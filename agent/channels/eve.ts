import { eveChannel } from "eve/channels/eve";
import {
  localDev,
  ForbiddenError,
  type AuthFn,
} from "eve/channels/auth";
import { createClerkClient } from "@clerk/backend";
import { userSubscriptionIsPro } from "@/lib/billing";

/**
 * Route auth for the Eve HTTP channel.
 *
 * Verifies the Clerk session on the incoming request and — because the AI Career
 * Agent is a Pro-only feature — enforces the Pro plan server-side before any model
 * work runs. The signed-in user's Clerk id is forwarded to tools as the caller
 * principal (`ctx.session.auth.current.principalId`).
 */
function clerkAuth(): AuthFn<Request> {
  return async (request) => {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
    });

    const requestState = await clerk.authenticateRequest(request);
    const auth = requestState.toAuth();

    // Not signed in → skip; the walk falls through (localDev in dev, else 401).
    if (!auth || !auth.userId) return null;

    // Pro gate: enforce entitlement before the agent can run. Checked via
    // the Billing API — session-token claims only carry the active payer's
    // plans, so they can't answer personal-plan questions in org context.
    const isPro = await userSubscriptionIsPro(clerk, auth.userId);
    if (!isPro) {
      throw new ForbiddenError({
        message: "Upgrade to Pro to use the AI Career Agent.",
      });
    }

    return {
      authenticator: "app",
      principalId: auth.userId,
      principalType: "user",
      attributes: {},
    };
  };
}

export default eveChannel({
  auth: [clerkAuth(), localDev()],
});
