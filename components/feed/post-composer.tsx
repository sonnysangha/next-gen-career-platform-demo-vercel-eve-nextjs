"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, PenLine, X } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { UserAvatar } from "@/components/user-avatar";
import { useImageUpload } from "@/components/image-input";
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
  const { upload, uploading } = useImageUpload();
  const fileRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState("");
  const [kind, setKind] = useState("update");
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const [posting, setPosting] = useState(false);

  function pickImage(file: File | undefined) {
    if (!file) return;
    if (image) URL.revokeObjectURL(image.preview);
    setImage({ file, preview: URL.createObjectURL(file) });
  }

  function clearImage() {
    if (image) URL.revokeObjectURL(image.preview);
    setImage(null);
  }

  async function onPost() {
    const text = content.trim();
    if (!text) return;
    setPosting(true);
    try {
      let imageStorageId;
      if (image) {
        imageStorageId = (await upload(image.file)) ?? undefined;
        if (imageStorageId === undefined) return; // upload error already toasted
      }
      await createPost({ content: text, kind: kind as never, imageStorageId });
      setContent("");
      setKind("update");
      clearImage();
      toast.success("Posted to your network");
    } catch {
      toast.error("Could not post. Try again.");
    } finally {
      setPosting(false);
    }
  }

  const busy = posting || uploading;

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
            className="min-h-20 resize-none rounded-2xl border-0 bg-muted/50 focus-visible:ring-0"
          />

          {image && (
            <div className="relative mt-2 overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.preview}
                alt="Attached"
                className="max-h-72 w-full object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Select value={kind} onValueChange={(v) => setKind(v ?? "update")}>
                <SelectTrigger className="h-9 w-36 rounded-full">
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
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  pickImage(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileRef.current?.click()}
                aria-label="Add image"
                disabled={busy}
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={onPost}
              disabled={busy || !content.trim()}
              className="gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PenLine className="h-4 w-4" />
              )}
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
