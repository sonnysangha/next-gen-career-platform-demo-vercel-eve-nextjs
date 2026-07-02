import { v } from "convex/values";
import { faker } from "@faker-js/faker";
import { internalMutation } from "./_generated/server";
import { MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Repeatable network seed.
 *
 * Run with:  npx convex run seed:run
 *
 * Idempotent: wipes every table, then re-inserts a deterministic network
 * (faker is seeded with 12345). Insert order respects foreign keys:
 *   companies -> recruiters -> jobs -> users -> profiles/experiences/education/
 *   skills -> skillEndorsements -> posts -> comments/likes -> follows
 *   -> applications.
 *
 * Every job is linked to a company (companyId), every experience to its
 * seeded company where one matches, every application to a (user, job,
 * company) triple, and every endorsement count is backed by real
 * skillEndorsements rows.
 *
 * Volume (a few thousand rows total) fits comfortably inside a single
 * mutation's read/write budget.
 */

// ── Canonical constants ──────────────────────────────────────────────

/** dicebear helpers keep imageUrl / logoUrl deterministic per seed. */
const logoFor = (slug: string) =>
  `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(slug)}`;
const avatarFor = (username: string) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
    username,
  )}`;
/** Deterministic photographic post/cover images. */
const photoFor = (seed: string, w = 800, h = 450) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

type SeedCompany = {
  name: string;
  slug: string;
  industry: string;
  size: string;
  location: string;
  about: string;
  websiteUrl?: string;
};

/**
 * 13 companies. First is the Vercel-inspired "Vercept" (frontend/AI infra);
 * "Synthiel AI" and "Loomcast" are the AI startups referenced by the strong
 * Alex-storyline jobs.
 */
const COMPANIES: SeedCompany[] = [
  {
    name: "Vercept",
    slug: "vercept",
    industry: "Frontend & AI Infrastructure",
    size: "201-500",
    location: "San Francisco, CA",
    about:
      "The platform for frontend developers. Vercept ships the framework, edge network, and AI SDK that power the modern web — from static sites to streaming AI apps.",
    websiteUrl: "https://vercept.example.com",
  },
  {
    name: "Synthiel AI",
    slug: "synthiel-ai",
    industry: "Artificial Intelligence",
    size: "11-50",
    location: "Remote",
    about:
      "Synthiel builds full-stack AI application tooling — agents, RAG pipelines, and evals — so product teams can ship reliable LLM features fast.",
    websiteUrl: "https://synthiel.example.com",
  },
  {
    name: "Loomcast",
    slug: "loomcast",
    industry: "Artificial Intelligence",
    size: "11-50",
    location: "New York, NY",
    about:
      "Loomcast turns unstructured company knowledge into grounded, cited answers. Retrieval-augmented generation for the enterprise.",
    websiteUrl: "https://loomcast.example.com",
  },
  {
    name: "Northwind Systems",
    slug: "northwind-systems",
    industry: "Cloud Infrastructure",
    size: "501-1000",
    location: "Seattle, WA",
    about:
      "Northwind operates the reliable, boring, load-bearing cloud primitives that thousands of engineering teams quietly depend on.",
    websiteUrl: "https://northwind.example.com",
  },
  {
    name: "Brightwave Health",
    slug: "brightwave-health",
    industry: "Health Technology",
    size: "201-500",
    location: "Boston, MA",
    about:
      "Brightwave builds patient-first digital health products that make care coordination feel effortless.",
    websiteUrl: "https://brightwave.example.com",
  },
  {
    name: "Ledgerline",
    slug: "ledgerline",
    industry: "Financial Technology",
    size: "51-200",
    location: "London, UK",
    about:
      "Ledgerline is the developer-first payments and ledgering platform for companies that outgrew their spreadsheets.",
    websiteUrl: "https://ledgerline.example.com",
  },
  {
    name: "Cartograph Labs",
    slug: "cartograph-labs",
    industry: "Developer Tools",
    size: "51-200",
    location: "Berlin, DE",
    about:
      "Cartograph maps your codebase, your dependencies, and your incidents so engineering leaders can see around corners.",
    websiteUrl: "https://cartograph.example.com",
  },
  {
    name: "Orchard Retail",
    slug: "orchard-retail",
    industry: "E-commerce",
    size: "1001-5000",
    location: "Austin, TX",
    about:
      "Orchard powers headless storefronts for modern brands — fast, composable, and conversion-obsessed.",
    websiteUrl: "https://orchard.example.com",
  },
  {
    name: "Meridian Data",
    slug: "meridian-data",
    industry: "Data & Analytics",
    size: "201-500",
    location: "Chicago, IL",
    about:
      "Meridian is the warehouse-native analytics layer that lets every team answer their own data questions.",
    websiteUrl: "https://meridian.example.com",
  },
  {
    name: "Halcyon Games",
    slug: "halcyon-games",
    industry: "Gaming",
    size: "51-200",
    location: "Vancouver, CA",
    about:
      "Halcyon crafts cozy, beautiful games and the live-ops platform that keeps their worlds humming.",
    websiteUrl: "https://halcyon.example.com",
  },
  {
    name: "Solstice Energy",
    slug: "solstice-energy",
    industry: "Clean Energy",
    size: "201-500",
    location: "Denver, CO",
    about:
      "Solstice builds the software grid for distributed renewable energy — forecasting, dispatch, and settlement.",
    websiteUrl: "https://solstice.example.com",
  },
  {
    name: "Fathom Security",
    slug: "fathom-security",
    industry: "Cybersecurity",
    size: "51-200",
    location: "Remote",
    about:
      "Fathom gives security teams deep, real-time visibility into their cloud attack surface — without the alert fatigue.",
    websiteUrl: "https://fathom.example.com",
  },
  {
    name: "Palette Studio",
    slug: "palette-studio",
    industry: "Design & Creative Tools",
    size: "11-50",
    location: "Lisbon, PT",
    about:
      "Palette is the collaborative canvas where product teams design, prototype, and hand off in one place.",
    websiteUrl: "https://palette.example.com",
  },
];

type SeedRecruiter = {
  key: string; // internal handle to wire recruiters to jobs
  name: string;
  title: string;
  companySlug: string;
  email: string;
};

/** 5 recruiters; the first 3 are tied to the strong Alex jobs. */
const RECRUITERS: SeedRecruiter[] = [
  {
    key: "vercept-recruiter",
    name: "Dana Whitfield",
    title: "Senior Technical Recruiter",
    companySlug: "vercept",
    email: "dana.whitfield@vercept.example.com",
  },
  {
    key: "synthiel-recruiter",
    name: "Marcus Lee",
    title: "Head of Talent",
    companySlug: "synthiel-ai",
    email: "marcus.lee@synthiel.example.com",
  },
  {
    key: "northwind-recruiter",
    name: "Priya Nair",
    title: "Engineering Recruiter",
    companySlug: "northwind-systems",
    email: "priya.nair@northwind.example.com",
  },
  {
    key: "loomcast-recruiter",
    name: "Sofia Alvarez",
    title: "Recruiting Lead",
    companySlug: "loomcast",
    email: "sofia.alvarez@loomcast.example.com",
  },
  {
    key: "cartograph-recruiter",
    name: "Tom Becker",
    title: "Talent Partner",
    companySlug: "cartograph-labs",
    email: "tom.becker@cartograph.example.com",
  },
];

type Seniority = Doc<"jobs">["seniority"];
type WorkMode = Doc<"jobs">["workMode"];

type HandcraftedJob = {
  title: string;
  companySlug: string;
  recruiterKey: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  skillsRequired: string[];
  seniority: Seniority;
  workMode: WorkMode;
  location: string;
  description: string;
};

/**
 * The 6 Alex Carter storyline jobs. The 3 "strong" jobs overlap Alex's
 * React/Next.js strengths PLUS the AI skills he's missing, so a matcher can
 * produce a meaningful, attainable score. The 3 "stretch" jobs demand heavier
 * ML/infra depth.
 */
const HANDCRAFTED_JOBS: HandcraftedJob[] = [
  // ── Strong / attainable ──
  {
    title: "AI Engineer",
    companySlug: "vercept",
    recruiterKey: "vercept-recruiter",
    salaryMin: 150000,
    salaryMax: 200000,
    currency: "USD",
    skillsRequired: [
      "React",
      "Next.js",
      "TypeScript",
      "Vercel AI SDK",
      "RAG",
      "LLM agents",
      "evals",
    ],
    seniority: "mid",
    workMode: "hybrid",
    location: "San Francisco, CA",
    description:
      "Join Vercept's AI applications team to build streaming, agentic product features on top of the Vercel AI SDK. You already ship polished React/Next.js frontends — here you'll pair that with RAG pipelines, tool-calling agents, and rigorous evals. Strong frontend engineers who are hungry to go deep on applied AI thrive in this role.",
  },
  {
    title: "Full Stack AI Developer",
    companySlug: "synthiel-ai",
    recruiterKey: "synthiel-recruiter",
    salaryMin: 140000,
    salaryMax: 185000,
    currency: "USD",
    skillsRequired: [
      "React",
      "Next.js",
      "TypeScript",
      "Node.js",
      "Vercel AI SDK",
      "RAG",
      "prompt engineering",
    ],
    seniority: "mid",
    workMode: "remote",
    location: "Remote",
    description:
      "Synthiel is a small, fast AI startup. We want a full-stack developer who owns features end to end: a crisp Next.js UI on the front, and RAG + agent orchestration on the back. If you know React cold and want to level up on the AI SDK, evals, and prompt engineering, this is the seat.",
  },
  {
    title: "Next.js Platform Engineer (AI features)",
    companySlug: "cartograph-labs",
    recruiterKey: "cartograph-recruiter",
    salaryMin: 145000,
    salaryMax: 190000,
    currency: "USD",
    skillsRequired: [
      "Next.js",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Vercel AI SDK",
      "LLM agents",
      "evals",
    ],
    seniority: "mid",
    workMode: "hybrid",
    location: "Berlin, DE",
    description:
      "Own Cartograph's Next.js platform as we bolt AI features onto our developer tools. Deep Next.js and React expertise is the foundation; we'll invest in getting you fluent with the Vercel AI SDK, agent patterns, and evaluation harnesses. Perfect for a frontend-strong engineer breaking into AI.",
  },
  // ── Stretch ──
  {
    title: "Staff AI Engineer",
    companySlug: "synthiel-ai",
    recruiterKey: "synthiel-recruiter",
    salaryMin: 210000,
    salaryMax: 280000,
    currency: "USD",
    skillsRequired: [
      "PyTorch",
      "distributed training",
      "LLM fine-tuning",
      "CUDA",
      "model evaluation",
      "Python",
    ],
    seniority: "staff",
    workMode: "remote",
    location: "Remote",
    description:
      "Lead the modeling roadmap at Synthiel. You'll own fine-tuning, distributed training, and evaluation for our production LLM stack. Requires deep, hands-on ML research-to-production experience.",
  },
  {
    title: "ML Platform Engineer",
    companySlug: "northwind-systems",
    recruiterKey: "northwind-recruiter",
    salaryMin: 190000,
    salaryMax: 250000,
    currency: "USD",
    skillsRequired: [
      "Kubernetes",
      "Python",
      "MLOps",
      "feature stores",
      "distributed systems",
      "Ray",
    ],
    seniority: "senior",
    workMode: "onsite",
    location: "Seattle, WA",
    description:
      "Build the training and serving platform that our ML teams run on: pipelines, feature stores, GPU scheduling, and observability. Requires strong distributed-systems and MLOps depth.",
  },
  {
    title: "AI Infrastructure Engineer",
    companySlug: "loomcast",
    recruiterKey: "loomcast-recruiter",
    salaryMin: 195000,
    salaryMax: 260000,
    currency: "USD",
    skillsRequired: [
      "Go",
      "vector databases",
      "GPU orchestration",
      "distributed systems",
      "Kubernetes",
      "inference optimization",
    ],
    seniority: "senior",
    workMode: "hybrid",
    location: "New York, NY",
    description:
      "Own the inference and retrieval infrastructure behind Loomcast's RAG platform: vector databases at scale, GPU orchestration, and latency optimization. Requires deep systems engineering experience.",
  },
];

/** Skill pools drawn from by faker for the ~40 generated users. */
const FRONTEND_SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "CSS",
  "Tailwind CSS",
  "HTML",
  "Redux",
  "GraphQL",
  "Vite",
  "Jest",
  "Playwright",
];
const BACKEND_SKILLS = [
  "Node.js",
  "Python",
  "Go",
  "PostgreSQL",
  "Redis",
  "Docker",
  "Kubernetes",
  "AWS",
  "gRPC",
  "Kafka",
];
const AI_SKILLS = [
  "Vercel AI SDK",
  "RAG",
  "LLM agents",
  "prompt engineering",
  "evals",
  "PyTorch",
  "LangChain",
  "vector databases",
  "fine-tuning",
];
const ALL_SKILLS = [...FRONTEND_SKILLS, ...BACKEND_SKILLS, ...AI_SKILLS];

const JOB_TITLES = [
  "Software Engineer",
  "Senior Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Platform Engineer",
  "Data Engineer",
  "DevOps Engineer",
  "Site Reliability Engineer",
  "Product Engineer",
  "Mobile Engineer",
  "Security Engineer",
  "Engineering Manager",
  "Product Designer",
  "Data Scientist",
];

const SENIORITIES: Seniority[] = [
  "intern",
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
];
const WORK_MODES: WorkMode[] = ["remote", "hybrid", "onsite"];
const POST_KINDS: Doc<"posts">["kind"][] = [
  "update",
  "hiring",
  "hot_take",
  "launch",
];

const HOT_TAKES = [
  "Unpopular opinion: most 'AI features' are just a text box wired to a prompt. The moat is the evals, not the model.",
  "RAG isn't dead. Your chunking strategy is just bad.",
  "If your Next.js app ships 400kb of JS to render a marketing page, that's a you problem, not a framework problem.",
  "Hot take: TypeScript strict mode should be the default, and 'any' should require a code review comment explaining yourself.",
  "The best AI engineers I know are frontend engineers who learned to love evals.",
  "Agents are just for-loops with a vibe. Ship the boring version first.",
  "Tailwind haters have never maintained a 2000-line CSS file across a team of eight.",
  "Your LLM app is slow because you're not streaming. Stream everything.",
];
const LAUNCH_LINES = [
  "We just shipped it 🚀 Spent the last quarter rebuilding our whole RAG pipeline and the eval scores finally cleared the bar.",
  "Launched a new open-source Next.js starter with the Vercel AI SDK wired in out of the box. Feedback welcome!",
  "After months of heads-down work, our agent framework is live in production. Streaming, tool-calling, the works.",
  "New feature is out: real-time collaborative editing, powered end to end on the edge.",
];
const HIRING_LINES = [
  "We're hiring! Looking for a mid-level AI Engineer who's strong in React/Next.js and wants to go deep on the AI SDK. DM me.",
  "My team has an opening for a Full Stack AI Developer. Remote-friendly, small team, big ownership.",
  "Growing the platform team — if you love Next.js and want to build AI features, let's talk.",
  "Hiring a Data Scientist. Bonus points if you've shipped models to production, not just notebooks.",
];

// ── Helpers ──────────────────────────────────────────────────────────

/** Delete every row from a table. Small tables -> collect + delete is fine. */
async function wipeTable(
  ctx: MutationCtx,
  table:
    | "companies"
    | "recruiters"
    | "jobs"
    | "users"
    | "profiles"
    | "experiences"
    | "education"
    | "skills"
    | "skillEndorsements"
    | "posts"
    | "comments"
    | "likes"
    | "follows"
    | "notifications"
    | "applications"
    | "savedJobs"
    | "outreachDrafts"
    | "profileDrafts"
    | "careerPlans"
    | "aiRuns",
): Promise<void> {
  const rows = await ctx.db.query(table).collect();
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
}

/** Pick n distinct random members of arr (faker-driven for determinism). */
function pickSome<T>(arr: T[], n: number): T[] {
  return faker.helpers.arrayElements(arr, Math.min(n, arr.length));
}

// ── The seed mutation ────────────────────────────────────────────────

export const run = internalMutation({
  args: {},
  returns: v.object({
    companies: v.number(),
    recruiters: v.number(),
    jobs: v.number(),
    users: v.number(),
    education: v.number(),
    endorsements: v.number(),
    posts: v.number(),
    comments: v.number(),
    likes: v.number(),
    follows: v.number(),
    applications: v.number(),
  }),
  handler: async (ctx) => {
    faker.seed(12345);

    // 1) Wipe everything (children first to avoid dangling references while
    //    iterating; order isn't strictly required since we delete by _id).
    await wipeTable(ctx, "savedJobs");
    await wipeTable(ctx, "applications");
    await wipeTable(ctx, "notifications");
    await wipeTable(ctx, "likes");
    await wipeTable(ctx, "comments");
    await wipeTable(ctx, "follows");
    await wipeTable(ctx, "posts");
    await wipeTable(ctx, "skillEndorsements");
    await wipeTable(ctx, "skills");
    await wipeTable(ctx, "education");
    await wipeTable(ctx, "experiences");
    await wipeTable(ctx, "profiles");
    await wipeTable(ctx, "aiRuns");
    await wipeTable(ctx, "careerPlans");
    await wipeTable(ctx, "profileDrafts");
    await wipeTable(ctx, "outreachDrafts");
    await wipeTable(ctx, "jobs");
    await wipeTable(ctx, "recruiters");
    await wipeTable(ctx, "users");
    await wipeTable(ctx, "companies");

    // 2) Companies.
    const companyIdBySlug = new Map<string, Id<"companies">>();
    for (const c of COMPANIES) {
      const id = await ctx.db.insert("companies", {
        name: c.name,
        slug: c.slug,
        logoUrl: logoFor(c.slug),
        industry: c.industry,
        size: c.size,
        location: c.location,
        about: c.about,
        websiteUrl: c.websiteUrl,
      });
      companyIdBySlug.set(c.slug, id);
    }

    // 3) Recruiters (tied to companies; users wired later stays optional/absent).
    const recruiterIdByKey = new Map<string, Id<"recruiters">>();
    for (const r of RECRUITERS) {
      const companyId = companyIdBySlug.get(r.companySlug);
      if (companyId === undefined) continue;
      const id = await ctx.db.insert("recruiters", {
        userId: undefined,
        name: r.name,
        title: r.title,
        companyId,
        imageUrl: avatarFor(r.name.toLowerCase().replace(/\s+/g, "-")),
        email: r.email,
      });
      recruiterIdByKey.set(r.key, id);
    }

    // 4) Jobs — handcrafted storyline jobs first, then ~44 generated ones.
    //    Every job is linked to a seeded company via companyId; a few of the
    //    generated ones are closed to exercise the open/closed lifecycle.
    const jobIdByTitle = new Map<string, Id<"jobs">>();
    const openJobs: { jobId: Id<"jobs">; companyId: Id<"companies"> }[] = [];
    const now = Date.now();
    let jobCount = 0;

    for (const j of HANDCRAFTED_JOBS) {
      const companyId = companyIdBySlug.get(j.companySlug);
      if (companyId === undefined) continue;
      const recruiterId = recruiterIdByKey.get(j.recruiterKey);
      const id = await ctx.db.insert("jobs", {
        title: j.title,
        companyId,
        recruiterId,
        status: "open",
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        currency: j.currency,
        skillsRequired: j.skillsRequired,
        seniority: j.seniority,
        workMode: j.workMode,
        location: j.location,
        description: j.description,
        postedAt: now - faker.number.int({ min: 0, max: 20 }) * 86_400_000,
      });
      // Only remember the first occurrence of a title (used to save "AI Engineer").
      if (!jobIdByTitle.has(j.title)) jobIdByTitle.set(j.title, id);
      openJobs.push({ jobId: id, companyId });
      jobCount += 1;
    }

    const companySlugs = COMPANIES.map((c) => c.slug);
    const targetJobs = 50;
    while (jobCount < targetJobs) {
      const slug = faker.helpers.arrayElement(companySlugs);
      const companyId = companyIdBySlug.get(slug);
      if (companyId === undefined) continue;
      const seniority = faker.helpers.arrayElement(SENIORITIES);
      const salaryBase = faker.number.int({ min: 80_000, max: 180_000 });
      const skills = pickSome(ALL_SKILLS, faker.number.int({ min: 3, max: 6 }));
      const title = faker.helpers.arrayElement(JOB_TITLES);
      // ~6% of generated jobs are closed (filled roles stay on the company page).
      const closed = faker.datatype.boolean({ probability: 0.06 });
      const id = await ctx.db.insert("jobs", {
        title,
        companyId,
        recruiterId: undefined,
        status: closed ? "closed" : "open",
        salaryMin: salaryBase,
        salaryMax: salaryBase + faker.number.int({ min: 20_000, max: 70_000 }),
        currency: "USD",
        skillsRequired: skills,
        seniority,
        workMode: faker.helpers.arrayElement(WORK_MODES),
        location: `${faker.location.city()}, ${faker.location.countryCode()}`,
        description: faker.lorem.paragraph({ min: 3, max: 5 }),
        postedAt: now - faker.number.int({ min: 0, max: 45 }) * 86_400_000,
      });
      if (!closed) openJobs.push({ jobId: id, companyId });
      jobCount += 1;
    }

    // 5) Users + profiles + experiences + education + skills (~40 users).
    const userIds: Id<"users">[] = [];
    const usedUsernames = new Set<string>();
    const allSkills: { skillId: Id<"skills">; ownerId: Id<"users"> }[] = [];
    let educationTotal = 0;
    const targetUsers = 40;

    for (let i = 0; i < targetUsers; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const name = `${firstName} ${lastName}`;

      // Deterministic, unique username slug.
      const baseUsername = faker.helpers
        .slugify(`${firstName}-${lastName}`)
        .toLowerCase();
      let username = baseUsername;
      let suffix = 1;
      while (usedUsernames.has(username)) {
        suffix += 1;
        username = `${baseUsername}-${suffix}`;
      }
      usedUsernames.add(username);

      const targetRole = faker.helpers.maybe(
        () => faker.helpers.arrayElement(JOB_TITLES),
        { probability: 0.6 },
      );

      const userId = await ctx.db.insert("users", {
        clerkId: `seed_${username}`,
        name,
        email: `${username}@example.com`,
        imageUrl: avatarFor(username),
        username,
        createdAt: now - faker.number.int({ min: 30, max: 900 }) * 86_400_000,
      });
      userIds.push(userId);

      await ctx.db.insert("profiles", {
        userId,
        headline: `${faker.helpers.arrayElement(JOB_TITLES)} at ${faker.company.name()}`,
        about: faker.lorem.sentences({ min: 2, max: 4 }),
        location: `${faker.location.city()}, ${faker.location.countryCode()}`,
        pronouns: faker.helpers.maybe(
          () => faker.helpers.arrayElement(["she/her", "he/him", "they/them"]),
          { probability: 0.4 },
        ),
        websiteUrl: faker.helpers.maybe(() => `https://${username}.dev`, {
          probability: 0.3,
        }),
        githubUrl: faker.helpers.maybe(
          () => `https://github.com/${username}`,
          { probability: 0.45 },
        ),
        targetRole: targetRole ?? undefined,
        openToWork: faker.datatype.boolean({ probability: 0.35 }),
        coverImageUrl: faker.helpers.maybe(
          () => photoFor(`cover-${username}`, 1200, 300),
          { probability: 0.3 },
        ),
      });

      // 1–3 experiences.
      const expCount = faker.number.int({ min: 1, max: 3 });
      for (let e = 0; e < expCount; e++) {
        const companySlug = faker.helpers.arrayElement(companySlugs);
        const companyMeta = COMPANIES.find((c) => c.slug === companySlug)!;
        const startYear = faker.number.int({ min: 2015, max: 2023 });
        const startMonth = faker.number.int({ min: 1, max: 12 });
        const isCurrent = e === 0 && faker.datatype.boolean({ probability: 0.6 });
        const endYear = faker.number.int({
          min: startYear + 1,
          max: 2025,
        });
        const endMonth = faker.number.int({ min: 1, max: 12 });
        await ctx.db.insert("experiences", {
          userId,
          title: faker.helpers.arrayElement(JOB_TITLES),
          company: companyMeta.name,
          companyId: companyIdBySlug.get(companySlug),
          startDate: `${startYear}-${String(startMonth).padStart(2, "0")}`,
          endDate: isCurrent
            ? undefined
            : `${endYear}-${String(endMonth).padStart(2, "0")}`,
          description: faker.lorem.sentences({ min: 1, max: 2 }),
          location: faker.datatype.boolean()
            ? `${faker.location.city()}, ${faker.location.countryCode()}`
            : undefined,
        });
      }

      // 1–2 education entries.
      const eduCount = faker.number.int({ min: 1, max: 2 });
      for (let d = 0; d < eduCount; d++) {
        const eduStart = faker.number.int({ min: 2008, max: 2019 });
        await ctx.db.insert("education", {
          userId,
          school: `University of ${faker.location.city()}`,
          degree: faker.helpers.arrayElement(["BSc", "BA", "MSc", "MEng"]),
          field: faker.helpers.arrayElement([
            "Computer Science",
            "Software Engineering",
            "Information Systems",
            "Mathematics",
            "Human-Computer Interaction",
            "Electrical Engineering",
          ]),
          startYear: String(eduStart),
          endYear: String(eduStart + faker.number.int({ min: 3, max: 5 })),
          description: faker.helpers.maybe(() => faker.lorem.sentence(), {
            probability: 0.4,
          }),
        });
        educationTotal += 1;
      }

      // 4–8 skills. Endorsement counts are reconciled against real
      // skillEndorsements rows after every user exists (step 5b).
      const skillNames = pickSome(
        ALL_SKILLS,
        faker.number.int({ min: 4, max: 8 }),
      );
      for (const skillName of skillNames) {
        const skillId = await ctx.db.insert("skills", {
          userId,
          name: skillName,
          endorsements: 0,
        });
        allSkills.push({ skillId, ownerId: userId });
      }
    }

    // 5b) Skill endorsements — real rows from other seeded users, with the
    //     denormalized `endorsements` count kept honest.
    let endorsementTotal = 0;
    for (const { skillId, ownerId } of allSkills) {
      const n = faker.number.int({ min: 0, max: 6 });
      if (n === 0) continue;
      const endorsers = faker.helpers.arrayElements(
        userIds.filter((u) => u !== ownerId),
        n,
      );
      for (const endorserId of endorsers) {
        await ctx.db.insert("skillEndorsements", { skillId, endorserId });
      }
      await ctx.db.patch(skillId, { endorsements: endorsers.length });
      endorsementTotal += endorsers.length;
    }

    // 6) Posts (~100) with kind variety + consistent counts.
    const postIds: Id<"posts">[] = [];
    const targetPosts = 100;
    const commentTargets: Id<"posts">[] = []; // weighted pool for comments/likes

    for (let p = 0; p < targetPosts; p++) {
      const authorId = faker.helpers.arrayElement(userIds);
      const kind = faker.helpers.arrayElement(POST_KINDS);
      let content: string;
      switch (kind) {
        case "hot_take":
          content = faker.helpers.arrayElement(HOT_TAKES);
          break;
        case "launch":
          content = faker.helpers.arrayElement(LAUNCH_LINES);
          break;
        case "hiring":
          content = faker.helpers.arrayElement(HIRING_LINES);
          break;
        default:
          content = faker.lorem.sentences({ min: 1, max: 3 });
      }

      const postId = await ctx.db.insert("posts", {
        authorId,
        content,
        imageUrl: faker.helpers.maybe(() => photoFor(`post-${p}`), {
          probability: 0.2,
        }),
        kind,
        likeCount: 0, // patched to a consistent value after inserting likes
        commentCount: 0,
      });
      postIds.push(postId);
      commentTargets.push(postId);
    }

    // 7) Comments (~150) — track per-post counts to keep commentCount honest.
    const targetComments = 150;
    const commentCountByPost = new Map<Id<"posts">, number>();
    let commentTotal = 0;
    for (let c = 0; c < targetComments; c++) {
      const postId = faker.helpers.arrayElement(postIds);
      const authorId = faker.helpers.arrayElement(userIds);
      await ctx.db.insert("comments", {
        postId,
        authorId,
        content: faker.lorem.sentence(),
      });
      commentCountByPost.set(postId, (commentCountByPost.get(postId) ?? 0) + 1);
      commentTotal += 1;
    }

    // 8) Likes (~300) — unique (postId,userId) pairs; track per-post counts.
    const targetLikes = 300;
    const likedPairs = new Set<string>();
    const likeCountByPost = new Map<Id<"posts">, number>();
    let likeTotal = 0;
    let likeAttempts = 0;
    const maxLikeAttempts = targetLikes * 4;
    while (likeTotal < targetLikes && likeAttempts < maxLikeAttempts) {
      likeAttempts += 1;
      const postId = faker.helpers.arrayElement(postIds);
      const userId = faker.helpers.arrayElement(userIds);
      const key = `${postId}:${userId}`;
      if (likedPairs.has(key)) continue;
      likedPairs.add(key);
      await ctx.db.insert("likes", { postId, userId });
      likeCountByPost.set(postId, (likeCountByPost.get(postId) ?? 0) + 1);
      likeTotal += 1;
    }

    // 9) Reconcile denormalized counts on posts.
    for (const postId of postIds) {
      await ctx.db.patch(postId, {
        likeCount: likeCountByPost.get(postId) ?? 0,
        commentCount: commentCountByPost.get(postId) ?? 0,
      });
    }

    // 10) Follows — each user follows 3–8 distinct others.
    const followPairs = new Set<string>();
    let followTotal = 0;
    for (const followerId of userIds) {
      const followCount = faker.number.int({ min: 3, max: 8 });
      const candidates = faker.helpers.arrayElements(
        userIds.filter((u) => u !== followerId),
        followCount,
      );
      for (const followingId of candidates) {
        const key = `${followerId}:${followingId}`;
        if (followPairs.has(key)) continue;
        followPairs.add(key);
        await ctx.db.insert("follows", { followerId, followingId });
        followTotal += 1;
      }
    }

    // 11) Applications — ~35 unique (user, open job) pairs across the
    //     pipeline, each linked to the job's company. Populates applicant
    //     counts and the company pipeline with realistic data.
    const applicationPairs = new Set<string>();
    let applicationTotal = 0;
    const targetApplications = 35;
    let applicationAttempts = 0;
    while (
      applicationTotal < targetApplications &&
      applicationAttempts < targetApplications * 4
    ) {
      applicationAttempts += 1;
      const { jobId, companyId } = faker.helpers.arrayElement(openJobs);
      const userId = faker.helpers.arrayElement(userIds);
      const key = `${userId}:${jobId}`;
      if (applicationPairs.has(key)) continue;
      applicationPairs.add(key);
      const status = faker.helpers.weightedArrayElement([
        { value: "submitted" as const, weight: 5 },
        { value: "reviewed" as const, weight: 2 },
        { value: "interviewing" as const, weight: 2 },
        { value: "offer" as const, weight: 1 },
        { value: "rejected" as const, weight: 2 },
      ]);
      const createdAt =
        now - faker.number.int({ min: 1, max: 30 }) * 86_400_000;
      await ctx.db.insert("applications", {
        jobId,
        userId,
        companyId,
        coverNote: faker.helpers.maybe(
          () => faker.lorem.sentences({ min: 1, max: 2 }),
          { probability: 0.6 },
        ),
        status,
        createdAt,
        updatedAt:
          status === "submitted"
            ? createdAt
            : createdAt +
              faker.number.int({ min: 1, max: 5 }) * 86_400_000,
      });
      applicationTotal += 1;
    }

    return {
      companies: COMPANIES.length,
      recruiters: recruiterIdByKey.size,
      jobs: jobCount,
      users: userIds.length,
      education: educationTotal,
      endorsements: endorsementTotal,
      posts: postIds.length,
      comments: commentTotal,
      likes: likeTotal,
      follows: followTotal,
      applications: applicationTotal,
    };
  },
});
