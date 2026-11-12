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
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/marketing-shield/v1/health",
  "/api/webhooks/clerk",
  "/api/inngest(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
