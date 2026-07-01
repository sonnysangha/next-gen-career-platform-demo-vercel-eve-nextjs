import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Next.js 16 renamed the `middleware` convention to `proxy`. Clerk's
// clerkMiddleware() is exported as the default proxy handler.
//
// Public routes. Everything else requires a signed-in user.
// - /sign-in, /sign-up: Clerk auth pages
// - /eve/*: mounted by withEve(); the Eve channel enforces its own auth
// - /api/*: route handlers / webhooks do their own checks
const isPublicRoute = createRouteMatcher([
  "/", // public marketing landing page
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/eve(.*)",
  "/api(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
