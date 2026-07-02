"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import {
  Search,
  Briefcase,
  Building2,
  MapPin,
  Bookmark,
  FileText,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { JobCard, MatchBadge } from "@/components/jobs/job-card";
import { ApplyButton } from "@/components/jobs/apply-dialog";
import { AiActionButton } from "@/components/ai/ai-action-button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatSalary,
  seniorityLabel,
  workModeLabel,
} from "@/lib/format";
import { AI_FEATURES } from "@/lib/ai-features";

function JobsInner() {
  const params = useSearchParams();
  const { has } = useAuth();
  const jobMatcherLocked = !(has?.({ feature: AI_FEATURES.job_matcher }) ?? false);

  const [tab, setTab] = useState<string>("browse");
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [seniority, setSeniority] = useState<string>("all");
  const [workMode, setWorkMode] = useState<string>("all");
  const [selected, setSelected] = useState<Id<"jobs"> | null>(
    (params.get("job") as Id<"jobs"> | null) ?? null
  );

  // Compute the user's profile embedding once so jobs get a % match score
  // (getJobs derives matchScore from the stored embeddings, reactively).
  const ensureMyProfileEmbedding = useAction(api.embeddings.ensureMyProfileEmbedding);
  useEffect(() => {
    void ensureMyProfileEmbedding().catch(() => {});
  }, [ensureMyProfileEmbedding]);

  const browseJobs = useQuery(
    api.jobs.getJobs,
    tab === "browse"
      ? {
          search: search || undefined,
          seniority: seniority === "all" ? undefined : (seniority as never),
          workMode: workMode === "all" ? undefined : (workMode as never),
        }
      : "skip"
  );
  const savedJobs = useQuery(
    api.jobs.getSavedJobs,
    tab === "saved" ? {} : "skip"
  );

  const jobs =
    tab === "saved"
      ? savedJobs?.map((j) => ({ ...j, matchScore: null }))
      : browseJobs;

  const activeId = selected ?? jobs?.[0]?._id ?? null;
  const detail = useQuery(
    api.jobs.getJobById,
    activeId ? { jobId: activeId } : "skip"
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* List column */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Tabs value={tab} onValueChange={(v) => setTab(String(v ?? "browse"))}>
            <TabsList>
              <TabsTrigger value="browse" className="gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                Browse
              </TabsTrigger>
              <TabsTrigger value="saved" className="gap-1.5">
                <Bookmark className="h-3.5 w-3.5" />
                Saved
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            render={<Link href="/applications" />}
            variant="ghost"
            size="sm"
            className="gap-1.5"
          >
            <FileText className="h-4 w-4" />
            My applications
          </Button>
        </div>

        {tab === "browse" && (
          <div className="space-y-2 rounded-xl border bg-card p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, skill, company…"
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Select value={seniority} onValueChange={(v) => setSeniority(v ?? "all")}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seniority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  {["junior", "mid", "senior", "staff", "principal"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {seniorityLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={workMode} onValueChange={(v) => setWorkMode(v ?? "all")}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Work mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any location</SelectItem>
                  {["remote", "hybrid", "onsite"].map((m) => (
                    <SelectItem key={m} value={m}>
                      {workModeLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {jobs === undefined ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          tab === "saved" ? (
            <EmptyState
              icon={Bookmark}
              title="No saved jobs"
              description="Tap the bookmark on any job to keep it here for later."
            />
          ) : (
            <EmptyState
              icon={Briefcase}
              title="No jobs match"
              description="Try clearing filters or a different search."
            />
          )
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job._id}
                job={job}
                selected={activeId === job._id}
                onSelect={() => setSelected(job._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail column */}
      <div className="hidden lg:block">
        <div className="sticky top-[4.5rem]">
          {detail === undefined && activeId ? (
            <Skeleton className="h-96 w-full rounded-xl" />
          ) : detail ? (
            <div className="space-y-4 rounded-xl border bg-card p-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{detail.title}</h2>
                  {detail.status === "closed" && (
                    <Badge variant="outline">Closed</Badge>
                  )}
                  {typeof detail.matchScore === "number" && (
                    <MatchBadge score={detail.matchScore} />
                  )}
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  {detail.company ? (
                    <Link
                      href={`/companies/${detail.company.slug}`}
                      className="hover:underline"
                    >
                      {detail.company.name}
                    </Link>
                  ) : (
                    "Unknown company"
                  )}
                  <span>·</span>
                  <MapPin className="h-4 w-4" />
                  {detail.location}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">{workModeLabel(detail.workMode)}</Badge>
                  <Badge variant="secondary">{seniorityLabel(detail.seniority)}</Badge>
                  <span className="font-medium">
                    {formatSalary(detail.salaryMin, detail.salaryMax, detail.currency)}
                  </span>
                </div>
              </div>

              <ApplyButton
                jobId={detail._id}
                jobTitle={detail.title}
                companyName={detail.company?.name ?? "the company"}
                appliedByMe={detail.appliedByMe}
                closed={detail.status === "closed"}
              />

              <AiActionButton
                locked={jobMatcherLocked}
                label="Match me with AI"
                prompt={`Analyze how well I match the "${detail.title}" role at ${detail.company?.name ?? "this company"} and show my skill gaps.`}
                lockedTitle="AI Job Matcher"
                lockedDescription="See your match score and exactly which skills you're missing for this role."
              />

              <div>
                <p className="mb-1.5 text-sm font-medium">Required skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.skillsRequired.map((s) => (
                    <Badge key={s} variant="outline" className="font-normal">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-sm font-medium">About the role</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {detail.description}
                </p>
              </div>

              {detail.recruiter && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Recruiter</p>
                  <p className="font-medium">{detail.recruiter.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {detail.recruiter.title}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={Bookmark}
              title="Select a job"
              description="Pick a role on the left to see details, apply, and match with AI."
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <JobsInner />
    </Suspense>
  );
}
