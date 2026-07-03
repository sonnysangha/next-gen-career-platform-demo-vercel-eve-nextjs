"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ThumbsUp,
  MessageSquare,
  Send,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { UserAvatar } from "@/components/user-avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  hiring: "Hiring",
  hot_take: "Hot take",
  launch: "Launch",
  update: "Update",
};

/* Post-kind chips carry the landing palette: blue for hiring,
   apricot for hot takes, green for launches. */
const KIND_TONE: Record<string, string> = {
  hiring: "bg-primary/10 text-primary",
  hot_take: "bg-apricot/30 text-ink dark:bg-apricot/20 dark:text-apricot",
  launch: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

type FeedPost = {
  _id: Id<"posts">;
  _creationTime: number;
  authorId: Id<"users">;
  content: string;
  imageUrl?: string;
  editedAt?: number;
  kind: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  author: {
    _id: Id<"users">;
    name: string;
    username: string;
    imageUrl: string | null;
    headline: string | null;
  } | null;
};

export function PostCard({
  post,
  currentUserId,
}: {
  post: FeedPost;
  currentUserId?: Id<"users"> | null;
}) {
  const toggleLike = useMutation(api.feed.toggleLike);
  const addComment = useMutation(api.feed.addComment);
  const updatePost = useMutation(api.feed.updatePost);
  const deletePost = useMutation(api.feed.deletePost);
  const deleteComment = useMutation(api.feed.deleteComment);

  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Lazily fetch comments only when the section is open.
  const comments = useQuery(
    api.feed.getComments,
    showComments ? { postId: post._id } : "skip"
  );

  const isMine = currentUserId != null && currentUserId === post.authorId;

  async function onLike() {
    setLiked((v) => !v);
    setLikeCount((c) => c + (liked ? -1 : 1));
    try {
      await toggleLike({ postId: post._id });
    } catch {
      setLiked(post.likedByMe);
      setLikeCount(post.likeCount);
    }
  }

  async function onComment() {
    const text = comment.trim();
    if (!text) return;
    setComment("");
    setCommentCount((c) => c + 1);
    // keep the section open so the new comment appears (Convex is reactive)
    await addComment({ postId: post._id, content: text });
  }

  async function saveEdit() {
    const text = editText.trim();
    if (!text) return;
    setSavingEdit(true);
    try {
      await updatePost({ postId: post._id, content: text });
      setEditing(false);
      toast.success("Post updated");
    } catch {
      toast.error("Could not update the post");
    } finally {
      setSavingEdit(false);
    }
  }

  const author = post.author;

  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <Link href={author ? `/in/${author.username}` : "#"}>
          <UserAvatar name={author?.name ?? "Unknown"} src={author?.imageUrl} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={author ? `/in/${author.username}` : "#"}
              className="truncate font-medium hover:underline"
            >
              {author?.name ?? "Unknown"}
            </Link>
            {post.kind !== "update" && (
              <Badge
                variant="secondary"
                className={cn("shrink-0 text-[10px]", KIND_TONE[post.kind])}
              >
                {KIND_LABEL[post.kind] ?? post.kind}
              </Badge>
            )}
          </div>
          {author?.headline && (
            <p className="truncate text-xs text-muted-foreground">
              {author.headline}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {timeAgo(post._creationTime)}
            {post.editedAt !== undefined && " · edited"}
          </p>
        </div>

        {isMine && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Post options"
                />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditText(post.content);
                  setEditing(true);
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit post
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Controlled: the trigger lives in the dropdown, which unmounts on close. */}
      <ConfirmDialog
        title="Delete this post?"
        description="The post, its comments, and likes will be permanently removed."
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={async () => {
          try {
            await deletePost({ postId: post._id });
            toast.success("Post deleted");
          } catch {
            toast.error("Could not delete the post");
          }
        }}
      />

      {editing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="min-h-20"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={saveEdit} disabled={savingEdit || !editText.trim()}>
              {savingEdit ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
          {post.content}
        </p>
      )}

      {post.imageUrl && !editing && (
        <div className="mt-3 overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt=""
            loading="lazy"
            className="max-h-[28rem] w-full object-cover"
          />
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 border-t pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLike}
          className={cn("gap-1.5", liked && "text-primary")}
        >
          <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} />
          {likeCount > 0 ? likeCount : "Like"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments((v) => !v)}
          className="gap-1.5"
        >
          <MessageSquare className="h-4 w-4" />
          {commentCount > 0 ? commentCount : "Comment"}
        </Button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-3 border-t pt-3">
          {/* Add a comment */}
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onComment();
              }}
              placeholder="Add a comment…"
              className="h-9"
            />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={onComment}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Existing comments */}
          {comments === undefined ? (
            <p className="text-xs text-muted-foreground">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No comments yet. Be the first.
            </p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => {
                const canDelete =
                  currentUserId != null &&
                  (c.authorId === currentUserId || isMine);
                return (
                  <div key={c._id} className="group flex gap-2">
                    <Link href={c.author ? `/in/${c.author.username}` : "#"}>
                      <UserAvatar
                        name={c.author?.name ?? "Unknown"}
                        src={c.author?.imageUrl}
                        className="h-8 w-8"
                      />
                    </Link>
                    <div className="min-w-0 flex-1 rounded-lg bg-muted/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={c.author ? `/in/${c.author.username}` : "#"}
                          className="truncate text-sm font-medium hover:underline"
                        >
                          {c.author?.name ?? "Unknown"}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(c._creationTime)}
                        </span>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await deleteComment({ commentId: c._id });
                                setCommentCount((n) => Math.max(0, n - 1));
                              } catch {
                                toast.error("Could not delete the comment");
                              }
                            }}
                            className="ml-auto rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                            aria-label="Delete comment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{c.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
