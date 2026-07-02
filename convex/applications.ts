import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  getUserByIdentity,
  assertCompanyAdmin,
  orgHasCompanyPro,
  notify,
  applicationDocValidator,
  applicationStatusValidator,
  jobDocValidator,
  companyDocValidator,
  authorSummaryValidator,
  profileDocValidator,
  skillDocValidator,
} from "./model";

/** Apply to a job. Re-applying after a withdrawal re-activates the row. */
export const apply = mutation({
  args: {
    jobId: v.id("jobs"),
    coverNote: v.optional(v.string()),
  },
  returns: v.id("applications"),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.jobId);
    if (job === null) throw new Error("Job not found");
    if (job.status === "closed") throw new Error("This job is closed");

    const coverNote =
      args.coverNote && args.coverNote.trim().length > 0
        ? args.coverNote.trim()
        : undefined;

    const existing = await ctx.db
      .query("applications")
      .withIndex("by_user_and_job", (q) =>
        q.eq("userId", me._id).eq("jobId", args.jobId),
      )
      .unique();

    let applicationId;
    if (existing !== null) {
      if (existing.status !== "withdrawn") {
        throw new Error("You already applied to this job");
      }
      await ctx.db.patch(existing._id, {
        status: "submitted",
        coverNote,
        updatedAt: Date.now(),
      });
      applicationId = existing._id;
    } else {
      applicationId = await ctx.db.insert("applications", {
        jobId: args.jobId,
        userId: me._id,
        companyId: job.companyId,
        coverNote,
        status: "submitted",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Tell the company (its owner) about the new applicant.
    const company = await ctx.db.get(job.companyId);
    if (company?.ownerId !== undefined) {
      await notify(ctx, {
        userId: company.ownerId,
        actorId: me._id,
        type: "application",
        message: `${me.name} applied to ${job.title}`,
        jobId: job._id,
        applicationId,
      });
    }
    return applicationId;
  },
});

/** Withdraw the caller's application to a job. */
export const withdraw = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("applications")
      .withIndex("by_user_and_job", (q) =>
        q.eq("userId", me._id).eq("jobId", args.jobId),
      )
      .unique();
    if (existing === null) throw new Error("Application not found");
    await ctx.db.patch(existing._id, {
      status: "withdrawn",
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** The caller's applications, newest first, enriched with job + company. */
export const getMyApplications = query({
  args: {},
  returns: v.array(
    v.object({
      ...applicationDocValidator.fields,
      job: v.union(jobDocValidator, v.null()),
      company: v.union(companyDocValidator, v.null()),
    }),
  ),
  handler: async (ctx) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) return [];
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .order("desc")
      .collect();
    return await Promise.all(
      applications.map(async (app) => {
        const job = await ctx.db.get(app.jobId);
        const company = await ctx.db.get(app.companyId);
        const jobRest =
          job === null
            ? null
            : (({ embedding: _e, ...rest }) => rest)(job);
        return { ...app, job: jobRest, company };
      }),
    );
  },
});

const applicantValidator = v.object({
  ...applicationDocValidator.fields,
  applicant: v.union(authorSummaryValidator, v.null()),
  profile: v.union(profileDocValidator, v.null()),
  skills: v.array(skillDocValidator),
});

/**
 * Applicants for one job (or the whole company when jobId is omitted),
 * newest first, enriched with the applicant's public profile. Caller must
 * administer the company.
 *
 * Org billing: candidate skill insights are a Company Pro feature — free
 * companies get an empty `skills` array (the UI shows an upgrade hint).
 */
export const getApplicantsForCompany = query({
  args: {
    companyId: v.id("companies"),
    jobId: v.optional(v.id("jobs")),
  },
  returns: v.array(applicantValidator),
  handler: async (ctx, args) => {
    await assertCompanyAdmin(ctx, args.companyId);
    const pro = await orgHasCompanyPro(ctx);

    let applications;
    if (args.jobId !== undefined) {
      const jobId = args.jobId;
      applications = await ctx.db
        .query("applications")
        .withIndex("by_job", (q) => q.eq("jobId", jobId))
        .collect();
    } else {
      applications = await ctx.db
        .query("applications")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect();
    }
    applications = applications.filter((a) => a.status !== "withdrawn");
    applications.sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      applications.map(async (app) => {
        const user = await ctx.db.get(app.userId);
        const profile =
          user === null
            ? null
            : await ctx.db
                .query("profiles")
                .withIndex("by_userId", (q) => q.eq("userId", user._id))
                .unique();
        const skills =
          user === null || !pro
            ? []
            : await ctx.db
                .query("skills")
                .withIndex("by_userId", (q) => q.eq("userId", user._id))
                .collect();
        return {
          ...app,
          applicant:
            user === null
              ? null
              : {
                  _id: user._id,
                  name: user.name,
                  username: user.username,
                  imageUrl: user.imageUrl ?? null,
                  headline: profile?.headline ?? null,
                },
          profile,
          skills,
        };
      }),
    );
  },
});

/**
 * Move an application through the pipeline. Caller must administer the
 * company; the applicant gets a status notification.
 *
 * Org billing: the free tier can mark applicants reviewed/rejected; the
 * interview and offer stages require Company Pro (checked via the org's
 * billing claims on the JWT).
 */
export const updateStatus = mutation({
  args: {
    applicationId: v.id("applications"),
    status: applicationStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (app === null) throw new Error("Application not found");
    const { me } = await assertCompanyAdmin(ctx, app.companyId);
    if (args.status === "withdrawn") {
      throw new Error("Only the applicant can withdraw an application");
    }
    if (
      (args.status === "interviewing" || args.status === "offer") &&
      !(await orgHasCompanyPro(ctx))
    ) {
      throw new Error(
        "Interview and offer stages are a Company Pro feature — upgrade your organization to unlock the full pipeline.",
      );
    }
    if (app.status === args.status) return null;

    await ctx.db.patch(app._id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    const job = await ctx.db.get(app.jobId);
    const company = await ctx.db.get(app.companyId);
    const statusLabel: Record<string, string> = {
      submitted: "was received",
      reviewed: "was reviewed",
      interviewing: "moved to interviews",
      offer: "received an offer 🎉",
      rejected: "was not selected",
    };
    await notify(ctx, {
      userId: app.userId,
      actorId: me._id,
      type: "application_status",
      message: `Your application for ${job?.title ?? "a role"} at ${
        company?.name ?? "a company"
      } ${statusLabel[args.status] ?? `is now ${args.status}`}`,
      jobId: app.jobId,
      applicationId: app._id,
    });
    return null;
  },
});
