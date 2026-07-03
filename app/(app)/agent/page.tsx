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
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-apricot">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          The AI Career Agent is a Pro feature
        </h1>
        <p className="mt-2 text-muted-foreground">
          Upgrade to put an AI agent to work on your career — grounded in your real
          CareerConnect profile and jobs.
        </p>
        <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-ink p-5 text-left text-paper">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-paper/60">
            Included with Pro
          </p>
          <ul className="mt-3 space-y-2.5 text-sm text-paper/90">
            {PRO_PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-apricot" />
                {p}
              </li>
            ))}
          </ul>
        </div>
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
