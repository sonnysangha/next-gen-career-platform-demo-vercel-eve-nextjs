import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import {
  getUserByIdentity,
  getProfileForUser,
  jobDocValidator,
  companyDocValidator,
  recruiterDocValidator,
} from "./model";
import { cosineSimilarity } from "./embeddings";

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
  matchScore: v.union(v.number(), v.null()),
});

/**
 * 0–100 vector match score between a user's profile embedding and a job's
 * embedding, or null when either side lacks an embedding.
 */
function computeMatchScore(
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
    }),
  ),
  handler: async (ctx) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) return [];

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
