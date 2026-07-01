import { ConvexHttpClient } from "convex/browser";

/**
 * A one-shot Convex client for the trusted Eve runtime (server-side, no browser).
 * Tools call the secret-guarded `api.eve.*` functions with EVE_CONVEX_SECRET and an
 * explicit Clerk user id — Convex validates the secret before touching data.
 */
export function convexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set for the Eve runtime");
  return new ConvexHttpClient(url);
}

export function eveConvexSecret() {
  const secret = process.env.EVE_CONVEX_SECRET;
  if (!secret) throw new Error("EVE_CONVEX_SECRET is not set for the Eve runtime");
  return secret;
}
