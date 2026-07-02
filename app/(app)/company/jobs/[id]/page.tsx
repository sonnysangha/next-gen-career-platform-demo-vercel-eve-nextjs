"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { ArrowLeft, Briefcase, ExternalLink, MapPin } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/empty-state";
import { ApplicantsPanel } from "@/components/company/applicants-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSalary, seniorityLabel, workModeLabel, timeAgo } from "@/lib/format";

/** All applicants for one job, company-admin only. */
export default function CompanyJobPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = id as Id<"jobs">;
  const job = useQuery(api.jobs.getJobById, { jobId });
  const company = useQuery(api.companies.getMyCompany, {});

  if (job === undefined || company === undefined) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }
  if (job === null || company === null || job.companyId !== company._id) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Job not found"
        description="It may have been removed, or you don't manage this company."
      />
    );
  }

  const closed = job.status === "closed";

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Button
        render={<Link href="/company" />}
        variant="ghost"
        size="sm"
        className="gap-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Button>

      {/* Job header */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{job.title}</h1>
              <Badge
                variant={closed ? "outline" : "secondary"}
                className="font-normal"
              >
                {closed ? "Closed" : "Open"}
              </Badge>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {workModeLabel(job.workMode)} · {seniorityLabel(job.seniority)} ·{" "}
              {job.location} ·{" "}
              {formatSalary(job.salaryMin, job.salaryMax, job.currency)} · posted{" "}
              {timeAgo(job.postedAt)} ago
            </p>
          </div>
          {job.company && (
            <Button
              render={<Link href={`/companies/${job.company.slug}`} />}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <ExternalLink className="h-4 w-4" />
              Public page
            </Button>
          )}
        </div>
      </div>

      {/* Applicants for this job only */}
      <ApplicantsPanel
        companyId={company._id}
        jobs={[{ _id: job._id, title: job.title }]}
        lockedJobId={job._id}
      />
    </div>
  );
}
