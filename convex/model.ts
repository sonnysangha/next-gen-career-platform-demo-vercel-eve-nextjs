import { v } from "convex/values";
import type { UserIdentity } from "convex/server";
import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";

/**
 * Shared helpers + reusable validator shapes.
 *
 * These are plain functions / validator objects, NOT registered Convex
 * functions, so they need no args/returns validators of their own. Registered
 * functions in the other files import from here.
 */

// ── Identity resolution ──────────────────────────────────────────────

/**
 * Resolve the current signed-in user from the Clerk identity.
 * Returns null when there is no authenticated caller. In queries, also returns
 * null when no users row matches. In mutations, a missing row is recreated
 * from the identity claims instead — a signed-in user must never be orphaned
 * (e.g. after `pnpm seed` wipes the users table mid-session).
 */
export async function getUserByIdentity(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) return null;
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (existing !== null) return existing;
  if ("insert" in ctx.db) {
    return await createUserFromIdentity(ctx as MutationCtx, identity);
  }
  return null;
}

/**
 * Create the users row (+ blank profile) from Clerk identity token claims.
 * Shared by users.upsertCurrentUser and the mutation path of
 * getUserByIdentity.
 */
export async function createUserFromIdentity(
  ctx: MutationCtx,
  identity: UserIdentity,
): Promise<Doc<"users">> {
  const name =
    identity.name ??
    (typeof identity.givenName === "string" ? identity.givenName : null) ??
    identity.nickname ??
    "New Member";
  const email = identity.email ?? `${identity.subject}@users.noreply`;
  const imageUrl =
    typeof identity.pictureUrl === "string" ? identity.pictureUrl : undefined;

  const username = await uniqueUsername(ctx, baseUsernameFrom(email, name));
  const userId = await ctx.db.insert("users", {
    clerkId: identity.subject,
    name,
    email,
    imageUrl,
    username,
    createdAt: Date.now(),
  });
  await ctx.db.insert("profiles", {
    userId,
    headline: "",
    about: "",
    location: "",
    targetRole: undefined,
    openToWork: false,
    coverImageUrl: undefined,
  });
  const created = await ctx.db.get(userId);
  if (created === null) throw new Error("Failed to create user");
  return created;
}

/** Resolve a users row from a Clerk userId string (used by the Eve bridge). */
export async function getUserByClerkId(
  ctx: QueryCtx | MutationCtx,
  clerkId: string,
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
}

/** Get the current user's profile, or null. */
export async function getProfileForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<Doc<"profiles"> | null> {
  return await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

// ── Company / Clerk-Organization authorization ───────────────────────

/**
 * The Clerk organization id ("org_…") active on the caller's session, or null.
 * Comes from the `org_id` claim on the Convex JWT template (or the `o.id`
 * claim Clerk emits by default on session tokens with an active org).
 */
export async function getActiveOrgId(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) return null;
  const claims = identity as Record<string, unknown>;
  if (typeof claims.org_id === "string" && claims.org_id.length > 0) {
    return claims.org_id;
  }
  const o = claims.o;
  if (o !== null && typeof o === "object" && "id" in o) {
    const id = (o as { id: unknown }).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return null;
}

/**
 * Org-based billing. Keep in sync with lib/ai-features.ts
 * (COMPANY_PRO_PLAN / FREE_OPEN_JOB_LIMIT) — convex/ can't import from lib/.
 *
 * Whether an org actually HAS the Company Pro plan is checked against Clerk
 * Billing via the Backend SDK — see convex/clerkBilling.ts. It must never be
 * derived from JWT claims: Clerk JWT templates cannot emit the session-only
 * `pla`/`fea` billing claims, so a claims check silently reports every org
 * as free tier.
 */
export const COMPANY_PRO_PLAN = "company_pro";
export const FREE_OPEN_JOB_LIMIT = 3;

/** Is the current caller an admin of this company (org member or owner)? */
export async function isCompanyAdmin(
  ctx: QueryCtx | MutationCtx,
  company: Doc<"companies">,
  me: Doc<"users"> | null,
): Promise<boolean> {
  if (me !== null && company.ownerId === me._id) return true;
  if (company.orgId !== undefined) {
    const orgId = await getActiveOrgId(ctx);
    if (orgId !== null && orgId === company.orgId) return true;
  }
  return false;
}

/**
 * Load a company and assert the caller may administer it. Returns
 * { company, me } or throws.
 */
export async function assertCompanyAdmin(
  ctx: QueryCtx | MutationCtx,
  companyId: Id<"companies">,
): Promise<{ company: Doc<"companies">; me: Doc<"users"> }> {
  const me = await getUserByIdentity(ctx);
  if (me === null) throw new Error("Not authenticated");
  const company = await ctx.db.get(companyId);
  if (company === null) throw new Error("Company not found");
  if (!(await isCompanyAdmin(ctx, company, me))) {
    throw new Error("Not authorized to manage this company");
  }
  return { company, me };
}

/**
 * The company the caller administers: the one owned by them, or the one
 * linked to their active Clerk organization. Null when neither exists.
 */
export async function getMyCompanyDoc(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"companies"> | null> {
  const me = await getUserByIdentity(ctx);
  const orgId = await getActiveOrgId(ctx);
  if (orgId !== null) {
    const byOrg = await ctx.db
      .query("companies")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    if (byOrg !== null) return byOrg;
  }
  if (me !== null) {
    const byOwner = await ctx.db
      .query("companies")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", me._id))
      .first();
    if (byOwner !== null) return byOwner;
  }
  return null;
}

// ── Notifications ────────────────────────────────────────────────────

/**
 * Insert a notification, skipping self-notifications (actor == recipient).
 */
export async function notify(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    actorId?: Id<"users">;
    type: Doc<"notifications">["type"];
    message: string;
    postId?: Id<"posts">;
    jobId?: Id<"jobs">;
    applicationId?: Id<"applications">;
  },
): Promise<void> {
  if (args.actorId !== undefined && args.actorId === args.userId) return;
  await ctx.db.insert("notifications", {
    userId: args.userId,
    actorId: args.actorId,
    type: args.type,
    message: args.message,
    postId: args.postId,
    jobId: args.jobId,
    applicationId: args.applicationId,
    read: false,
    createdAt: Date.now(),
  });
}

/** Build a stable, url-safe slug from a company name. */
export function baseSlugFrom(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug.length > 0 ? slug : "company";
}

/** Ensure a company slug is unique by appending -2, -3, ... as needed. */
export async function uniqueCompanySlug(
  ctx: QueryCtx | MutationCtx,
  base: string,
): Promise<string> {
  let candidate = base;
  let n = 1;
  while (true) {
    const existing = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();
    if (existing === null) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

/**
 * Build a stable, url-safe base slug from an email/name. Callers still need to
 * de-duplicate against existing usernames.
 */
export function baseUsernameFrom(email: string, name: string): string {
  const fromEmail = email.split("@")[0] ?? "";
  const source = fromEmail.length > 0 ? fromEmail : name;
  const slug = source
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug.length > 0 ? slug : "user";
}

/** Ensure a username slug is unique by appending -2, -3, ... as needed. */
export async function uniqueUsername(
  ctx: QueryCtx | MutationCtx,
  base: string,
): Promise<string> {
  let candidate = base;
  let n = 1;
  // Bounded loop: usernames collide rarely; this is O(collisions).
  while (true) {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", candidate))
      .unique();
    if (existing === null) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

// ── Reusable validator shapes ────────────────────────────────────────

/** Public author summary embedded in feed / profile payloads. */
export const authorSummaryValidator = v.object({
  _id: v.id("users"),
  name: v.string(),
  username: v.string(),
  imageUrl: v.union(v.string(), v.null()),
  headline: v.union(v.string(), v.null()),
});

/** Full users document validator. */
export const userDocValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  clerkId: v.string(),
  name: v.string(),
  email: v.string(),
  imageUrl: v.optional(v.string()),
  imageStorageId: v.optional(v.id("_storage")),
  username: v.string(),
  createdAt: v.number(),
});

/** Full profiles document validator. */
export const profileDocValidator = v.object({
  _id: v.id("profiles"),
  _creationTime: v.number(),
  userId: v.id("users"),
  headline: v.string(),
  about: v.string(),
  location: v.string(),
  pronouns: v.optional(v.string()),
  websiteUrl: v.optional(v.string()),
  githubUrl: v.optional(v.string()),
  twitterUrl: v.optional(v.string()),
  targetRole: v.optional(v.string()),
  openToWork: v.boolean(),
  coverImageUrl: v.optional(v.string()),
  coverImageStorageId: v.optional(v.id("_storage")),
  embedding: v.optional(v.array(v.float64())),
  embeddingText: v.optional(v.string()),
});

/** Full education document validator. */
export const educationDocValidator = v.object({
  _id: v.id("education"),
  _creationTime: v.number(),
  userId: v.id("users"),
  school: v.string(),
  degree: v.string(),
  field: v.string(),
  startYear: v.string(),
  endYear: v.optional(v.string()),
  description: v.optional(v.string()),
});

/** Full experiences document validator. */
export const experienceDocValidator = v.object({
  _id: v.id("experiences"),
  _creationTime: v.number(),
  userId: v.id("users"),
  title: v.string(),
  company: v.string(),
  companyId: v.optional(v.id("companies")),
  startDate: v.string(),
  endDate: v.optional(v.string()),
  description: v.string(),
  location: v.optional(v.string()),
});

/** Full skills document validator. */
export const skillDocValidator = v.object({
  _id: v.id("skills"),
  _creationTime: v.number(),
  userId: v.id("users"),
  name: v.string(),
  endorsements: v.number(),
});

/** Full companies document validator. */
export const companyDocValidator = v.object({
  _id: v.id("companies"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  logoUrl: v.optional(v.string()),
  logoStorageId: v.optional(v.id("_storage")),
  coverImageUrl: v.optional(v.string()),
  coverImageStorageId: v.optional(v.id("_storage")),
  industry: v.string(),
  size: v.string(),
  location: v.string(),
  about: v.string(),
  websiteUrl: v.optional(v.string()),
  orgId: v.optional(v.string()),
  ownerId: v.optional(v.id("users")),
});

/** Application status validator (shared by applications.ts + UI payloads). */
export const applicationStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("reviewed"),
  v.literal("interviewing"),
  v.literal("offer"),
  v.literal("rejected"),
  v.literal("withdrawn"),
);

/** Full applications document validator. */
export const applicationDocValidator = v.object({
  _id: v.id("applications"),
  _creationTime: v.number(),
  jobId: v.id("jobs"),
  userId: v.id("users"),
  companyId: v.id("companies"),
  coverNote: v.optional(v.string()),
  status: applicationStatusValidator,
  statusHistory: v.optional(
    v.array(v.object({ status: applicationStatusValidator, at: v.number() })),
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/** Full notifications document validator. */
export const notificationDocValidator = v.object({
  _id: v.id("notifications"),
  _creationTime: v.number(),
  userId: v.id("users"),
  actorId: v.optional(v.id("users")),
  type: v.union(
    v.literal("like"),
    v.literal("comment"),
    v.literal("follow"),
    v.literal("endorsement"),
    v.literal("application"),
    v.literal("application_status"),
  ),
  message: v.string(),
  postId: v.optional(v.id("posts")),
  jobId: v.optional(v.id("jobs")),
  applicationId: v.optional(v.id("applications")),
  read: v.boolean(),
  createdAt: v.number(),
});

/** Full jobs document validator. */
export const jobDocValidator = v.object({
  _id: v.id("jobs"),
  _creationTime: v.number(),
  title: v.string(),
  companyId: v.id("companies"),
  recruiterId: v.optional(v.id("recruiters")),
  createdBy: v.optional(v.id("users")),
  status: v.optional(v.union(v.literal("open"), v.literal("closed"))),
  salaryMin: v.number(),
  salaryMax: v.number(),
  currency: v.string(),
  skillsRequired: v.array(v.string()),
  seniority: v.union(
    v.literal("intern"),
    v.literal("junior"),
    v.literal("mid"),
    v.literal("senior"),
    v.literal("staff"),
    v.literal("principal"),
  ),
  workMode: v.union(
    v.literal("remote"),
    v.literal("hybrid"),
    v.literal("onsite"),
  ),
  location: v.string(),
  description: v.string(),
  postedAt: v.number(),
  embedding: v.optional(v.array(v.float64())),
});

/** Full recruiters document validator. */
export const recruiterDocValidator = v.object({
  _id: v.id("recruiters"),
  _creationTime: v.number(),
  userId: v.optional(v.id("users")),
  name: v.string(),
  title: v.string(),
  companyId: v.id("companies"),
  imageUrl: v.optional(v.string()),
  email: v.optional(v.string()),
});

/** Full posts document validator. */
export const postDocValidator = v.object({
  _id: v.id("posts"),
  _creationTime: v.number(),
  authorId: v.id("users"),
  content: v.string(),
  imageUrl: v.optional(v.string()),
  imageStorageId: v.optional(v.id("_storage")),
  editedAt: v.optional(v.number()),
  kind: v.union(
    v.literal("update"),
    v.literal("hiring"),
    v.literal("hot_take"),
    v.literal("launch"),
  ),
  likeCount: v.number(),
  commentCount: v.number(),
});

/** Full profileDrafts document validator. */
export const profileDraftDocValidator = v.object({
  _id: v.id("profileDrafts"),
  _creationTime: v.number(),
  userId: v.id("users"),
  headline: v.string(),
  about: v.string(),
  experienceBullets: v.array(v.string()),
  suggestedSkills: v.array(v.string()),
  explanation: v.string(),
  targetRole: v.optional(v.string()),
  status: v.union(
    v.literal("draft"),
    v.literal("saved"),
    v.literal("applied"),
  ),
  createdAt: v.number(),
});

/** Full outreachDrafts document validator. */
export const outreachDraftDocValidator = v.object({
  _id: v.id("outreachDrafts"),
  _creationTime: v.number(),
  userId: v.id("users"),
  jobId: v.optional(v.id("jobs")),
  recruiterId: v.optional(v.id("recruiters")),
  tone: v.optional(v.string()),
  connectionMessage: v.string(),
  recruiterDm: v.string(),
  subject: v.optional(v.string()),
  status: v.union(v.literal("draft"), v.literal("saved")),
  createdAt: v.number(),
});

/** careerPlans phase sub-object validator (reused by ai.ts + eve.ts args). */
export const careerPhaseValidator = v.object({
  period: v.union(v.literal("30"), v.literal("60"), v.literal("90")),
  focus: v.string(),
  milestones: v.array(v.string()),
});

/** Full careerPlans document validator. */
export const careerPlanDocValidator = v.object({
  _id: v.id("careerPlans"),
  _creationTime: v.number(),
  userId: v.id("users"),
  goal: v.string(),
  summary: v.optional(v.string()),
  phases: v.array(careerPhaseValidator),
  weeklyMilestones: v.array(v.string()),
  projectIdeas: v.array(v.string()),
  skillsToLearn: v.array(v.string()),
  jobsToApplyFirst: v.array(v.string()),
  status: v.union(v.literal("draft"), v.literal("saved")),
  createdAt: v.number(),
});

/** Full aiRuns document validator. */
export const aiRunDocValidator = v.object({
  _id: v.id("aiRuns"),
  _creationTime: v.number(),
  userId: v.id("users"),
  feature: v.union(
    v.literal("profile_optimizer"),
    v.literal("job_matcher"),
    v.literal("outreach_writer"),
    v.literal("career_plan"),
  ),
  status: v.string(),
  sessionId: v.optional(v.string()),
  createdAt: v.number(),
});
