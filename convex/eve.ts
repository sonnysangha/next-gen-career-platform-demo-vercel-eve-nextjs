import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { getUserByClerkId, careerPhaseValidator } from "./model";
import { Id } from "./_generated/dataModel";

/**
 * Eve bridge — PUBLIC functions called ONLY by the trusted Eve runtime
 * (a Node process using ConvexHttpClient). There is NO Clerk identity in that
 * context, so every function is guarded by a shared secret instead.
 *
 * Contract:
 *  - Every function takes `secret` and validates it against
 *    process.env.EVE_CONVEX_SECRET (set via: npx convex env set EVE_CONVEX_SECRET ...).
 *  - Every function operates on an explicit Clerk userId string, resolved to a
 *    real Id<"users"> here before touching data or dispatching to internal.ai.*
 *
 * Because these are public, the secret check is the ONLY thing standing between
 * the open internet and these writes. Keep it first, keep it strict.
 */

/** Throw unless the provided secret matches the deployment's EVE_CONVEX_SECRET. */
function assertEveSecret(secret: string): void {
  const expected = process.env.EVE_CONVEX_SECRET;
  if (expected === undefined || expected.length === 0) {
    throw new Error("EVE_CONVEX_SECRET is not configured on this deployment");
  }
  if (secret !== expected) {
    throw new Error("Unauthorized: invalid Eve secret");
  }
}

/**
 * Resolve a Clerk userId to a real users._id after checking the secret.
 * Throws on missing user (callers that need null should catch, but our reads
 * below return null explicitly instead).
 */
async function authorizeEve(
  ctx: QueryCtx | MutationCtx,
  secret: string,
  clerkUserId: string,
): Promise<Id<"users"> | null> {
  assertEveSecret(secret);
  const user = await getUserByClerkId(ctx, clerkUserId);
  return user?._id ?? null;
}

// ── Reusable output shapes ──────────────────────────────────────────

const userContextValidator = v.object({
  userId: v.id("users"),
  clerkId: v.string(),
  name: v.string(),
  username: v.string(),
  headline: v.union(v.string(), v.null()),
  about: v.union(v.string(), v.null()),
  location: v.union(v.string(), v.null()),
  targetRole: v.union(v.string(), v.null()),
  openToWork: v.boolean(),
  experiences: v.array(
    v.object({
      _id: v.id("experiences"),
      title: v.string(),
      company: v.string(),
      startDate: v.string(),
      endDate: v.union(v.string(), v.null()),
      description: v.string(),
      location: v.union(v.string(), v.null()),
    }),
  ),
  skills: v.array(
    v.object({
      _id: v.id("skills"),
      name: v.string(),
      endorsements: v.number(),
    }),
  ),
  savedJobs: v.array(
    v.object({
      jobId: v.id("jobs"),
      title: v.string(),
      company: v.union(v.string(), v.null()),
      seniority: v.string(),
      workMode: v.string(),
      location: v.string(),
      skillsRequired: v.array(v.string()),
    }),
  ),
});

const jobForMatchingValidator = v.object({
  jobId: v.id("jobs"),
  title: v.string(),
  companyId: v.id("companies"),
  company: v.union(v.string(), v.null()),
  companyIndustry: v.union(v.string(), v.null()),
  salaryMin: v.number(),
  salaryMax: v.number(),
  currency: v.string(),
  skillsRequired: v.array(v.string()),
  seniority: v.string(),
  workMode: v.string(),
  location: v.string(),
  description: v.string(),
  postedAt: v.number(),
});

// ── Reads ────────────────────────────────────────────────────────────

/**
 * Full context the LLM needs about a user: profile, experiences, skills, goal
 * (targetRole) and saved jobs. Returns null if the user doesn't exist.
 */
export const getUserContext = query({
  args: { secret: v.string(), clerkUserId: v.string() },
  returns: v.union(userContextValidator, v.null()),
  handler: async (ctx, args) => {
    const userId = await authorizeEve(ctx, args.secret, args.clerkUserId);
    if (userId === null) return null;

    const user = await ctx.db.get(userId);
    if (user === null) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    const experiences = await ctx.db
      .query("experiences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const skills = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const savedRows = await ctx.db
      .query("savedJobs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const savedJobs = [];
    for (const row of savedRows) {
      const job = await ctx.db.get(row.jobId);
      if (job === null) continue;
      const company = await ctx.db.get(job.companyId);
      savedJobs.push({
        jobId: job._id,
        title: job.title,
        company: company?.name ?? null,
        seniority: job.seniority,
        workMode: job.workMode,
        location: job.location,
        skillsRequired: job.skillsRequired,
      });
    }

    return {
      userId: user._id,
      clerkId: user.clerkId,
      name: user.name,
      username: user.username,
      headline: profile?.headline ?? null,
      about: profile?.about ?? null,
      location: profile?.location ?? null,
      targetRole: profile?.targetRole ?? null,
      openToWork: profile?.openToWork ?? false,
      experiences: experiences.map((e) => ({
        _id: e._id,
        title: e.title,
        company: e.company,
        startDate: e.startDate,
        endDate: e.endDate ?? null,
        description: e.description,
        location: e.location ?? null,
      })),
      skills: skills.map((s) => ({
        _id: s._id,
        name: s.name,
        endorsements: s.endorsements,
      })),
      savedJobs,
    };
  },
});

/**
 * All jobs enriched with company + industry + skillsRequired, for the LLM's
 * job-matching tool to rank/score. clerkUserId is accepted for symmetry /
 * future personalization but the full catalog is returned regardless.
 */
export const getAllJobsForMatching = query({
  args: { secret: v.string(), clerkUserId: v.optional(v.string()) },
  returns: v.array(jobForMatchingValidator),
  handler: async (ctx, args) => {
    assertEveSecret(args.secret);

    const jobs = await ctx.db.query("jobs").order("desc").collect();
    return await Promise.all(
      jobs.map(async (job) => {
        const company = await ctx.db.get(job.companyId);
        return {
          jobId: job._id,
          title: job.title,
          companyId: job.companyId,
          company: company?.name ?? null,
          companyIndustry: company?.industry ?? null,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          currency: job.currency,
          skillsRequired: job.skillsRequired,
          seniority: job.seniority,
          workMode: job.workMode,
          location: job.location,
          description: job.description,
          postedAt: job.postedAt,
        };
      }),
    );
  },
});

// ── Writes (dispatch to internal.ai.*) ───────────────────────────────

/** Secret-guarded bridge to internal.ai.saveProfileDraft. */
export const saveProfileDraft = mutation({
  args: {
    secret: v.string(),
    clerkUserId: v.string(),
    headline: v.string(),
    about: v.string(),
    experienceBullets: v.array(v.string()),
    suggestedSkills: v.array(v.string()),
    explanation: v.string(),
    targetRole: v.optional(v.string()),
  },
  returns: v.id("profileDrafts"),
  handler: async (ctx, args): Promise<Id<"profileDrafts">> => {
    const userId = await authorizeEve(ctx, args.secret, args.clerkUserId);
    if (userId === null) throw new Error("User not found for clerkUserId");
    return await ctx.runMutation(internal.ai.saveProfileDraft, {
      userId,
      headline: args.headline,
      about: args.about,
      experienceBullets: args.experienceBullets,
      suggestedSkills: args.suggestedSkills,
      explanation: args.explanation,
      targetRole: args.targetRole,
    });
  },
});

/** Secret-guarded bridge to internal.ai.saveOutreachDraft. */
export const saveOutreachDraft = mutation({
  args: {
    secret: v.string(),
    clerkUserId: v.string(),
    // Accept plain strings from the Eve runtime; normalize to ids below.
    jobId: v.optional(v.string()),
    recruiterId: v.optional(v.string()),
    tone: v.optional(v.string()),
    connectionMessage: v.string(),
    recruiterDm: v.string(),
    subject: v.optional(v.string()),
  },
  returns: v.id("outreachDrafts"),
  handler: async (ctx, args): Promise<Id<"outreachDrafts">> => {
    const userId = await authorizeEve(ctx, args.secret, args.clerkUserId);
    if (userId === null) throw new Error("User not found for clerkUserId");
    const jobId = args.jobId
      ? ctx.db.normalizeId("jobs", args.jobId) ?? undefined
      : undefined;
    const recruiterId = args.recruiterId
      ? ctx.db.normalizeId("recruiters", args.recruiterId) ?? undefined
      : undefined;
    return await ctx.runMutation(internal.ai.saveOutreachDraft, {
      userId,
      jobId,
      recruiterId,
      tone: args.tone,
      connectionMessage: args.connectionMessage,
      recruiterDm: args.recruiterDm,
      subject: args.subject,
    });
  },
});

/** Secret-guarded bridge to internal.ai.saveCareerPlan. */
export const saveCareerPlan = mutation({
  args: {
    secret: v.string(),
    clerkUserId: v.string(),
    goal: v.string(),
    summary: v.optional(v.string()),
    phases: v.array(careerPhaseValidator),
    weeklyMilestones: v.array(v.string()),
    projectIdeas: v.array(v.string()),
    skillsToLearn: v.array(v.string()),
    jobsToApplyFirst: v.array(v.string()),
  },
  returns: v.id("careerPlans"),
  handler: async (ctx, args): Promise<Id<"careerPlans">> => {
    const userId = await authorizeEve(ctx, args.secret, args.clerkUserId);
    if (userId === null) throw new Error("User not found for clerkUserId");
    return await ctx.runMutation(internal.ai.saveCareerPlan, {
      userId,
      goal: args.goal,
      summary: args.summary,
      phases: args.phases,
      weeklyMilestones: args.weeklyMilestones,
      projectIdeas: args.projectIdeas,
      skillsToLearn: args.skillsToLearn,
      jobsToApplyFirst: args.jobsToApplyFirst,
    });
  },
});

/** Secret-guarded bridge to internal.ai.recordAiRun. */
export const recordAiRun = mutation({
  args: {
    secret: v.string(),
    clerkUserId: v.string(),
    feature: v.union(
      v.literal("profile_optimizer"),
      v.literal("job_matcher"),
      v.literal("outreach_writer"),
      v.literal("career_plan"),
    ),
    status: v.string(),
    sessionId: v.optional(v.string()),
  },
  returns: v.id("aiRuns"),
  handler: async (ctx, args): Promise<Id<"aiRuns">> => {
    const userId = await authorizeEve(ctx, args.secret, args.clerkUserId);
    if (userId === null) throw new Error("User not found for clerkUserId");
    return await ctx.runMutation(internal.ai.recordAiRun, {
      userId,
      feature: args.feature,
      status: args.status,
      sessionId: args.sessionId,
    });
  },
});
