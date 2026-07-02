"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Check, Send, Undo2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * Apply / withdraw control for a job. Shows an optimistic "Applied" state;
 * Convex reactivity keeps it correct across pages.
 */
export function ApplyButton({
  jobId,
  jobTitle,
  companyName,
  appliedByMe,
  closed,
}: {
  jobId: Id<"jobs">;
  jobTitle: string;
  companyName: string;
  appliedByMe: boolean;
  closed?: boolean;
}) {
  const apply = useMutation(api.applications.apply);
  const withdraw = useMutation(api.applications.withdraw);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (closed) {
    return (
      <Button disabled className="w-full">
        This job is closed
      </Button>
    );
  }

  if (appliedByMe) {
    return (
      <div className="flex items-center gap-2">
        <Button disabled variant="secondary" className="flex-1 gap-1.5">
          <Check className="h-4 w-4" />
          Applied
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await withdraw({ jobId });
              toast.success("Application withdrawn");
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Could not withdraw",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Undo2 className="h-4 w-4" />
          Withdraw
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button className="w-full gap-1.5" onClick={() => setOpen(true)}>
        <Send className="h-4 w-4" />
        Apply now
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply to {jobTitle}</DialogTitle>
            <DialogDescription>
              Your profile is shared with {companyName} along with an optional
              note.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2">
            <Label htmlFor="apply-note">Note to the hiring team (optional)</Label>
            <Textarea
              id="apply-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-28"
              placeholder="Why you're a great fit for this role…"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              className="gap-1.5"
              onClick={async () => {
                setBusy(true);
                try {
                  await apply({ jobId, coverNote: note.trim() || undefined });
                  toast.success("Application sent 🎉");
                  setOpen(false);
                  setNote("");
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Could not apply",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Send className="h-4 w-4" />
              {busy ? "Sending…" : "Submit application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
