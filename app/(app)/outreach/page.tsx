"use client";

import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { MessagesSquare, Mail, Send, Trash2, Copy } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AiActionButton } from "@/components/ai/ai-action-button";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AI_FEATURES } from "@/lib/ai-features";
import { timeAgo } from "@/lib/format";

export default function OutreachPage() {
  const { has } = useAuth();
  const drafts = useQuery(api.drafts.getMyOutreachDrafts, {});
  const deleteDraft = useMutation(api.drafts.deleteOutreachDraft);
  const outreachLocked = !(has?.({ feature: AI_FEATURES.outreach_writer }) ?? false);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Outreach</h1>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Send className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Draft recruiter outreach with AI</p>
            <p className="text-sm text-muted-foreground">
              Generate a tailored connection note and recruiter DM for a role.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <AiActionButton
            locked={outreachLocked}
            label="Draft outreach with AI"
            prompt="Draft outreach to a recruiter for one of my saved jobs — a short connection message and a longer recruiter DM."
            lockedTitle="AI Outreach Writer"
            lockedDescription="Generate a tailored connection note and recruiter DM, then approve before saving."
          />
        </div>
      </div>

      <h2 className="pt-2 text-sm font-medium text-muted-foreground">
        Your drafts
      </h2>

      {drafts === undefined ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No outreach drafts yet"
          description="Use the AI Outreach Writer to create your first draft."
        />
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => (
            <div key={d._id} className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <Badge variant={d.status === "saved" ? "default" : "secondary"}>
                  {d.status}
                </Badge>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(d.createdAt)}
                  </span>
                  <ConfirmDialog
                    title="Delete this draft?"
                    description="The outreach draft will be permanently removed."
                    onConfirm={async () => {
                      try {
                        await deleteDraft({ draftId: d._id });
                        toast.success("Draft deleted");
                      } catch {
                        toast.error("Could not delete the draft");
                      }
                    }}
                    renderTrigger={(open) => (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={open}
                        aria-label="Delete draft"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  />
                </div>
              </div>
              {d.subject && (
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {d.subject}
                </p>
              )}
              <div className="space-y-2 text-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Connection message</p>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Copy connection message"
                      onClick={async () => {
                        await navigator.clipboard.writeText(d.connectionMessage);
                        toast.success("Copied to clipboard");
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="whitespace-pre-wrap">{d.connectionMessage}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Recruiter DM</p>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Copy recruiter DM"
                      onClick={async () => {
                        await navigator.clipboard.writeText(d.recruiterDm);
                        toast.success("Copied to clipboard");
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="whitespace-pre-wrap">{d.recruiterDm}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
