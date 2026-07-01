# CareerConnect — LinkedIn-style clone with a Vercel Eve AI Career Agent

## Context

Build a polished, livestream-ready full-stack SaaS demo: a LinkedIn-style professional
network ("CareerConnect") where **free** users get the core social/job experience and
**Pro** users unlock a **Vercel Eve**-powered AI Career Agent (profile optimizer, job
matcher, outreach writer, career planner). The signature demo is **Alex Carter**, a
frontend dev with a deliberately weak profile who wants to become a Next.js AI Engineer —
the "wow" moment is running the Pro AI agent on his account live, with human-approval gates.

**Existing state:** fresh `create-next-app` — Next.js 16.2.9, React 19.2 (React Compiler
on), Tailwind v4, TS, `@/*` alias, Geist fonts. `eve@0.17.1` is now installed (docs read
from `node_modules/eve/docs/`). Still to add: Clerk, Convex, shadcn/ui, lucide-react,
@faker-js/faker. Node local = v22.22.3 (builds fine; spec suggested 24+ — non-blocking).

**Research is complete and source-verified** for Eve (v0.17.1 bundled docs), Clerk (Auth +
Billing + Convex wiring), and Convex (schema/indexes/seed/server calls). Exact APIs below.

---

## Architecture (how the pieces fit)

```
Browser (Next.js App Router, React 19, shadcn/ui)
  │  Clerk cookies on every request
  ├── App pages: Feed / Profile / Jobs / Companies / Outreach / Agent
  ├── Convex live data via ConvexProviderWithClerk (react hooks)
  └── AI Career Agent: useEveAgent() → same-origin /eve/v1/* (mounted by withEve)
                                          │
                        agent/channels/eve.ts  ← custom Clerk auth verifier
                        (rejects non-signed-in; sets principalId = Clerk userId)
                                          │
                        Eve runtime (agent/agent.ts + tools/*)
                          tools read/write Convex via ConvexHttpClient
                          save_* tools gated with approval: always()  ← HITL
```

- **One Vercel project.** `withEve(nextConfig)` runs Next.js + the Eve runtime together
  (one dev server, one deploy). No CORS, no cross-origin URL env vars.
- **Convex** is the source of truth for all app data; Clerk `userId` is the identity.
- **Eve tools** are the only path that mutates AI-generated artifacts, and the three
  `save_*` tools carry `approval: always()` so nothing persists without a human click.

---

## Tech decisions (locked)

- **Model:** Eve gateway string `model: "anthropic/claude-sonnet-5"` in `agent/agent.ts`,
  authed via `AI_GATEWAY_API_KEY` (Vercel AI Gateway — the platform default).
- **Eve agent location:** `agent/` at repo root, created manually (not `eve init`, which
  scaffolds a fresh project) alongside the existing Next.js app. `next.config.ts` wrapped
  with `withEve()` (keeping `reactCompiler: true`).
- **Clerk middleware:** `middleware.ts` with `clerkMiddleware()` + `createRouteMatcher`
  (Clerk's documented convention; Next 16 accepts it). Matcher must let `/eve/v1/*` pass
  through so the Eve channel can read Clerk cookies.
- **AI gating (server-side, two layers):**
  1. **Channel gate** — `agent/channels/eve.ts` custom `AuthFn` verifies the Clerk session
     from the request; unauthenticated → `null` (401). Sets `principalId = clerkUserId` so
     tools get identity via `ctx.session.auth.current.principalId`.
  2. **Feature gate** — each discrete AI button ("Match me with AI", "Improve with AI",
     etc.) first calls a **Server Action** that runs `await auth()` + `has({ feature })`;
     locked → returns locked state (upgrade UI), never reaching Eve. Feature slugs:
     `ai_profile_optimizer`, `ai_job_matcher`, `ai_outreach_writer`, `ai_career_plan`.
- **Billing:** **Real Clerk Billing only** (user decision) — no local `DEMO_FORCE_PRO`
  toggle. **Clerk handles billing/checkout end-to-end; the app never touches Stripe.** Pro
  state comes solely from a real Pro subscription. Requires Clerk dashboard setup (Billing
  enabled, Pro plan, 4 feature slugs) before the demo.
- **Custom pricing page (not the prebuilt `<PricingTable/>`):** build our own shadcn plan
  cards on `/pricing`, and wire each CTA with **`<CheckoutButton>` from
  `@clerk/nextjs/experimental`** — `planId` = the dashboard `cplan_…` id, `planPeriod`,
  custom `children` for the styled button, `onSubscriptionComplete`/
  `newSubscriptionRedirectUrl` to route back, and `checkoutProps.appearance` to theme the
  drawer. Must be wrapped in `<Show when="signed-in">` (from `@clerk/nextjs`). Use
  `has({ plan })` to render current-plan state / hide the CTA for existing Pro users. Clerk
  opens its own checkout drawer; on a **development** instance it accepts a test card
  (`4242 4242 4242 4242`) to complete the Free→Pro upgrade live.
- **Sign-in:** custom in-app `<SignIn/>`/`<SignUp/>` pages under `/sign-in`, `/sign-up`
  (polished, on-brand) with Clerk.

---

## Tooling: use the official CLIs, skills & MCPs (don't hand-roll setup)

Every provider is set up through its own CLI/skill/MCP rather than guessed config:

- **shadcn/ui** — `npx shadcn@latest init` + `shadcn add …`; the `shadcn` skill for
  composition/theming.
- **Convex** — `npx convex dev` (codegen + deploy), `npx convex run seed:run` (seed);
  the **`convex:convex-expert` subagent** authors everything under `convex/`; the
  **Convex MCP** (`mcp__plugin_convex_convex__*`: `tables`, `run`, `runOneoffQuery`,
  `data`, `logs`, `status`, `envSet/envGet`) to inspect/verify data and set the
  `CLERK_JWT_ISSUER_DOMAIN` env on the deployment.
- **Clerk** — `@clerk/clerk-cli` (`clerk`) for env keys / instance config; the
  **`clerk-cli`** and **`clerk-billing`** skills; the **Clerk MCP** snippet tools
  (`mcp__4e7e4b63…__clerk_sdk_snippet` / `list_clerk_sdk_snippets`) to pull exact,
  current SDK snippets for App-Router auth, `ConvexProviderWithClerk`, `has()` gating,
  and billing. **README must direct viewers to create their Clerk account via the referral
  link `go.clerk.com/sonny`.**
- **Eve** — `npx eve` CLI (`eve build`, `eve dev`, `eve info`); source of truth is the
  installed `node_modules/eve/docs/` (already read).
- **Vercel** — the **Vercel MCP** (`mcp__49c02018…__search_vercel_documentation`,
  `deploy_to_vercel`, `get_deployment(_build_logs)`, `get_runtime_errors/logs`) for
  docs, deploy, and post-deploy verification; the `vercel:deploy` / `vercel:env` skills;
  AI via **AI Gateway** (`AI_GATEWAY_API_KEY`).
- **Docs** — **context7 MCP** for any library API I'm unsure about at build time.
- **Faker** — `@faker-js/faker` for seed data.

> **No Stripe integration.** Clerk Billing handles all billing/checkout; we never wire
> Stripe. **Auth note (needs the user, once):** the Clerk, Convex, Vercel, and context7
> MCPs above are already connected. Provider **dashboard** steps that no CLI can do (enable
> Clerk Billing, create the Pro plan + 4 feature slugs, add the `convex` JWT template)
> remain manual and are called out in the build steps.

---

## Data model (Convex) — `convex/schema.ts`

Object-form functions only (`args` + `returns` + `handler`); `v.id("table")` for FKs;
`v.optional(...)` for nullable; return `null` (never `undefined`); reads use `withIndex`,
never `.filter()`. Identity via `ctx.auth.getUserIdentity()` (`.subject` = Clerk userId).

Tables: `users, profiles, experiences, skills, companies, jobs, posts, comments, likes,
follows, savedJobs, recruiters, outreachDrafts, profileDrafts, careerPlans, aiRuns`.

Indexes: `users.by_clerkId`; `profiles.by_userId`, `profiles.by_username`;
`jobs.by_companyId` (+ optional by role/seniority/location); `savedJobs.by_user_and_job`;
`follows.by_follower`, `by_following`, `by_follower_and_following`; drafts `by_userId`.
Feed uses built-in `by_creation_time` + `.order("desc")` (no custom index).

Functions: `getCurrentUser, upsertCurrentUser, getFeed, createPost, toggleLike, addComment,
getProfileByUsername, updateProfile, getCompanies, getCompanyBySlug, getJobs, getJobById,
saveJob, unsaveJob, getSavedJobs, getRecruitersForJob, saveProfileDraft, saveOutreachDraft,
saveCareerPlan, recordAiRun`. `upsertCurrentUser` lazily creates the `users` + `profiles`
row on first authenticated call. **AI writers are `internalMutation`** (the security
boundary) called by Eve tools; public queries power the React UI.

`convex/auth.config.ts`: `{ providers: [{ domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
applicationID: "convex" }] }` (needs a Clerk JWT template named `convex`).

---

## Eve agent — `agent/`

```
agent/
  agent.ts            defineAgent({ model: "anthropic/claude-sonnet-5", reasoning: "medium" })
  instructions.md     Career Agent persona: concise, practical, career-focused; must ask
                      approval before saving; never pretend to send/apply.
  channels/eve.ts     eveChannel({ auth: [clerkAuth(), localDev()] })  ← Clerk verifier
  lib/convex.ts       ConvexHttpClient helper (NEXT_PUBLIC_CONVEX_URL) for tools
  tools/
    get_user_profile.ts        get_relevant_jobs.ts     analyze_skill_gap.ts
    create_profile_rewrite.ts  save_profile_draft.ts    ← approval: always()
    create_outreach_draft.ts   save_outreach_draft.ts   ← approval: always()
    create_career_plan.ts      save_career_plan.ts       ← approval: always()
```

Tool shape (verified): `export default defineTool({ description, inputSchema: z.object({…}),
outputSchema?, approval?, async execute(input, ctx) {…} })` from `eve/tools`; approval
helpers `always()/once()/never()` from `eve/tools/approval`. Tools read the Clerk userId
from `ctx.session.auth.current.principalId` and call Convex (public queries for reads,
`internal.*` mutations for the approval-gated writes). `create_*` tools return structured
JSON for card rendering; `save_*` tools pause via `input.requested` until approved.

---

## Pages (App Router)

1. **Feed** `/` (first screen): left profile sidebar, center composer + posts, right
   suggested jobs/people. Like/comment via Convex mutations.
2. **Profile** `/in/[username]`: cover, avatar, headline, about, experience, skills,
   projects, activity; "Improve with AI" (locked free / Eve optimizer Pro, old-vs-new diff
   - approve).
3. **Jobs** `/jobs`: searchable/filterable list + detail panel; save; recruiter/company
   links; "Match me with AI" (locked/Pro, ranked results + skill-gap cards).
4. **Companies** `/companies/[slug]`: profile, open roles, employees/recruiters, posts.
5. **Outreach** `/outreach`: recruiter cards, draft list, "Draft outreach with AI" +
   approval before save.
6. **AI Career Agent** `/agent`: `useEveAgent()` chat/task dashboard, suggested prompts,
   streaming, inline approval prompts (reads `input.requested`, answers via `inputResponses`).
7. **Pricing** `/pricing`: custom shadcn plan cards with `<CheckoutButton>` CTAs (no
   prebuilt `<PricingTable/>`). Sign-in/up at `/sign-in`, `/sign-up`.

Design: LinkedIn-inspired (not copied), dense dashboard, lucide icons, responsive/mobile,
no nested cards, no giant hero. Every AI feature: locked → loading → streaming → result →
approval → saved → error. Skeleton + empty + error states throughout.

---

## Seed — `convex/seed.ts` (`internalMutation`, run via `npx convex run seed:run`)

Idempotent (clear-then-reinsert). `@faker-js/faker` imported directly into the Convex V8
function with `faker.seed(N)` for determinism. Bulk: 30–50 professionals, 10–15 companies,
40–60 jobs, 80–120 posts + comments/likes, follow graph, recruiter links. **Handcrafted
fixed block for Alex Carter** (`alex-carter`, London, Frontend Dev → Next.js AI Engineer,
weak headline/about, missing AI-SDK/RAG/agents/evals), 3 strong + 3 stretch jobs with tied
recruiters, ≥1 saved job, weak existing outreach draft. Wrap `pnpm seed` →
`convex run seed:run`. Document reset/reseed in README.

---

## Env vars — `.env.local.example` (documented placeholders, no real secrets)

Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
`NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`,
`NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/`,
`CLERK_WEBHOOK_SECRET` (if webhooks). Convex: `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`,
`CLERK_JWT_ISSUER_DOMAIN` (also set in Convex dashboard). Eve/AI: `AI_GATEWAY_API_KEY`.

---

## Build sequence

1. **Foundations:** `npx shadcn@latest init` + add base components; install lucide + faker;
   app-shell layout (top nav + left/right rails), theme, `.env.local.example`.
2. **Convex** _(via `convex:convex-expert` subagent)_: schema + indexes + `auth.config.ts`;
   `npx convex dev`; public queries/mutations; `getCurrentUser`/`upsertCurrentUser`. Verify
   with the **Convex MCP** (`tables`, `data`).
3. **Clerk** _(via `clerk-cli` skill + Clerk MCP snippets)_: `clerk` CLI for env keys;
   ClerkProvider, `middleware.ts`, sign-in/up pages, `ConvexProviderWithClerk`; route
   protection; lazy profile upsert. **Manual dashboard:** add `convex` JWT template.
4. **Seed:** `convex/seed.ts` + `pnpm seed` (→ `convex run seed:run`); verify Alex + bulk
   data via Convex MCP.
5. **Core pages** (free-tier): Feed, Profile, Jobs, Companies, Outreach on live Convex data.
6. **Billing (real Clerk Billing only)** _(via `clerk-billing` skill + Clerk MCP)_:
   **manual dashboard** — enable Billing, create Pro plan + 4 feature slugs (note the
   `cplan_…` id); then build a **custom** `/pricing` (shadcn cards + `<CheckoutButton>` from
   `@clerk/nextjs/experimental`, wrapped in `<Show when="signed-in">`), upgrade modal,
   `has()` server actions, locked-card UI. Demo Free→Pro live through Clerk's checkout drawer
   (dev instance accepts test card `4242 4242 4242 4242`). No Stripe wiring.
7. **Eve:** `withEve()` in next.config; `agent/` (agent.ts, instructions.md, channels/eve.ts
   Clerk verifier, lib/convex.ts); 9 tools with the 3 approval gates; `eve build`/`eve info`.
8. **AI UX:** `/agent` dashboard with `useEveAgent`; feature buttons on Profile/Jobs/
   Outreach that gate then drive the agent; approval diff UIs (old-vs-new profile, outreach
   preview, career plan save); all 7 UX states.
9. **Verify + ship:** `pnpm lint` + `tsc`, full demo path (Preview MCP/browser), README,
   deploy via **Vercel MCP `deploy_to_vercel`** (or `vercel:deploy` skill), then check
   `get_deployment_build_logs` / `get_runtime_errors`.

---

## Verification (end-to-end, matches livestream script)

Sign in as Alex → weak profile → browse/save jobs → "Match me with AI" as **free** →
locked upgrade UI → flip to **Pro** (Clerk checkout drawer, dev test card) → Job Matcher (ranked +
skill gaps) → Profile Optimizer (old-vs-new → **approve** → saved) → Outreach Writer
(preview → **approve** → saved) → 90-day plan → save → `vercel deploy`. Plus mechanical:
`pnpm install`, `pnpm dev`, `npx convex dev`, `pnpm seed`, protected routes redirect,
server gate blocks a free user from Eve even if UI is bypassed, `pnpm lint` + `tsc`,
mobile layout. Use the Preview MCP / browser to click through the flow before deploy.

---

## Risks / watch-items

- Eve is **preview** (v0.17.1) — APIs may shift; pin the version.
- Clerk Billing needs dashboard setup (plan + feature slugs + JWT template `convex`) done
  **before** the stream. Real-Billing-only (per your decision) means no local override — do
  a dry run of the Free→Pro upgrade through Clerk's checkout drawer (dev test card) ahead of
  going live.
- Ensure `clerkMiddleware` matcher does not strip Clerk cookies from `/eve/v1/*`.
- Per-feature (vs per-plan) enforcement lives in the Server Action layer; the channel gate
  is plan/identity level — keep both.
