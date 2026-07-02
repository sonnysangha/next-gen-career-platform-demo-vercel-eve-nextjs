import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  getUserByIdentity,
  getProfileForUser,
  assertCompanyAdmin,
} from "./model";

/**
 * Image uploads flow through Convex file storage:
 *   1. client calls generateUploadUrl → POSTs the file to it → gets storageId
 *   2. client calls one of the set* mutations below with that storageId
 * Each set* mutation resolves the public URL, patches the target document,
 * and deletes the previously-uploaded file (if any) so storage doesn't leak.
 */

/** Short-lived URL the client POSTs an image file to. Auth required. */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

/** Resolve a storage id to its public URL or throw if the upload is missing. */
async function urlFor(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
): Promise<string> {
  const url = await ctx.storage.getUrl(storageId);
  if (url === null) throw new Error("Uploaded file not found");
  return url;
}

/** Delete a previously-uploaded file, ignoring already-deleted files. */
async function deleteOld(
  ctx: MutationCtx,
  storageId: Id<"_storage"> | undefined,
): Promise<void> {
  if (storageId === undefined) return;
  try {
    await ctx.storage.delete(storageId);
  } catch {
    // already gone — nothing to clean up
  }
}

/** Set (or clear) the current user's avatar. */
export const setMyAvatar = mutation({
  args: { storageId: v.optional(v.id("_storage")) },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    await deleteOld(ctx, me.imageStorageId);
    if (args.storageId === undefined) {
      await ctx.db.patch(me._id, {
        imageUrl: undefined,
        imageStorageId: undefined,
      });
      return null;
    }
    const url = await urlFor(ctx, args.storageId);
    await ctx.db.patch(me._id, {
      imageUrl: url,
      imageStorageId: args.storageId,
    });
    return url;
  },
});

/** Set (or clear) the current user's profile cover image. */
export const setMyProfileCover = mutation({
  args: { storageId: v.optional(v.id("_storage")) },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const profile = await getProfileForUser(ctx, me._id);
    if (profile === null) throw new Error("Profile not found");
    await deleteOld(ctx, profile.coverImageStorageId);
    if (args.storageId === undefined) {
      await ctx.db.patch(profile._id, {
        coverImageUrl: undefined,
        coverImageStorageId: undefined,
      });
      return null;
    }
    const url = await urlFor(ctx, args.storageId);
    await ctx.db.patch(profile._id, {
      coverImageUrl: url,
      coverImageStorageId: args.storageId,
    });
    return url;
  },
});

/** Set (or clear) a company's logo. Caller must administer the company. */
export const setCompanyLogo = mutation({
  args: {
    companyId: v.id("companies"),
    storageId: v.optional(v.id("_storage")),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const { company } = await assertCompanyAdmin(ctx, args.companyId);
    await deleteOld(ctx, company.logoStorageId);
    if (args.storageId === undefined) {
      await ctx.db.patch(company._id, {
        logoUrl: undefined,
        logoStorageId: undefined,
      });
      return null;
    }
    const url = await urlFor(ctx, args.storageId);
    await ctx.db.patch(company._id, {
      logoUrl: url,
      logoStorageId: args.storageId,
    });
    return url;
  },
});

/** Set (or clear) a company's cover image. Caller must administer it. */
export const setCompanyCover = mutation({
  args: {
    companyId: v.id("companies"),
    storageId: v.optional(v.id("_storage")),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const { company } = await assertCompanyAdmin(ctx, args.companyId);
    await deleteOld(ctx, company.coverImageStorageId);
    if (args.storageId === undefined) {
      await ctx.db.patch(company._id, {
        coverImageUrl: undefined,
        coverImageStorageId: undefined,
      });
      return null;
    }
    const url = await urlFor(ctx, args.storageId);
    await ctx.db.patch(company._id, {
      coverImageUrl: url,
      coverImageStorageId: args.storageId,
    });
    return url;
  },
});
