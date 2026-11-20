/**
 * Cogent Marketing Shield - Owner-Only Internal Workspace Service
 *
 * An "Internal Workspace" is a tenant used by the platform owner and their team
 * for product walkthroughs, demos, and marketing. It always resolves to an
 * unlimited Enterprise plan: no trial, no Paystack, no quotas.
 *
 * Security model:
 *  - Only ONE identity is trusted: `PLATFORM_OWNER_EMAIL` (must be a *verified*
 *    email on the signed-in Clerk user). Optionally pinned further with
 *    `PLATFORM_OWNER_CLERK_USER_ID`.
 *  - Only active on Vercel `production` and `preview` deployments
 *    (`VERCEL_ENV`, or `APP_ENV` on other hosts). Disabled locally by design.
 *  - Fails closed: if anything is missing or Clerk cannot be reached, the user is
 *    NOT treated as the owner.
 *  - The flag lives in the dedicated `tenants.billing_override` column (never in
 *    the shared `settings` JSONB), so no other code path can overwrite it.
 */

import { clerkClient } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { auditService } from "@/modules/audit/audit.service";
import type { SubscriptionPlan } from "@/contracts/billing.contracts";

export const INTERNAL_ENTERPRISE_OVERRIDE = "internal_enterprise" as const;
export type BillingOverride = typeof INTERNAL_ENTERPRISE_OVERRIDE;

/** Environments where the owner override is honoured. Local development is excluded. */
const ALLOWED_RUNTIME_ENVS = new Set(["production", "preview"]);

const DEMO_TENANT_ID = "11111111-1111-1111-1111-111111111111";
const DEMO_ORG_ID = "org_demo_1111";

type EnvLike = Record<string, string | undefined>;

function normalizeEmail(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw.trim().replace(/^['"]+|['"]+$/g, "").trim().toLowerCase();
  return cleaned.includes("@") ? cleaned : null;
}

/** Returns the normalized platform owner email, or null if not configured. */
export function getPlatformOwnerEmail(env: EnvLike = process.env): string | null {
  return normalizeEmail(env.PLATFORM_OWNER_EMAIL);
}

/** Returns the optional pinned Clerk user ID for the platform owner. */
export function getPlatformOwnerClerkUserId(env: EnvLike = process.env): string | null {
  const raw = (env.PLATFORM_OWNER_CLERK_USER_ID || "").trim().replace(/^['"]+|['"]+$/g, "");
  return raw.length > 0 ? raw : null;
}

/** Name of the current deployment environment (Vercel `VERCEL_ENV`, or `APP_ENV`). */
export function getRuntimeEnvName(env: EnvLike = process.env): string | null {
  const raw = (env.VERCEL_ENV || env.APP_ENV || "").trim().toLowerCase();
  return raw.length > 0 ? raw : null;
}

/** True when the owner override is allowed to operate in this deployment. */
export function isInternalWorkspaceRuntimeEnabled(env: EnvLike = process.env): boolean {
  const runtime = getRuntimeEnvName(env);
  return Boolean(runtime && ALLOWED_RUNTIME_ENVS.has(runtime) && getPlatformOwnerEmail(env));
}

/** True when the tenant row carries the internal Enterprise override. */
export function isInternalOverride(value: unknown): value is BillingOverride {
  return value === INTERNAL_ENTERPRISE_OVERRIDE;
}

export function isDemoTenant(tenantId?: string | null, clerkOrgId?: string | null): boolean {
  return tenantId === DEMO_TENANT_ID || clerkOrgId === DEMO_ORG_ID;
}

/**
 * Pure identity check against a Clerk user's email addresses.
 * Exported for unit testing; production code should call `isPlatformOwner`.
 */
export function matchesPlatformOwner(
  user: {
    id: string;
    emailAddresses?: Array<{
      emailAddress?: string | null;
      verification?: { status?: string | null } | null;
    }>;
  },
  env: EnvLike = process.env,
): boolean {
  if (!isInternalWorkspaceRuntimeEnabled(env)) return false;
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

// Short-lived in-memory cache so tenant resolution does not call Clerk on every request.
const OWNER_CACHE_TTL_MS = 5 * 60 * 1000;
const ownerCache = new Map<string, { value: boolean; expiresAt: number }>();

/** Clears the owner lookup cache (used by tests). */
export function __resetPlatformOwnerCache(): void {
  ownerCache.clear();
}

/**
 * Returns true only if `clerkUserId` belongs to the platform owner
 * (verified `PLATFORM_OWNER_EMAIL`, optional pinned user ID, allowed runtime).
 */
export async function isPlatformOwner(clerkUserId?: string | null): Promise<boolean> {
  if (!clerkUserId || !isInternalWorkspaceRuntimeEnabled()) return false;

  const pinnedUserId = getPlatformOwnerClerkUserId();
  if (pinnedUserId && pinnedUserId !== clerkUserId) return false;

  const cached = ownerCache.get(clerkUserId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let value = false;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    value = matchesPlatformOwner(user);
  } catch (err) {
    logger.warn("Platform owner lookup failed; treating as non-owner", {
      clerkUserId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false; // Do not cache transient failures
  }

  ownerCache.set(clerkUserId, { value, expiresAt: Date.now() + OWNER_CACHE_TTL_MS });
  return value;
}

/**
 * Builds the unlimited plan used by internal workspaces: Enterprise with every
 * quota set to unlimited and every feature switched on.
 */
export function buildInternalEnterprisePlan(base: SubscriptionPlan): SubscriptionPlan {
  const features: SubscriptionPlan["features"] = { ...base.features };
  for (const [key, value] of Object.entries(features)) {
    if (typeof value === "boolean") {
      (features as Record<string, unknown>)[key] = true;
    } else if (typeof value === "number") {
      (features as Record<string, unknown>)[key] = -1;
    }
  }

  return {
    ...base,
    slug: "enterprise",
    monthly_audit_limit: -1,
    seat_limit: -1,
    url_drift_monitor_limit: -1,
    monthly_live_search_limit: -1,
    allowed_search_jurisdictions: Array.from(
      new Set([...(base.allowed_search_jurisdictions || []), "GLOBAL"]),
    ),
    features: {
      ...features,
      export_unwatermarked: true,
      cco_approval_lock: true,
      url_drift_monitoring: true,
      live_web_search: true,
      cross_border_research: true,
      work_product_docx_export: true,
      regulatory_ripple_live_web: true,
      monthly_live_search_limit: -1,
    },
    is_active: true,
  };
}

/** Reads the override for a tenant. Returns false if the column/migration is missing. */
export async function isInternalWorkspace(tenantId: string): Promise<boolean> {
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .maybeSingle();
    if (error || !data) return false;
    return isInternalOverride((data as Record<string, unknown>).billing_override);
  } catch {
    return false;
  }
}

export interface SetInternalWorkspaceResult {
  ok: boolean;
  isInternal: boolean;
  error?: string;
}

/**
 * Sets or clears the internal Enterprise override on a tenant.
 * Callers MUST have already verified the actor with `isPlatformOwner`.
 */
export async function setInternalWorkspace(params: {
  tenantId: string;
  enabled: boolean;
  actorId: string;
  source: "OWNER_AUTO_CLAIM" | "OWNER_SETTINGS_TOGGLE" | "ADMIN_CLI";
}): Promise<SetInternalWorkspaceResult> {
  const { tenantId, enabled, actorId, source } = params;

  if (isDemoTenant(tenantId)) {
    return { ok: false, isInternal: false, error: "The shared demo tenant cannot be modified." };
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("tenants")
    .update({
      billing_override: enabled ? INTERNAL_ENTERPRISE_OVERRIDE : null,
      billing_override_set_by: actorId,
      billing_override_set_at: now,
      updated_at: now,
    })
    .eq("id", tenantId);

  if (error) {
    logger.error("Failed to update internal workspace override", {
      tenantId,
      enabled,
      error: error.message,
    });
    return {
      ok: false,
      isInternal: !enabled,
      error: /billing_override/i.test(error.message)
        ? "Database migration 20261118000001_internal_workspace_override.sql has not been applied."
        : error.message,
    };
  }

  try {
    await auditService.appendEvent({
      tenantId,
      actorId,
      actorType: source === "ADMIN_CLI" ? "SYSTEM" : "USER",
      action: enabled ? "INTERNAL_WORKSPACE_ENABLED" : "INTERNAL_WORKSPACE_DISABLED",
      entityType: "TENANT_SUBSCRIPTION",
      entityId: tenantId,
      eventData: { override: enabled ? INTERNAL_ENTERPRISE_OVERRIDE : null, source },
    });
  } catch {
    // Non-blocking audit logging
  }

  const { invalidateTenantSubscriptionCache } = await import("./entitlements.service");
  invalidateTenantSubscriptionCache(tenantId);

  logger.info("Internal workspace override updated", { tenantId, enabled, source });
  return { ok: true, isInternal: enabled };
}

/**
 * Automatically marks a workspace as Internal when the platform owner CREATED the
 * Clerk organization. Orgs the owner merely joined (e.g. a customer's workspace)
 * are never auto-claimed; use the owner-only Settings toggle for those.
 *
 * Returns true if the tenant is (now) internal.
 */
export async function claimInternalWorkspaceIfOwnerCreated(params: {
  tenantId: string;
  clerkUserId?: string | null;
  clerkOrgId?: string | null;
  orgCreatedBy?: string | null;
}): Promise<boolean> {
  const { tenantId, clerkUserId, clerkOrgId } = params;
  if (!clerkUserId || !clerkOrgId || isDemoTenant(tenantId, clerkOrgId)) return false;
  if (!(await isPlatformOwner(clerkUserId))) return false;

  let createdBy = params.orgCreatedBy ?? null;
  if (!createdBy) {
    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({ organizationId: clerkOrgId });
      createdBy = org?.createdBy || null;
    } catch {
      return false;
    }
  }

  if (createdBy !== clerkUserId) return false;

  const result = await setInternalWorkspace({
    tenantId,
    enabled: true,
    actorId: clerkUserId,
    source: "OWNER_AUTO_CLAIM",
  });
  return result.ok && result.isInternal;
}
