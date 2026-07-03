"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { seniorityLabel, workModeLabel } from "@/lib/format";

const SENIORITIES = ["intern", "junior", "mid", "senior", "staff", "principal"] as const;
const WORK_MODES = ["remote", "hybrid", "onsite"] as const;
const CURRENCIES = ["USD", "GBP", "EUR"];

export type EditableJob = {
  _id: Id<"jobs">;
  title: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  skillsRequired: string[];
  seniority: string;
  workMode: string;
  location: string;
  description: string;
};

/** Create or edit a job posting for the company dashboard. */
export function JobDialog({
  companyId,
  job,
}: {
  companyId: Id<"companies">;
  job?: EditableJob;
}) {
  const isEdit = !!job;
  const [open, setOpen] = useState(false);
  // createJob is an action — it checks org billing via the Clerk Billing SDK.
  const createJob = useAction(api.jobs.createJob);
  const updateJob = useMutation(api.jobs.updateJob);

  const [title, setTitle] = useState(job?.title ?? "");
  const [salaryMin, setSalaryMin] = useState(job ? String(job.salaryMin) : "");
  const [salaryMax, setSalaryMax] = useState(job ? String(job.salaryMax) : "");
  const [currency, setCurrency] = useState(job?.currency ?? "USD");
  const [skills, setSkills] = useState(job?.skillsRequired.join(", ") ?? "");
  const [seniority, setSeniority] = useState(job?.seniority ?? "mid");
  const [workMode, setWorkMode] = useState(job?.workMode ?? "remote");
  const [location, setLocation] = useState(job?.location ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    const min = Number(salaryMin);
    const max = Number(salaryMax);
    if (!title.trim() || !location.trim() || !description.trim()) {
      toast.error("Title, location, and description are required");
      return;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
      toast.error("Enter a valid salary range");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        salaryMin: min,
        salaryMax: max,
        currency,
        skillsRequired: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        seniority: seniority as (typeof SENIORITIES)[number],
        workMode: workMode as (typeof WORK_MODES)[number],
        location: location.trim(),
        description: description.trim(),
      };
      if (isEdit) {
        await updateJob({ jobId: job._id, ...payload });
        toast.success("Job updated");
      } else {
        await createJob({ companyId, ...payload });
        toast.success("Job posted");
        // Reset for the next post.
        setTitle("");
        setSalaryMin("");
        setSalaryMax("");
        setSkills("");
        setLocation("");
        setDescription("");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the job");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {isEdit ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
          aria-label="Edit job"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Post a job
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-semibold tracking-tight">
              {isEdit ? "Edit job" : "Post a job"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the role details — changes go live immediately."
                : "Your job goes live on the Jobs board immediately."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="job-title">Title</Label>
              <Input
                id="job-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Full-Stack Engineer"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="job-min">Salary min</Label>
                <Input
                  id="job-min"
                  type="number"
                  min={0}
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  placeholder="90000"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="job-max">Salary max</Label>
                <Input
                  id="job-max"
                  type="number"
                  min={0}
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  placeholder="140000"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v ?? "USD")}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Seniority</Label>
                <Select value={seniority} onValueChange={(v) => setSeniority(v ?? "mid")}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SENIORITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {seniorityLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Work mode</Label>
                <Select value={workMode} onValueChange={(v) => setWorkMode(v ?? "remote")}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_MODES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {workModeLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-location">Location</Label>
              <Input
                id="job-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote (US) or London, UK"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-skills">Required skills (comma-separated)</Label>
              <Input
                id="job-skills"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. React, TypeScript, Next.js"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-desc">Description</Label>
              <Textarea
                id="job-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-32"
                placeholder="What the role involves, the team, and what great looks like."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Post job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
