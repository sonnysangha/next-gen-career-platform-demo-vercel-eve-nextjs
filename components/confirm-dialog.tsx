"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

/**
 * Destructive-action confirmation.
 *
 * Uncontrolled: pass `renderTrigger` and the dialog manages its own state.
 * Controlled: pass `open` + `onOpenChange` (needed when the trigger lives in
 * a menu that unmounts on close).
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  renderTrigger,
  open: controlledOpen,
  onOpenChange,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  renderTrigger?: (open: () => void) => React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChange?.(next);
    else setUncontrolledOpen(next);
  };

  return (
    <>
      {renderTrigger?.(() => setOpen(true))}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Working…" : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
