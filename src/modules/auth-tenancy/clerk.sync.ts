/**
 * Cogent Marketing Shield - Clerk to Supabase Real-Time Tenant Synchronization
 * Document Reference: Document 07 (Section 4) & Document 08 (Phase 3)
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { mapClerkRoleToCanonical } from "./permissions";
import { logger } from "@/lib/logger";

export interface ClerkOrgEventData {
  id: string; // e.g. org_xxx
  name: string;
  slug?: string | null;
}

export interface ClerkMembershipEventData {
  id: string; // e.g. orgmem_xxx
  role: string; // e.g. org:admin, org:chief_compliance_officer, org:member
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

/**
 * Synchronizes an organization creation event from Clerk to Supabase `tenants`.
 * Idempotent: Uses upsert on conflict of `clerk_org_id`.
 */
export async function syncClerkOrganizationCreated(data: ClerkOrgEventData): Promise<{ tenantId: string }> {
  const supabase = createAdminSupabaseClient();
  const slug = data.slug || data.id.toLowerCase().replace(/[^a-z0-9_-]/g, "_");

  const { data: tenant, error } = await supabase
    .from("tenants")
    .upsert(
      {
        clerk_org_id: data.id,
        name: data.name,
        slug: slug,
        status: "ACTIVE",
        settings: {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clerk_org_id" },
    )
    .select("id")
    .single();

  if (error || !tenant) {
    logger.error("Failed to sync Clerk organization creation", {
      clerkOrgId: data.id,
      error: error?.message,
    });
    throw new Error(`Failed to upsert tenant for Clerk org ${data.id}: ${error?.message}`);
  }

  logger.info("Synchronized Clerk organization to Supabase tenant", {
    tenantId: tenant.id,
    clerkOrgId: data.id,
    name: data.name,
  });

  return { tenantId: tenant.id };
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
    .select("id")
    .eq("clerk_org_id", data.organization.id)
    .single();

  let tenant = initialTenant;

  // If the tenant hasn't been synced yet, auto-provision it
  if (!tenant || tenantError) {
    const created = await syncClerkOrganizationCreated({
      id: data.organization.id,
      name: data.organization.name || "Default Organization",
      slug: data.organization.slug,
    });
    tenant = { id: created.tenantId };
  }

  const canonicalRole = mapClerkRoleToCanonical(data.role);

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
  const canonicalRole = mapClerkRoleToCanonical(data.role);

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
