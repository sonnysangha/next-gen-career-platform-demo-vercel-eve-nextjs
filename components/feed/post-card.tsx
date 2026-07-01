"use client";

import { useState } from "react";
import Link from "next/link";
import { ThumbsUp, MessageSquare, Send } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  hiring: "Hiring",
  hot_take: "Hot take",
  launch: "Launch",
  update: "Update",
};

type FeedPost = {
  _id: Id<"posts">;
  _creationTime: number;
  content: string;
  imageUrl?: string;
  kind: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  author: {
    name: string;
    username: string;
    imageUrl: string | null;
    headline: string | null;
  } | null;
};

export function PostCard({ post }: { post: FeedPost }) {
  const toggleLike = useMutation(api.feed.toggleLike);
  const addComment = useMutation(api.feed.addComment);

  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");

  // Lazily fetch comments only when the section is open.
  const comments = useQuery(
    api.feed.getComments,
    showComments ? { postId: post._id } : "skip"
  );

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
              <Badge variant="secondary" className="shrink-0 text-[10px]">
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
          </p>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
        {post.content}
      </p>

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
              {comments.map((c) => (
                <div key={c._id} className="flex gap-2">
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
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
