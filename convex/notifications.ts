import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  getUserByIdentity,
  notificationDocValidator,
  authorSummaryValidator,
} from "./model";

const notificationItemValidator = v.object({
  ...notificationDocValidator.fields,
  actor: v.union(authorSummaryValidator, v.null()),
});

/** The caller's notifications, newest first (capped), with actor summaries. */
export const getMyNotifications = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(notificationItemValidator),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) return [];
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .order("desc")
      .take(args.limit ?? 30);
    return await Promise.all(
      rows.map(async (n) => {
        let actor = null;
        if (n.actorId !== undefined) {
          const user = await ctx.db.get(n.actorId);
          if (user !== null) {
            const profile = await ctx.db
              .query("profiles")
              .withIndex("by_userId", (q) => q.eq("userId", user._id))
              .unique();
            actor = {
              _id: user._id,
              name: user.name,
              username: user.username,
              imageUrl: user.imageUrl ?? null,
              headline: profile?.headline ?? null,
            };
          }
        }
        return { ...n, actor };
      }),
    );
  },
});

/** Count of unread notifications (drives the bell badge). */
export const getUnreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) return 0;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", me._id).eq("read", false),
      )
      .collect();
    return unread.length;
  },
});

/** Mark one notification read. */
export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const n = await ctx.db.get(args.notificationId);
    if (n === null || n.userId !== me._id) {
      throw new Error("Notification not found");
    }
    if (!n.read) await ctx.db.patch(n._id, { read: true });
    return null;
  },
});

/** Mark all of the caller's notifications read. */
export const markAllRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", me._id).eq("read", false),
      )
      .collect();
    for (const n of unread) await ctx.db.patch(n._id, { read: true });
    return null;
  },
});

/** Delete one of the caller's notifications. */
export const deleteNotification = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const n = await ctx.db.get(args.notificationId);
    if (n === null || n.userId !== me._id) {
      throw new Error("Notification not found");
    }
    await ctx.db.delete(n._id);
    return null;
  },
});
