import type { ClerkClient } from "@clerk/backend";
import { PRO_PLAN, COMPANY_PRO_PLAN } from "./ai-features";

/** Subscription-item statuses that count as an entitled (paid or grace) plan. */
export const ENTITLED_STATUSES = new Set(["active", "past_due"]);

/**
 * Server-side billing checks via the Clerk Billing API — the single source
 * of truth for plan entitlements. Session-token claims are never consulted:
 * tokens only carry the ACTIVE payer's plans, so they can't answer
 * personal-plan questions while an organization is active. Kept free of
 * Next.js imports so non-Next server code (the Eve channel) can use it too.
 * Both checks fail closed (no subscription / API error → false).
 */
export async function userSubscriptionIsPro(
  client: ClerkClient,
  userId: string,
): Promise<boolean> {
  try {
    const sub = await client.billing.getUserBillingSubscription(userId);
    return sub.subscriptionItems.some(
      (item) =>
        item.plan?.slug === PRO_PLAN && ENTITLED_STATUSES.has(item.status),
    );
  } catch {
    return false;
  }
}

export async function orgSubscriptionIsCompanyPro(
  client: ClerkClient,
  orgId: string,
): Promise<boolean> {
  try {
    const sub = await client.billing.getOrganizationBillingSubscription(orgId);
    return sub.subscriptionItems.some(
      (item) =>
        item.plan?.slug === COMPANY_PRO_PLAN &&
        ENTITLED_STATUSES.has(item.status),
    );
  } catch {
    return false;
  }
}
