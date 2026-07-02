"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { toast } from "sonner";
import { Building2, Loader2, Rocket } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

/**
 * Company onboarding: creates a Clerk Organization (so teammates can be
 * invited and manage the same company) and the linked Convex company page.
 * Reuses the already-active organization when one exists (e.g. created via
 * the org switcher).
 */
export default function CompanyOnboardingPage() {
  const router = useRouter();
  const { organization: activeOrg } = useOrganization();
  const { createOrganization, setActive, isLoaded } = useOrganizationList();
  const myCompany = useQuery(api.companies.getMyCompany, {});
  const createCompany = useMutation(api.companies.createCompany);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("1-10");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [about, setAbout] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already set up? Straight to the dashboard.
  const hasCompany = myCompany !== undefined && myCompany !== null;
  useEffect(() => {
    if (hasCompany) router.replace("/company");
  }, [hasCompany, router]);
  if (hasCompany) return null;

  const companyName = name.trim() || activeOrg?.name || "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName) {
      toast.error("Company name is required");
      return;
    }
    if (!industry.trim() || !location.trim() || !about.trim()) {
      toast.error("Industry, location, and about are required");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Ensure a Clerk Organization. Reuse the active one, otherwise
      //    create one named after the company.
      let orgId = activeOrg?.id;
      if (!orgId && isLoaded && createOrganization) {
        try {
          const org = await createOrganization({ name: companyName });
          orgId = org.id;
          await setActive({ organization: org.id });
        } catch {
          // Organizations may be disabled on this Clerk instance — the
          // company page still works via page ownership.
          toast.info(
            "Couldn't create a Clerk organization (is the Organizations feature enabled?). Your account will own the company page instead.",
          );
        }
      }

      // 2. Create the linked company page in Convex.
      await createCompany({
        name: companyName,
        industry: industry.trim(),
        size,
        location: location.trim(),
        about: about.trim(),
        websiteUrl: website.trim() || undefined,
        orgId,
      });

      toast.success("Company created — welcome aboard!");
      router.push("/company");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not create the company",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Set up your company</h1>
          <p className="text-sm text-muted-foreground">
            Create your organization, publish a company page, and start posting
            jobs.
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border bg-card p-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="c-name">Company name</Label>
          <Input
            id="c-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={activeOrg?.name ?? "e.g. Acme Robotics"}
          />
          {activeOrg && !name.trim() && (
            <p className="text-xs text-muted-foreground">
              Using your active organization “{activeOrg.name}”.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-industry">Industry</Label>
            <Input
              id="c-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Artificial Intelligence"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Company size</Label>
            <Select value={size} onValueChange={(v) => setSize(v ?? "1-10")}>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-location">Location</Label>
            <Input
              id="c-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. London, UK"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-website">Website (optional)</Label>
            <Input
              id="c-website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-about">About</Label>
          <Textarea
            id="c-about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            className="min-h-28"
            placeholder="What does your company do? Who are you hiring?"
          />
        </div>

        <Button type="submit" disabled={submitting} className="w-full gap-1.5">
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Rocket className="h-4 w-4" />
          )}
          Create company
        </Button>
      </form>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        You can upload a logo and cover image from the company dashboard after
        this step.
      </p>
    </div>
  );
}
