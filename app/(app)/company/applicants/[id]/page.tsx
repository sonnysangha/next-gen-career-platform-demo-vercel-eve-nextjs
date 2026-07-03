"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Lock,
  MapPin,
  Sparkles,
  UserRound,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { UserAvatar } from "@/components/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { timeAgo } from "@/lib/format";
import { useCompanyPro } from "@/lib/use-billing";
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

/** Full application detail for one applicant, company-admin only. */
export default function ApplicantDetailPage() {
  const { id } = useParams<{ id: string }>();
  // Billing-API-backed check — the pipeline is a Company Pro (org) feature.
  const { isPro } = useCompanyPro();
  const app = useQuery(api.applications.getApplicantDetail, {
    applicationId: id as Id<"applications">,
  });
  const updateStatus = useAction(api.applications.updateStatus);

  if (app === undefined) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }
  if (app === null) {
    return (
      <EmptyState
        icon={UserRound}
        title="Application not found"
        description="It may have been removed, or you don't manage this company."
      />
    );
  }

  // Rows that predate statusHistory synthesize the submission event.
  const events =
    app.statusHistory && app.statusHistory.length > 0
      ? app.statusHistory
      : [{ status: "submitted" as const, at: app.createdAt }];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button
        render={<Link href="/company" />}
        variant="ghost"
        size="sm"
        className="gap-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Button>

      {/* Candidate header */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar
              name={app.applicant?.name ?? "Unknown"}
              src={app.applicant?.imageUrl}
              className="h-14 w-14"
            />
            <div className="min-w-0">
              <h1 className="truncate font-heading text-xl font-semibold tracking-tight">
                {app.applicant?.name ?? "Unknown applicant"}
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {app.applicant?.headline ?? ""}
              </p>
              {app.profile?.location && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {app.profile.location}
                  {app.profile.openToWork && (
                    <Badge variant="outline" className="ml-1 font-normal">
                      Open to work
                    </Badge>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {app.applicant && (
              <Button
                render={<Link href={`/in/${app.applicant.username}`} />}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <ExternalLink className="h-4 w-4" />
                View profile
              </Button>
            )}
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
                  try {
                    await updateStatus({
                      applicationId: app._id,
                      status: v as PipelineStage,
                    });
                    toast.success(
                      `Moved to ${APPLICATION_STATUS_LABEL[v] ?? v}`,
                    );
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Update failed",
                    );
                  }
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
        </div>
        <p className="mt-3 text-sm">
          Applied to{" "}
          <span className="font-medium">{app.job?.title ?? "a role"}</span>
          <span className="text-muted-foreground">
            {" "}
            · {timeAgo(app.createdAt)} · last update {timeAgo(app.updatedAt)}
          </span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_16rem]">
        {/* Cover letter */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Cover letter
          </h2>
          {app.coverNote ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {app.coverNote}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No cover letter provided.
            </p>
          )}

          <h2 className="mb-3 mt-6 flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Skills
          </h2>
          {isPro ? (
            app.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {app.skills.map((s) => (
                  <Badge key={s._id} variant="outline" className="font-normal">
                    {s.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No skills listed.</p>
            )
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Candidate skill insights are a Company Pro feature.
            </p>
          )}
        </section>

        {/* Application flow */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-heading text-lg font-semibold tracking-tight">
            Application flow
          </h2>
          <ol>
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
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {new Date(e.at).toLocaleDateString()} · {timeAgo(e.at)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
