"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Profile = {
  headline: string;
  about: string;
  location: string;
  targetRole?: string;
  openToWork: boolean;
} | null;

export function EditProfileDialog({
  user,
  profile,
}: {
  user: { name: string };
  profile: Profile;
}) {
  const [open, setOpen] = useState(false);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const updateName = useMutation(api.profiles.updateAccountName);

  const [name, setName] = useState(user.name);
  const [headline, setHeadline] = useState(profile?.headline ?? "");
  const [about, setAbout] = useState(profile?.about ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [targetRole, setTargetRole] = useState(profile?.targetRole ?? "");
  const [openToWork, setOpenToWork] = useState(profile?.openToWork ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Name can't be empty");
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        updateName({ name: name.trim() }),
        updateProfile({ headline, about, location, targetRole, openToWork }),
      ]);
      toast.success("Profile updated");
      setOpen(false);
    } catch {
      toast.error("Could not save profile");
    } finally {
      setSaving(false);
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
        Edit profile
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Update your public profile details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Frontend Engineer moving into AI"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="targetRole">Target role</Label>
              <Input
                id="targetRole"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Next.js AI Engineer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. London, UK"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="about">About</Label>
              <Textarea
                id="about"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="min-h-28"
                placeholder="A short summary of who you are and what you do."
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Open to work</p>
                <p className="text-xs text-muted-foreground">
                  Show recruiters you're available.
                </p>
              </div>
              <Switch checked={openToWork} onCheckedChange={setOpenToWork} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
