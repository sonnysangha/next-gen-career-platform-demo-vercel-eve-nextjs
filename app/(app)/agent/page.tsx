import { Suspense } from "react";
import Link from "next/link";
import { Sparkles, Lock, Check } from "lucide-react";
import { AgentChat } from "@/components/ai/agent-chat";
import { Button } from "@/components/ui/button";
import { isPro } from "@/lib/entitlements";

const PRO_PERKS = [
  "AI Profile Optimizer — rewrite your headline, about & experience",
  "AI Job Matcher — match score + skill-gap analysis",
  "AI Outreach Writer — connection notes & recruiter DMs",
  "AI Career Plan — a 30/60/90-day roadmap",
];

export default async function AgentPage() {
  const pro = await isPro();

  if (!pro) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold">The AI Career Agent is a Pro feature</h1>
        <p className="mt-2 text-muted-foreground">
          Upgrade to put an AI agent to work on your career — grounded in your real
          CareerConnect profile and jobs.
        </p>
        <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm">
          {PRO_PERKS.map((p) => (
            <li key={p} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {p}
            </li>
          ))}
        </ul>
        <Button render={<Link href="/pricing" />} className="mt-6 gap-1.5">
          <Sparkles className="h-4 w-4" />
          Upgrade to Pro
        </Button>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="py-10 text-center text-muted-foreground">Loading…</div>}>
      <AgentChat />
    </Suspense>
  );
}
