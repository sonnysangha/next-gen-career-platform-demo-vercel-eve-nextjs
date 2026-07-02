import { createClerkClient } from "@clerk/backend";
import { COMPANY_PRO_PLAN } from "./model";

/**
 * Org billing checked against Clerk Billing via the Backend SDK.
 *
 * This is the ONLY correct way to know whether an organization has the
 * Company Pro plan. Clerk JWT templates cannot emit the session-only
 * `pla`/`fea` billing claims (the template renders the literal string
 * "{{session.pla}}"), so any claims-based check silently treats every org
 * as free tier. Do not reintroduce one.
 *
 * The Clerk Backend SDK is fetch-based, so this runs in the default Convex
 * runtime — but only ACTIONS may call it (it makes an outbound HTTP request
 * to Clerk). Queries/mutations that need a billing decision receive it as an
 * argument from an action, or simply enforce the free-tier default.
 */

/**
 * Subscription-item statuses that count as "has the plan". `past_due` keeps
 * paying customers working through the dunning grace window; Clerk represents
 * free trials as `active` items, so trials are covered too. Everything else
 * (`upcoming`, `canceled`, `ended`, `expired`, `incomplete`, `abandoned`)
 * is not entitled.
 */
const PRO_ITEM_STATUSES = new Set<string>(["active", "past_due"]);

/**
 * Does this Clerk organization have an active-ish Company Pro subscription?
 * Fails closed: no org, missing secret key, no subscription (404), or any
 * Clerk API error all return false rather than throwing.
 */
export async function orgHasCompanyProBilling(
  orgId: string | null,
): Promise<boolean> {
  if (orgId === null || orgId.length === 0) return false;
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (secretKey === undefined || secretKey.length === 0) {
    console.error(
      "CLERK_SECRET_KEY is not set on this Convex deployment; treating org as free tier",
    );
    return false;
  }
  try {
    const clerk = createClerkClient({ secretKey });
    const subscription =
      await clerk.billing.getOrganizationBillingSubscription(orgId);
    return subscription.subscriptionItems.some(
      (item) =>
        item.plan?.slug === COMPANY_PRO_PLAN &&
        PRO_ITEM_STATUSES.has(item.status),
    );
  } catch (error) {
    // 404 = the org has no billing subscription = free tier. Transient API
    // failures also fail closed instead of breaking the caller.
    console.warn(`Clerk billing lookup failed for ${orgId}`, error);
    return false;
  }
}
