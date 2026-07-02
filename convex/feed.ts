import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  getUserByIdentity,
  notify,
  authorSummaryValidator,
  postDocValidator,
} from "./model";
import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";

const feedItemValidator = v.object({
  ...postDocValidator.fields,
  author: v.union(authorSummaryValidator, v.null()),
  likedByMe: v.boolean(),
});

/** Build the embedded author summary for a post's author. */
async function authorSummary(ctx: QueryCtx, authorId: Id<"users">) {
  const author = await ctx.db.get(authorId);
  if (author === null) return null;
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", author._id))
    .unique();
  return {
    _id: author._id,
    name: author.name,
    username: author.username,
    imageUrl: author.imageUrl ?? null,
    headline: profile?.headline ?? null,
  };
}

/**
 * Newest posts first, each enriched with an author summary and whether the
 * current user liked it. Uses the built-in by_creation_time index.
 */
export const getFeed = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(feedItemValidator),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_creation_time")
      .order("desc")
      .take(args.limit ?? 20);

    const items = await Promise.all(
      posts.map(async (post: Doc<"posts">) => {
        const author = await authorSummary(ctx, post.authorId);
        let likedByMe = false;
        if (me !== null) {
          const like = await ctx.db
            .query("likes")
            .withIndex("by_post_and_user", (q) =>
              q.eq("postId", post._id).eq("userId", me._id),
            )
            .unique();
          likedByMe = like !== null;
        }
        return { ...post, author, likedByMe };
      }),
    );
    return items;
  },
});

const kindValidator = v.union(
  v.literal("update"),
  v.literal("hiring"),
  v.literal("hot_take"),
  v.literal("launch"),
);

/** Create a post authored by the current user. Defaults kind to "update". */
export const createPost = mutation({
  args: {
    content: v.string(),
    kind: v.optional(kindValidator),
    // Image uploaded via files.generateUploadUrl; resolved to a URL here.
    imageStorageId: v.optional(v.id("_storage")),
  },
  returns: v.id("posts"),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    let imageUrl: string | undefined;
    if (args.imageStorageId !== undefined) {
      const url = await ctx.storage.getUrl(args.imageStorageId);
      if (url === null) throw new Error("Uploaded image not found");
      imageUrl = url;
    }
    return await ctx.db.insert("posts", {
      authorId: me._id,
      content: args.content,
      imageUrl,
      imageStorageId: args.imageStorageId,
      kind: args.kind ?? "update",
      likeCount: 0,
      commentCount: 0,
    });
  },
});

/** Edit the caller's own post (content/kind; optionally replace the image). */
export const updatePost = mutation({
  args: {
    postId: v.id("posts"),
    content: v.string(),
    kind: v.optional(kindValidator),
    // undefined == keep current image; null == remove; storageId == replace
    imageStorageId: v.optional(v.union(v.id("_storage"), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const post = await ctx.db.get(args.postId);
    if (post === null || post.authorId !== me._id) {
      throw new Error("Not authorized to edit this post");
    }
    const content = args.content.trim();
    if (content.length === 0) throw new Error("Post can't be empty");

    const patch: Partial<Doc<"posts">> = {
      content,
      editedAt: Date.now(),
      ...(args.kind !== undefined ? { kind: args.kind } : {}),
    };

    if (args.imageStorageId !== undefined) {
      // Replace or remove: delete the old uploaded file either way.
      if (post.imageStorageId !== undefined) {
        try {
          await ctx.storage.delete(post.imageStorageId);
        } catch {
          // already gone
        }
      }
      if (args.imageStorageId === null) {
        patch.imageUrl = undefined;
        patch.imageStorageId = undefined;
      } else {
        const url = await ctx.storage.getUrl(args.imageStorageId);
        if (url === null) throw new Error("Uploaded image not found");
        patch.imageUrl = url;
        patch.imageStorageId = args.imageStorageId;
      }
    }

    await ctx.db.patch(post._id, patch);
    return null;
  },
});

/** Delete the caller's own post, its comments, likes, and uploaded image. */
export const deletePost = mutation({
  args: { postId: v.id("posts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const post = await ctx.db.get(args.postId);
    if (post === null || post.authorId !== me._id) {
      throw new Error("Not authorized to delete this post");
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", post._id))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);

    // likes has no by_post-only index; by_post_and_user is prefixed by postId.
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_post_and_user", (q) => q.eq("postId", post._id))
      .collect();
    for (const l of likes) await ctx.db.delete(l._id);

    if (post.imageStorageId !== undefined) {
      try {
        await ctx.storage.delete(post.imageStorageId);
      } catch {
        // already gone
      }
    }

    await ctx.db.delete(post._id);
    return null;
  },
});

/**
 * Like / unlike a post for the current user and keep likeCount in sync.
 * Returns the resulting liked state.
 */
export const toggleLike = mutation({
  args: { postId: v.id("posts") },
  returns: v.object({ liked: v.boolean() }),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (post === null) throw new Error("Post not found");

    const existing = await ctx.db
      .query("likes")
      .withIndex("by_post_and_user", (q) =>
        q.eq("postId", args.postId).eq("userId", me._id),
      )
      .unique();

    if (existing !== null) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.postId, {
        likeCount: Math.max(0, post.likeCount - 1),
      });
      return { liked: false };
    }

    await ctx.db.insert("likes", { postId: args.postId, userId: me._id });
    await ctx.db.patch(args.postId, { likeCount: post.likeCount + 1 });
    await notify(ctx, {
      userId: post.authorId,
      actorId: me._id,
      type: "like",
      message: `${me.name} liked your post`,
      postId: post._id,
    });
    return { liked: true };
  },
});

/** Add a comment to a post and keep commentCount in sync. */
export const addComment = mutation({
  args: { postId: v.id("posts"), content: v.string() },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (post === null) throw new Error("Post not found");

    const commentId = await ctx.db.insert("comments", {
      postId: args.postId,
      authorId: me._id,
      content: args.content,
    });
    await ctx.db.patch(args.postId, { commentCount: post.commentCount + 1 });
    await notify(ctx, {
      userId: post.authorId,
      actorId: me._id,
      type: "comment",
      message: `${me.name} commented on your post`,
      postId: post._id,
    });
    return commentId;
  },
});

/**
 * Delete a comment. Allowed for the comment's author or the post's author
 * (moderating your own post). Keeps commentCount in sync.
 */
export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const comment = await ctx.db.get(args.commentId);
    if (comment === null) throw new Error("Comment not found");
    const post = await ctx.db.get(comment.postId);
    const isMine = comment.authorId === me._id;
    const isMyPost = post !== null && post.authorId === me._id;
    if (!isMine && !isMyPost) {
      throw new Error("Not authorized to delete this comment");
    }
    await ctx.db.delete(comment._id);
    if (post !== null) {
      await ctx.db.patch(post._id, {
        commentCount: Math.max(0, post.commentCount - 1),
      });
    }
    return null;
  },
});

const commentItemValidator = v.object({
  _id: v.id("comments"),
  _creationTime: v.number(),
  postId: v.id("posts"),
  authorId: v.id("users"),
  content: v.string(),
  author: v.union(authorSummaryValidator, v.null()),
});

/** Comments for a post, oldest first, each with an author summary. */
export const getComments = query({
  args: { postId: v.id("posts") },
  returns: v.array(commentItemValidator),
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("asc")
      .collect();
    return await Promise.all(
      comments.map(async (c) => ({
        _id: c._id,
        _creationTime: c._creationTime,
        postId: c.postId,
        authorId: c.authorId,
        content: c.content,
        author: await authorSummary(ctx, c.authorId),
      }))
    );
  },
});
