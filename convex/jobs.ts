import { v } from "convex/values";
import {
  query,
  mutation,
  action,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import {
  getUserByIdentity,
  getProfileForUser,
  assertCompanyAdmin,
  getActiveOrgId,
  FREE_OPEN_JOB_LIMIT,
  jobDocValidator,
  companyDocValidator,
  recruiterDocValidator,
} from "./model";
import { orgHasCompanyProBilling } from "./clerkBilling";
import { cosineSimilarity } from "./embeddings";
import type { MutationCtx } from "./_generated/server";

/** Jobs with no status are legacy/seeded rows and count as open. */
const jobIsOpen = (j: Doc<"jobs">) => j.status !== "closed";

const FREE_CAP_ERROR = `Free companies can have up to ${FREE_OPEN_JOB_LIMIT} open jobs. Upgrade to Company Pro for unlimited job posts.`;

/** Open jobs at a company, optionally ignoring the job being transitioned. */
async function countOpenJobs(
  ctx: QueryCtx | MutationCtx,
  companyId: Id<"companies">,
  excludeJobId?: Id<"jobs">,
): Promise<number> {
  const jobs = await ctx.db
    .query("jobs")
    .withIndex("by_companyId", (q) => q.eq("companyId", companyId))
    .collect();
  return jobs.filter((j) => jobIsOpen(j) && j._id !== excludeJobId).length;
}

/**
 * Org billing: free companies keep at most FREE_OPEN_JOB_LIMIT jobs open.
 * Company Pro removes the cap — but that is verified against Clerk Billing
 * via the Backend SDK in the public ACTIONS (createJob / setJobStatus), which
 * pass `capExempt: true` into the internal mutations. This transactional
 * check is the enforcement for everyone else.
 */
async function assertOpenJobSlot(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  excludeJobId?: Id<"jobs">,
): Promise<void> {
  const openCount = await countOpenJobs(ctx, companyId, excludeJobId);
  if (openCount >= FREE_OPEN_JOB_LIMIT) {
    throw new Error(FREE_CAP_ERROR);
  }
}

const seniorityValidator = v.union(
  v.literal("intern"),
  v.literal("junior"),
  v.literal("mid"),
  v.literal("senior"),
  v.literal("staff"),
  v.literal("principal"),
);
const workModeValidator = v.union(
  v.literal("remote"),
  v.literal("hybrid"),
  v.literal("onsite"),
);

const jobWithCompanyValidator = v.object({
  ...jobDocValidator.fields,
  company: v.union(companyDocValidator, v.null()),
  savedByMe: v.boolean(),
  appliedByMe: v.boolean(),
  matchScore: v.union(v.number(), v.null()),
});

/**
 * 0–100 vector match score between a user's profile embedding and a job's
 * embedding, or null when either side lacks an embedding.
 */
export function computeMatchScore(
  userEmbedding: number[] | undefined,
  jobEmbedding: number[] | undefined,
): number | null {
  if (userEmbedding === undefined || jobEmbedding === undefined) return null;
  const sim = cosineSimilarity(userEmbedding, jobEmbedding);
  return Math.max(0, Math.min(100, Math.round(sim * 100)));
}

/** Does the current user have this job saved? */
async function isSavedByMe(
  ctx: QueryCtx,
  meId: Id<"users"> | null,
  jobId: Id<"jobs">,
): Promise<boolean> {
  if (meId === null) return false;
  const saved = await ctx.db
    .query("savedJobs")
    .withIndex("by_user_and_job", (q) =>
      q.eq("userId", meId).eq("jobId", jobId),
    )
    .unique();
  return saved !== null;
}

/** Does the current user have a live (non-withdrawn) application here? */
async function isAppliedByMe(
  ctx: QueryCtx,
  meId: Id<"users"> | null,
  jobId: Id<"jobs">,
): Promise<boolean> {
  if (meId === null) return false;
  const app = await ctx.db
    .query("applications")
    .withIndex("by_user_and_job", (q) =>
      q.eq("userId", meId).eq("jobId", jobId),
    )
    .unique();
  return app !== null && app.status !== "withdrawn";
}

/**
 * Job search. Uses indexes for the seniority/workMode filters (whichever is
 * present) and does free-text search in-handler over title/description/company/
 * skills. Each job is enriched with its company and savedByMe.
 */
export const getJobs = query({
  args: {
    search: v.optional(v.string()),
    seniority: v.optional(seniorityValidator),
    workMode: v.optional(workModeValidator),
  },
  returns: v.array(jobWithCompanyValidator),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    const myProfile =
      me !== null ? await getProfileForUser(ctx, me._id) : null;
    const myEmbedding = myProfile?.embedding;

    // Pick the most selective indexed filter first.
    let jobs: Doc<"jobs">[];
    if (args.seniority !== undefined) {
      const seniority = args.seniority;
      jobs = await ctx.db
        .query("jobs")
        .withIndex("by_seniority", (q) => q.eq("seniority", seniority))
        .collect();
      if (args.workMode !== undefined) {
        jobs = jobs.filter((j) => j.workMode === args.workMode);
      }
    } else if (args.workMode !== undefined) {
      const workMode = args.workMode;
      jobs = await ctx.db
        .query("jobs")
        .withIndex("by_workMode", (q) => q.eq("workMode", workMode))
        .collect();
    } else {
      jobs = await ctx.db.query("jobs").order("desc").collect();
    }

    // Closed jobs never show in search.
    jobs = jobs.filter(jobIsOpen);

    // Enrich with company (needed both for output and for text search).
    const enriched = await Promise.all(
      jobs.map(async (job) => {
        const company = await ctx.db.get(job.companyId);
        return { job, company };
      }),
    );

    // In-handler free-text search across title/description/company/skills.
    const term = args.search?.trim().toLowerCase();
    const filtered =
      term && term.length > 0
        ? enriched.filter(({ job, company }) => {
            const haystack = [
              job.title,
              job.description,
              job.location,
              company?.name ?? "",
              ...job.skillsRequired,
            ]
              .join(" ")
              .toLowerCase();
            return haystack.includes(term);
          })
        : enriched;

    // Newest first for a stable ordering.
    filtered.sort((a, b) => b.job.postedAt - a.job.postedAt);

    const results = await Promise.all(
      filtered.map(async ({ job, company }) => {
        // Drop the large embedding array from the client payload.
        const { embedding: _jobEmbedding, ...jobRest } = job;
        return {
          ...jobRest,
          company,
          savedByMe: await isSavedByMe(ctx, me?._id ?? null, job._id),
          appliedByMe: await isAppliedByMe(ctx, me?._id ?? null, job._id),
          matchScore: computeMatchScore(myEmbedding, job.embedding),
        };
      }),
    );

    // When the user has an embedding, sort by match score desc (nulls last);
    // otherwise keep the newest-first order from above.
    if (myEmbedding !== undefined) {
      results.sort((a, b) => {
        if (a.matchScore === null && b.matchScore === null) return 0;
        if (a.matchScore === null) return 1;
        if (b.matchScore === null) return -1;
        return b.matchScore - a.matchScore;
      });
    }

    return results;
  },
});

/** A single job with its company, recruiter, and savedByMe. Null if missing. */
export const getJobById = query({
  args: { jobId: v.id("jobs") },
  returns: v.union(
    v.object({
      ...jobDocValidator.fields,
      company: v.union(companyDocValidator, v.null()),
      recruiter: v.union(recruiterDocValidator, v.null()),
      savedByMe: v.boolean(),
      appliedByMe: v.boolean(),
      matchScore: v.union(v.number(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    const myProfile =
      me !== null ? await getProfileForUser(ctx, me._id) : null;
    const myEmbedding = myProfile?.embedding;

    const job = await ctx.db.get(args.jobId);
    if (job === null) return null;

    const company = await ctx.db.get(job.companyId);
    const recruiter =
      job.recruiterId !== undefined
        ? await ctx.db.get(job.recruiterId)
        : null;

    // Drop the large embedding array from the client payload.
    const { embedding: _jobEmbedding, ...jobRest } = job;
    return {
      ...jobRest,
      company,
      recruiter,
      savedByMe: await isSavedByMe(ctx, me?._id ?? null, job._id),
      appliedByMe: await isAppliedByMe(ctx, me?._id ?? null, job._id),
      matchScore: computeMatchScore(myEmbedding, job.embedding),
    };
  },
});

/** Save a job for the current user (idempotent). */
export const saveJob = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.object({ saved: v.boolean() }),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.jobId);
    if (job === null) throw new Error("Job not found");

    const existing = await ctx.db
      .query("savedJobs")
      .withIndex("by_user_and_job", (q) =>
        q.eq("userId", me._id).eq("jobId", args.jobId),
      )
      .unique();
    if (existing === null) {
      await ctx.db.insert("savedJobs", {
        userId: me._id,
        jobId: args.jobId,
        savedAt: Date.now(),
      });
    }
    return { saved: true };
  },
});

/** Remove a saved job for the current user (idempotent). */
export const unsaveJob = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.object({ saved: v.boolean() }),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("savedJobs")
      .withIndex("by_user_and_job", (q) =>
        q.eq("userId", me._id).eq("jobId", args.jobId),
      )
      .unique();
    if (existing !== null) {
      await ctx.db.delete(existing._id);
    }
    return { saved: false };
  },
});

/** The current user's saved jobs, enriched with company. Newest saved first. */
export const getSavedJobs = query({
  args: {},
  returns: v.array(
    v.object({
      ...jobDocValidator.fields,
      company: v.union(companyDocValidator, v.null()),
      savedAt: v.number(),
      savedByMe: v.boolean(),
      matchScore: v.union(v.number(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) return [];
    const myProfile = await getProfileForUser(ctx, me._id);
    const myEmbedding = myProfile?.embedding;

    const saved = await ctx.db
      .query("savedJobs")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .order("desc")
      .collect();

    const results = [];
    for (const row of saved) {
      const job = await ctx.db.get(row.jobId);
      if (job === null) continue; // job was deleted; skip stale save
      const company = await ctx.db.get(job.companyId);
      results.push({
        ...job,
        company,
        savedAt: row.savedAt,
        savedByMe: true,
        matchScore: computeMatchScore(myEmbedding, job.embedding),
      });
    }
    return results;
  },
});

/**
 * Recruiters relevant to a job: the job's explicitly-tied recruiter (if any)
 * plus all recruiters at the job's company, de-duplicated.
 */
export const getRecruitersForJob = query({
  args: { jobId: v.id("jobs") },
  returns: v.array(recruiterDocValidator),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (job === null) return [];

    const byId = new Map<Id<"recruiters">, Doc<"recruiters">>();

    if (job.recruiterId !== undefined) {
      const tied = await ctx.db.get(job.recruiterId);
      if (tied !== null) byId.set(tied._id, tied);
    }

    const atCompany = await ctx.db
      .query("recruiters")
      .withIndex("by_company", (q) => q.eq("companyId", job.companyId))
      .collect();
    for (const r of atCompany) byId.set(r._id, r);

    return Array.from(byId.values());
  },
});

// ── Company-side job management (Clerk-org / owner gated) ────────────

const jobEditableFields = {
  title: v.string(),
  salaryMin: v.number(),
  salaryMax: v.number(),
  currency: v.string(),
  skillsRequired: v.array(v.string()),
  seniority: seniorityValidator,
  workMode: workModeValidator,
  location: v.string(),
  description: v.string(),
};

/**
 * All jobs for a company the caller administers (open AND closed), each with
 * a live applicant count. Powers the company dashboard.
 */
export const getCompanyJobs = query({
  args: { companyId: v.id("companies") },
  returns: v.array(
    v.object({
      ...jobDocValidator.fields,
      applicantCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await assertCompanyAdmin(ctx, args.companyId);
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();
    jobs.sort((a, b) => b.postedAt - a.postedAt);
    return await Promise.all(
      jobs.map(async (job) => {
        const applications = await ctx.db
          .query("applications")
          .withIndex("by_job", (q) => q.eq("jobId", job._id))
          .collect();
        const { embedding: _e, ...jobRest } = job;
        return {
          ...jobRest,
          applicantCount: applications.filter((a) => a.status !== "withdrawn")
            .length,
        };
      }),
    );
  },
});

/**
 * Would opening one more job put this company over the free-tier cap?
 * Asserts company admin. `excludeJobId` ignores the job being reopened.
 */
export const wouldExceedFreeCap = internalQuery({
  args: {
    companyId: v.id("companies"),
    excludeJobId: v.optional(v.id("jobs")),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await assertCompanyAdmin(ctx, args.companyId);
    const openCount = await countOpenJobs(
      ctx,
      args.companyId,
      args.excludeJobId,
    );
    return openCount >= FREE_OPEN_JOB_LIMIT;
  },
});

/** The company a job belongs to (asserting admin). Used by setJobStatus. */
export const getJobCompanyId = internalQuery({
  args: { jobId: v.id("jobs") },
  returns: v.id("companies"),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (job === null) throw new Error("Job not found");
    await assertCompanyAdmin(ctx, job.companyId);
    return job.companyId;
  },
});

/**
 * Post a job for a company the caller administers.
 *
 * ACTION: when the company is at the free-tier open-job cap, the Company Pro
 * plan is verified against Clerk Billing via the Backend SDK (an outbound
 * HTTP call — never JWT claims). The write happens in createJobInternal,
 * which re-asserts admin and re-checks the cap transactionally unless pro
 * was verified here.
 */
export const createJob = action({
  args: { companyId: v.id("companies"), ...jobEditableFields },
  returns: v.id("jobs"),
  handler: async (ctx, args): Promise<Id<"jobs">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");
    let capExempt = false;
    const atCap: boolean = await ctx.runQuery(internal.jobs.wouldExceedFreeCap, {
      companyId: args.companyId,
    });
    if (atCap) {
      capExempt = await orgHasCompanyProBilling(await getActiveOrgId(ctx));
      if (!capExempt) throw new Error(FREE_CAP_ERROR);
    }
    return await ctx.runMutation(internal.jobs.createJobInternal, {
      ...args,
      capExempt,
    });
  },
});

/**
 * Transactional half of createJob. Auth is NOT delegated to the action:
 * this re-asserts company admin itself. `capExempt` is only true when the
 * action verified Company Pro against Clerk Billing.
 */
export const createJobInternal = internalMutation({
  args: {
    companyId: v.id("companies"),
    ...jobEditableFields,
    capExempt: v.boolean(),
  },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    const { company, me } = await assertCompanyAdmin(ctx, args.companyId);
    const title = args.title.trim();
    if (title.length === 0) throw new Error("Job title is required");
    if (args.salaryMin < 0 || args.salaryMax < args.salaryMin) {
      throw new Error("Salary range is invalid");
    }
    if (!args.capExempt) await assertOpenJobSlot(ctx, company._id);
    return await ctx.db.insert("jobs", {
      title,
      companyId: company._id,
      createdBy: me._id,
      status: "open",
      salaryMin: args.salaryMin,
      salaryMax: args.salaryMax,
      currency: args.currency,
      skillsRequired: args.skillsRequired.map((s) => s.trim()).filter(Boolean),
      seniority: args.seniority,
      workMode: args.workMode,
      location: args.location.trim(),
      description: args.description.trim(),
      postedAt: Date.now(),
    });
  },
});

/** Edit a job belonging to a company the caller administers. */
export const updateJob = mutation({
  args: { jobId: v.id("jobs"), ...jobEditableFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (job === null) throw new Error("Job not found");
    await assertCompanyAdmin(ctx, job.companyId);
    const title = args.title.trim();
    if (title.length === 0) throw new Error("Job title is required");
    if (args.salaryMin < 0 || args.salaryMax < args.salaryMin) {
      throw new Error("Salary range is invalid");
    }
    await ctx.db.patch(job._id, {
      title,
      salaryMin: args.salaryMin,
      salaryMax: args.salaryMax,
      currency: args.currency,
      skillsRequired: args.skillsRequired.map((s) => s.trim()).filter(Boolean),
      seniority: args.seniority,
      workMode: args.workMode,
      location: args.location.trim(),
      description: args.description.trim(),
      // The description changed, so any stale embedding must be recomputed.
      embedding: undefined,
    });
    return null;
  },
});

/**
 * Open / close a job (closed jobs disappear from search).
 *
 * ACTION: reopening a job can push a free company past the open-job cap, so
 * when that would happen the Company Pro plan is verified against Clerk
 * Billing via the Backend SDK. The write happens in setJobStatusInternal,
 * which re-asserts admin and re-checks the cap unless pro was verified here.
 */
export const setJobStatus = action({
  args: {
    jobId: v.id("jobs"),
    status: v.union(v.literal("open"), v.literal("closed")),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");
    let capExempt = false;
    if (args.status === "open") {
      const companyId: Id<"companies"> = await ctx.runQuery(
        internal.jobs.getJobCompanyId,
        { jobId: args.jobId },
      );
      const atCap: boolean = await ctx.runQuery(
        internal.jobs.wouldExceedFreeCap,
        { companyId, excludeJobId: args.jobId },
      );
      if (atCap) {
        capExempt = await orgHasCompanyProBilling(await getActiveOrgId(ctx));
        if (!capExempt) throw new Error(FREE_CAP_ERROR);
      }
    }
    return await ctx.runMutation(internal.jobs.setJobStatusInternal, {
      jobId: args.jobId,
      status: args.status,
      capExempt,
    });
  },
});

/**
 * Transactional half of setJobStatus. Re-asserts company admin itself.
 * `capExempt` is only true when the action verified Company Pro against
 * Clerk Billing.
 */
export const setJobStatusInternal = internalMutation({
  args: {
    jobId: v.id("jobs"),
    status: v.union(v.literal("open"), v.literal("closed")),
    capExempt: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (job === null) throw new Error("Job not found");
    await assertCompanyAdmin(ctx, job.companyId);
    if (
      args.status === "open" &&
      job.status === "closed" &&
      !args.capExempt
    ) {
      await assertOpenJobSlot(ctx, job.companyId, job._id);
    }
    await ctx.db.patch(job._id, { status: args.status });
    return null;
  },
});

/** Delete a job plus its applications and saved-job rows. */
export const deleteJob = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (job === null) throw new Error("Job not found");
    await assertCompanyAdmin(ctx, job.companyId);

    const applications = await ctx.db
      .query("applications")
      .withIndex("by_job", (q) => q.eq("jobId", job._id))
      .collect();
    for (const app of applications) await ctx.db.delete(app._id);

    // savedJobs has no by_job index; the table stays small enough to scan.
    const saves = await ctx.db.query("savedJobs").collect();
    for (const save of saves) {
      if (save.jobId === job._id) await ctx.db.delete(save._id);
    }

    await ctx.db.delete(job._id);
    return null;
  },
});
