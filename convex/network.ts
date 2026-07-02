import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getUserByIdentity, notify, authorSummaryValidator } from "./model";

/** Follow / unfollow a user. Returns the resulting following state. */
export const toggleFollow = mutation({
  args: { userId: v.id("users") },
  returns: v.object({ following: v.boolean() }),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    if (me._id === args.userId) throw new Error("You can't follow yourself");

    const target = await ctx.db.get(args.userId);
    if (target === null) throw new Error("User not found");

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", me._id).eq("followingId", args.userId),
      )
      .unique();

    if (existing !== null) {
      await ctx.db.delete(existing._id);
      return { following: false };
    }

    await ctx.db.insert("follows", {
      followerId: me._id,
      followingId: args.userId,
    });
    await notify(ctx, {
      userId: args.userId,
      actorId: me._id,
      type: "follow",
      message: `${me.name} started following you`,
    });
    return { following: true };
  },
});

/** Follower/following counts + whether the caller follows this user. */
export const getFollowStats = query({
  args: { userId: v.id("users") },
  returns: v.object({
    followers: v.number(),
    following: v.number(),
    followedByMe: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect();
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    const me = await getUserByIdentity(ctx);
    const followedByMe =
      me !== null && followers.some((f) => f.followerId === me._id);

    return {
      followers: followers.length,
      following: following.length,
      followedByMe,
    };
  },
});

/**
 * People suggestions for the feed sidebar: recently joined members the caller
 * doesn't follow yet.
 */
export const getSuggestedPeople = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(authorSummaryValidator),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    const limit = Math.min(args.limit ?? 5, 10);

    const iFollow = new Set<Id<"users">>();
    if (me !== null) {
      const follows = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", me._id))
        .collect();
      for (const f of follows) iFollow.add(f.followingId);
    }

    const results = [];
    for await (const user of ctx.db.query("users").order("desc")) {
      if (me !== null && user._id === me._id) continue;
      if (iFollow.has(user._id)) continue;
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique();
      results.push({
        _id: user._id,
        name: user.name,
        username: user.username,
        imageUrl: user.imageUrl ?? null,
        headline: profile?.headline ?? null,
      });
      if (results.length >= limit) break;
    }
    return results;
  },
});
