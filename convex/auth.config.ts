/**
 * Convex <-> Clerk auth bridge.
 *
 * `CLERK_JWT_ISSUER_DOMAIN` must be set on the Convex deployment:
 *   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-domain.clerk.accounts.dev
 *
 * The `applicationID: "convex"` must match the audience ("aud") claim of the
 * Clerk JWT template named "convex".
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
