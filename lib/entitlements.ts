import "server-only";
import { auth } from "@clerk/nextjs/server";
import {
  AI_FEATURES,
  PRO_PLAN,
  COMPANY_PRO_PLAN,
  type AiFeature,
} from "./ai-features";

export { AI_FEATURES, PRO_PLAN, COMPANY_PRO_PLAN, type AiFeature };

/** Server-side: does the signed-in user have a specific AI feature entitlement? */
export async function hasAiFeature(feature: AiFeature): Promise<boolean> {
  const { has, userId } = await auth();
  if (!userId) return false;
  return has({ feature: AI_FEATURES[feature] });
}

/** Server-side: is the signed-in user on the Pro plan? */
export async function isPro(): Promise<boolean> {
  const { has, userId } = await auth();
  if (!userId) return false;
  return has({ plan: PRO_PLAN });
}

/**
 * Server-side: is the caller's ACTIVE ORGANIZATION on the Company Pro plan?
 * Clerk resolves org-scoped plans against the active organization.
 */
export async function isCompanyPro(): Promise<boolean> {
  const { has, userId, orgId } = await auth();
  if (!userId || !orgId) return false;
  return has({ plan: COMPANY_PRO_PLAN });
}
