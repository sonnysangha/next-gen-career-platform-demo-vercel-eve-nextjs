"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { OrganizationList, useOrganization } from "@clerk/nextjs";
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
 * Company onboarding, org-first:
 * 1. No active Clerk Organization → Clerk's <OrganizationList/> handles
 *    creating one or joining via invitation/suggestion.
 * 2. Active org but no linked company page → publish the Convex company
 *    page tied to that org (teammates co-manage it via org membership).
 * 3. Company already linked → straight to the dashboard.
 */
export default function CompanyOnboardingPage() {
  const router = useRouter();
  const { organization: activeOrg, isLoaded: orgLoaded } = useOrganization();
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

  if (!orgLoaded || myCompany === undefined) {
    return (
      <div className="mx-auto flex max-w-xl justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Step 1 — no organization yet: Clerk's native create/join UI (handles
  // new orgs, invitations, and suggestions). Both paths land back here.
  if (!activeOrg) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Set up your organization
            </h1>
            <p className="text-sm text-muted-foreground">
              Create an organization or accept an invitation — your company
              page and job posts hang off it, and teammates manage them with
              you.
            </p>
          </div>
        </div>
        <div className="flex justify-center">
          <OrganizationList
            hidePersonal
            afterCreateOrganizationUrl="/onboarding/company"
            afterSelectOrganizationUrl="/onboarding/company"
          />
        </div>
      </div>
    );
  }

  // Narrowed copy so the submit closure keeps the non-null type.
  const org = activeOrg;
  const companyName = name.trim() || org.name;

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
      // Step 2 — publish the company page linked to the active org.
      await createCompany({
        name: companyName,
        industry: industry.trim(),
        size,
        location: location.trim(),
        about: about.trim(),
        websiteUrl: website.trim() || undefined,
        orgId: org.id,
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
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Publish your company page
          </h1>
          <p className="text-sm text-muted-foreground">
            “{activeOrg.name}” is ready — add the public details and start
            posting jobs.
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
            placeholder={activeOrg.name}
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
