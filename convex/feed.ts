import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getUserByIdentity, authorSummaryValidator, postDocValidator } from "./model";
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

/** Create a post authored by the current user. Defaults kind to "update". */
export const createPost = mutation({
  args: {
    content: v.string(),
    kind: v.optional(
      v.union(
        v.literal("update"),
        v.literal("hiring"),
        v.literal("hot_take"),
        v.literal("launch"),
      ),
    ),
    imageUrl: v.optional(v.string()),
  },
  returns: v.id("posts"),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    return await ctx.db.insert("posts", {
      authorId: me._id,
      content: args.content,
      imageUrl: args.imageUrl,
      kind: args.kind ?? "update",
      likeCount: 0,
      commentCount: 0,
    });
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
    return commentId;
  },
});

const commentItemValidator = v.object({
  _id: v.id("comments"),
  _creationTime: v.number(),
  postId: v.id("posts"),
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
        content: c.content,
        author: await authorSummary(ctx, c.authorId),
      }))
    );
  },
});
