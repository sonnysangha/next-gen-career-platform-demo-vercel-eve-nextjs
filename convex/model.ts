import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";

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
 * Returns null when there is no authenticated caller or no matching users row.
 */
export async function getUserByIdentity(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
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
  targetRole: v.optional(v.string()),
  openToWork: v.boolean(),
  coverImageUrl: v.optional(v.string()),
  embedding: v.optional(v.array(v.float64())),
  embeddingText: v.optional(v.string()),
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
  industry: v.string(),
  size: v.string(),
  location: v.string(),
  about: v.string(),
  websiteUrl: v.optional(v.string()),
});

/** Full jobs document validator. */
export const jobDocValidator = v.object({
  _id: v.id("jobs"),
  _creationTime: v.number(),
  title: v.string(),
  companyId: v.id("companies"),
  recruiterId: v.optional(v.id("recruiters")),
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
