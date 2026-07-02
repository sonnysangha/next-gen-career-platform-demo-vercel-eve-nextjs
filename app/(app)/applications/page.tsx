"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAction, useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { FileText, MapPin, Undo2, Send } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { CompanyLogo } from "@/components/company-logo";
import { MatchBadge } from "@/components/jobs/job-card";
import { EmptyState } from "@/components/empty-state";
import {
  APPLICATION_STATUS_LABEL,
  applicationStatusTone,
} from "@/components/company/applicants-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSalary, timeAgo, workModeLabel } from "@/lib/format";

export default function ApplicationsPage() {
  const applications = useQuery(api.applications.getMyApplications, {});
  const withdraw = useMutation(api.applications.withdraw);

  // Warm up the profile embedding so each application shows its % match.
  const ensureMyProfileEmbedding = useAction(
    api.embeddings.ensureMyProfileEmbedding,
  );
  useEffect(() => {
    void ensureMyProfileEmbedding().catch(() => {});
  }, [ensureMyProfileEmbedding]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          My applications
        </h1>
        <p className="text-sm text-muted-foreground">
          Track every role you&apos;ve applied to and where it stands.
        </p>
      </div>

      {applications === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No applications yet"
          description="Find a role you love and hit Apply — your applications will show up here."
          action={
            <Button render={<Link href="/jobs" />} className="gap-1.5">
              <Send className="h-4 w-4" />
              Browse jobs
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app._id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={app.job ? `/jobs?job=${app.job._id}` : "#"}
                  className="flex min-w-0 items-start gap-3"
                >
                  <CompanyLogo
                    name={app.company?.name ?? "Company"}
                    src={app.company?.logoUrl}
                    className="h-10 w-10"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium hover:underline">
                      {app.job?.title ?? "Role removed"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {app.company?.name ?? "Unknown company"}
                    </p>
                    {app.job && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {app.job.location} · {workModeLabel(app.job.workMode)} ·{" "}
                        {formatSalary(
                          app.job.salaryMin,
                          app.job.salaryMax,
                          app.job.currency,
                        )}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge
                    className={`border-transparent ${applicationStatusTone(app.status)}`}
                  >
                    {APPLICATION_STATUS_LABEL[app.status] ?? app.status}
                  </Badge>
                  {typeof app.matchScore === "number" && (
                    <MatchBadge score={app.matchScore} />
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                <span>
                  Applied {timeAgo(app.createdAt)} · updated {timeAgo(app.updatedAt)}
                </span>
                {app.status !== "withdrawn" &&
                  app.status !== "rejected" &&
                  app.job && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="gap-1"
                      onClick={async () => {
                        try {
                          await withdraw({ jobId: app.jobId });
                          toast.success("Application withdrawn");
                        } catch {
                          toast.error("Could not withdraw");
                        }
                      }}
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Withdraw
                    </Button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
