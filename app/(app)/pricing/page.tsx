import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { CheckoutButton } from "@clerk/nextjs/experimental";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isPro } from "@/lib/entitlements";
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

const PRO_PLAN_ID = process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID ?? "";

export default async function PricingPage() {
  const pro = await isPro();

  return (
    <div className="mx-auto max-w-4xl py-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Unlock your AI Career Agent
        </h1>
        <p className="mt-2 text-muted-foreground">
          CareerConnect is free to use. Go Pro to put an AI agent to work on your career.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Free */}
        <div className="flex flex-col rounded-xl border bg-card p-6">
          <div className="mb-1 text-sm font-medium text-muted-foreground">Free</div>
          <div className="mb-4 text-3xl font-semibold">
            $0<span className="text-base font-normal text-muted-foreground">/mo</span>
          </div>
          <ul className="mb-6 space-y-3 text-sm">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
            "relative flex flex-col rounded-xl border-2 bg-card p-6",
            pro ? "border-primary/40" : "border-primary"
          )}
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-medium text-primary">Pro</span>
            <Badge className="gap-1">
              <Sparkles className="h-3 w-3" /> AI
            </Badge>
          </div>
          <div className="mb-4 text-3xl font-semibold">
            $20<span className="text-base font-normal text-muted-foreground">/mo</span>
          </div>
          <ul className="mb-6 space-y-3 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto">
            {pro ? (
              <Button className="w-full" disabled>
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
                    <Button className="w-full gap-2">
                      <Sparkles className="h-4 w-4" />
                      Upgrade to Pro
                    </Button>
                  </CheckoutButton>
                </Show>
                <Show when="signed-out">
                  <Button render={<Link href="/sign-in" />} className="w-full gap-2">
                    <Sparkles className="h-4 w-4" />
                    Sign in to upgrade
                  </Button>
                </Show>
              </>
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
