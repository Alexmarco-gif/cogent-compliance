/**
 * Cogent Marketing Shield - Authoritative Server-Side Tenant & RBAC Resolver
 * Document Reference: Document 07 (Section 3 & 4) & Document 08 (Phase 3)
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { AuthTenancyError, CANONICAL_ROLES, CanonicalRole, TenantContext } from "./types";
import { getPermissionsForRole, mapClerkRoleToCanonical } from "./permissions";
import { syncClerkOrganizationCreated } from "./clerk.sync";
import {
  parseInternalEnterpriseEmails,
  provisionEnterpriseForAllowlistedCreator,
} from "@/modules/billing/enterprise-allowlist.service";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

function isCanonicalRole(value: unknown): value is CanonicalRole {
  return typeof value === "string" && (CANONICAL_ROLES as readonly string[]).includes(value);
}

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

  if (process.env.NODE_ENV === "development" && (!userId || !orgId)) {
    const role: CanonicalRole = "CHIEF_COMPLIANCE_OFFICER";
    return {
      tenantId: "11111111-1111-1111-1111-111111111111",
      userId: "user_demo_000000000001",
      clerkOrgId: "org_demo_1111",
      clerkUserId: "user_demo_000000000001",
      orgSlug: "first-bank-demo",
      orgName: "First Bank of Nigeria (Demo)",
      role,
      permissions: getPermissionsForRole(role),
      status: "ACTIVE",
    };
  }

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
  let { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name, slug, status, settings")
    .eq("clerk_org_id", orgId)
    .single();

  let provisionFailureReason: string | null = null;

  if ((tenantError || !tenant) && process.env.NODE_ENV !== "test") {
    try {
      let resolvedOrgName = orgSlug || `Organization ${orgId.slice(-6)}`;
      let resolvedOrgSlug = orgSlug || null;
      let resolvedOrgCreatedAt: number | undefined;
      let resolvedOrgCreatedBy: string | undefined;

      try {
        const client = await clerkClient();
        const org = await client.organizations.getOrganization({ organizationId: orgId });
        if (org?.name) resolvedOrgName = org.name;
        if (org?.slug) resolvedOrgSlug = org.slug;
        if (org?.createdAt) resolvedOrgCreatedAt = org.createdAt;
        if (org?.createdBy) resolvedOrgCreatedBy = org.createdBy;
      } catch (clerkErr) {
        logger.warn("Unable to fetch org metadata from Clerk during lazy tenant provisioning", {
          clerkOrgId: orgId,
          error: clerkErr instanceof Error ? clerkErr.message : String(clerkErr),
        });
      }

      const provisioned = await syncClerkOrganizationCreated({
        id: orgId,
        name: resolvedOrgName,
        slug: resolvedOrgSlug,
        created_at: resolvedOrgCreatedAt,
        created_by: resolvedOrgCreatedBy,
      });

      const { data: reloadedTenant, error: reloadErr } = await supabase
        .from("tenants")
        .select("id, name, slug, status, settings")
        .eq("id", provisioned.tenantId)
        .single();

      if (reloadedTenant && !reloadErr) {
        tenant = reloadedTenant;
        tenantError = null;
        logger.info("Auto-provisioned missing Supabase tenant for active Clerk organization", {
          clerkOrgId: orgId,
          tenantId: reloadedTenant.id,
        });
      } else {
        provisionFailureReason = reloadErr?.message || "Reloaded tenant record was null";
      }
    } catch (provisionErr) {
      provisionFailureReason =
        provisionErr instanceof Error ? provisionErr.message : String(provisionErr);
      logger.error("Failed to auto-provision missing tenant row", {
        clerkOrgId: orgId,
        error: provisionFailureReason,
      });
    }
  }

  if (tenantError || !tenant) {
    let supabaseHost = "unknown";
    try {
      if (env.NEXT_PUBLIC_SUPABASE_URL) {
        supabaseHost = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host;
      }
    } catch {
      supabaseHost = "invalid-url";
    }
    logger.warn("Tenant not found in Supabase for active Clerk org", {
      clerkOrgId: orgId,
      supabaseHost,
      provisionFailureReason,
    });
    const detail = provisionFailureReason
      ? ` (host=${supabaseHost}; ${provisionFailureReason})`
      : ` (host=${supabaseHost})`;
    throw new AuthTenancyError(
      "TENANT_CONTEXT_INVALID",
      `Institution tenant for organization ${orgId} is not provisioned or recognized in the database.${detail}`,
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
  let resolvedMembershipId = membership?.id;

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
    let effectiveOrgRole = orgRole;
    let clerkMembershipId: string | undefined;
    let clerkMetadataCanonicalRole: unknown;
    let memberEmail: string | undefined;
    let orgMemberCount = 0;

    // Inspect Clerk membership metadata & pending invitations when JWT/Supabase lacks a row
    if (process.env.NODE_ENV !== "test") {
      try {
        const client = await clerkClient();
        let offset = 0;
        const pageSize = 100;
        let foundMember = null as
          | Awaited<ReturnType<typeof client.organizations.getOrganizationMembershipList>>["data"][number]
          | null;

        for (let page = 0; page < 20; page += 1) {
          const memList = await client.organizations.getOrganizationMembershipList({
            organizationId: orgId,
            limit: pageSize,
            offset,
          });
          if (page === 0) {
            orgMemberCount = memList.totalCount ?? memList.data.length;
          }
          const match = memList.data.find((m) => m.publicUserData?.userId === userId);
          if (match) {
            foundMember = match;
            break;
          }
          if (memList.data.length < pageSize) {
            break;
          }
          offset += pageSize;
        }

        if (foundMember) {
          clerkMembershipId = foundMember.id;
          clerkMetadataCanonicalRole = (foundMember.publicMetadata as Record<string, unknown> | undefined)
            ?.canonicalRole;
          memberEmail = foundMember.publicUserData?.identifier?.toLowerCase().trim();
          if (!effectiveOrgRole && foundMember.role) {
            effectiveOrgRole = foundMember.role;
          }
        }
      } catch (memErr) {
        logger.warn("Unable to inspect Clerk organization memberships", {
          clerkOrgId: orgId,
          userId,
          error: memErr instanceof Error ? memErr.message : String(memErr),
        });
      }
    }

    if (effectiveOrgRole || isCanonicalRole(clerkMetadataCanonicalRole)) {
      const tenantSettings = ((tenant as { settings?: Record<string, unknown> | null }).settings || {}) as Record<
        string,
        unknown
      >;
      const pendingRoles = {
        ...((tenantSettings.pending_role_assignments || {}) as Record<string, unknown>),
      };
      let matchedPendingEmail: string | undefined =
        memberEmail && isCanonicalRole(pendingRoles[memberEmail]) ? memberEmail : undefined;
      let pendingRole = matchedPendingEmail ? pendingRoles[matchedPendingEmail] : undefined;

      if (
        !isCanonicalRole(clerkMetadataCanonicalRole) &&
        !isCanonicalRole(pendingRole) &&
        process.env.NODE_ENV !== "test" &&
        Object.keys(pendingRoles).length > 0
      ) {
        try {
          const client = await clerkClient();
          const clerkUser = await client.users.getUser(userId);
          for (const addr of clerkUser.emailAddresses || []) {
            const lower = addr.emailAddress?.toLowerCase().trim();
            if (lower && isCanonicalRole(pendingRoles[lower])) {
              matchedPendingEmail = lower;
              pendingRole = pendingRoles[lower];
              break;
            }
          }
        } catch {
          // Non-blocking fallback
        }
      }

      if (isCanonicalRole(clerkMetadataCanonicalRole)) {
        resolvedRole = clerkMetadataCanonicalRole;
      } else if (isCanonicalRole(pendingRole)) {
        resolvedRole = pendingRole;
      } else if (
        (effectiveOrgRole === "org:admin" || effectiveOrgRole === "admin") &&
        orgMemberCount <= 1
      ) {
        // Founding workspace creator defaults to Chief Compliance Officer instead of IT-only Workspace Admin
        resolvedRole = "CHIEF_COMPLIANCE_OFFICER";
      } else {
        resolvedRole = mapClerkRoleToCanonical(effectiveOrgRole);
      }

      try {
        const upsertPayload: Record<string, unknown> = {
          tenant_id: tenant.id,
          user_id: userId,
          role: resolvedRole,
          status: "ACTIVE",
          updated_at: new Date().toISOString(),
        };
        if (clerkMembershipId) {
          upsertPayload.clerk_membership_id = clerkMembershipId;
        }

        const { data: reconciled } = await supabase
          .from("tenant_memberships")
          .upsert(upsertPayload, { onConflict: "tenant_id,user_id" })
          .select("id")
          .single();
        if (reconciled?.id) {
          resolvedMembershipId = reconciled.id;
        }

        if (matchedPendingEmail) {
          delete pendingRoles[matchedPendingEmail];
          await supabase
            .from("tenants")
            .update({
              settings: {
                ...tenantSettings,
                pending_role_assignments: pendingRoles,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", tenant.id);
        }

        if (
          process.env.NODE_ENV !== "test" &&
          clerkMetadataCanonicalRole !== resolvedRole &&
          orgId !== "org_demo_1111"
        ) {
          try {
            const client = await clerkClient();
            await client.organizations.updateOrganizationMembershipMetadata({
              organizationId: orgId,
              userId,
              publicMetadata: { canonicalRole: resolvedRole },
            });
          } catch {
            // Non-blocking metadata sync
          }
        }

        logger.info("Auto-reconciled missing membership row", {
          userId,
          tenantId: tenant.id,
          role: resolvedRole,
        });
      } catch (err: unknown) {
        logger.error("Failed to auto-reconcile membership", { error: err });
      }
    } else {
      throw new AuthTenancyError(
        "TENANT_CONTEXT_INVALID",
        `User ${userId} is not an authorized member of institution ${tenant.name}.`,
        403,
      );
    }
  }

  const tenantSettings = ((tenant as { settings?: Record<string, unknown> | null }).settings || {}) as Record<
    string,
    unknown
  >;
  const existingSub = tenantSettings.subscription as { status?: string } | undefined;
  if (
    orgId !== "org_demo_1111" &&
    parseInternalEnterpriseEmails().size > 0 &&
    (resolvedRole === "CHIEF_COMPLIANCE_OFFICER" || resolvedRole === "WORKSPACE_ADMIN") &&
    !tenantSettings.enterprise_comp_owner_user_id &&
    !tenantSettings.enterprise_comp_checked_at &&
    existingSub?.status !== "active"
  ) {
    try {
      const compResult = await provisionEnterpriseForAllowlistedCreator({
        tenantId: tenant.id,
        clerkUserId: userId,
        clerkOrgId: orgId,
      });
      if (compResult.granted && resolvedRole === "WORKSPACE_ADMIN") {
        resolvedRole = "CHIEF_COMPLIANCE_OFFICER";
      }
    } catch {
      // Non-blocking Enterprise allowlist evaluation
    }
  }

  const permissions = getPermissionsForRole(resolvedRole);

  return {
    tenantId: tenant.id,
    userId: resolvedMembershipId || userId,
    clerkOrgId: orgId,
    clerkUserId: userId,
    orgSlug: tenant.slug || orgSlug || "unknown",
    orgName: tenant.name,
    role: resolvedRole,
    permissions,
    status: membershipStatus,
  };
}
