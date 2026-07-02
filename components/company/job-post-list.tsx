"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FunctionReturnType } from "convex/server";
import { useQuery, useMutation, useAction } from "convex/react";
import { toast } from "sonner";
import {
  ChevronRight,
  CircleDot,
  CircleOff,
  Trash2,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { UserAvatar } from "@/components/user-avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { JobDialog } from "@/components/company/job-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSalary, seniorityLabel, workModeLabel, timeAgo } from "@/lib/format";
import {
  APPLICATION_STATUS_LABEL,
  applicationStatusTone,
} from "@/components/company/applicants-panel";

type CompanyJob = FunctionReturnType<typeof api.jobs.getCompanyJobs>[number];

/** How many applicants to preview inline before "View all". */
const PREVIEW_LIMIT = 4;

/** Job posts rendered as expandable accordions with an applicant preview. */
export function JobPostList({
  companyId,
  jobs,
}: {
  companyId: Id<"companies">;
  jobs: CompanyJob[];
}) {
  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <JobPostRow key={job._id} companyId={companyId} job={job} />
      ))}
    </div>
  );
}

function JobPostRow({
  companyId,
  job,
}: {
  companyId: Id<"companies">;
  job: CompanyJob;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const setJobStatus = useAction(api.jobs.setJobStatus);
  const deleteJob = useMutation(api.jobs.deleteJob);
  const closed = job.status === "closed";

  // Lazily load applicants only once the accordion is opened.
  const applicants = useQuery(
    api.applications.getApplicantsForCompany,
    open ? { companyId, jobId: job._id } : "skip",
  );
  const active = (applicants ?? []).filter((a) => a.status !== "withdrawn");
  const preview = active.slice(0, PREVIEW_LIMIT);

  return (
    <div className="rounded-lg border">
      {/* Accordion header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <ChevronRight
            className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              open ? "rotate-90" : ""
            }`}
          />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium">{job.title}</span>
              <Badge
                variant={closed ? "outline" : "secondary"}
                className="font-normal"
              >
                {closed ? "Closed" : "Open"}
              </Badge>
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {workModeLabel(job.workMode)} · {seniorityLabel(job.seniority)} ·{" "}
              {job.location} ·{" "}
              {formatSalary(job.salaryMin, job.salaryMax, job.currency)} ·
              posted {timeAgo(job.postedAt)} ago
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {job.applicantCount} applicant
              {job.applicantCount === 1 ? "" : "s"}
            </span>
          </span>
        </button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={async () => {
              try {
                await setJobStatus({
                  jobId: job._id,
                  status: closed ? "open" : "closed",
                });
                toast.success(closed ? "Job reopened" : "Job closed");
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Could not update the job",
                );
              }
            }}
          >
            {closed ? (
              <CircleDot className="h-4 w-4" />
            ) : (
              <CircleOff className="h-4 w-4" />
            )}
            {closed ? "Reopen" : "Close"}
          </Button>
          <JobDialog companyId={companyId} job={job} />
          <ConfirmDialog
            title="Delete this job?"
            description={`"${job.title}" and all of its applications will be permanently removed.`}
            onConfirm={async () => {
              try {
                await deleteJob({ jobId: job._id });
                toast.success("Job deleted");
              } catch {
                toast.error("Could not delete the job");
              }
            }}
            renderTrigger={(openDialog) => (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={openDialog}
                aria-label="Delete job"
                className="text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          />
        </div>
      </div>

      {/* Accordion body: applicant preview */}
      {open && (
        <div className="border-t p-3">
          {applicants === undefined ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : active.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">
              No applicants for this role yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {preview.map((app) => (
                <button
                  type="button"
                  key={app._id}
                  onClick={() => router.push(`/company/applicants/${app._id}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border p-2.5 text-left transition-colors hover:border-primary/40"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <UserAvatar
                      name={app.applicant?.name ?? "Unknown"}
                      src={app.applicant?.imageUrl}
                      className="h-8 w-8"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {app.applicant?.name ?? "Unknown"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {app.applicant?.headline ?? `Applied ${timeAgo(app.createdAt)}`}
                      </span>
                    </span>
                  </span>
                  <Badge
                    className={`shrink-0 border-transparent ${applicationStatusTone(app.status)}`}
                  >
                    {APPLICATION_STATUS_LABEL[app.status] ?? app.status}
                  </Badge>
                </button>
              ))}

              <Button
                render={<Link href={`/company/jobs/${job._id}`} />}
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
              >
                {active.length > PREVIEW_LIMIT
                  ? `View all ${active.length} applicants`
                  : "Open applicant board"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
