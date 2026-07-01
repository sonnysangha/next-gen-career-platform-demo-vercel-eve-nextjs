import { v } from "convex/values";
import { query } from "./_generated/server";
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
