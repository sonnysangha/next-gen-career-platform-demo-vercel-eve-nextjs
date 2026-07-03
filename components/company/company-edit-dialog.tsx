"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

export function CompanyEditDialog({
  company,
}: {
  company: {
    _id: Id<"companies">;
    name: string;
    industry: string;
    size: string;
    location: string;
    about: string;
    websiteUrl?: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const updateCompany = useMutation(api.companies.updateCompany);

  const [name, setName] = useState(company.name);
  const [industry, setIndustry] = useState(company.industry);
  const [size, setSize] = useState(company.size);
  const [location, setLocation] = useState(company.location);
  const [website, setWebsite] = useState(company.websiteUrl ?? "");
  const [about, setAbout] = useState(company.about);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim() || !industry.trim() || !location.trim()) {
      toast.error("Name, industry, and location are required");
      return;
    }
    setBusy(true);
    try {
      await updateCompany({
        companyId: company._id,
        name: name.trim(),
        industry: industry.trim(),
        size,
        location: location.trim(),
        about: about.trim(),
        websiteUrl: website.trim() || undefined,
      });
      toast.success("Company updated");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-4 w-4" />
        Edit company
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-semibold tracking-tight">
              Edit company
            </DialogTitle>
            <DialogDescription>
              These details appear on your public company page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ce-name">Name</Label>
              <Input id="ce-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ce-industry">Industry</Label>
                <Input
                  id="ce-industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Size</Label>
                <Select value={size} onValueChange={(v) => setSize(v ?? size)}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s} employees
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ce-location">Location</Label>
                <Input
                  id="ce-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ce-website">Website</Label>
                <Input
                  id="ce-website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ce-about">About</Label>
              <Textarea
                id="ce-about"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="min-h-28"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
