/**
 * Cogent Marketing Shield - Authoritative Server-Side Tenant & RBAC Resolver
 * Document Reference: Document 07 (Section 3 & 4) & Document 08 (Phase 3)
 */

import { auth } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { AuthTenancyError, CanonicalRole, TenantContext } from "./types";
import { getPermissionsForRole, mapClerkRoleToCanonical } from "./permissions";
import { logger } from "@/lib/logger";

export interface ResolveTenantOptions {
  /** Test context override exclusively active during automated unit testing */
  testContext?: Partial<TenantContext>;
}

/**
 * Authoritatively resolves the active tenant institution, user identity, and RBAC permissions
 * from the cryptographic Clerk session and Supabase `tenants` / `tenant_memberships` tables.
 *
 * Fails closed:
 * - 401 UNAUTHENTICATED if no valid user session exists.
 * - 403 TENANT_CONTEXT_INVALID if no organization is active or user is not a member.
 * - 403 TENANT_SUSPENDED if the tenant or membership is suspended.
 */
export async function resolveTenantContext(
  req?: Request,
  options?: ResolveTenantOptions,
): Promise<TenantContext> {
  // 1. Allow deterministic test injection in test environment
  if (process.env.NODE_ENV === "test" && options?.testContext) {
    const override = options.testContext;
    const role: CanonicalRole = override.role || "MARKETING_GROWTH";
    const permissions = override.permissions || getPermissionsForRole(role);

    return {
      tenantId: override.tenantId || "00000000-0000-0000-0000-000000000001",
      userId: override.userId || "00000000-0000-0000-0000-000000000002",
      clerkOrgId: override.clerkOrgId || "org_test_default",
      clerkUserId: override.clerkUserId || "user_test_default",
      orgSlug: override.orgSlug || "first-bank-test",
      orgName: override.orgName || "First Bank of Nigeria Test",
      role,
      permissions,
      status: override.status || "ACTIVE",
    };
  }

  // 2. Read Clerk authenticated session
  let session: Awaited<ReturnType<typeof auth>>;
  try {
    session = await auth();
  } catch (err) {
    logger.error("Failed to read Clerk session in resolveTenantContext", { error: err });
    throw new AuthTenancyError("UNAUTHENTICATED", "Failed to verify user authentication session", 401);
  }

  const { userId, orgId, orgRole, orgSlug } = session;

  if (!userId) {
    throw new AuthTenancyError(
      "UNAUTHENTICATED",
      "Authentication required. No active Clerk user session found.",
      401,
    );
  }

  if (!orgId) {
    throw new AuthTenancyError(
      "TENANT_CONTEXT_INVALID",
      "Multi-tenant context missing: No active organization selected in session. Users must belong to and select an authorized institution organization.",
      403,
    );
  }

  // 3. Query Supabase database authority
  const supabase = createAdminSupabaseClient();

  // Find tenant by clerk_org_id
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name, slug, status")
    .eq("clerk_org_id", orgId)
    .single();

  if (tenantError || !tenant) {
    logger.warn("Tenant not found in Supabase for active Clerk org", { clerkOrgId: orgId });
    throw new AuthTenancyError(
      "TENANT_CONTEXT_INVALID",
      `Institution tenant for organization ${orgId} is not provisioned or recognized in the database.`,
      403,
    );
  }

  if (tenant.status === "SUSPENDED" || tenant.status === "INACTIVE") {
    logger.warn("Access attempt to suspended tenant", { tenantId: tenant.id, status: tenant.status });
    throw new AuthTenancyError(
      "TENANT_SUSPENDED",
      `Institution account '${tenant.name}' is currently ${tenant.status}. Access is blocked.`,
      403,
    );
  }

  // Find membership in tenant_memberships
  const { data: membership, error: _memError } = await supabase
    .from("tenant_memberships")
    .select("id, role, status")
    .eq("tenant_id", tenant.id)
    .eq("user_id", userId)
    .single();

  let resolvedRole: CanonicalRole;
  let membershipStatus: "ACTIVE" | "SUSPENDED" | "INVITED" = "ACTIVE";

  if (membership) {
    if (membership.status === "SUSPENDED") {
      logger.warn("Suspended user attempted access", { userId, tenantId: tenant.id });
      throw new AuthTenancyError(
        "TENANT_SUSPENDED",
        `Your user membership in institution '${tenant.name}' is SUSPENDED. Contact your compliance administrator.`,
        403,
      );
    }
    resolvedRole = mapClerkRoleToCanonical(membership.role);
    membershipStatus = membership.status as "ACTIVE" | "SUSPENDED" | "INVITED";
  } else {
    // If membership row is still syncing via webhook but Clerk session contains active orgRole
    if (orgRole) {
      resolvedRole = mapClerkRoleToCanonical(orgRole);
      // Auto-reconcile membership row in background
      void supabase
        .from("tenant_memberships")
        .upsert(
          {
            tenant_id: tenant.id,
            user_id: userId,
            role: resolvedRole,
            status: "ACTIVE",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,user_id" },
        )
        .then(
          () => logger.info("Auto-reconciled missing membership row", { userId, tenantId: tenant.id }),
          (err: unknown) => logger.error("Failed to auto-reconcile membership", { error: err }),
        );
    } else {
      throw new AuthTenancyError(
        "TENANT_CONTEXT_INVALID",
        `User ${userId} is not an authorized member of institution ${tenant.name}.`,
        403,
      );
    }
  }

  const permissions = getPermissionsForRole(resolvedRole);

  return {
    tenantId: tenant.id,
    userId: membership?.id || userId,
    clerkOrgId: orgId,
    clerkUserId: userId,
    orgSlug: tenant.slug || orgSlug || "unknown",
    orgName: tenant.name,
    role: resolvedRole,
    permissions,
    status: membershipStatus,
  };
}
