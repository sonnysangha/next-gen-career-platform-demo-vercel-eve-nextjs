"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";

export type ExperienceData = {
  _id: Id<"experiences">;
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  description: string;
  location?: string;
};

export function ExperienceDialog({ experience }: { experience?: ExperienceData }) {
  const isEdit = !!experience;
  const [open, setOpen] = useState(false);
  const addExperience = useMutation(api.profiles.addExperience);
  const updateExperience = useMutation(api.profiles.updateExperience);
  const deleteExperience = useMutation(api.profiles.deleteExperience);

  const [title, setTitle] = useState(experience?.title ?? "");
  const [company, setCompany] = useState(experience?.company ?? "");
  const [startDate, setStartDate] = useState(experience?.startDate ?? "");
  const [endDate, setEndDate] = useState(experience?.endDate ?? "");
  const [location, setLocation] = useState(experience?.location ?? "");
  const [description, setDescription] = useState(experience?.description ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim() || !company.trim() || !startDate) {
      toast.error("Title, company and start date are required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        company: company.trim(),
        startDate,
        endDate,
        description,
        location,
      };
      if (isEdit) {
        await updateExperience({ experienceId: experience._id, ...payload });
      } else {
        await addExperience(payload);
      }
      toast.success(isEdit ? "Experience updated" : "Experience added");
      setOpen(false);
    } catch {
      toast.error("Could not save experience");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!experience) return;
    setBusy(true);
    try {
      await deleteExperience({ experienceId: experience._id });
      toast.success("Experience removed");
      setOpen(false);
    } catch {
      toast.error("Could not remove experience");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {isEdit ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setOpen(true)}
          aria-label="Edit experience"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add experience
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit experience" : "Add experience"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-title">Title</Label>
              <Input
                id="exp-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Frontend Developer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-company">Company</Label>
              <Input
                id="exp-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-start">Start</Label>
                <Input
                  id="exp-start"
                  type="month"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-end">End (blank = present)</Label>
                <Input
                  id="exp-end"
                  type="month"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-location">Location</Label>
              <Input
                id="exp-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. London, UK"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-desc">Description</Label>
              <Textarea
                id="exp-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-24"
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            {isEdit ? (
              <Button
                variant="destructive"
                onClick={remove}
                disabled={busy}
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
