"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Building2, MapPin, Users, Briefcase, ExternalLink } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { CompanyLogo } from "@/components/company-logo";
import { UserAvatar } from "@/components/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  formatSalary,
  seniorityLabel,
  workModeLabel,
} from "@/lib/format";

export default function CompanyPage() {
  const { slug } = useParams<{ slug: string }>();
  const data = useQuery(api.companies.getCompanyBySlug, { slug });

  if (data === undefined) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }
  if (data === null) {
    return <EmptyState icon={Building2} title="Company not found" />;
  }

  const { company, jobs, recruiters, employees } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start gap-4">
          <CompanyLogo name={company.name} src={company.logoUrl} className="h-16 w-16" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold">{company.name}</h1>
            <p className="text-sm text-muted-foreground">{company.industry}</p>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {company.location}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {company.size}
              </span>
              {company.websiteUrl && (
                <a
                  href={company.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3" />
                  Website
                </a>
              )}
            </p>
          </div>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {company.about}
        </p>
      </div>

      {/* Open roles */}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          Open roles ({jobs.length})
        </h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open roles right now.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <Link
                key={job._id}
                href={`/jobs?job=${job._id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:border-primary/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {workModeLabel(job.workMode)} · {seniorityLabel(job.seniority)} ·{" "}
                    {job.location}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium">
                  {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recruiters */}
      {recruiters.length > 0 && (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Users className="h-4 w-4 text-muted-foreground" />
            Recruiters
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {recruiters.map((r) => (
              <div key={r._id} className="flex items-center gap-3 rounded-lg border p-3">
                <UserAvatar name={r.name} src={r.imageUrl} className="h-9 w-9" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Employees */}
      {employees.length > 0 && (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Users className="h-4 w-4 text-muted-foreground" />
            People
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {employees.map(({ user, profile }) => (
              <Link
                key={user._id}
                href={`/in/${user.username}`}
                className="flex items-center gap-3 rounded-lg border p-3 hover:border-primary/40"
              >
                <UserAvatar name={user.name} src={user.imageUrl} className="h-9 w-9" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {profile?.headline ?? ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
