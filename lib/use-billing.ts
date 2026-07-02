"use client";

import { useSubscription } from "@clerk/nextjs/experimental";
import { PRO_PLAN, COMPANY_PRO_PLAN } from "@/lib/ai-features";

/** Subscription-item statuses that count as an entitled (paid or grace) plan. */
const ENTITLED_STATUSES = new Set(["active", "past_due"]);

function subscriptionHasPlan(
  data: ReturnType<typeof useSubscription>["data"],
  slug: string,
): boolean {
  return (
    data?.subscriptionItems.some(
      (item) => item.plan.slug === slug && ENTITLED_STATUSES.has(item.status),
    ) ?? false
  );
}

/**
 * Personal (user-payer) Pro — reads the user's subscription straight from the
 * Clerk Billing API. Session-token claims are never consulted: tokens only
 * carry the ACTIVE payer's plans, so they can't answer personal-plan
 * questions while an organization is active.
 */
export function usePersonalPro(): { isPro: boolean; isLoaded: boolean } {
  const { data, isLoading } = useSubscription({ for: "user" });
  return { isPro: subscriptionHasPlan(data, PRO_PLAN), isLoaded: !isLoading };
}

/**
 * Company Pro for the ACTIVE organization — same Billing-API source of truth
 * as the personal check, no token claims involved.
 */
export function useCompanyPro(): { isPro: boolean; isLoaded: boolean } {
  const { data, isLoading } = useSubscription({ for: "organization" });
  return {
    isPro: subscriptionHasPlan(data, COMPANY_PRO_PLAN),
    isLoaded: !isLoading,
  };
}
