/**
 * Reduce a Clerk `redirect_url` query value (absolute, e.g.
 * "http://localhost:3000/feed") to a same-app path. Dropping the origin
 * keeps the redirect open-redirect-safe no matter what's in the URL.
 */
export function localRedirectPath(raw: string | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const url = new URL(raw);
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
