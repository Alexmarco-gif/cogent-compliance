/**
 * Cogent Marketing Shield - Internal Enterprise Allowlist Service
 *
 * Automatically activates the Enterprise plan and Chief Compliance Officer role
 * for verified allowlisted emails (on their first active organization) or explicitly
 * allowlisted Clerk organization IDs (`INTERNAL_ENTERPRISE_ORG_IDS`).
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
  matchedOrgId?: string;
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
      .map((entry) => entry.trim().replace(/^['"]+|['"]+$/g, "").trim().toLowerCase())
      .filter((entry) => entry.length > 0 && entry.includes("@")),
  );
}

/**
 * Parses comma-separated Clerk organization IDs from `INTERNAL_ENTERPRISE_ORG_IDS` (e.g. `org_2abc...`).
 */
export function parseInternalEnterpriseOrgIds(
  raw: string | undefined = process.env.INTERNAL_ENTERPRISE_ORG_IDS,
): Set<string> {
  if (!raw || typeof raw !== "string") {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().replace(/^['"]+|['"]+$/g, "").trim())
      .filter((entry) => entry.length > 0),
  );
}

/**
 * Returns true if either `INTERNAL_ENTERPRISE_EMAILS` or `INTERNAL_ENTERPRISE_ORG_IDS` is configured.
 */
export function hasInternalEnterpriseAllowlistConfigured(): boolean {
  return parseInternalEnterpriseEmails().size > 0 || parseInternalEnterpriseOrgIds().size > 0;
}

function isClerkOrgAdminRole(
  clerkRole: string | null | undefined,
  canonicalRole?: unknown,
): boolean {
  if (canonicalRole === "CHIEF_COMPLIANCE_OFFICER" || canonicalRole === "WORKSPACE_ADMIN") {
    return true;
  }
  const normalized = (clerkRole || "").toLowerCase().trim();
  return (
    normalized === "org:admin" ||
    normalized === "admin" ||
    normalized === "org:workspace_admin" ||
    normalized === "workspace_admin" ||
    normalized === "org:super_admin" ||
    normalized === "org:chief_compliance_officer" ||
    normalized === "chief_compliance_officer"
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
    logger.warn("Allowlisted email matched Clerk user but verification status is not verified", {
      clerkUserId,
      verificationStatus: addr.verification?.status || "unknown",
    });
  }

  return null;
}

/**
 * Activates a complimentary Enterprise plan (10-year term) on a tenant and mirrors it
 * into both `tenant_subscriptions` and `tenants.settings.subscription`.
 */
export async function activateEnterprisePlanForTenant(params: {
  tenantId: string;
  existingSettings?: Record<string, unknown>;
  clerkUserId?: string;
  clerkOrgId?: string | null;
  matchedEmail?: string;
  source: "INTERNAL_ENTERPRISE_ALLOWLIST" | "INTERNAL_ENTERPRISE_ORG_ALLOWLIST" | "ADMIN_CLI";
  promoteWorkspaceAdminToCco?: boolean;
}): Promise<EnterpriseAllowlistResult> {
  const {
    tenantId,
    existingSettings = {},
    clerkUserId,
    clerkOrgId,
    matchedEmail,
    source,
    promoteWorkspaceAdminToCco = true,
  } = params;

  const supabase = createAdminSupabaseClient();
  const enterprisePlan = await paystackBillingService.getPlan("enterprise");
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);

  try {
    const { error: subUpsertErr } = await supabase.from("tenant_subscriptions").upsert(
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
    if (subUpsertErr) {
      logger.warn(
        "Could not upsert tenant_subscriptions during Enterprise activation; relying on settings mirror",
        {
          tenantId,
          error: subUpsertErr.message,
        },
      );
    }
  } catch (subErr) {
    logger.warn(
      "Could not upsert tenant_subscriptions during Enterprise activation; relying on settings mirror",
      {
        tenantId,
        error: subErr instanceof Error ? subErr.message : String(subErr),
      },
    );
  }

  const nextSettings: Record<string, unknown> = {
    ...existingSettings,
    enterprise_comp_granted_at: now.toISOString(),
    enterprise_comp_checked_at: now.toISOString(),
    subscription: {
      plan_slug: "enterprise",
      plan_name: enterprisePlan.name,
      status: "active",
      billing_interval: "annual",
      source,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    },
  };

  delete nextSettings.enterprise_comp_skip_reason;

  if (clerkUserId) {
    nextSettings.enterprise_comp_owner_user_id = clerkUserId;
  }
  if (matchedEmail) {
    nextSettings.enterprise_comp_email = matchedEmail;
  }
  if (clerkOrgId) {
    nextSettings.enterprise_comp_org_id = clerkOrgId;
  }

  const { error: updateErr } = await supabase
    .from("tenants")
    .update({
      settings: nextSettings,
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

  // Ensure founding/admin creator has CHIEF_COMPLIANCE_OFFICER (full marketing + admin + approval access)
  if (promoteWorkspaceAdminToCco && clerkUserId) {
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

        if (clerkOrgId) {
          try {
            const client = await clerkClient();
            await client.organizations.updateOrganizationMembershipMetadata({
              organizationId: clerkOrgId,
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
  }

  // Record immutable audit trail
  try {
    await auditService.appendEvent({
      tenantId,
      actorId: clerkUserId || "system",
      actorType: "SYSTEM",
      action: "ENTERPRISE_ALLOWLIST_PROVISIONED",
      entityType: "TENANT_SUBSCRIPTION",
      entityId: tenantId,
      eventData: {
        planSlug: "enterprise",
        source,
        matchedEmail: matchedEmail || null,
        matchedOrgId: clerkOrgId || null,
        periodEnd: periodEnd.toISOString(),
      },
    });
  } catch {
    // Non-blocking audit logging
  }

  logger.info("Provisioned complimentary Enterprise plan for tenant", {
    tenantId,
    clerkUserId: clerkUserId || null,
    clerkOrgId: clerkOrgId || null,
    matchedEmail: matchedEmail || null,
    source,
  });

  return {
    granted: true,
    reason: "GRANTED",
    tenantId,
    matchedEmail,
    matchedOrgId: clerkOrgId || undefined,
    planSlug: "enterprise",
  };
}

/**
 * Provisions the Enterprise plan for:
 * 1) Any organization explicitly listed in `INTERNAL_ENTERPRISE_ORG_IDS`, OR
 * 2) An allowlisted, email-verified user's FIRST active organization in `INTERNAL_ENTERPRISE_EMAILS`.
 *
 * Idempotent and race-safe:
 * - Never provisions demo tenants.
 * - For email allowlist: only grants if the email is verified in Clerk and in `INTERNAL_ENTERPRISE_EMAILS`.
 * - For email allowlist: verifies the user created the Clerk org (or is an org admin when `org.createdBy`
 *   is omitted, e.g. orgs created directly via the Clerk Dashboard).
 * - For email allowlist: only grants for the FIRST active (non-INACTIVE) organization per user/email.
 */
export async function provisionEnterpriseForAllowlistedCreator(params: {
  tenantId: string;
  clerkUserId?: string;
  clerkOrgId?: string | null;
  isCreatorHint?: boolean;
}): Promise<EnterpriseAllowlistResult> {
  const { tenantId, clerkUserId, clerkOrgId, isCreatorHint = false } = params;

  const allowlist = parseInternalEnterpriseEmails();
  const orgAllowlist = parseInternalEnterpriseOrgIds();
  if (allowlist.size === 0 && orgAllowlist.size === 0) {
    return { granted: false, reason: "ALLOWLIST_EMPTY", tenantId };
  }

  if (
    !tenantId ||
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
      .select("id, clerk_org_id, status, settings")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantErr || !tenant) {
      return { granted: false, reason: "TENANT_NOT_FOUND", tenantId };
    }

    const existingSettings = (tenant.settings || {}) as Record<string, unknown>;
    const existingSub = existingSettings.subscription as
      | { plan_slug?: string; status?: string }
      | undefined;

    if (existingSub?.plan_slug === "enterprise" && existingSub.status === "active") {
      return { granted: false, reason: "ALREADY_ENTERPRISE", tenantId };
    }

    const effectiveClerkOrgId = clerkOrgId || tenant.clerk_org_id;
    const isOrgAllowlisted = Boolean(effectiveClerkOrgId && orgAllowlist.has(effectiveClerkOrgId));

    if (!isOrgAllowlisted && existingSettings.enterprise_comp_owner_user_id) {
      return { granted: false, reason: "ALREADY_COMPED_FOR_TENANT", tenantId };
    }

    // 2. Direct Organization ID allowlist path (ideal for internal marketing & walkthrough teams)
    if (isOrgAllowlisted) {
      let matchedEmail: string | undefined;
      if (clerkUserId && allowlist.size > 0) {
        try {
          matchedEmail = (await findVerifiedAllowlistedEmail(clerkUserId, allowlist)) || undefined;
        } catch {
          // Non-blocking email lookup for audit metadata
        }
      }

      return activateEnterprisePlanForTenant({
        tenantId,
        existingSettings,
        clerkUserId,
        clerkOrgId: effectiveClerkOrgId,
        matchedEmail,
        source: "INTERNAL_ENTERPRISE_ORG_ALLOWLIST",
        promoteWorkspaceAdminToCco: Boolean(clerkUserId),
      });
    }

    // 3. Verified email allowlist path
    if (!clerkUserId || allowlist.size === 0) {
      return { granted: false, reason: "NOT_ALLOWLISTED_OR_UNVERIFIED", tenantId };
    }

    const matchedEmail = await findVerifiedAllowlistedEmail(clerkUserId, allowlist);
    if (!matchedEmail) {
      return { granted: false, reason: "NOT_ALLOWLISTED_OR_UNVERIFIED", tenantId };
    }

    // 4. Verify the user is the creator (or admin of a Dashboard-created org without `createdBy`)
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
        // Organizations created in the Clerk Dashboard often omit `createdBy`;
        // allow verified allowlisted admins regardless of current team size.
        let offset = 0;
        const pageSize = 100;
        for (let page = 0; page < 5; page += 1) {
          const memList = await client.organizations.getOrganizationMembershipList({
            organizationId: effectiveClerkOrgId,
            limit: pageSize,
            offset,
          });
          const member = memList.data.find((m) => m.publicUserData?.userId === clerkUserId);
          if (member) {
            const canonicalRole = (
              member.publicMetadata as Record<string, unknown> | undefined
            )?.canonicalRole;
            if (isClerkOrgAdminRole(member.role, canonicalRole)) {
              isVerifiedCreator = true;
            }
            break;
          }
          if (memList.data.length < pageSize) {
            break;
          }
          offset += pageSize;
        }
      }
    }

    if (!isVerifiedCreator) {
      return { granted: false, reason: "NOT_ORG_CREATOR", tenantId };
    }

    // 5. Enforce FIRST ACTIVE ORG ONLY for this user/email (excluding INACTIVE/deleted test orgs)
    const { data: priorComps } = await supabase
      .from("tenants")
      .select("id, clerk_org_id")
      .neq("id", tenantId)
      .neq("status", "INACTIVE")
      .or(
        `settings->>enterprise_comp_owner_user_id.eq."${clerkUserId}",settings->>enterprise_comp_email.eq."${matchedEmail}"`,
      )
      .limit(5);

    const activePriorComps: Array<{ id: string; clerk_org_id?: string | null }> = [];
    for (const prior of priorComps || []) {
      if (prior.clerk_org_id && process.env.NODE_ENV !== "test") {
        try {
          const client = await clerkClient();
          await client.organizations.getOrganization({ organizationId: prior.clerk_org_id });
          activePriorComps.push(prior);
        } catch (orgLookupErr: unknown) {
          const status =
            (orgLookupErr as { status?: number })?.status ??
            (orgLookupErr as { statusCode?: number })?.statusCode;
          if (status === 404) {
            // Prior org was deleted in Clerk without webhook cleanup; mark stale row INACTIVE
            await supabase
              .from("tenants")
              .update({ status: "INACTIVE", updated_at: new Date().toISOString() })
              .eq("id", prior.id);
          } else {
            activePriorComps.push(prior);
          }
        }
      } else {
        activePriorComps.push(prior);
      }
    }

    if (activePriorComps.length > 0) {
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

    // 6. Activate Enterprise plan (10-year term)
    return activateEnterprisePlanForTenant({
      tenantId,
      existingSettings,
      clerkUserId,
      clerkOrgId: effectiveClerkOrgId,
      matchedEmail,
      source: "INTERNAL_ENTERPRISE_ALLOWLIST",
      promoteWorkspaceAdminToCco: true,
    });
  } catch (err) {
    logger.warn("Allowlist Enterprise provisioning check failed non-fatally", {
      tenantId,
      clerkUserId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { granted: false, reason: "ERROR", tenantId };
  }
}

export interface EnterpriseAllowlistDiagnostic {
  isDemoTenant: boolean;
  emailAllowlistConfigured: boolean;
  emailAllowlistCount: number;
  orgAllowlistConfigured: boolean;
  clerkOrgId: string;
  userEmails: Array<{
    email: string;
    verified: boolean;
    matchesAllowlist: boolean;
  }>;
  orgCreatedByMatchesUser: boolean | null;
  priorCompedCount: number;
  skipReason: string | null;
  provisionAttempt: EnterpriseAllowlistResult;
}

/**
 * Runs a non-secret diagnostic + re-evaluation for an active tenant session
 * (strictly exposed in Clerk Development mode only; never returns allowlist values).
 */
export async function diagnoseEnterpriseAllowlistForSession(params: {
  tenantId: string;
  clerkUserId: string;
  clerkOrgId: string;
}): Promise<EnterpriseAllowlistDiagnostic> {
  const { tenantId, clerkUserId, clerkOrgId } = params;
  const emailAllowlist = parseInternalEnterpriseEmails();
  const orgAllowlist = parseInternalEnterpriseOrgIds();
  const isDemoTenant =
    tenantId === "11111111-1111-1111-1111-111111111111" || clerkOrgId === "org_demo_1111";

  const userEmails: EnterpriseAllowlistDiagnostic["userEmails"] = [];
  let orgCreatedByMatchesUser: boolean | null = null;

  if (process.env.NODE_ENV !== "test" && clerkUserId && clerkOrgId && !isDemoTenant) {
    try {
      const client = await clerkClient();
      const [user, org] = await Promise.all([
        client.users.getUser(clerkUserId),
        client.organizations.getOrganization({ organizationId: clerkOrgId }),
      ]);

      for (const addr of user.emailAddresses || []) {
        const normalized = (addr.emailAddress || "").trim().toLowerCase();
        userEmails.push({
          email: normalized,
          verified: addr.verification?.status === "verified",
          matchesAllowlist: emailAllowlist.has(normalized),
        });
      }
      orgCreatedByMatchesUser = org?.createdBy ? org.createdBy === clerkUserId : null;
    } catch {
      // Non-blocking Clerk lookup
    }
  }

  const provisionAttempt = await provisionEnterpriseForAllowlistedCreator({
    tenantId,
    clerkUserId,
    clerkOrgId,
  });

  const supabase = createAdminSupabaseClient();
  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .maybeSingle();
  const settings = (tenantRow?.settings || {}) as Record<string, unknown>;
  const skipReason =
    typeof settings.enterprise_comp_skip_reason === "string"
      ? settings.enterprise_comp_skip_reason
      : null;

  let priorCompedCount = 0;
  const matchedVerified = userEmails.find((e) => e.verified && e.matchesAllowlist)?.email;
  if (matchedVerified && !isDemoTenant) {
    const { data: priors } = await supabase
      .from("tenants")
      .select("id")
      .neq("id", tenantId)
      .neq("status", "INACTIVE")
      .or(
        `settings->>enterprise_comp_owner_user_id.eq."${clerkUserId}",settings->>enterprise_comp_email.eq."${matchedVerified}"`,
      )
      .limit(5);
    priorCompedCount = priors?.length || 0;
  }

  return {
    isDemoTenant,
    emailAllowlistConfigured: emailAllowlist.size > 0,
    emailAllowlistCount: emailAllowlist.size,
    orgAllowlistConfigured: orgAllowlist.size > 0,
    clerkOrgId,
    userEmails,
    orgCreatedByMatchesUser,
    priorCompedCount,
    skipReason,
    provisionAttempt,
  };
}
