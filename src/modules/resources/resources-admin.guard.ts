/**
 * Cogent Resources Hub - Owner-Only Admin Guard
 * Strictly restricts /admin/resources and /api/marketing-shield/v1/admin/resources/*
 * to the platform owner identified by verified PLATFORM_OWNER_EMAIL
 * (and optional PLATFORM_OWNER_CLERK_USER_ID).
 *
 * Works in Vercel production/preview AND local development (still failing closed
 * unless Clerk authentication succeeds and the verified email matches).
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";

type EnvLike = Record<string, string | undefined>;

function normalizeEmail(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw.trim().replace(/^['"]+|['"]+$/g, "").trim().toLowerCase();
  return cleaned.includes("@") ? cleaned : null;
}

function getPlatformOwnerEmail(env: EnvLike = process.env): string | null {
  return normalizeEmail(env.PLATFORM_OWNER_EMAIL);
}

function getPlatformOwnerClerkUserId(env: EnvLike = process.env): string | null {
  const raw = (env.PLATFORM_OWNER_CLERK_USER_ID || "").trim().replace(/^['"]+|['"]+$/g, "");
  return raw.length > 0 ? raw : null;
}

export interface ClerkUserLike {
  id: string;
  emailAddresses?: Array<{
    emailAddress?: string | null;
    verification?: { status?: string | null } | null;
  }>;
}

/**
 * Pure identity check exported for unit testing.
 */
export function matchesResourcesAdmin(
  user: ClerkUserLike | null | undefined,
  env: EnvLike = process.env,
): boolean {
  const ownerEmail = getPlatformOwnerEmail(env);
  if (!ownerEmail || !user?.id) return false;

  const pinnedUserId = getPlatformOwnerClerkUserId(env);
  if (pinnedUserId && pinnedUserId !== user.id) return false;

  return (user.emailAddresses || []).some(
    (addr) =>
      normalizeEmail(addr.emailAddress) === ownerEmail &&
      addr.verification?.status === "verified",
  );
}

const ADMIN_CACHE_TTL_MS = 5 * 60 * 1000;
const adminCache = new Map<string, { value: boolean; expiresAt: number }>();

export function __resetResourcesAdminCache(): void {
  adminCache.clear();
}

export async function isResourcesAdmin(clerkUserId?: string | null): Promise<boolean> {
  if (!clerkUserId) return false;

  const ownerEmail = getPlatformOwnerEmail();
  if (!ownerEmail) return false;

  const pinnedUserId = getPlatformOwnerClerkUserId();
  if (pinnedUserId && pinnedUserId !== clerkUserId) return false;

  const cached = adminCache.get(clerkUserId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let value = false;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    value = matchesResourcesAdmin(user);
  } catch (err) {
    logger.warn("Resources admin owner lookup failed; denying access", {
      clerkUserId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }

  adminCache.set(clerkUserId, { value, expiresAt: Date.now() + ADMIN_CACHE_TTL_MS });
  return value;
}

export async function requireResourcesAdminSession(): Promise<
  { authorized: true; clerkUserId: string } | { authorized: false }
> {
  try {
    const { userId } = await auth();
    if (!userId) return { authorized: false };
    const allowed = await isResourcesAdmin(userId);
    if (!allowed) return { authorized: false };
    return { authorized: true, clerkUserId: userId };
  } catch {
    return { authorized: false };
  }
}
