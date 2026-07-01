import "server-only";
import { auth } from "@clerk/nextjs/server";
import { AI_FEATURES, PRO_PLAN, type AiFeature } from "./ai-features";

export { AI_FEATURES, PRO_PLAN, type AiFeature };

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
