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

export type EducationData = {
  _id: Id<"education">;
  school: string;
  degree: string;
  field: string;
  startYear: string;
  endYear?: string;
  description?: string;
};

export function EducationDialog({ education }: { education?: EducationData }) {
  const isEdit = !!education;
  const [open, setOpen] = useState(false);
  const addEducation = useMutation(api.profiles.addEducation);
  const updateEducation = useMutation(api.profiles.updateEducation);
  const deleteEducation = useMutation(api.profiles.deleteEducation);

  const [school, setSchool] = useState(education?.school ?? "");
  const [degree, setDegree] = useState(education?.degree ?? "");
  const [field, setField] = useState(education?.field ?? "");
  const [startYear, setStartYear] = useState(education?.startYear ?? "");
  const [endYear, setEndYear] = useState(education?.endYear ?? "");
  const [description, setDescription] = useState(education?.description ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!school.trim() || !startYear.trim()) {
      toast.error("School and start year are required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        school: school.trim(),
        degree: degree.trim(),
        field: field.trim(),
        startYear: startYear.trim(),
        endYear: endYear.trim() || undefined,
        description: description.trim() || undefined,
      };
      if (isEdit) {
        await updateEducation({ educationId: education._id, ...payload });
      } else {
        await addEducation(payload);
      }
      toast.success(isEdit ? "Education updated" : "Education added");
      setOpen(false);
    } catch {
      toast.error("Could not save education");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!education) return;
    setBusy(true);
    try {
      await deleteEducation({ educationId: education._id });
      toast.success("Education removed");
      setOpen(false);
    } catch {
      toast.error("Could not remove education");
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
          aria-label="Edit education"
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
          Add education
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit education" : "Add education"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edu-school">School</Label>
              <Input
                id="edu-school"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. University of Manchester"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edu-degree">Degree</Label>
                <Input
                  id="edu-degree"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="e.g. BSc"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edu-field">Field of study</Label>
                <Input
                  id="edu-field"
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  placeholder="e.g. Computer Science"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edu-start">Start year</Label>
                <Input
                  id="edu-start"
                  type="number"
                  min="1950"
                  max="2100"
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  placeholder="2018"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edu-end">End year (blank = present)</Label>
                <Input
                  id="edu-end"
                  type="number"
                  min="1950"
                  max="2100"
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                  placeholder="2021"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edu-desc">Description (optional)</Label>
              <Textarea
                id="edu-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-20"
                placeholder="Societies, awards, coursework…"
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
