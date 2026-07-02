"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Upload a picked file to Convex storage and return its storageId. */
export function useImageUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (file: File): Promise<Id<"_storage"> | null> => {
      if (!ACCEPTED.includes(file.type)) {
        toast.error("Use a PNG, JPEG, WebP, or GIF image");
        return null;
      }
      if (file.size > MAX_BYTES) {
        toast.error("Images must be 5MB or smaller");
        return null;
      }
      setUploading(true);
      try {
        const url = await generateUploadUrl();
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        const { storageId } = (await res.json()) as {
          storageId: Id<"_storage">;
        };
        return storageId;
      } catch {
        toast.error("Could not upload the image. Try again.");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [generateUploadUrl],
  );

  return { upload, uploading };
}

/**
 * A "change image" button + hidden file input. Uploads to Convex storage and
 * hands back the storageId; the parent decides which mutation to call.
 */
export function ImagePickerButton({
  label,
  onUploaded,
  onClear,
  hasImage,
  className,
  variant = "outline",
  size = "sm",
}: {
  label: string;
  onUploaded: (storageId: Id<"_storage">) => void | Promise<void>;
  /** Show a companion "remove" button when an image is set. */
  onClear?: () => void | Promise<void>;
  hasImage?: boolean;
  className?: string;
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "xs" | "default";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useImageUpload();
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const storageId = await upload(file);
    if (storageId === null) return;
    setBusy(true);
    try {
      await onUploaded(storageId);
    } finally {
      setBusy(false);
    }
  }

  const working = uploading || busy;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        className="gap-1.5"
        disabled={working}
        onClick={() => inputRef.current?.click()}
      >
        {working ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {label}
      </Button>
      {hasImage && onClear && (
        <Button
          type="button"
          variant="ghost"
          size={size === "default" ? "icon" : "icon-sm"}
          disabled={working}
          onClick={() => void onClear()}
          aria-label="Remove image"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
