import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * CareerConnect schema — 16 tables.
 *
 * Conventions:
 * - Every foreign key uses v.id("<table>").
 * - Optional fields use v.optional(...); absent value == "not set".
 * - Custom indexes are named after their columns in order (by_a_and_b).
 * - _creationTime is appended to every index automatically by Convex; it is
 *   never listed as an explicit index column.
 */
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    username: v.string(), // url slug, unique
    createdAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_username", ["username"]),

  profiles: defineTable({
    userId: v.id("users"),
    headline: v.string(),
    about: v.string(),
    location: v.string(),
    targetRole: v.optional(v.string()),
    openToWork: v.boolean(),
    coverImageUrl: v.optional(v.string()),
    // Vector match: 1536-dim embedding of the profile text (text-embedding-3-small).
    embedding: v.optional(v.array(v.float64())),
    // The profile text that produced `embedding`, for cache-invalidation.
    embeddingText: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  experiences: defineTable({
    userId: v.id("users"),
    title: v.string(),
    company: v.string(),
    companyId: v.optional(v.id("companies")),
    startDate: v.string(), // "YYYY-MM"
    endDate: v.optional(v.string()), // absent == present
    description: v.string(),
    location: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  skills: defineTable({
    userId: v.id("users"),
    name: v.string(),
    endorsements: v.number(),
  }).index("by_userId", ["userId"]),

  companies: defineTable({
    name: v.string(),
    slug: v.string(), // unique
    logoUrl: v.optional(v.string()),
    industry: v.string(),
    size: v.string(), // e.g. "51-200"
    location: v.string(),
    about: v.string(),
    websiteUrl: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  jobs: defineTable({
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
    // Vector match: 1536-dim embedding of the job text (text-embedding-3-small).
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_companyId", ["companyId"])
    .index("by_seniority", ["seniority"])
    .index("by_workMode", ["workMode"]),

  posts: defineTable({
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
  }),
  // feed reads use the built-in by_creation_time index (no custom index needed)

  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.id("users"),
    content: v.string(),
  }).index("by_post", ["postId"]),

  likes: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
  })
    .index("by_post_and_user", ["postId", "userId"])
    .index("by_user", ["userId"]),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_follower_and_following", ["followerId", "followingId"]),

  savedJobs: defineTable({
    userId: v.id("users"),
    jobId: v.id("jobs"),
    savedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_job", ["userId", "jobId"]),

  recruiters: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    title: v.string(),
    companyId: v.id("companies"),
    imageUrl: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_company", ["companyId"]),

  outreachDrafts: defineTable({
    userId: v.id("users"),
    jobId: v.optional(v.id("jobs")),
    recruiterId: v.optional(v.id("recruiters")),
    tone: v.optional(v.string()),
    connectionMessage: v.string(),
    recruiterDm: v.string(),
    subject: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("saved")),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  profileDrafts: defineTable({
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
  }).index("by_userId", ["userId"]),

  careerPlans: defineTable({
    userId: v.id("users"),
    goal: v.string(),
    summary: v.optional(v.string()),
    phases: v.array(
      v.object({
        period: v.union(v.literal("30"), v.literal("60"), v.literal("90")),
        focus: v.string(),
        milestones: v.array(v.string()),
      }),
    ),
    weeklyMilestones: v.array(v.string()),
    projectIdeas: v.array(v.string()),
    skillsToLearn: v.array(v.string()),
    jobsToApplyFirst: v.array(v.string()),
    status: v.union(v.literal("draft"), v.literal("saved")),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  aiRuns: defineTable({
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
  }).index("by_userId", ["userId"]),
});
