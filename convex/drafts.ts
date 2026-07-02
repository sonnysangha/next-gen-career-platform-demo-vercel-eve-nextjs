import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  getUserByIdentity,
  profileDraftDocValidator,
  outreachDraftDocValidator,
  careerPlanDocValidator,
  aiRunDocValidator,
} from "./model";

/** Current user's profile drafts, newest first. */
export const getMyProfileDrafts = query({
  args: {},
  returns: v.array(profileDraftDocValidator),
  handler: async (ctx) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) return [];
    return await ctx.db
      .query("profileDrafts")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .order("desc")
      .collect();
  },
});

/** Current user's outreach drafts, newest first. */
export const getMyOutreachDrafts = query({
  args: {},
  returns: v.array(outreachDraftDocValidator),
  handler: async (ctx) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) return [];
    return await ctx.db
      .query("outreachDrafts")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .order("desc")
      .collect();
  },
});

/** Current user's career plans, newest first. */
export const getMyCareerPlans = query({
  args: {},
  returns: v.array(careerPlanDocValidator),
  handler: async (ctx) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) return [];
    return await ctx.db
      .query("careerPlans")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .order("desc")
      .collect();
  },
});

/** Current user's most recent career plan, or null. */
export const getLatestCareerPlan = query({
  args: {},
  returns: v.union(careerPlanDocValidator, v.null()),
  handler: async (ctx) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) return null;
    return await ctx.db
      .query("careerPlans")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .order("desc")
      .first();
  },
});

/** Delete one of the current user's outreach drafts. */
export const deleteOutreachDraft = mutation({
  args: { draftId: v.id("outreachDrafts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const draft = await ctx.db.get(args.draftId);
    if (draft === null || draft.userId !== me._id) {
      throw new Error("Not authorized to delete this draft");
    }
    await ctx.db.delete(draft._id);
    return null;
  },
});

/** Delete one of the current user's profile drafts. */
export const deleteProfileDraft = mutation({
  args: { draftId: v.id("profileDrafts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const draft = await ctx.db.get(args.draftId);
    if (draft === null || draft.userId !== me._id) {
      throw new Error("Not authorized to delete this draft");
    }
    await ctx.db.delete(draft._id);
    return null;
  },
});

/** Delete one of the current user's career plans. */
export const deleteCareerPlan = mutation({
  args: { planId: v.id("careerPlans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const plan = await ctx.db.get(args.planId);
    if (plan === null || plan.userId !== me._id) {
      throw new Error("Not authorized to delete this plan");
    }
    await ctx.db.delete(plan._id);
    return null;
  },
});

/** Current user's AI run history, newest first. */
export const getMyAiRuns = query({
  args: {},
  returns: v.array(aiRunDocValidator),
  handler: async (ctx) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) return [];
    return await ctx.db
      .query("aiRuns")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .order("desc")
      .collect();
  },
});
