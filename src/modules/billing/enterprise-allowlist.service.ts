/**
 * Cogent Marketing Shield - Internal Enterprise Allowlist Service
 *
 * Automatically activates the Enterprise plan and Chief Compliance Officer role
 * for verified allowlisted emails on the FIRST organization they create.
 */

import { clerkClient } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { paystackBillingService } from "./paystack.service";
import { auditService } from "@/modules/audit/audit.service";

export interface EnterpriseAllowlistResult {
  granted: boolean;
  reason:
    | "GRANTED"
    | "ALLOWLIST_EMPTY"
    | "DEMO_TENANT_SKIPPED"
    | "TENANT_NOT_FOUND"
    | "ALREADY_COMPED_FOR_TENANT"
    | "ALREADY_ENTERPRISE"
    | "NOT_ALLOWLISTED_OR_UNVERIFIED"
    | "NOT_ORG_CREATOR"
    | "FIRST_ORG_ALREADY_COMPED"
    | "ERROR";
  tenantId?: string;
  matchedEmail?: string;
  planSlug?: "enterprise";
}

/**
 * Parses comma-separated emails from `INTERNAL_ENTERPRISE_EMAILS`.
 */
export function parseInternalEnterpriseEmails(
  raw: string | undefined = process.env.INTERNAL_ENTERPRISE_EMAILS,
): Set<string> {
  if (!raw || typeof raw !== "string") {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0 && entry.includes("@")),
  );
}

/**
 * Queries Clerk for the user's verified email addresses and returns the first
 * verified email present in the allowlist, or null if none match.
 */
export async function findVerifiedAllowlistedEmail(
  clerkUserId: string,
  allowlist: Set<string>,
): Promise<string | null> {
  if (!clerkUserId || allowlist.size === 0) {
    return null;
  }

  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);

  for (const addr of user.emailAddresses || []) {
    const normalized = addr.emailAddress?.toLowerCase().trim();
    if (!normalized || !allowlist.has(normalized)) {
      continue;
    }
    if (addr.verification?.status === "verified") {
      return normalized;
    }
  }

  return null;
}

/**
 * Provisions the Enterprise plan for an allowlisted, email-verified user's FIRST created organization.
 * Idempotent and race-safe:
 * - Only grants if the email is verified in Clerk and in `INTERNAL_ENTERPRISE_EMAILS`.
 * - Only grants if the user is the creator of the Clerk organization.
 * - Only grants for the FIRST organization per allowlisted user/email.
 */
export async function provisionEnterpriseForAllowlistedCreator(params: {
  tenantId: string;
  clerkUserId: string;
  clerkOrgId?: string | null;
  isCreatorHint?: boolean;
}): Promise<EnterpriseAllowlistResult> {
  const { tenantId, clerkUserId, clerkOrgId, isCreatorHint = false } = params;

  const allowlist = parseInternalEnterpriseEmails();
  if (allowlist.size === 0) {
    return { granted: false, reason: "ALLOWLIST_EMPTY", tenantId };
  }

  if (
    !tenantId ||
    !clerkUserId ||
    tenantId === "11111111-1111-1111-1111-111111111111" ||
    clerkOrgId === "org_demo_1111" ||
    clerkUserId === "user_demo_000000000001"
  ) {
    return { granted: false, reason: "DEMO_TENANT_SKIPPED", tenantId };
  }

  const supabase = createAdminSupabaseClient();

  try {
    // 1. Fetch current tenant state
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("id, clerk_org_id, settings")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantErr || !tenant) {
      return { granted: false, reason: "TENANT_NOT_FOUND", tenantId };
    }

    const existingSettings = (tenant.settings || {}) as Record<string, unknown>;
    if (existingSettings.enterprise_comp_owner_user_id) {
      return { granted: false, reason: "ALREADY_COMPED_FOR_TENANT", tenantId };
    }

    const existingSub = existingSettings.subscription as
      | { plan_slug?: string; status?: string }
      | undefined;
    if (existingSub?.plan_slug === "enterprise" && existingSub.status === "active") {
      return { granted: false, reason: "ALREADY_ENTERPRISE", tenantId };
    }

    // 2. Verify Clerk user email is in allowlist AND verified
    const matchedEmail = await findVerifiedAllowlistedEmail(clerkUserId, allowlist);
    if (!matchedEmail) {
      return { granted: false, reason: "NOT_ALLOWLISTED_OR_UNVERIFIED", tenantId };
    }

    // 3. Verify the user is the creator of this organization (prevents comping third-party orgs they are invited to)
    const effectiveClerkOrgId = clerkOrgId || tenant.clerk_org_id;
    let isVerifiedCreator = isCreatorHint;

    if (!isVerifiedCreator && effectiveClerkOrgId) {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({
        organizationId: effectiveClerkOrgId,
      });

      if (org?.createdBy) {
        if (org.createdBy !== clerkUserId) {
          return { granted: false, reason: "NOT_ORG_CREATOR", tenantId };
        }
        isVerifiedCreator = true;
      } else {
        const memList = await client.organizations.getOrganizationMembershipList({
          organizationId: effectiveClerkOrgId,
          limit: 5,
        });
        const total = memList.totalCount ?? memList.data.length;
        const member = memList.data.find((m) => m.publicUserData?.userId === clerkUserId);
        const isAdmin =
          member?.role === "org:admin" ||
          member?.role === "admin" ||
          member?.role === "org:chief_compliance_officer";
        if (total <= 1 && isAdmin) {
          isVerifiedCreator = true;
        }
      }
    }

    if (!isVerifiedCreator) {
      return { granted: false, reason: "NOT_ORG_CREATOR", tenantId };
    }

    // 4. Enforce FIRST ORG ONLY for this user/email
    const { data: priorComps } = await supabase
      .from("tenants")
      .select("id")
      .neq("id", tenantId)
      .or(
        `settings->>enterprise_comp_owner_user_id.eq.${clerkUserId},settings->>enterprise_comp_email.eq.${matchedEmail}`,
      )
      .limit(1);

    if (priorComps && priorComps.length > 0) {
      await supabase
        .from("tenants")
        .update({
          settings: {
            ...existingSettings,
            enterprise_comp_checked_at: new Date().toISOString(),
            enterprise_comp_skip_reason: "FIRST_ORG_ALREADY_COMPED",
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", tenantId);

      return { granted: false, reason: "FIRST_ORG_ALREADY_COMPED", tenantId };
    }

    // 5. Activate Enterprise plan (10-year term) in tenant_subscriptions + tenants.settings
    const enterprisePlan = await paystackBillingService.getPlan("enterprise");
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);

    try {
      await supabase.from("tenant_subscriptions").upsert(
        {
          tenant_id: tenantId,
          plan_id: enterprisePlan.id,
          status: "active",
          billing_interval: "annual",
          paystack_customer_code: null,
          paystack_subscription_code: null,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: "tenant_id" },
      );
    } catch (subErr) {
      logger.warn("Could not upsert tenant_subscriptions during allowlist Enterprise grant; relying on settings mirror", {
        tenantId,
        error: subErr instanceof Error ? subErr.message : String(subErr),
      });
    }

    const updatedSettings: Record<string, unknown> = {
      ...existingSettings,
      enterprise_comp_owner_user_id: clerkUserId,
      enterprise_comp_email: matchedEmail,
      enterprise_comp_granted_at: now.toISOString(),
      enterprise_comp_checked_at: now.toISOString(),
      subscription: {
        plan_slug: "enterprise",
        plan_name: enterprisePlan.name,
        status: "active",
        billing_interval: "annual",
        source: "INTERNAL_ENTERPRISE_ALLOWLIST",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      },
    };

    const { error: updateErr } = await supabase
      .from("tenants")
      .update({
        settings: updatedSettings,
        updated_at: now.toISOString(),
      })
      .eq("id", tenantId);

    if (updateErr) {
      logger.error("Failed to persist Enterprise allowlist settings on tenant", {
        tenantId,
        error: updateErr.message,
      });
      return { granted: false, reason: "ERROR", tenantId };
    }

    // 6. Ensure founding creator has CHIEF_COMPLIANCE_OFFICER (full marketing + admin + approval access)
    try {
      const { data: existingMem } = await supabase
        .from("tenant_memberships")
        .select("id, role")
        .eq("tenant_id", tenantId)
        .eq("user_id", clerkUserId)
        .maybeSingle();

      if (!existingMem || existingMem.role === "WORKSPACE_ADMIN") {
        await supabase.from("tenant_memberships").upsert(
          {
            tenant_id: tenantId,
            user_id: clerkUserId,
            role: "CHIEF_COMPLIANCE_OFFICER",
            status: "ACTIVE",
            updated_at: now.toISOString(),
          },
          { onConflict: "tenant_id,user_id" },
        );

        if (effectiveClerkOrgId) {
          try {
            const client = await clerkClient();
            await client.organizations.updateOrganizationMembershipMetadata({
              organizationId: effectiveClerkOrgId,
              userId: clerkUserId,
              publicMetadata: { canonicalRole: "CHIEF_COMPLIANCE_OFFICER" },
            });
          } catch {
            // Non-blocking Clerk metadata sync
          }
        }
      }
    } catch {
      // Non-blocking membership promotion
    }

    // 7. Record immutable audit trail
    try {
      await auditService.appendEvent({
        tenantId,
        actorId: clerkUserId,
        actorType: "SYSTEM",
        action: "ENTERPRISE_ALLOWLIST_PROVISIONED",
        entityType: "TENANT_SUBSCRIPTION",
        entityId: tenantId,
        eventData: {
          planSlug: "enterprise",
          matchedEmail,
          periodEnd: periodEnd.toISOString(),
        },
      });
    } catch {
      // Non-blocking audit logging
    }

    logger.info("Auto-provisioned Enterprise plan for verified allowlisted founder org", {
      tenantId,
      clerkUserId,
      matchedEmail,
    });

    return {
      granted: true,
      reason: "GRANTED",
      tenantId,
      matchedEmail,
      planSlug: "enterprise",
    };
  } catch (err) {
    logger.warn("Allowlist Enterprise provisioning check failed non-fatally", {
      tenantId,
      clerkUserId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { granted: false, reason: "ERROR", tenantId };
  }
}
