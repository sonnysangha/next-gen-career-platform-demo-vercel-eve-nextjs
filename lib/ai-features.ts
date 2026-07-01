/**
 * Clerk Billing feature slugs for the Pro AI features.
 * Client-safe (no server-only imports) so both UI gating (Clerk `has()` in client
 * components) and server gating (lib/entitlements.ts) can share them.
 * Configure these in Clerk Dashboard → Billing → Plans → Pro → Features.
 */
export const AI_FEATURES = {
  profile_optimizer: "ai_profile_optimizer",
  job_matcher: "ai_job_matcher",
  outreach_writer: "ai_outreach_writer",
  career_plan: "ai_career_plan",
} as const;

export type AiFeature = keyof typeof AI_FEATURES;

export const PRO_PLAN = "pro";
