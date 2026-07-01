import { convexClient, eveConvexSecret } from "./convex";
import { api } from "../../convex/_generated/api";

/**
 * The Clerk user id of the caller on the current turn, set by the channel verifier
 * (agent/channels/eve.ts). Throws if absent — tools must run for a signed-in user.
 */
export function requireClerkUserId(ctx: {
  session: { auth: { current: { principalId?: string } | null } };
}): string {
  const id = ctx.session?.auth?.current?.principalId;
  if (!id) throw new Error("No authenticated user on this turn.");
  return id;
}

/** Convex client + secret + caller id, bundled for a tool call. */
export function eveConvex(ctx: {
  session: { auth: { current: { principalId?: string } | null } };
}) {
  return {
    convex: convexClient(),
    secret: eveConvexSecret(),
    clerkUserId: requireClerkUserId(ctx),
    api,
  };
}
