import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  getUserByIdentity,
  getProfileForUser,
  baseUsernameFrom,
  uniqueUsername,
  userDocValidator,
  profileDocValidator,
} from "./model";

/**
 * Current user + their profile, or null when signed out / not yet synced.
 * Read this once on app load; call upsertCurrentUser to lazily create the row.
 */
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      user: userDocValidator,
      profile: v.union(profileDocValidator, v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const user = await getUserByIdentity(ctx);
    if (user === null) return null;
    const profile = await getProfileForUser(ctx, user._id);
    return { user, profile };
  },
});

/**
 * Idempotently create a users row (and an empty-ish profile) from the Clerk
 * identity. Safe to call on every sign-in. Returns the users doc.
 */
export const upsertCurrentUser = mutation({
  args: {},
  returns: userDocValidator,
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    // Derive best-effort name/email/image from the identity token claims.
    const name =
      identity.name ??
      (typeof identity.givenName === "string" ? identity.givenName : null) ??
      identity.nickname ??
      "New Member";
    const email = identity.email ?? `${identity.subject}@users.noreply`;
    const imageUrl =
      typeof identity.pictureUrl === "string" ? identity.pictureUrl : undefined;

    if (existing !== null) {
      // Keep name/email/image fresh from Clerk, but never touch username/slug.
      const patch: {
        name?: string;
        email?: string;
        imageUrl?: string;
      } = {};
      if (existing.name !== name) patch.name = name;
      if (existing.email !== email) patch.email = email;
      // Don't clobber a custom-uploaded avatar (imageStorageId set) with the
      // Clerk profile picture.
      if (
        imageUrl !== undefined &&
        existing.imageStorageId === undefined &&
        existing.imageUrl !== imageUrl
      ) {
        patch.imageUrl = imageUrl;
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }
      const refreshed = await ctx.db.get(existing._id);
      if (refreshed === null) throw new Error("User vanished during upsert");
      return refreshed;
    }

    const username = await uniqueUsername(ctx, baseUsernameFrom(email, name));
    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name,
      email,
      imageUrl,
      username,
      createdAt: now,
    });

    // Seed an empty-ish profile so the UI always has a row to edit.
    await ctx.db.insert("profiles", {
      userId,
      headline: "",
      about: "",
      location: "",
      targetRole: undefined,
      openToWork: false,
      coverImageUrl: undefined,
    });

    const created = await ctx.db.get(userId);
    if (created === null) throw new Error("Failed to create user");
    return created;
  },
});
