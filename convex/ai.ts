import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { careerPhaseValidator } from "./model";

/**
 * Internal AI writers — the security boundary.
 *
 * These are internalMutations: never callable directly from a browser client.
 * They accept a real Id<"users"> (already resolved by the caller) and insert
 * with the appropriate persisted status + createdAt. The Eve bridge (eve.ts)
 * dispatches here via ctx.runMutation after checking its shared secret and
 * resolving the Clerk userId to a users._id.
 */

const featureValidator = v.union(
  v.literal("profile_optimizer"),
  v.literal("job_matcher"),
  v.literal("outreach_writer"),
  v.literal("career_plan"),
);

/** Persist an AI-generated profile draft with status "saved". */
export const saveProfileDraft = internalMutation({
  args: {
    userId: v.id("users"),
    headline: v.string(),
    about: v.string(),
    experienceBullets: v.array(v.string()),
    suggestedSkills: v.array(v.string()),
    explanation: v.string(),
    targetRole: v.optional(v.string()),
  },
  returns: v.id("profileDrafts"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("profileDrafts", {
      userId: args.userId,
      headline: args.headline,
      about: args.about,
      experienceBullets: args.experienceBullets,
      suggestedSkills: args.suggestedSkills,
      explanation: args.explanation,
      targetRole: args.targetRole,
      status: "saved",
      createdAt: Date.now(),
    });
  },
});

/** Persist an AI-generated outreach draft with status "saved". */
export const saveOutreachDraft = internalMutation({
  args: {
    userId: v.id("users"),
    jobId: v.optional(v.id("jobs")),
    recruiterId: v.optional(v.id("recruiters")),
    tone: v.optional(v.string()),
    connectionMessage: v.string(),
    recruiterDm: v.string(),
    subject: v.optional(v.string()),
  },
  returns: v.id("outreachDrafts"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("outreachDrafts", {
      userId: args.userId,
      jobId: args.jobId,
      recruiterId: args.recruiterId,
      tone: args.tone,
      connectionMessage: args.connectionMessage,
      recruiterDm: args.recruiterDm,
      subject: args.subject,
      status: "saved",
      createdAt: Date.now(),
    });
  },
});

/** Persist an AI-generated 30/60/90 career plan with status "saved". */
export const saveCareerPlan = internalMutation({
  args: {
    userId: v.id("users"),
    goal: v.string(),
    summary: v.optional(v.string()),
    phases: v.array(careerPhaseValidator),
    weeklyMilestones: v.array(v.string()),
    projectIdeas: v.array(v.string()),
    skillsToLearn: v.array(v.string()),
    jobsToApplyFirst: v.array(v.string()),
  },
  returns: v.id("careerPlans"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("careerPlans", {
      userId: args.userId,
      goal: args.goal,
      summary: args.summary,
      phases: args.phases,
      weeklyMilestones: args.weeklyMilestones,
      projectIdeas: args.projectIdeas,
      skillsToLearn: args.skillsToLearn,
      jobsToApplyFirst: args.jobsToApplyFirst,
      status: "saved",
      createdAt: Date.now(),
    });
  },
});

/** Record that an AI feature ran (for history / telemetry). */
export const recordAiRun = internalMutation({
  args: {
    userId: v.id("users"),
    feature: featureValidator,
    status: v.string(),
    sessionId: v.optional(v.string()),
  },
  returns: v.id("aiRuns"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiRuns", {
      userId: args.userId,
      feature: args.feature,
      status: args.status,
      sessionId: args.sessionId,
      createdAt: Date.now(),
    });
  },
});
