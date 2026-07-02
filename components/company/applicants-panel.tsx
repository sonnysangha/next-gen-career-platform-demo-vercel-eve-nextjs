"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { toast } from "sonner";
import { Columns3, Eye, EyeOff, Lock, Rows3, Sparkles, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { UserAvatar } from "@/components/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";
import { useCompanyPro } from "@/lib/use-billing";
import {
  PipelineBoard,
  type PipelineStage,
} from "@/components/company/pipeline-board";

const PIPELINE = [
  "submitted",
  "reviewed",
  "interviewing",
  "offer",
  "rejected",
] as const;

/** Pipeline stages that require the Company Pro (org) plan. */
const PRO_STAGES = new Set<string>(["interviewing", "offer"]);

export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  reviewed: "Reviewed",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function applicationStatusTone(status: string): string {
  switch (status) {
    case "offer":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    case "interviewing":
      return "bg-primary/15 text-primary";
    case "reviewed":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "rejected":
    case "withdrawn":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

/** Applicant review panel for the company dashboard. */
export function ApplicantsPanel({
  companyId,
  jobs,
  lockedJobId,
}: {
  companyId: Id<"companies">;
  jobs: { _id: Id<"jobs">; title: string }[];
  // When set, the panel only shows this job's applicants and the job filter
  // is hidden (used by the per-job full page).
  lockedJobId?: Id<"jobs">;
}) {
  const router = useRouter();
  // Billing-API-backed check — the pipeline is a Company Pro (org) feature.
  const { isPro } = useCompanyPro();
  const [jobFilter, setJobFilter] = useState<string>(
    lockedJobId ? (lockedJobId as string) : "all",
  );
  const [view, setView] = useState<"board" | "list">("board");
  const [showRejected, setShowRejected] = useState(false);
  const effectiveJobId = lockedJobId ?? (jobFilter === "all" ? undefined : (jobFilter as Id<"jobs">));
  const applicants = useQuery(api.applications.getApplicantsForCompany, {
    companyId,
    jobId: effectiveJobId,
  });
  const updateStatus = useAction(api.applications.updateStatus);

  const jobTitle = new Map(jobs.map((j) => [j._id as string, j.title]));

  // Rejected/withdrawn are hidden by default to keep the pipeline focused.
  const closedCount = (applicants ?? []).filter(
    (a) => a.status === "rejected" || a.status === "withdrawn",
  ).length;
  const visibleApplicants = (applicants ?? []).filter(
    (a) =>
      showRejected || (a.status !== "rejected" && a.status !== "withdrawn"),
  );

  const moveTo = async (
    applicationId: Id<"applications">,
    status: PipelineStage,
  ) => {
    try {
      await updateStatus({ applicationId, status });
      toast.success(`Moved to ${APPLICATION_STATUS_LABEL[status]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Users className="h-4 w-4 text-muted-foreground" />
          Applicants
          {applicants !== undefined && (
            <Badge variant="secondary">{applicants.length}</Badge>
          )}
          {!isPro && (
            <Badge variant="outline" className="gap-1 font-normal">
              <Lock className="h-3 w-3" />
              Free: review &amp; reject only
            </Badge>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="xs"
            className="gap-1"
            onClick={() => setShowRejected((s) => !s)}
            aria-pressed={showRejected}
          >
            {showRejected ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {showRejected ? "Hide rejected" : "Show rejected"}
            {!showRejected && closedCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1 font-normal">
                {closedCount}
              </Badge>
            )}
          </Button>
          {!lockedJobId && (
            <Select value={jobFilter} onValueChange={(v) => setJobFilter(v ?? "all")}>
              <SelectTrigger className="h-8 w-52">
                <SelectValue placeholder="All jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All jobs</SelectItem>
                {jobs.map((j) => (
                  <SelectItem key={j._id} value={j._id}>
                    {j.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex rounded-md border p-0.5">
            <Button
              variant={view === "board" ? "secondary" : "ghost"}
              size="xs"
              className="gap-1"
              onClick={() => setView("board")}
              aria-pressed={view === "board"}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Board
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="xs"
              className="gap-1"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
            >
              <Rows3 className="h-3.5 w-3.5" />
              List
            </Button>
          </div>
        </div>
      </div>

      {applicants === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : applicants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No applicants yet"
          description="Applications to your open roles will show up here."
        />
      ) : view === "board" ? (
        <PipelineBoard
          applicants={visibleApplicants.filter((a) => a.status !== "withdrawn")}
          jobTitle={jobTitle}
          isPro={isPro}
          showRejected={showRejected}
          onMove={moveTo}
          onOpen={(id) => router.push(`/company/applicants/${id}`)}
        />
      ) : visibleApplicants.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          All applicants here are rejected or withdrawn — use “Show rejected”
          to see them.
        </p>
      ) : (
        <div className="space-y-3">
          {visibleApplicants.map((app) => (
            <div
              key={app._id}
              className="cursor-pointer rounded-lg border p-3 transition-colors hover:border-primary/40"
              onClick={() => router.push(`/company/applicants/${app._id}`)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link
                  href={app.applicant ? `/in/${app.applicant.username}` : "#"}
                  className="flex min-w-0 items-center gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <UserAvatar
                    name={app.applicant?.name ?? "Unknown"}
                    src={app.applicant?.imageUrl}
                    className="h-10 w-10"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium hover:underline">
                      {app.applicant?.name ?? "Unknown"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {app.applicant?.headline ?? ""}
                    </p>
                  </div>
                </Link>
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Badge
                    className={`border-transparent ${applicationStatusTone(app.status)}`}
                  >
                    {APPLICATION_STATUS_LABEL[app.status] ?? app.status}
                  </Badge>
                  <Select
                    value={app.status}
                    onValueChange={async (v) => {
                      if (!v || v === app.status) return;
                      try {
                        await updateStatus({
                          applicationId: app._id,
                          status: v as (typeof PIPELINE)[number],
                        });
                        toast.success("Applicant updated");
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
                </div>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Applied to{" "}
                <span className="font-medium text-foreground">
                  {jobTitle.get(app.jobId as string) ?? "a role"}
                </span>{" "}
                · {timeAgo(app.createdAt)}
              </p>

              {app.coverNote && (
                <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-2.5 text-sm">
                  {app.coverNote}
                </p>
              )}

              {isPro ? (
                app.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {app.skills.slice(0, 8).map((s) => (
                      <Badge key={s._id} variant="outline" className="font-normal">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                )
              ) : (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Candidate skill insights are a Company Pro feature.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

    </section>
  );
}
