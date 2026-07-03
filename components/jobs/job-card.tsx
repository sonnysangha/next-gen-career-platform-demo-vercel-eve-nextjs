"use client";

import { useState } from "react";
import { Bookmark, MapPin, Building2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatSalary,
  seniorityLabel,
  timeAgo,
  workModeLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export type JobCardData = {
  _id: Id<"jobs">;
  title: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  skillsRequired: string[];
  seniority: string;
  workMode: string;
  location: string;
  postedAt: number;
  savedByMe: boolean;
  matchScore?: number | null;
  company: { name: string; logoUrl?: string; slug: string } | null;
};

/** Match badge colored by score. */
export function MatchBadge({ score }: { score: number }) {
  const tone =
    score >= 75
      ? "bg-primary/15 text-primary"
      : score >= 50
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium",
        tone
      )}
    >
      {score}% match
    </span>
  );
}

export function JobCard({
  job,
  selected,
  onSelect,
}: {
  job: JobCardData;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const saveJob = useMutation(api.jobs.saveJob);
  const unsaveJob = useMutation(api.jobs.unsaveJob);
  const [saved, setSaved] = useState(job.savedByMe);

  async function onToggleSave(e: React.MouseEvent) {
    e.stopPropagation();
    setSaved((v) => !v);
    try {
      if (saved) await unsaveJob({ jobId: job._id });
      else await saveJob({ jobId: job._id });
    } catch {
      setSaved(job.savedByMe);
    }
  }

  return (
    // Not a <button>: it contains the Save button, and nested buttons are invalid
    // HTML. Use a clickable/keyboard-accessible div instead.
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={cn(
        "w-full cursor-pointer rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40",
        selected && "border-primary ring-1 ring-primary"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-heading text-base font-semibold tracking-tight">
              {job.title}
            </h3>
            {typeof job.matchScore === "number" && (
              <MatchBadge score={job.matchScore} />
            )}
          </div>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {job.company?.name ?? "Unknown company"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8 shrink-0", saved && "text-primary")}
          onClick={onToggleSave}
          aria-label={saved ? "Unsave job" : "Save job"}
        >
          <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {job.location}
        </span>
        <span>·</span>
        <span>{workModeLabel(job.workMode)}</span>
        <span>·</span>
        <span>{seniorityLabel(job.seniority)}</span>
        <span>·</span>
        <span className="font-mono font-medium text-foreground">
          {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.skillsRequired.slice(0, 5).map((s) => (
          <Badge key={s} variant="secondary" className="font-normal">
            {s}
          </Badge>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Posted {timeAgo(job.postedAt)} ago
      </p>
    </div>
  );
}
