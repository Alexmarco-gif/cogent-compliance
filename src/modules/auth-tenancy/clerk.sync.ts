/**
 * Cogent Marketing Shield - Clerk to Supabase Real-Time Tenant Synchronization
 * Document Reference: Document 07 (Section 4) & Document 08 (Phase 3)
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { mapClerkRoleToCanonical } from "./permissions";
import { CANONICAL_ROLES, type CanonicalRole } from "./types";
import { logger } from "@/lib/logger";
import {
  parseInternalEnterpriseEmails,
  provisionEnterpriseForAllowlistedCreator,
} from "@/modules/billing/enterprise-allowlist.service";

export interface ClerkOrgEventData {
  id: string; // e.g. org_xxx
  name: string;
  slug?: string | null;
  created_at?: number | string | null;
  created_by?: string | null;
}

export interface ClerkMembershipEventData {
  id: string; // e.g. orgmem_xxx
  role: string; // e.g. org:admin, org:chief_compliance_officer, org:member
  public_metadata?: {
    canonicalRole?: string;
  } | null;
  organization: {
    id: string; // e.g. org_xxx
    name?: string;
    slug?: string | null;
  };
  public_user_data: {
    user_id: string; // e.g. user_xxx
    identifier?: string;
    first_name?: string | null;
    last_name?: string | null;
  };
}

function isCanonicalRole(value: unknown): value is CanonicalRole {
  return typeof value === "string" && (CANONICAL_ROLES as readonly string[]).includes(value);
}

function isGenericClerkRole(clerkRole: string | undefined | null): boolean {
  const normalized = (clerkRole || "").toLowerCase().trim();
  return normalized === "org:admin" || normalized === "org:member" || normalized === "admin" || normalized === "member";
}

/**
 * Synchronizes an organization creation event from Clerk to Supabase `tenants`.
 * Idempotent: Uses upsert on conflict of `clerk_org_id`.
 */
export async function syncClerkOrganizationCreated(data: ClerkOrgEventData): Promise<{ tenantId: string }> {
  const supabase = createAdminSupabaseClient();

  // 1. Return immediately if already provisioned for this clerk_org_id (never overwrite existing settings)
  const { data: existing, error: existingErr } = await supabase
    .from("tenants")
    .select("id")
    .eq("clerk_org_id", data.id)
    .maybeSingle();

  if (existing?.id) {
    return { tenantId: existing.id };
  }
  if (existingErr) {
    logger.warn("Lookup by clerk_org_id returned error before provisioning", {
      clerkOrgId: data.id,
      error: existingErr.message,
    });
  }

  // 2. Normalize slug and prepare collision-safe fallback candidates
  const rawSlug = data.slug || data.name || data.id;
  const baseSlug =
    rawSlug
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || data.id.toLowerCase();

  const orgSuffix = data.id.slice(-8).toLowerCase().replace(/[^a-z0-9]/g, "");
  const candidateSlugs = Array.from(
    new Set([
      baseSlug,
      `${baseSlug}-${orgSuffix}`,
      `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`,
    ]),
  );

  let initialTrialStart = new Date().toISOString();
  if (data.created_at) {
    const parsed = new Date(data.created_at);
    if (!Number.isNaN(parsed.getTime())) {
      initialTrialStart = parsed.toISOString();
    }
  }

  let lastErrorMessage = "Unknown database error";

  for (const candidateSlug of candidateSlugs) {
    const { data: tenant, error } = await supabase
      .from("tenants")
      .insert({
        clerk_org_id: data.id,
        name: data.name || `Organization ${data.id.slice(-6)}`,
        slug: candidateSlug,
        status: "ACTIVE",
        settings: { trial_started_at: initialTrialStart },
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!error && tenant?.id) {
      logger.info("Synchronized Clerk organization to Supabase tenant", {
        tenantId: tenant.id,
        clerkOrgId: data.id,
        name: data.name,
        slug: candidateSlug,
      });

      if (data.created_by && parseInternalEnterpriseEmails().size > 0) {
        try {
          await provisionEnterpriseForAllowlistedCreator({
            tenantId: tenant.id,
            clerkUserId: data.created_by,
            clerkOrgId: data.id,
            isCreatorHint: true,
          });
        } catch (allowlistErr) {
          logger.warn("Allowlist Enterprise check skipped during organization sync", {
            tenantId: tenant.id,
            error: allowlistErr instanceof Error ? allowlistErr.message : String(allowlistErr),
          });
        }
      }

      return { tenantId: tenant.id };
    }

    lastErrorMessage = error?.message || "Insert returned no tenant row";

    // Handle concurrent creation race or slug uniqueness collision (PostgreSQL 23505)
    if (error?.code === "23505" || /duplicate key/i.test(lastErrorMessage)) {
      const { data: raced } = await supabase
        .from("tenants")
        .select("id")
        .eq("clerk_org_id", data.id)
        .maybeSingle();
      if (raced?.id) {
        return { tenantId: raced.id };
      }
      // Slug was already taken by another tenant row -> try next candidate slug
      logger.warn("Tenant slug collision during Clerk org sync; retrying with disambiguated slug", {
        clerkOrgId: data.id,
        collidedSlug: candidateSlug,
      });
      continue;
    }

    break;
  }

  logger.error("Failed to sync Clerk organization creation", {
    clerkOrgId: data.id,
    error: lastErrorMessage,
  });
  throw new Error(`Failed to provision tenant for Clerk org ${data.id}: ${lastErrorMessage}`);
}

/**
 * Synchronizes an organization update event from Clerk to Supabase `tenants`.
 */
export async function syncClerkOrganizationUpdated(data: ClerkOrgEventData): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const updatePayload: Record<string, unknown> = {
    name: data.name,
    updated_at: new Date().toISOString(),
  };

  if (data.slug) {
    updatePayload.slug = data.slug;
  }

  const { error } = await supabase
    .from("tenants")
    .update(updatePayload)
    .eq("clerk_org_id", data.id);

  if (error) {
    logger.error("Failed to update Clerk organization in Supabase", {
      clerkOrgId: data.id,
      error: error.message,
    });
    throw new Error(`Failed to update tenant for Clerk org ${data.id}: ${error.message}`);
  }

  logger.info("Updated Clerk organization in Supabase tenant", {
    clerkOrgId: data.id,
    name: data.name,
  });
}

/**
 * Handles organization deletion by marking the tenant as INACTIVE (preserving audit history).
 */
export async function syncClerkOrganizationDeleted(data: { id: string }): Promise<void> {
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("tenants")
    .update({
      status: "INACTIVE",
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_org_id", data.id);

  if (error) {
    logger.error("Failed to archive Clerk organization in Supabase", {
      clerkOrgId: data.id,
      error: error.message,
    });
    throw new Error(`Failed to archive tenant for Clerk org ${data.id}: ${error.message}`);
  }

  logger.info("Archived Supabase tenant on Clerk organization deletion", {
    clerkOrgId: data.id,
  });
}

/**
 * Synchronizes an organization membership creation event from Clerk to Supabase `tenant_memberships`.
 * Idempotent: Finds parent tenant by `clerk_org_id`, then upserts on `(tenant_id, user_id)`.
 */
export async function syncClerkMembershipCreated(data: ClerkMembershipEventData): Promise<{ membershipId: string }> {
  const supabase = createAdminSupabaseClient();

  // 1. Resolve parent tenant by Clerk organization ID
  const { data: initialTenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, settings")
    .eq("clerk_org_id", data.organization.id)
    .single();

  let tenant: { id: string; settings?: Record<string, unknown> | null } | null = initialTenant;

  // If the tenant hasn't been synced yet, auto-provision it
  if (!tenant || tenantError) {
    const created = await syncClerkOrganizationCreated({
      id: data.organization.id,
      name: data.organization.name || "Default Organization",
      slug: data.organization.slug,
    });
    tenant = { id: created.tenantId, settings: {} };
  }

  const tenantSettings = (tenant.settings || {}) as Record<string, unknown>;
  const pendingRoles = {
    ...((tenantSettings.pending_role_assignments || {}) as Record<string, unknown>),
  };
  const candidateEmails = new Set<string>();
  if (data.public_user_data.identifier) {
    candidateEmails.add(data.public_user_data.identifier.toLowerCase().trim());
  }

  let matchedPendingEmail: string | undefined;
  let pendingRole: unknown;
  for (const email of candidateEmails) {
    if (isCanonicalRole(pendingRoles[email])) {
      matchedPendingEmail = email;
      pendingRole = pendingRoles[email];
      break;
    }
  }

  if (
    !isCanonicalRole(data.public_metadata?.canonicalRole) &&
    !isCanonicalRole(pendingRole) &&
    process.env.NODE_ENV !== "test" &&
    Object.keys(pendingRoles).length > 0
  ) {
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(data.public_user_data.user_id);
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

  let canonicalRole: CanonicalRole;
  if (isCanonicalRole(data.public_metadata?.canonicalRole)) {
    canonicalRole = data.public_metadata.canonicalRole;
  } else if (isCanonicalRole(pendingRole)) {
    canonicalRole = pendingRole;
  } else {
    canonicalRole = mapClerkRoleToCanonical(data.role);
    if (
      process.env.NODE_ENV !== "test" &&
      (data.role === "org:admin" || data.role === "admin")
    ) {
      try {
        const { count } = await supabase
          .from("tenant_memberships")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id);
        if ((count ?? 0) === 0) {
          canonicalRole = "CHIEF_COMPLIANCE_OFFICER";
        }
      } catch {
        // Non-blocking founding creator promotion
      }
    }
  }

  const { data: membership, error: memError } = await supabase
    .from("tenant_memberships")
    .upsert(
      {
        tenant_id: tenant.id,
        user_id: data.public_user_data.user_id,
        clerk_membership_id: data.id,
        role: canonicalRole,
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,user_id" },
    )
    .select("id")
    .single();

  if (memError || !membership) {
    logger.error("Failed to sync Clerk membership to Supabase", {
      clerkMembershipId: data.id,
      clerkUserId: data.public_user_data.user_id,
      error: memError?.message,
    });
    throw new Error(`Failed to upsert tenant membership: ${memError?.message}`);
  }

  // Consume pending assignment & keep Clerk membership metadata in sync
  if (matchedPendingEmail) {
    delete pendingRoles[matchedPendingEmail];
    try {
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
    } catch {
      // Non-blocking cleanup
    }
  }

  if (
    process.env.NODE_ENV !== "test" &&
    data.public_metadata?.canonicalRole !== canonicalRole &&
    data.organization.id !== "org_demo_1111"
  ) {
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();
      await client.organizations.updateOrganizationMembershipMetadata({
        organizationId: data.organization.id,
        userId: data.public_user_data.user_id,
        publicMetadata: { canonicalRole },
      });
    } catch {
      // Non-blocking metadata sync
    }
  }

  if (
    parseInternalEnterpriseEmails().size > 0 &&
    !tenantSettings.enterprise_comp_owner_user_id &&
    !tenantSettings.enterprise_comp_checked_at
  ) {
    try {
      await provisionEnterpriseForAllowlistedCreator({
        tenantId: tenant.id,
        clerkUserId: data.public_user_data.user_id,
        clerkOrgId: data.organization.id,
      });
    } catch (allowlistErr) {
      logger.warn("Allowlist Enterprise check skipped during membership sync", {
        tenantId: tenant.id,
        error: allowlistErr instanceof Error ? allowlistErr.message : String(allowlistErr),
      });
    }
  }

  logger.info("Synchronized Clerk membership to Supabase tenant_memberships", {
    membershipId: membership.id,
    tenantId: tenant.id,
    clerkUserId: data.public_user_data.user_id,
    role: canonicalRole,
  });

  return { membershipId: membership.id };
}

/**
 * Synchronizes an organization membership update event from Clerk (e.g. role change).
 */
export async function syncClerkMembershipUpdated(data: ClerkMembershipEventData): Promise<void> {
  const supabase = createAdminSupabaseClient();

  let canonicalRole: CanonicalRole;
  if (isCanonicalRole(data.public_metadata?.canonicalRole)) {
    canonicalRole = data.public_metadata.canonicalRole;
  } else {
    canonicalRole = mapClerkRoleToCanonical(data.role);
    // Preserve specialized functional roles (e.g. CHIEF_COMPLIANCE_OFFICER, LEGAL_COUNSEL)
    // when Clerk emits generic org:admin / org:member updates without public_metadata.
    if (isGenericClerkRole(data.role)) {
      try {
        const { data: existing } = await supabase
          .from("tenant_memberships")
          .select("role")
          .eq("clerk_membership_id", data.id)
          .maybeSingle();

        if (existing?.role && isCanonicalRole(existing.role)) {
          const existingIsAdmin =
            existing.role === "CHIEF_COMPLIANCE_OFFICER" || existing.role === "WORKSPACE_ADMIN";
          const incomingIsAdmin = data.role.toLowerCase().includes("admin");
          if (existingIsAdmin === incomingIsAdmin) {
            canonicalRole = existing.role;
          }
        }
      } catch {
        // Fallback to mapped Clerk role if lookup fails
      }
    }
  }

  const { error } = await supabase
    .from("tenant_memberships")
    .update({
      role: canonicalRole,
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_membership_id", data.id);

  if (error) {
    logger.error("Failed to update Clerk membership role in Supabase", {
      clerkMembershipId: data.id,
      error: error.message,
    });
    throw new Error(`Failed to update tenant membership: ${error.message}`);
  }

  logger.info("Updated Clerk membership role in Supabase", {
    clerkMembershipId: data.id,
    role: canonicalRole,
  });
}

/**
 * Handles membership removal by marking the membership as SUSPENDED (preserves audit integrity).
 */
export async function syncClerkMembershipDeleted(data: { id: string }): Promise<void> {
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("tenant_memberships")
    .update({
      status: "SUSPENDED",
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_membership_id", data.id);

  if (error) {
    logger.error("Failed to suspend Clerk membership in Supabase", {
      clerkMembershipId: data.id,
      error: error.message,
    });
    throw new Error(`Failed to suspend tenant membership: ${error.message}`);
  }

  logger.info("Suspended Supabase tenant membership on Clerk removal", {
    clerkMembershipId: data.id,
  });
}

/**
 * Dispatcher for verified Clerk webhook events.
 */
export async function dispatchClerkWebhookEvent(
  eventType: string,
  data: Record<string, unknown>,
): Promise<{ handled: boolean; eventType: string }> {
  switch (eventType) {
    case "organization.created":
      await syncClerkOrganizationCreated(data as unknown as ClerkOrgEventData);
      return { handled: true, eventType };

    case "organization.updated":
      await syncClerkOrganizationUpdated(data as unknown as ClerkOrgEventData);
      return { handled: true, eventType };

    case "organization.deleted":
      await syncClerkOrganizationDeleted(data as unknown as { id: string });
      return { handled: true, eventType };

    case "organizationMembership.created":
      await syncClerkMembershipCreated(data as unknown as ClerkMembershipEventData);
      return { handled: true, eventType };

    case "organizationMembership.updated":
      await syncClerkMembershipUpdated(data as unknown as ClerkMembershipEventData);
      return { handled: true, eventType };

    case "organizationMembership.deleted":
      await syncClerkMembershipDeleted(data as unknown as { id: string });
      return { handled: true, eventType };

    case "user.created":
    case "user.updated":
    case "user.deleted":
      // User lifecycle events acknowledged for webhook health
      logger.info(`Received Clerk user event: ${eventType}`, { userId: (data as { id?: string }).id });
      return { handled: true, eventType };

    default:
      logger.info(`Ignored unhandled Clerk webhook event: ${eventType}`);
      return { handled: false, eventType };
  }
}
