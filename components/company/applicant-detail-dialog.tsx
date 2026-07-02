"use client";

import Link from "next/link";
import type { FunctionReturnType } from "convex/server";
import { ExternalLink, FileText, Lock, MapPin, Sparkles } from "lucide-react";
import type { api } from "@/convex/_generated/api";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { timeAgo } from "@/lib/format";
import {
  APPLICATION_STATUS_LABEL,
  applicationStatusTone,
} from "@/components/company/applicants-panel";
import {
  PRO_STAGES,
  type PipelineStage,
} from "@/components/company/pipeline-board";

const PIPELINE: PipelineStage[] = [
  "submitted",
  "reviewed",
  "interviewing",
  "offer",
  "rejected",
];

type Applicant = FunctionReturnType<
  typeof api.applications.getApplicantsForCompany
>[number];

/**
 * Full application detail for the company dashboard: candidate header,
 * stage controls, the complete status timeline, and the full cover letter.
 */
export function ApplicantDetailDialog({
  app,
  jobTitle,
  isPro,
  onMove,
  onOpenChange,
}: {
  app: Applicant | null;
  jobTitle: string;
  isPro: boolean;
  onMove: (
    applicationId: Applicant["_id"],
    status: PipelineStage,
  ) => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
}) {
  if (app === null) return null;

  // Rows that predate statusHistory synthesize the submission event.
  const events =
    app.statusHistory && app.statusHistory.length > 0
      ? app.statusHistory
      : [{ status: "submitted" as const, at: app.createdAt }];

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <UserAvatar
              name={app.applicant?.name ?? "Unknown"}
              src={app.applicant?.imageUrl}
              className="h-11 w-11"
            />
            <span className="min-w-0">
              <span className="block truncate">
                {app.applicant?.name ?? "Unknown applicant"}
              </span>
              <span className="block truncate text-sm font-normal text-muted-foreground">
                {app.applicant?.headline ?? ""}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Application meta + stage control */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 text-sm">
              <p className="truncate">
                Applied to <span className="font-medium">{jobTitle}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {timeAgo(app.createdAt)} · last update {timeAgo(app.updatedAt)}
              </p>
            </div>
            {app.status === "withdrawn" ? (
              <Badge
                className={`border-transparent ${applicationStatusTone(app.status)}`}
              >
                {APPLICATION_STATUS_LABEL[app.status]}
              </Badge>
            ) : (
              <Select
                value={app.status}
                onValueChange={async (v) => {
                  if (!v || v === app.status) return;
                  await onMove(app._id, v as PipelineStage);
                }}
              >
                <SelectTrigger className="h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE.map((s) => {
                    const locked = !isPro && PRO_STAGES.has(s);
                    return (
                      <SelectItem key={s} value={s} disabled={locked}>
                        {APPLICATION_STATUS_LABEL[s]}
                        {locked ? " — Pro" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Status timeline */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Application flow
            </p>
            <ol className="space-y-0">
              {events.map((e, i) => (
                <li key={`${e.status}-${e.at}`} className="flex gap-2.5">
                  <span className="flex flex-col items-center">
                    <span
                      className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${applicationStatusTone(e.status)}`}
                    />
                    {i < events.length - 1 && (
                      <span className="w-px flex-1 bg-border" />
                    )}
                  </span>
                  <span className="pb-3 text-sm">
                    <span className="font-medium">
                      {APPLICATION_STATUS_LABEL[e.status] ?? e.status}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {new Date(e.at).toLocaleString()} · {timeAgo(e.at)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Cover letter */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Cover letter
            </p>
            {app.coverNote ? (
              <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm leading-relaxed">
                {app.coverNote}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No cover letter provided.
              </p>
            )}
          </div>

          {/* Candidate context */}
          {app.profile?.location && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {app.profile.location}
              {app.profile.openToWork && (
                <Badge variant="outline" className="ml-1 font-normal">
                  Open to work
                </Badge>
              )}
            </p>
          )}

          {isPro ? (
            app.skills.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Skills
                </p>
                <div className="flex flex-wrap gap-1">
                  {app.skills.map((s) => (
                    <Badge key={s._id} variant="outline" className="font-normal">
                      {s.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Candidate skill insights are a Company Pro feature.
              <Lock className="h-3 w-3" />
            </p>
          )}

          {app.applicant && (
            <Button
              render={<Link href={`/in/${app.applicant.username}`} />}
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
            >
              <ExternalLink className="h-4 w-4" />
              View full profile
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
