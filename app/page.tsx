import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  Sparkles,
  Briefcase,
  Users,
  Wand2,
  Target,
  MessagesSquare,
  ArrowRight,
  Check,
  Bookmark,
  Building2,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FREE = [
  { icon: Users, title: "Build your profile", desc: "Headline, experience, skills, projects." },
  { icon: Briefcase, title: "Browse & save jobs", desc: "Filter roles and keep a shortlist." },
  { icon: MessagesSquare, title: "Grow your network", desc: "Follow people, post, and comment." },
];

const PRO = [
  { icon: Wand2, title: "AI Profile Optimizer", desc: "Rewrite your headline, about, and experience for a target role." },
  { icon: Target, title: "AI Job Matcher", desc: "Rank real jobs by match score and reveal your skill gaps." },
  { icon: MessagesSquare, title: "AI Outreach Writer", desc: "Draft recruiter connection notes and DMs — you approve before saving." },
  { icon: Sparkles, title: "AI Career Plan", desc: "A concrete 30/60/90-day roadmap toward your goal." },
];

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/feed");

  return (
    <div className="flex min-h-svh flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Button render={<Link href="/sign-in" />} variant="ghost" size="sm">
              Sign in
            </Button>
            <Button render={<Link href="/sign-up" />} size="sm" className="gap-1.5">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Powered by Vercel Eve
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Grow your career with an{" "}
              <span className="text-primary">AI Career Agent</span>.
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              CareerConnect is a professional network with an AI agent that optimizes your
              profile, matches you to real jobs, drafts recruiter outreach, and builds your
              career plan — grounded in your data, with your approval.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button render={<Link href="/sign-up" />} size="lg" className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                Get started free
              </Button>
              <Button render={<Link href="/sign-in" />} size="lg" variant="outline">
                Sign in
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Free to join. Upgrade to Pro to unlock the AI Career Agent.
            </p>
          </div>

          {/* Product preview */}
          <div className="relative">
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium">AI Career Agent</span>
                <Badge className="ml-auto gap-1 text-[10px]">
                  <Sparkles className="h-3 w-3" /> Pro
                </Badge>
              </div>
              <div className="space-y-2">
                {[
                  { t: "AI Engineer", c: "Vercept", m: 92 },
                  { t: "Full Stack AI Developer", c: "Synthiel AI", m: 88 },
                  { t: "Next.js Platform Engineer", c: "Cartograph Labs", m: 84 },
                ].map((j) => (
                  <div
                    key={j.t}
                    className="flex items-center gap-3 rounded-lg border p-2.5"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{j.t}</p>
                      <p className="truncate text-xs text-muted-foreground">{j.c}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 font-mono text-[11px]">
                      {j.m}% match
                    </Badge>
                    <Bookmark className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs">
                <p className="font-medium">Approve to save</p>
                <p className="mt-0.5 text-muted-foreground">
                  New headline: “Frontend Engineer moving into AI — Next.js + AI SDK”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free features */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          Everything you need, free
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {FREE.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <f.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-medium">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pro / AI */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="mb-8 text-center">
            <Badge className="mb-3 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Pro
            </Badge>
            <h2 className="text-2xl font-semibold tracking-tight">
              The AI Career Agent does the heavy lifting
            </h2>
            <p className="mt-2 text-muted-foreground">
              Four AI tools that act on your real profile and jobs — nothing saves without
              your approval.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PRO.map((f) => (
              <div key={f.title} className="flex gap-3 rounded-xl border bg-card p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Ready to level up your career?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Join CareerConnect free, then let the AI Career Agent go to work.
        </p>
        <ul className="mx-auto mt-5 flex max-w-md flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {["Free to join", "Real jobs & people", "Approval-gated AI"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-primary" />
              {t}
            </li>
          ))}
        </ul>
        <Button render={<Link href="/sign-up" />} size="lg" className="mt-6 gap-1.5">
          <Sparkles className="h-4 w-4" />
          Get started free
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} CareerConnect. A demo app.</p>
        </div>
      </footer>
    </div>
  );
}
