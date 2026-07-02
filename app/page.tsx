import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Check,
  ClipboardList,
  Newspaper,
  PenLine,
  Route,
  Sparkles,
  Target,
  Users,
  Wand2,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";

const MARQUEE_ROLES = [
  "Product Designer",
  "Staff Engineer",
  "Data Scientist",
  "Growth Marketer",
  "Founding Engineer",
  "UX Researcher",
  "Product Manager",
  "ML Engineer",
  "DevRel Lead",
  "Brand Designer",
];

const STEPS = [
  {
    n: "01",
    title: "Build a profile that pops",
    desc: "Experience, skills, education — or let Eve's Profile Optimizer rewrite the whole thing for the role you're actually chasing.",
  },
  {
    n: "02",
    title: "Let Eve rank what's live",
    desc: "The Job Matcher scores every open role by fit and names the exact skill gaps standing in the way.",
  },
  {
    n: "03",
    title: "Apply, track, follow up",
    desc: "One pipeline for every application — submitted to offer — with recruiter outreach drafted in your voice.",
  },
];

const EVE_TOOLS = [
  {
    icon: Wand2,
    title: "Profile Optimizer",
    desc: "Headline, about, and experience bullets rewritten against your target role.",
    run: "profile_optimizer",
  },
  {
    icon: Target,
    title: "Job Matcher",
    desc: "Live openings ranked by match score, with the skill gaps that matter.",
    run: "job_matcher",
  },
  {
    icon: PenLine,
    title: "Outreach Writer",
    desc: "Connection notes and recruiter DMs in your voice — approve before anything sends.",
    run: "outreach_writer",
  },
  {
    icon: Route,
    title: "Career Plan",
    desc: "A 30/60/90-day roadmap with milestones, projects, and skills to learn.",
    run: "career_plan",
  },
];

const NETWORK_FEATURES = [
  {
    icon: Newspaper,
    title: "A feed worth reading",
    desc: "Updates, launches, hiring posts, and the occasional hot take.",
  },
  {
    icon: Users,
    title: "Follows & endorsements",
    desc: "Build your circle and endorse the skills you've actually seen.",
  },
  {
    icon: Briefcase,
    title: "A real job board",
    desc: "Filter by seniority, work mode, and salary — keep a shortlist.",
  },
  {
    icon: ClipboardList,
    title: "Application tracker",
    desc: "Every application and its stage, in one place instead of ten tabs.",
  },
  {
    icon: Building2,
    title: "Company pages",
    desc: "Follow companies and see who's behind every open role.",
  },
];

const PIPELINE = [
  {
    label: "New",
    count: 8,
    people: [
      { name: "Dana K.", match: "91%", dot: "bg-sky" },
      { name: "Femi A.", match: "87%", dot: "bg-apricot" },
      { name: "Lena W.", match: "82%", dot: "bg-paper/60" },
    ],
  },
  {
    label: "Interviewing",
    count: 3,
    people: [
      { name: "Marco P.", match: "94%", dot: "bg-sky" },
      { name: "Ines R.", match: "89%", dot: "bg-apricot" },
    ],
  },
  {
    label: "Offer",
    count: 1,
    people: [{ name: "Yuki T.", match: "96%", dot: "bg-apricot" }],
  },
];

function Eyebrow({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <p
      className={`flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.24em] ${
        dark ? "text-paper/50" : "text-ink/55"
      }`}
    >
      <span aria-hidden className="text-apricot">
        ✦
      </span>
      {children}
    </p>
  );
}

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/feed");

  return (
    <div className="lp lp-grain relative min-h-svh overflow-x-clip bg-paper text-ink">
      {/* ===== Nav ===== */}
      <header className="sticky top-0 z-40 border-b border-ink/8 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav
            aria-label="Primary"
            className="hidden items-center gap-7 text-sm font-medium text-ink/65 md:flex"
          >
            <a href="#how" className="transition-colors hover:text-ink">
              How it works
            </a>
            <a href="#agent" className="transition-colors hover:text-ink">
              Meet Eve
            </a>
            <a href="#companies" className="transition-colors hover:text-ink">
              For companies
            </a>
            <a href="#pricing" className="transition-colors hover:text-ink">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              render={<Link href="/sign-in" />}
              variant="ghost"
              size="sm"
              className="text-ink/75 hover:bg-ink/5 hover:text-ink"
            >
              Sign in
            </Button>
            <Button
              render={<Link href="/sign-up" />}
              size="sm"
              className="rounded-full bg-ink px-4 text-paper hover:bg-ink/85"
            >
              Join free
              <ArrowRight />
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ===== Hero ===== */}
        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(color-mix(in_oklch,var(--color-ink)_60%,transparent)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_80%_65%_at_50%_0%,black,transparent)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-44 top-16 size-[34rem] rounded-full bg-sky/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 bottom-0 size-72 rounded-full bg-apricot/20 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
            <div className="lp-stagger">
              <div className="flex flex-wrap items-center gap-3">
                <Eyebrow>The AI-native career network</Eyebrow>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/12 bg-white/60 px-2.5 py-1 font-mono text-[10px] tracking-wide text-ink/60">
                  <Sparkles className="size-3 text-primary" />
                  Powered by Vercel Eve
                </span>
              </div>

              <h1 className="mt-6 font-display text-[2.9rem]/[1.04] font-medium tracking-[-0.02em] sm:text-6xl/[1.03] lg:text-[4.4rem]/[1.02]">
                Your career just hired an{" "}
                <span className="lp-hl px-1 italic">agent</span>.
              </h1>

              <p className="mt-6 max-w-lg text-lg/relaxed text-ink-soft">
                CareerConnect pairs a real professional network with Eve — an AI
                career agent that polishes your profile, ranks live openings by
                fit, drafts your outreach, and maps your next 90 days. You
                approve every move.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  render={<Link href="/sign-up" />}
                  className="h-12 rounded-full bg-ink px-7 text-[15px] text-paper hover:bg-ink/85"
                >
                  Join free — get matched
                  <ArrowRight />
                </Button>
                <Button
                  render={<a href="#agent" />}
                  variant="outline"
                  className="h-12 rounded-full border-ink/15 bg-transparent px-6 text-[15px] text-ink hover:bg-ink/5 hover:text-ink"
                >
                  See Eve at work
                </Button>
              </div>

              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink/60">
                {[
                  "Free for job seekers",
                  "No credit card",
                  "Nothing saves without your OK",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-primary" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Product collage */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="relative z-10 rounded-3xl border border-ink/10 bg-white/90 p-5 shadow-[0_28px_80px_-32px_rgb(15_23_42/0.45)] backdrop-blur">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Sparkles className="size-4" />
                  </span>
                  <div className="leading-tight">
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      Eve
                      <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[9px] font-medium text-paper">
                        PRO
                      </span>
                    </p>
                    <p className="text-[11px] text-ink/50">Your career agent</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-sm text-paper">
                    I want a senior product role at an AI startup.
                  </p>
                  <div className="rounded-2xl rounded-bl-md bg-paper-deep p-3.5">
                    <p className="text-sm text-ink/80">
                      Scanned <span className="font-semibold">128</span> live
                      openings — 12 fit. Your top match:
                    </p>
                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-ink/10 bg-white p-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink/5">
                        <Building2 className="size-4 text-ink/60" />
                      </span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-sm font-semibold">
                          Senior Product Engineer
                        </p>
                        <p className="truncate text-xs text-ink/55">
                          Vercept · Remote · $170–210k
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                        94%
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap justify-end gap-1.5">
                      {["Next.js ✓", "AI SDK ✓", "+1 gap: evals"].map((s) => (
                        <span
                          key={s}
                          className="rounded-full border border-ink/10 bg-white px-2 py-0.5 text-[11px] text-ink/65"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[11px] text-ink/45">
                    <BadgeCheck className="size-3.5 text-primary" />
                    Eve asks before anything saves
                  </div>
                </div>
              </div>

              {/* Floating: application stage */}
              <div className="lp-float absolute -top-10 right-0 z-20 hidden w-60 rotate-2 rounded-2xl border border-ink/10 bg-white p-3.5 shadow-xl sm:block lg:-right-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45">
                  Application
                </p>
                <p className="mt-1 truncate text-sm font-semibold">
                  Vercept — Sr Product Eng
                </p>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className="h-1.5 flex-1 rounded-full bg-primary" />
                  <span className="h-1.5 flex-1 rounded-full bg-primary" />
                  <span className="h-1.5 flex-1 animate-pulse rounded-full bg-apricot" />
                  <span className="h-1.5 flex-1 rounded-full bg-ink/10" />
                </div>
                <p className="mt-1.5 text-[11px] font-medium text-ink/60">
                  Interviewing · round 2 booked
                </p>
              </div>

              {/* Floating: outreach draft */}
              <div className="lp-float absolute -bottom-12 -left-3 z-20 hidden w-64 -rotate-2 rounded-2xl border border-ink/10 bg-white p-3.5 shadow-xl [animation-delay:1.6s] sm:block lg:-left-10">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45">
                  <PenLine className="size-3" />
                  Outreach draft
                </p>
                <p className="mt-1.5 line-clamp-2 text-[13px] italic text-ink/70">
                  “Hi Maya — loved Vercept's agents launch. I've shipped three
                  Next.js AI products and…”
                </p>
                <span className="mt-2.5 inline-block rounded-full bg-apricot/40 px-2.5 py-1 text-[11px] font-semibold text-ink">
                  Approve & send
                </span>
              </div>

              {/* Floating: profile toast */}
              <div className="lp-float absolute -left-5 top-[4.6rem] z-20 hidden -rotate-3 items-center gap-2 rounded-full border border-ink/10 bg-white py-2 pl-2.5 pr-4 shadow-lg [animation-delay:0.8s] lg:flex xl:-left-10">
                <BadgeCheck className="size-4 text-primary" />
                <span className="text-xs font-medium text-ink/75">
                  Headline rewritten by Eve
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Marquee ===== */}
        <div
          aria-hidden
          className="lp-marquee relative overflow-hidden border-y border-ink/8 bg-paper-deep py-3.5"
        >
          <div className="lp-marquee-track flex w-max items-center gap-8 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
            {[...MARQUEE_ROLES, ...MARQUEE_ROLES].map((role, i) => (
              <span key={i} className="flex items-center gap-8">
                {role}
                <span className="text-apricot">✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* ===== How it works ===== */}
        <section id="how" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <Eyebrow>How it works</Eyebrow>
                  <h2 className="mt-4 font-display text-4xl font-medium tracking-[-0.015em] sm:text-5xl">
                    Three moves to hired.
                  </h2>
                </div>
                <p className="max-w-sm text-sm/relaxed text-ink-soft">
                  No endless scrolling, no spray-and-pray applications. Point
                  Eve at a goal and work the shortlist.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-10 border-t border-dashed border-ink/20 pt-10 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal key={step.n} delay={i * 120}>
                  <p className="font-display text-6xl/none italic text-ink/12">
                    {step.n}
                  </p>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm/relaxed text-ink-soft">
                    {step.desc}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Meet Eve ===== */}
        <section id="agent" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
            <div className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-white p-6 sm:p-10 lg:p-14">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-sky/20 blur-3xl"
              />
              <Reveal>
                <div className="relative max-w-2xl">
                  <Eyebrow>Meet Eve — included with Pro</Eyebrow>
                  <h2 className="mt-4 font-display text-4xl font-medium tracking-[-0.015em] sm:text-5xl">
                    The heavy lifting,{" "}
                    <span className="italic text-primary">handled</span>.
                  </h2>
                  <p className="mt-4 text-base/relaxed text-ink-soft">
                    Eve is grounded in your real profile and real openings — not
                    generic advice. Every suggestion arrives as a draft, and you
                    approve what saves, sends, or changes.
                  </p>
                </div>
              </Reveal>

              <div className="relative mt-10 grid gap-4 sm:grid-cols-2">
                {EVE_TOOLS.map((tool, i) => (
                  <Reveal key={tool.title} delay={(i % 2) * 120}>
                    <div className="group h-full rounded-2xl border border-ink/8 bg-paper p-6 transition-all duration-300 hover:-translate-y-1 hover:border-ink/15 hover:shadow-[0_18px_50px_-24px_rgb(15_23_42/0.35)]">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <tool.icon className="size-5" />
                      </span>
                      <h3 className="mt-4 text-lg font-semibold">
                        {tool.title}
                      </h3>
                      <p className="mt-1.5 text-sm/relaxed text-ink-soft">
                        {tool.desc}
                      </p>
                      <code className="mt-4 block font-mono text-[10px] text-ink/35">
                        eve.run(&quot;{tool.run}&quot;)
                      </code>
                    </div>
                  </Reveal>
                ))}
              </div>

              <Reveal>
                <div className="relative mt-6 flex flex-col items-start gap-4 rounded-2xl bg-ink p-5 text-paper sm:flex-row sm:items-center sm:p-6">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-apricot/20 text-apricot">
                    <BadgeCheck className="size-5" />
                  </span>
                  <p className="text-sm/relaxed text-paper/85">
                    <span className="font-semibold text-paper">
                      Approval-gated by design.
                    </span>{" "}
                    Eve proposes, you decide — and every run is logged to your
                    account.
                  </p>
                  <Button
                    render={<Link href="/sign-up" />}
                    size="sm"
                    className="rounded-full bg-paper px-4 text-ink hover:bg-paper/90 sm:ml-auto"
                  >
                    Meet Eve after you join
                    <ArrowUpRight />
                  </Button>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===== The network ===== */}
        <section className="border-t border-ink/8">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal>
              <Eyebrow>The network</Eyebrow>
              <h2 className="mt-4 font-display text-4xl font-medium tracking-[-0.015em] sm:text-5xl">
                Still a network{" "}
                <span className="lp-hl px-1 italic">at heart</span>.
              </h2>
              <p className="mt-4 max-w-md text-base/relaxed text-ink-soft">
                The agent is your edge — people are the point. Post, follow,
                endorse, and keep your job hunt organized in the same place your
                network lives.
              </p>
            </Reveal>

            <div>
              {NETWORK_FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 80}>
                  <div className="flex items-start gap-4 border-b border-ink/8 py-5 first:pt-0">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/70">
                      <f.icon className="size-4.5" />
                    </span>
                    <div>
                      <h3 className="font-semibold">{f.title}</h3>
                      <p className="mt-0.5 text-sm text-ink-soft">{f.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Quote ===== */}
        <section className="border-y border-ink/8 bg-paper-deep">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
            <Reveal>
              <p
                aria-hidden
                className="font-display text-6xl/none italic text-apricot"
              >
                &ldquo;
              </p>
              <blockquote className="mt-2 font-display text-2xl/snug font-medium tracking-[-0.01em] sm:text-3xl/snug">
                I stopped doom-scrolling job boards. Eve shortlists, I decide —
                and my applications actually go somewhere.
              </blockquote>
              <p className="mt-6 text-sm text-ink/55">
                Amara O. — Product Designer, matched in three weeks
              </p>
            </Reveal>
          </div>
        </section>

        {/* ===== For companies ===== */}
        <section id="companies" className="scroll-mt-20 bg-ink text-paper">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:py-28">
            <Reveal>
              <Eyebrow dark>For companies</Eyebrow>
              <h2 className="mt-4 font-display text-4xl font-medium tracking-[-0.015em] sm:text-5xl">
                Hiring? Watch your pipeline{" "}
                <span className="italic text-apricot">fill</span>.
              </h2>
              <p className="mt-5 max-w-lg text-base/relaxed text-paper/70">
                Spin up a company page, post roles in minutes, and review
                applicants who arrive with living profiles — experience, skills,
                endorsements — not PDF guesswork.
              </p>
              <ul className="mt-7 space-y-3 text-sm text-paper/85">
                {[
                  "Post roles with salary, seniority, and work mode",
                  "Move applicants from submitted → interviewing → offer",
                  "Bring your team — seats come with your organization",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-apricot" />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button
                  render={<Link href="/sign-up?type=company" />}
                  className="h-12 rounded-full bg-apricot px-7 text-[15px] font-semibold text-ink hover:bg-apricot/90"
                >
                  Start hiring
                  <ArrowUpRight />
                </Button>
                <Button
                  render={<a href="#pricing" />}
                  variant="outline"
                  className="h-12 rounded-full border-paper/25 bg-transparent px-6 text-[15px] text-paper hover:bg-paper/10 hover:text-paper"
                >
                  Company Pro — $99/mo
                </Button>
              </div>
            </Reveal>

            {/* Pipeline mock */}
            <Reveal delay={150}>
              <div className="rounded-3xl border border-paper/12 bg-white/[0.04] p-5 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-apricot/20 text-apricot">
                      <Building2 className="size-4" />
                    </span>
                    <div className="leading-tight">
                      <p className="text-sm font-semibold">Acme Labs</p>
                      <p className="text-[11px] text-paper/50">
                        Senior Product Engineer
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-paper/15 px-2.5 py-1 font-mono text-[10px] text-paper/60">
                    3 open roles
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {PIPELINE.map((col) => (
                    <div key={col.label}>
                      <p className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-paper/50">
                        {col.label}
                        <span className="text-paper/80">{col.count}</span>
                      </p>
                      <div className="mt-2 space-y-2">
                        {col.people.map((p) => (
                          <div
                            key={p.name}
                            className={`flex items-center gap-2 rounded-lg border p-2 ${
                              col.label === "Offer"
                                ? "border-apricot/50 bg-apricot/10"
                                : "border-paper/10 bg-white/[0.05]"
                            }`}
                          >
                            <span
                              className={`size-5 shrink-0 rounded-full ${p.dot}`}
                            />
                            <div className="min-w-0 leading-tight">
                              <p className="truncate text-[11px] font-medium">
                                {p.name}
                              </p>
                              <p className="font-mono text-[10px] text-paper/50">
                                {p.match}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-paper/10 pt-4 text-[11px] text-paper/55">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" />4 teammates reviewing
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 animate-pulse rounded-full bg-apricot" />
                    Updated live
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== Pricing ===== */}
        <section id="pricing" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <div className="flex justify-center">
                  <Eyebrow>Pricing</Eyebrow>
                </div>
                <h2 className="mt-4 font-display text-4xl font-medium tracking-[-0.015em] sm:text-5xl">
                  Start free. Upgrade when it{" "}
                  <span className="lp-hl px-1 italic">pays for itself</span>.
                </h2>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {/* Free */}
              <Reveal>
                <div className="flex h-full flex-col rounded-3xl border border-ink/10 bg-white p-7">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
                    Free
                  </p>
                  <p className="mt-3 font-display text-4xl font-medium">
                    $0{" "}
                    <span className="text-base italic text-ink/45">
                      forever
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    The network — everything you need to show up and apply.
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink/75">
                    {[
                      "Profile, feed & posts",
                      "Browse, filter & save jobs",
                      "Follow people & endorse skills",
                      "Track every application",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <Button
                    render={<Link href="/sign-up" />}
                    variant="outline"
                    className="mt-7 h-11 w-full rounded-full border-ink/15 text-ink hover:bg-ink/5 hover:text-ink"
                  >
                    Join free
                  </Button>
                </div>
              </Reveal>

              {/* Pro */}
              <Reveal delay={120}>
                <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-ink p-7 text-paper shadow-[0_28px_70px_-30px_rgb(15_23_42/0.6)]">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-sky/25 blur-3xl"
                  />
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/55">
                      Pro
                    </p>
                    <span className="rounded-full bg-apricot px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink">
                      Most loved
                    </span>
                  </div>
                  <p className="mt-3 font-display text-4xl font-medium">
                    The <span className="italic text-apricot">agent</span>
                  </p>
                  <p className="mt-2 text-sm text-paper/65">
                    Everything in Free, plus Eve working your search.
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm text-paper/85">
                    {[
                      "Eve — your AI career agent chat",
                      "Profile Optimizer & Job Matcher",
                      "Outreach Writer & Career Plan",
                      "Approval-gated, every single run",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-apricot" />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <Button
                    render={<Link href="/sign-up" />}
                    className="mt-7 h-11 w-full rounded-full bg-apricot font-semibold text-ink hover:bg-apricot/90"
                  >
                    Go Pro
                    <Sparkles />
                  </Button>
                </div>
              </Reveal>

              {/* Company Pro */}
              <Reveal delay={240}>
                <div className="flex h-full flex-col rounded-3xl border border-ink/10 bg-white p-7">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
                    Company Pro
                  </p>
                  <p className="mt-3 font-display text-4xl font-medium">
                    $99{" "}
                    <span className="text-base italic text-ink/45">
                      /mo per org
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    The pipeline — for teams that are actively hiring.
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink/75">
                    {[
                      "Company page & job posts",
                      "Applicant pipeline with stages",
                      "Team seats via your organization",
                      "Billing managed in-app",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <Button
                    render={<Link href="/sign-up?type=company" />}
                    variant="outline"
                    className="mt-7 h-11 w-full rounded-full border-ink/15 text-ink hover:bg-ink/5 hover:text-ink"
                  >
                    Start hiring
                  </Button>
                </div>
              </Reveal>
            </div>

            <p className="mt-8 text-center text-xs text-ink/45">
              Full plan details and checkout live in the app once you&apos;re
              signed in.
            </p>
          </div>
        </section>

        {/* ===== Final CTA ===== */}
        <section className="relative border-t border-ink/8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(color-mix(in_oklch,var(--color-ink)_60%,transparent)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_70%_80%_at_50%_100%,black,transparent)]"
          />
          <div className="relative mx-auto max-w-3xl px-4 py-28 text-center sm:px-6">
            <Reveal>
              <p
                aria-hidden
                className="font-display text-3xl italic text-apricot"
              >
                ✦
              </p>
              <h2 className="mt-4 font-display text-5xl/[1.05] font-medium tracking-[-0.02em] sm:text-6xl/[1.04]">
                Be first in line for{" "}
                <span className="lp-hl px-1 italic">what&apos;s next</span>.
              </h2>
              <p className="mx-auto mt-5 max-w-md text-base/relaxed text-ink-soft">
                Join free, build a profile that pops, and put an agent on your
                side of the table.
              </p>
              <div className="mt-9 flex justify-center">
                <Button
                  render={<Link href="/sign-up" />}
                  className="h-13 rounded-full bg-ink px-9 text-base text-paper hover:bg-ink/85"
                >
                  Join CareerConnect free
                  <ArrowRight />
                </Button>
              </div>
              <p className="mt-4 text-xs text-ink/45">
                Takes about a minute. Bring your ambition.
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo className="text-paper" />
            <p className="mt-3 max-w-xs text-sm/relaxed text-paper/55">
              The career network with an agent on your side of the table.
            </p>
          </div>
          {[
            {
              head: "Product",
              links: [
                { label: "How it works", href: "#how" },
                { label: "Meet Eve", href: "#agent" },
                { label: "Pricing", href: "#pricing" },
              ],
            },
            {
              head: "Job seekers",
              links: [
                { label: "Join free", href: "/sign-up" },
                { label: "Sign in", href: "/sign-in" },
              ],
            },
            {
              head: "Companies",
              links: [
                { label: "Start hiring", href: "/sign-up?type=company" },
                { label: "Company Pro", href: "#companies" },
              ],
            },
          ].map((col) => (
            <div key={col.head}>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/45">
                {col.head}
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) =>
                  l.href.startsWith("#") ? (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="text-paper/75 transition-colors hover:text-paper"
                      >
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-paper/75 transition-colors hover:text-paper"
                      >
                        {l.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-paper/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6">
            <p className="text-xs text-paper/45">
              © {new Date().getFullYear()} CareerConnect — a demo build.
            </p>
            <p className="font-mono text-[11px] text-paper/40">
              Next.js · Convex · Clerk · Vercel Eve
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
