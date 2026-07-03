import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Show } from "@clerk/nextjs";
import { CheckoutButton } from "@clerk/nextjs/experimental";
import { Building2, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isPro, isCompanyPro } from "@/lib/entitlements";
import { FREE_OPEN_JOB_LIMIT } from "@/lib/ai-features";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "Create & edit your profile",
  "Browse the feed, post & comment",
  "Browse and save jobs",
  "Follow people & view companies",
];

const PRO_FEATURES = [
  "AI Profile Optimizer",
  "AI Job Matcher with skill-gap analysis",
  "AI Outreach Writer for recruiters",
  "AI Career Plan (30/60/90-day)",
  "Weekly job recommendations",
];

const COMPANY_FREE_FEATURES = [
  "Company page with logo & cover",
  `Up to ${FREE_OPEN_JOB_LIMIT} open job posts`,
  "View applicants, profiles & cover notes",
  "Mark applicants reviewed or rejected",
  "Invite teammates via your organization",
];

const COMPANY_PRO_FEATURES = [
  "Unlimited open job posts",
  "Full pipeline: interview & offer stages",
  "Candidate skill insights on every applicant",
  "Billing shared across your organization",
];

const PRO_PLAN_ID = process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID ?? "";
const COMPANY_PLAN_ID = process.env.NEXT_PUBLIC_CLERK_COMPANY_PLAN_ID ?? "";

export default async function PricingPage() {
  const pro = await isPro();
  const companyPro = await isCompanyPro();
  const { orgId } = await auth();

  return (
    <div className="mx-auto max-w-4xl py-6">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Plans for both sides of the hire
        </h1>
        <p className="mt-2 text-muted-foreground">
          Personal plans for job seekers, organization plans for companies.
        </p>
      </div>

      {/* ── For job seekers (personal billing) ────────────────────── */}
      <div className="mb-8 text-center">
        <h2 className="flex items-center justify-center gap-2 font-heading text-2xl font-semibold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary" />
          For job seekers
        </h2>
        <p className="mt-2 text-muted-foreground">
          Free to use. Go Pro to put an AI agent to work on your career.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Free */}
        <div className="flex flex-col rounded-3xl border border-ink/10 bg-card p-6">
          <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Free
          </div>
          <div className="mb-4 font-heading text-4xl font-semibold tracking-tight">
            $0<span className="text-base font-normal italic text-muted-foreground"> /mo</span>
          </div>
          <ul className="mb-6 space-y-3 text-sm">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="mt-auto" disabled>
            {pro ? "Included" : "Your current plan"}
          </Button>
        </div>

        {/* Pro */}
        <div
          className={cn(
            "relative flex flex-col overflow-hidden rounded-3xl bg-ink p-6 text-paper shadow-[0_28px_70px_-30px_rgb(15_23_42/0.6)]",
            pro ? "ring-1 ring-apricot/30" : "ring-1 ring-apricot/50"
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-paper/60">
              Pro
            </span>
            <Badge className="gap-1 border-transparent bg-apricot text-[10px] font-bold uppercase tracking-wide text-ink">
              <Sparkles className="h-3 w-3" /> AI
            </Badge>
          </div>
          <div className="mb-4 font-heading text-4xl font-semibold tracking-tight">
            $20<span className="text-base font-normal italic text-paper/60"> /mo</span>
          </div>
          <ul className="mb-6 space-y-3 text-sm text-paper/85">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-apricot" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto">
            {pro ? (
              <Button className="w-full bg-apricot font-semibold text-ink hover:bg-apricot/90" disabled>
                You&apos;re on Pro ✨
              </Button>
            ) : (
              <>
                <Show when="signed-in">
                  <CheckoutButton
                    planId={PRO_PLAN_ID}
                    planPeriod="month"
                    newSubscriptionRedirectUrl="/agent"
                  >
                    <Button className="w-full gap-2 bg-apricot font-semibold text-ink hover:bg-apricot/90">
                      <Sparkles className="h-4 w-4" />
                      Upgrade to Pro
                    </Button>
                  </CheckoutButton>
                </Show>
                <Show when="signed-out">
                  <Button
                    render={<Link href="/sign-in" />}
                    className="w-full gap-2 bg-apricot font-semibold text-ink hover:bg-apricot/90"
                  >
                    <Sparkles className="h-4 w-4" />
                    Sign in to upgrade
                  </Button>
                </Show>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── For companies (org-based billing) ─────────────────────── */}
      <div className="mb-8 mt-14 text-center">
        <h2 className="flex items-center justify-center gap-2 font-heading text-2xl font-semibold tracking-tight">
          <Building2 className="h-6 w-6 text-primary" />
          For companies
        </h2>
        <p className="mt-2 text-muted-foreground">
          Billing is tied to your Clerk <strong>organization</strong> — one
          subscription covers every teammate.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Company Free */}
        <div className="flex flex-col rounded-3xl border border-ink/10 bg-card p-6">
          <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Company Free
          </div>
          <div className="mb-4 font-heading text-4xl font-semibold tracking-tight">
            $0
            <span className="text-base font-normal italic text-muted-foreground"> /mo</span>
          </div>
          <ul className="mb-6 space-y-3 text-sm">
            {COMPANY_FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="mt-auto" disabled>
            {companyPro ? "Included" : "Your current plan"}
          </Button>
        </div>

        {/* Company Pro */}
        <div
          className={cn(
            "relative flex flex-col rounded-3xl border-2 bg-card p-6",
            companyPro ? "border-primary/40" : "border-primary",
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              Company Pro
            </span>
            <Badge className="gap-1 text-[10px] font-bold uppercase tracking-wide">
              <Building2 className="h-3 w-3" /> Org
            </Badge>
          </div>
          <div className="mb-4 font-heading text-4xl font-semibold tracking-tight">
            $99
            <span className="text-base font-normal italic text-muted-foreground"> /mo</span>
          </div>
          <ul className="mb-6 space-y-3 text-sm">
            {COMPANY_PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto">
            {companyPro ? (
              <Button className="w-full" disabled>
                Your organization is on Company Pro ✨
              </Button>
            ) : orgId && COMPANY_PLAN_ID ? (
              <Show when="signed-in">
                <CheckoutButton
                  planId={COMPANY_PLAN_ID}
                  planPeriod="month"
                  for="organization"
                  newSubscriptionRedirectUrl="/company"
                >
                  <Button className="w-full gap-2">
                    <Sparkles className="h-4 w-4" />
                    Upgrade your organization
                  </Button>
                </CheckoutButton>
              </Show>
            ) : (
              <Button
                render={<Link href="/onboarding/company" />}
                variant="outline"
                className="w-full gap-2"
              >
                <Building2 className="h-4 w-4" />
                Create a company first
              </Button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Test mode: use card <span className="font-mono">4242 4242 4242 4242</span>, any
        future expiry &amp; CVC.
      </p>
    </div>
  );
}
