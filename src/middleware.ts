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
  "/",
  "/platform(.*)",
  "/solutions(.*)",
  "/resources(.*)",
  "/blog(.*)",
  "/company(.*)",
  "/legal(.*)",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image(.*)",
  "/twitter-image(.*)",
  "/manifest.webmanifest",
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

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  const isOwnerScopedResourcesRoute =
    pathname.startsWith("/resources/@/") || pathname.startsWith("/resources/%40/");

  if (!isOwnerScopedResourcesRoute && isAlwaysPublicRoute(req)) {
    return;
  }

  // API endpoints return structured JSON 401/403 via resolveTenantContext()
  // instead of redirecting fetch() calls to HTML sign-in pages.
  if (isApiRoute(req)) {
    return;
  }

  // Protect all authenticated application routes (/onboarding, /chat, /knowledge-base, /drift-monitors, /settings, /@/admin/resources, /resources/@/admin/resources)
  // so unauthenticated visitors always authenticate via /sign-in before entering the workspace.
  await auth.protect({
    unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
  });
});

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
