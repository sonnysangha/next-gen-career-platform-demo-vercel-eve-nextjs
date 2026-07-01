# CareerConnect — LinkedIn-style network with an AI Career Agent

A full-stack SaaS demo: a professional network where **Free** users get the social + jobs
experience and **Pro** users unlock a **Vercel Eve**–powered **AI Career Agent** that
optimizes profiles, matches jobs, drafts recruiter outreach, and builds career plans — all
grounded in real data, with human approval before anything is saved.

**Stack:** Next.js 16 (App Router, React 19) · Convex (data/backend) · Clerk (Auth +
Billing) · Vercel Eve (backend AI agent, Sonnet 5 via AI Gateway) · shadcn/ui + Tailwind v4
· Faker (seed).

---

## Prerequisites

- Node 20+ (24 recommended) and **pnpm**
- A **Clerk** account — create one via **https://go.clerk.com/sonny**
- A **Convex** account (free)
- A **Vercel AI Gateway** API key (for the Eve agent's model)

---

## 1. Install

```bash
pnpm install
```

## 2. Convex (database)

```bash
pnpm convex        # = npx convex dev — logs in, creates a dev deployment, writes convex/_generated
```

Leave this running (or run once). It sets `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT`
in `.env.local` and generates `convex/_generated/`.

## 3. Clerk (auth + billing)

1. Create an app at **https://go.clerk.com/sonny** → copy the API keys.
2. **JWT template**: Clerk Dashboard → **JWT Templates** → **New** → **Convex** → name it
   exactly `convex`. Copy the **Issuer** (Frontend API URL).
3. **Billing** (features/plan): either the **Clerk Dashboard** (Billing → enable → create a
   **Pro** plan → add features `ai_profile_optimizer`, `ai_job_matcher`,
   `ai_outreach_writer`, `ai_career_plan`), **or** the **Clerk CLI** (faster):
   ```bash
   clerk enable billing --for users
   clerk config patch --file clerk-billing.json   # billing.features + billing.plans (see clerk config schema --keys billing)
   ```
   Then copy the Pro plan id from `clerk api /billing/plans` into
   `NEXT_PUBLIC_CLERK_PRO_PLAN_ID` (looks like `cplan_…`).

## 4. Environment variables

Copy `.env.local.example` → `.env.local` and fill in:

| Var | Where |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk → API Keys |
| `NEXT_PUBLIC_CLERK_PRO_PLAN_ID` | Clerk → Billing → Pro plan (`cplan_…`) |
| `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT` | set by `pnpm convex` |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk → JWT template issuer |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway |
| `EVE_CONVEX_SECRET` | any long random string (used by the Eve↔Convex bridge) |

Then set the two server-side vars **on the Convex deployment** too:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-domain.clerk.accounts.dev
npx convex env set EVE_CONVEX_SECRET <the-same-value-as-.env.local>
```

## 5. Seed data

```bash
pnpm seed          # = npx convex run seed:run  (idempotent: clears + reseeds)
```

Seeds ~13 companies, ~40 professionals, 50 jobs (incl. the 6 Alex-Carter storyline jobs),
100 posts, comments, likes, follows, and recruiters.

**Generate job match embeddings** (powers the `% match` on the Jobs page via vector
similarity through the AI Gateway — requires `AI_GATEWAY_API_KEY` set on the deployment):

```bash
npx convex run embeddings:embedJobs
```

Each user's profile embedding is computed automatically when they open the Jobs page; the
`% match` is the cosine similarity between the profile and job embeddings.

## 6. Run

```bash
pnpm dev           # Next.js + the Eve agent run together (withEve)
```

Open http://localhost:3000 → sign up → you land on the feed.

---

## The Alex Carter demo

CareerConnect uses real Clerk sign-in, so the demo runs on **your** account:

1. Sign up / sign in.
2. Open your profile (top-right avatar) and click **“Become Alex Carter”** — this loads the
   handcrafted weak profile (Frontend Dev → wants to be a Next.js AI Engineer), his
   experience/skills, a saved job, and a weak outreach draft.
3. Browse **Jobs**, save a few, click **“Match me with AI”** → as a Free user you'll see the
   **locked** upgrade card.
4. Go to **Pricing** → **Upgrade to Pro** (dev test card `4242 4242 4242 4242`, any future
   expiry/CVC).
5. Now the AI features unlock:
   - **AI Job Matcher** — ranks real jobs, shows match score + missing skills.
   - **AI Profile Optimizer** — proposes an old-vs-new rewrite → **approve** to save the
     draft → apply it to your live profile from the profile page.
   - **AI Outreach Writer** — drafts a connection note + recruiter DM → **approve** to save.
   - **AI Career Plan** — a 30/60/90-day plan → **approve** to save.

Every save is **human-approved** inside the agent chat before it persists. Reset/reseed
anytime with `pnpm seed`.

---

## How the AI is gated (server-side)

- **Eve channel** (`agent/channels/eve.ts`) authenticates the Clerk session and **requires
  the Pro plan** before the agent runs.
- The `/agent` page is server-gated with Clerk `has({ plan: "pro" })`; Free users see an
  upgrade screen.
- The three `save_*` Eve tools use `approval: always()` — the run pauses for human approval.
- Eve tools reach Convex via a **secret-guarded** `convex/eve.ts` bridge (never the client).

## Deploy (Vercel)

The Next.js app and the Eve agent deploy as **one** Vercel project (`withEve`).

```bash
vercel        # or connect the repo in the Vercel dashboard
```

Set all env vars from step 4 in the Vercel project settings, run `npx convex deploy` for a
prod deployment, and set `CLERK_JWT_ISSUER_DOMAIN` / `EVE_CONVEX_SECRET` on the prod Convex
deployment.

---

## Project layout

```
app/(app)/        feed, jobs, companies, outreach, agent, pricing, profile
app/(auth)/       custom sign-in / sign-up
agent/            Eve agent: agent.ts, instructions.md, channels/eve.ts, tools/*
convex/           schema, queries/mutations, ai.ts (internal), eve.ts (bridge), seed.ts, demo.ts
components/       shared UI (feed, jobs, ai, layout) + shadcn/ui
lib/              entitlements (server), ai-features, format helpers
```
