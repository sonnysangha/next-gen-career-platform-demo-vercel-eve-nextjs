import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  AI_FEATURES,
  PRO_PLAN,
  COMPANY_PRO_PLAN,
  type AiFeature,
} from "./ai-features";
import { userSubscriptionIsPro, orgSubscriptionIsCompanyPro } from "./billing";

export { AI_FEATURES, PRO_PLAN, COMPANY_PRO_PLAN, type AiFeature };
export { userSubscriptionIsPro, orgSubscriptionIsCompanyPro };

/**
 * Server-side: is the signed-in user on the Pro plan?
 * Checked via the Clerk Billing API (never session-token claims), so the
 * answer is correct regardless of which organization is active.
 */
export async function isPro(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;
  return userSubscriptionIsPro(await clerkClient(), userId);
}

/**
 * Server-side: does the signed-in user have a specific AI feature?
 * All AI features ship with the personal Pro plan, so this is a Pro check.
 */
export async function hasAiFeature(_feature: AiFeature): Promise<boolean> {
  return isPro();
}

/**
 * Server-side: is the caller's ACTIVE ORGANIZATION on the Company Pro plan?
 * Same Billing-API source of truth as the personal check.
 */
export async function isCompanyPro(): Promise<boolean> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return false;
  return orgSubscriptionIsCompanyPro(await clerkClient(), orgId);
}
