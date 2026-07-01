"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const KINDS = [
  { value: "update", label: "Update" },
  { value: "hiring", label: "Hiring" },
  { value: "hot_take", label: "Hot take" },
  { value: "launch", label: "Launch" },
];

export function PostComposer({
  currentUser,
}: {
  currentUser: { name: string; imageUrl?: string | null } | null;
}) {
  const createPost = useMutation(api.feed.createPost);
  const [content, setContent] = useState("");
  const [kind, setKind] = useState("update");
  const [posting, setPosting] = useState(false);

  async function onPost() {
    const text = content.trim();
    if (!text) return;
    setPosting(true);
    try {
      await createPost({ content: text, kind: kind as never });
      setContent("");
      setKind("update");
      toast.success("Posted to your network");
    } catch {
      toast.error("Could not post. Try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex gap-3">
        <UserAvatar
          name={currentUser?.name ?? "You"}
          src={currentUser?.imageUrl}
        />
        <div className="min-w-0 flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share an update, a win, or a hot take…"
            className="min-h-20 resize-none border-0 bg-muted/40 focus-visible:ring-0"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <Select value={kind} onValueChange={(v) => setKind(v ?? "update")}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={onPost}
              disabled={posting || !content.trim()}
              className="gap-1.5"
            >
              <PenLine className="h-4 w-4" />
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
