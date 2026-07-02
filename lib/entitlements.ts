import "server-only";
import { auth } from "@clerk/nextjs/server";
import {
  AI_FEATURES,
  PRO_PLAN,
  COMPANY_PRO_PLAN,
  type AiFeature,
} from "./ai-features";

export { AI_FEATURES, PRO_PLAN, COMPANY_PRO_PLAN, type AiFeature };

/**
 * Server-side: does the signed-in user have a specific AI feature entitlement?
 * Scoped to `user:` so a personal Pro subscription unlocks the feature even
 * while a (free or pro) organization is active on the session.
 */
export async function hasAiFeature(feature: AiFeature): Promise<boolean> {
  const { has, userId } = await auth();
  if (!userId) return false;
  return has({ feature: `user:${AI_FEATURES[feature]}` });
}

/**
 * Server-side: is the signed-in user on the Pro plan?
 * Scoped to `user:` so the check reads the personal subscription regardless
 * of which organization is currently active.
 */
export async function isPro(): Promise<boolean> {
  const { has, userId } = await auth();
  if (!userId) return false;
  return has({ plan: `user:${PRO_PLAN}` });
}

/**
 * Server-side: is the caller's ACTIVE ORGANIZATION on the Company Pro plan?
 * Scoped to `org:` so a personal plan can never satisfy a company gate.
 */
export async function isCompanyPro(): Promise<boolean> {
  const { has, userId, orgId } = await auth();
  if (!userId || !orgId) return false;
  return has({ plan: `org:${COMPANY_PRO_PLAN}` });
}
