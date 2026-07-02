"use client";

import Link from "next/link";
import { useAuth, useOrganization } from "@clerk/nextjs";
import {
  CheckoutButton,
  SubscriptionDetailsButton,
} from "@clerk/nextjs/experimental";
import { Building2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COMPANY_PRO_PLAN, FREE_OPEN_JOB_LIMIT } from "@/lib/ai-features";

const COMPANY_PLAN_ID = process.env.NEXT_PUBLIC_CLERK_COMPANY_PLAN_ID ?? "";

/**
 * Org-billing status card for the company dashboard: shows the active plan,
 * free-tier job-slot usage, and the upgrade / manage-subscription actions.
 * Billing is org-scoped — Clerk resolves `has({ plan })` and the checkout
 * against the ACTIVE organization.
 */
export function CompanyBillingCard({ openJobs }: { openJobs: number }) {
  const { has, orgId } = useAuth();
  const { organization } = useOrganization();
  const isPro = has?.({ plan: `org:${COMPANY_PRO_PLAN}` }) ?? false;

  if (isPro) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-transparent p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              Company Pro
              <Badge className="gap-1 text-[10px]">
                <Sparkles className="h-3 w-3" /> Active
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground">
              Unlimited job posts and the full applicant pipeline for{" "}
              {organization?.name ?? "your organization"}.
            </p>
          </div>
        </div>
        <SubscriptionDetailsButton for="organization">
          <Button variant="outline" size="sm">
            Manage subscription
          </Button>
        </SubscriptionDetailsButton>
      </section>
    );
  }

  const slotsUsed = Math.min(openJobs, FREE_OPEN_JOB_LIMIT);
  const atCap = openJobs >= FREE_OPEN_JOB_LIMIT;

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Building2 className="h-4 w-4" />
        </div>
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            Company Free
            <Badge variant={atCap ? "destructive" : "secondary"} className="text-[10px]">
              {slotsUsed}/{FREE_OPEN_JOB_LIMIT} open job slots used
            </Badge>
          </p>
          <p className="text-xs text-muted-foreground">
            {atCap
              ? "You've hit the free job limit — upgrade for unlimited posts, the interview/offer pipeline, and candidate insights."
              : "Upgrade for unlimited job posts, the interview/offer pipeline, and candidate skill insights."}
          </p>
        </div>
      </div>
      {orgId && COMPANY_PLAN_ID ? (
        <CheckoutButton
          planId={COMPANY_PLAN_ID}
          planPeriod="month"
          for="organization"
          newSubscriptionRedirectUrl="/company"
        >
          <Button size="sm" className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            Upgrade to Company Pro
          </Button>
        </CheckoutButton>
      ) : (
        <Button render={<Link href="/pricing" />} size="sm" variant="outline" className="gap-1.5">
          <Sparkles className="h-4 w-4" />
          See company plans
        </Button>
      )}
    </section>
  );
}
