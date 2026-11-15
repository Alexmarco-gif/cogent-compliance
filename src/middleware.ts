/**
 * Cogent Marketing Shield - Clerk Authentication & Route Protection Middleware
 * Document Reference: Document 07 (Section 3) & Document 08 (Phase 3)
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Public routes accessible without active authentication:
 * - Landing page / marketing entry
 * - Sign in and Sign up flows
 * - Standard health check gateway route
 * - Clerk Svix webhook ingestion endpoint
 */
const isAlwaysPublicRoute = createRouteMatcher([
  "/pricing(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/marketing-shield/v1/health",
  "/api/marketing-shield/v1/billing/plans",
  "/api/marketing-shield/v1/billing/webhooks/(.*)",
  "/api/webhooks/(.*)",
  "/api/inngest(.*)",
]);

const isApiRoute = createRouteMatcher([
  "/api/(.*)",
]);

const isDevPreviewRoute = createRouteMatcher([
  "/",
  "/chat(.*)",
  "/drift-monitors(.*)",
  "/knowledge-base(.*)",
  "/onboarding(.*)",
  "/settings(.*)",
  "/studio(.*)",
  "/api/marketing-shield/v1/(.*)",
  "/api/billing(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isAlwaysPublicRoute(req)) {
    return;
  }

  // API endpoints return structured JSON 401/403 via resolveTenantContext()
  // instead of redirecting fetch() calls to HTML sign-in pages.
  if (isApiRoute(req)) {
    return;
  }

  // Allow frictionless local testing in development/test while protecting all
  // workspace pages in production deployments.
  if (process.env.NODE_ENV !== "production" && isDevPreviewRoute(req)) {
    return;
  }

  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
