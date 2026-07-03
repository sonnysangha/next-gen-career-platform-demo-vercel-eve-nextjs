"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";
import {
  APPLICATION_STATUS_LABEL,
  applicationStatusTone,
} from "@/components/company/applicants-panel";

export type PipelineStage =
  | "submitted"
  | "reviewed"
  | "interviewing"
  | "offer"
  | "rejected";

const STAGES: PipelineStage[] = [
  "submitted",
  "reviewed",
  "interviewing",
  "offer",
  "rejected",
];

/** Pipeline stages that require the Company Pro (org) plan. */
export const PRO_STAGES = new Set<PipelineStage>(["interviewing", "offer"]);

export type PipelineApplicant = {
  _id: Id<"applications">;
  status: string;
  jobId: Id<"jobs">;
  createdAt: number;
  applicant: {
    name: string;
    username: string;
    imageUrl: string | null;
    headline: string | null;
  } | null;
};

/**
 * Kanban view of the hiring pipeline. Cards drag between stage columns
 * (native HTML5 drag & drop — no library). Interview/offer columns are
 * locked on the free org tier.
 */
export function PipelineBoard({
  applicants,
  jobTitle,
  isPro,
  showRejected = true,
  onMove,
  onOpen,
}: {
  applicants: PipelineApplicant[];
  jobTitle: Map<string, string>;
  isPro: boolean;
  /** When false, the rejected column is hidden entirely. */
  showRejected?: boolean;
  onMove: (applicationId: Id<"applications">, status: PipelineStage) => void;
  onOpen?: (applicationId: Id<"applications">) => void;
}) {
  const [dragging, setDragging] = useState<Id<"applications"> | null>(null);
  const [dropTarget, setDropTarget] = useState<PipelineStage | null>(null);

  const stages = showRejected
    ? STAGES
    : STAGES.filter((s) => s !== "rejected");

  const byStage = new Map<PipelineStage, PipelineApplicant[]>(
    STAGES.map((s) => [s, []]),
  );
  for (const app of applicants) {
    byStage.get(app.status as PipelineStage)?.push(app);
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div
        className={`grid gap-2 ${
          stages.length === 5
            ? "min-w-[880px] grid-cols-5"
            : "min-w-[704px] grid-cols-4"
        }`}
      >
        {stages.map((stage) => {
          const locked = !isPro && PRO_STAGES.has(stage);
          const cards = byStage.get(stage) ?? [];
          const isTarget = dropTarget === stage && dragging !== null && !locked;
          return (
            <div
              key={stage}
              className={`flex min-h-48 flex-col rounded-lg border bg-muted/30 transition-colors ${
                isTarget ? "border-primary bg-primary/5" : ""
              } ${locked ? "opacity-70" : ""}`}
              onDragOver={(e) => {
                if (locked) return;
                e.preventDefault();
                setDropTarget(stage);
              }}
              onDragLeave={() =>
                setDropTarget((t) => (t === stage ? null : t))
              }
              onDrop={(e) => {
                e.preventDefault();
                setDropTarget(null);
                if (locked || dragging === null) return;
                const app = applicants.find((a) => a._id === dragging);
                if (app && app.status !== stage) onMove(dragging, stage);
                setDragging(null);
              }}
            >
              <div className="flex items-center justify-between gap-1 border-b px-2.5 py-2">
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${applicationStatusTone(stage)}`}
                  />
                  {APPLICATION_STATUS_LABEL[stage]}
                  {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                </span>
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 font-mono text-[10px] font-normal"
                >
                  {cards.length}
                </Badge>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-2">
                {locked && cards.length === 0 ? (
                  <p className="m-auto px-2 text-center text-[11px] text-muted-foreground">
                    Company Pro unlocks this stage
                  </p>
                ) : cards.length === 0 ? (
                  <p className="m-auto text-[11px] text-muted-foreground">
                    {isTarget ? "Drop to move here" : "No applicants"}
                  </p>
                ) : (
                  cards.map((app) => (
                    <div
                      key={app._id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        setDragging(app._id);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setDropTarget(null);
                      }}
                      onClick={() => onOpen?.(app._id)}
                      className={`cursor-grab rounded-md border p-2.5 shadow-xs transition-colors active:cursor-grabbing ${
                        stage === "offer"
                          ? "border-apricot/50 bg-apricot/10 hover:border-apricot"
                          : "bg-card hover:border-primary/40"
                      } ${dragging === app._id ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          name={app.applicant?.name ?? "Unknown"}
                          src={app.applicant?.imageUrl}
                          className="h-7 w-7"
                        />
                        <div className="min-w-0">
                          <Link
                            href={
                              app.applicant ? `/in/${app.applicant.username}` : "#"
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="block truncate text-xs font-medium hover:underline"
                          >
                            {app.applicant?.name ?? "Unknown"}
                          </Link>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {jobTitle.get(app.jobId as string) ?? "a role"}
                          </p>
                        </div>
                      </div>
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Applied {timeAgo(app.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
