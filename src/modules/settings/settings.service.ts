/**
 * Cogent Marketing Shield - Workspace Settings & Team Governance Service
 * Handles authoritative Supabase persistence + Clerk organization synchronization.
 */

import { clerkClient } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { AppApiError } from "@/lib/api-handler";
import { logger } from "@/lib/logger";
import { auditService } from "@/modules/audit/audit.service";
import { CANONICAL_ROLES, CanonicalRole, TenantContext } from "@/modules/auth-tenancy/types";
import { getRoleMetadata, mapCanonicalRoleToClerkOrgRole } from "@/modules/auth-tenancy/roles";
import type {
  CompliancePolicy,
  InviteTeamMembersInput,
  OrganizationProfile,
  UpdateTeamMemberInput,
  UpdateWorkspaceSettingsInput,
} from "@/contracts/settings.contracts";

const ADMIN_CAPABLE_ROLES: ReadonlySet<string> = new Set([
  "CHIEF_COMPLIANCE_OFFICER",
  "WORKSPACE_ADMIN",
]);

function isCanonicalRole(value: unknown): value is CanonicalRole {
  return typeof value === "string" && (CANONICAL_ROLES as readonly string[]).includes(value);
}

function extractClerkErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "errors" in err) {
    const errors = (err as { errors?: Array<{ message?: string; longMessage?: string; code?: string }> }).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const first = errors[0];
      const detail = first?.longMessage || first?.message;
      const code = first?.code || "";
      if (detail) {
        if (
          code.includes("limit") ||
          code.includes("quota") ||
          /maximum|allowed.*members|membership limit|upgrade.*clerk/i.test(detail)
        ) {
          return `${detail} Increase your Clerk organization membership limit in the Clerk Dashboard (Configure -> Organizations -> Settings -> Membership limit).`;
        }
        return detail;
      }
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

type ClerkServerClient = Awaited<ReturnType<typeof clerkClient>>;

async function fetchAllOrganizationMemberships(
  client: ClerkServerClient,
  organizationId: string,
) {
  const all = [];
  let offset = 0;
  const pageSize = 100;
  for (let page = 0; page < 20; page += 1) {
    const res = await client.organizations.getOrganizationMembershipList({
      organizationId,
      limit: pageSize,
      offset,
    });
    const rows = res.data || [];
    all.push(...rows);
    if (rows.length < pageSize || all.length >= (res.totalCount ?? Number.MAX_SAFE_INTEGER)) {
      break;
    }
    offset += pageSize;
  }
  return all;
}

async function fetchAllPendingInvitations(
  client: ClerkServerClient,
  organizationId: string,
) {
  const all = [];
  let offset = 0;
  const pageSize = 100;
  for (let page = 0; page < 20; page += 1) {
    const res = await client.organizations.getOrganizationInvitationList({
      organizationId,
      status: ["pending"],
      limit: pageSize,
      offset,
    });
    const rows = res.data || [];
    all.push(...rows);
    if (rows.length < pageSize || all.length >= (res.totalCount ?? Number.MAX_SAFE_INTEGER)) {
      break;
    }
    offset += pageSize;
  }
  return all;
}

export interface WorkspaceSettingsSnapshot {
  tenantId: string;
  organizationName: string;
  organizationSlug: string;
  clerkOrgId: string | null;
  activeRegulatoryScopes: string[];
  organizationProfile: OrganizationProfile & { clerkLogoUrl?: string | null };
  compliancePolicy: CompliancePolicy;
  currentRole: CanonicalRole;
  canManageWorkspace: boolean;
  canManageTeam: boolean;
}

export interface EnrichedTeamMember {
  id: string;
  userId: string;
  clerkMembershipId: string | null;
  role: CanonicalRole;
  roleLabel: string;
  roleShortLabel: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string;
  imageUrl: string | null;
  joinedAt: string;
  isCurrentUser: boolean;
}

export interface PendingTeamInvitation {
  id: string;
  emailAddress: string;
  role: CanonicalRole;
  roleLabel: string;
  status: string;
  createdAt: string;
}

export class SettingsService {
  public async getWorkspaceSettings(tenant: TenantContext): Promise<WorkspaceSettingsSnapshot> {
    const supabase = createAdminSupabaseClient();

    const { data: tenantRow, error } = await supabase
      .from("tenants")
      .select("id, name, slug, clerk_org_id, settings")
      .eq("id", tenant.tenantId)
      .single();

    if (error || !tenantRow) {
      throw new AppApiError("NOT_FOUND", "Workspace tenant record not found.", 404);
    }

    const rawSettings = (tenantRow.settings || {}) as Record<string, unknown>;
    const rawOrgProfile = (rawSettings.organization_profile || {}) as Record<string, unknown>;
    const rawAddress = (rawOrgProfile.address || {}) as Record<string, unknown>;
    const rawPolicy = (rawSettings.compliance_policy || {}) as Record<string, unknown>;
    const activeScopes = Array.isArray(rawSettings.active_regulatory_scopes)
      ? (rawSettings.active_regulatory_scopes as string[])
      : ["DIGITAL_LENDING"];

    let clerkLogoUrl: string | null = null;
    if (
      tenantRow.clerk_org_id &&
      tenantRow.clerk_org_id !== "org_demo_1111" &&
      process.env.NODE_ENV !== "test"
    ) {
      try {
        const client = await clerkClient();
        const org = await client.organizations.getOrganization({
          organizationId: tenantRow.clerk_org_id,
        });
        clerkLogoUrl = org.imageUrl || null;
      } catch {
        // Non-blocking fallback
      }
    }

    const organizationProfile: OrganizationProfile & { clerkLogoUrl?: string | null } = {
      registration_number: String(rawOrgProfile.registration_number || ""),
      regulator_license_id: String(rawOrgProfile.regulator_license_id || ""),
      phone: String(rawOrgProfile.phone || ""),
      email: String(rawOrgProfile.email || ""),
      website: String(rawOrgProfile.website || ""),
      timezone: String(rawOrgProfile.timezone || "Africa/Lagos"),
      logo_url:
        typeof rawOrgProfile.logo_url === "string"
          ? rawOrgProfile.logo_url
          : clerkLogoUrl,
      clerkLogoUrl,
      address: {
        country: String(rawAddress.country || "Nigeria"),
        state_region: String(rawAddress.state_region || ""),
        city: String(rawAddress.city || ""),
        street_address: String(rawAddress.street_address || ""),
        office_suite: String(rawAddress.office_suite || ""),
        postal_code: String(rawAddress.postal_code || ""),
      },
    };

    const compliancePolicy: CompliancePolicy = {
      enforce_dual_control_approval:
        typeof rawPolicy.enforce_dual_control_approval === "boolean"
          ? rawPolicy.enforce_dual_control_approval
          : process.env.ENFORCE_DUAL_CONTROL_APPROVAL === "true",
      cco_alert_email: String(rawPolicy.cco_alert_email || ""),
      default_drift_frequency:
        (rawPolicy.default_drift_frequency as CompliancePolicy["default_drift_frequency"]) ||
        "DAILY",
      auto_create_drift_incident_thread:
        typeof rawPolicy.auto_create_drift_incident_thread === "boolean"
          ? rawPolicy.auto_create_drift_incident_thread
          : true,
    };

    return {
      tenantId: tenantRow.id,
      organizationName: tenantRow.name,
      organizationSlug: tenantRow.slug,
      clerkOrgId: tenantRow.clerk_org_id || null,
      activeRegulatoryScopes: activeScopes,
      organizationProfile,
      compliancePolicy,
      currentRole: tenant.role,
      canManageWorkspace: tenant.permissions.has("tenant.admin"),
      canManageTeam: tenant.permissions.has("user.manage"),
    };
  }

  public async updateWorkspaceSettings(
    tenant: TenantContext,
    input: UpdateWorkspaceSettingsInput,
  ): Promise<WorkspaceSettingsSnapshot> {
    const supabase = createAdminSupabaseClient();

    const { data: tenantRow, error: fetchErr } = await supabase
      .from("tenants")
      .select("id, name, slug, clerk_org_id, settings")
      .eq("id", tenant.tenantId)
      .single();

    if (fetchErr || !tenantRow) {
      throw new AppApiError("NOT_FOUND", "Workspace tenant record not found.", 404);
    }

    const existingSettings = (tenantRow.settings || {}) as Record<string, unknown>;
    const existingOrgProfile = (existingSettings.organization_profile || {}) as Record<
      string,
      unknown
    >;
    const existingAddress = (existingOrgProfile.address || {}) as Record<string, unknown>;
    const existingPolicy = (existingSettings.compliance_policy || {}) as Record<string, unknown>;

    const mergedOrgProfile = input.organization_profile
      ? {
          ...existingOrgProfile,
          ...input.organization_profile,
          address: input.organization_profile.address
            ? {
                ...existingAddress,
                ...input.organization_profile.address,
              }
            : existingAddress,
        }
      : existingOrgProfile;

    const mergedPolicy = input.compliance_policy
      ? {
          ...existingPolicy,
          ...input.compliance_policy,
        }
      : existingPolicy;

    const mergedSettings: Record<string, unknown> = {
      ...existingSettings,
      organization_profile: mergedOrgProfile,
      compliance_policy: mergedPolicy,
    };

    if (input.active_regulatory_scopes) {
      mergedSettings.active_regulatory_scopes = input.active_regulatory_scopes;
    }

    const updatePayload: Record<string, unknown> = {
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    };

    if (input.organization_name && input.organization_name.trim() !== tenantRow.name) {
      updatePayload.name = input.organization_name.trim();
    }

    const { error: updateErr } = await supabase
      .from("tenants")
      .update(updatePayload)
      .eq("id", tenant.tenantId);

    if (updateErr) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to update workspace settings: ${updateErr.message}`,
        500,
      );
    }

    // Best-effort sync of organization name to Clerk
    if (
      input.organization_name &&
      tenantRow.clerk_org_id &&
      tenantRow.clerk_org_id !== "org_demo_1111" &&
      process.env.NODE_ENV !== "test"
    ) {
      try {
        const client = await clerkClient();
        await client.organizations.updateOrganization(tenantRow.clerk_org_id, {
          name: input.organization_name.trim(),
        });
      } catch (clerkErr) {
        logger.warn("Best-effort Clerk org name sync failed", {
          tenantId: tenant.tenantId,
          error: clerkErr instanceof Error ? clerkErr.message : String(clerkErr),
        });
      }
    }

    try {
      await auditService.appendEvent({
        tenantId: tenant.tenantId,
        actorId: tenant.clerkUserId,
        actorType: "USER",
        action: "WORKSPACE_SETTINGS_UPDATED",
        entityType: "TENANT",
        entityId: tenant.tenantId,
        eventData: {
          updatedFields: Object.keys(input),
          organizationName: updatePayload.name || tenantRow.name,
        },
      });
    } catch {
      // Non-blocking audit failure guard
    }

    return this.getWorkspaceSettings(tenant);
  }

  public async listTeamMembers(tenant: TenantContext): Promise<{
    members: EnrichedTeamMember[];
    invitations: PendingTeamInvitation[];
    canManageTeam: boolean;
  }> {
    const supabase = createAdminSupabaseClient();

    const [{ data: tenantRow }, { data: membershipRows, error: memErr }] = await Promise.all([
      supabase
        .from("tenants")
        .select("id, clerk_org_id, settings")
        .eq("id", tenant.tenantId)
        .single(),
      supabase
        .from("tenant_memberships")
        .select("id, user_id, clerk_membership_id, role, status, joined_at, created_at")
        .eq("tenant_id", tenant.tenantId)
        .order("created_at", { ascending: true }),
    ]);

    if (memErr) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to load team members: ${memErr.message}`,
        500,
      );
    }

    const clerkUserMap = new Map<
      string,
      {
        firstName: string | null;
        lastName: string | null;
        fullName: string;
        email: string;
        imageUrl: string | null;
        clerkMembershipId: string | null;
      }
    >();

    const invitations: PendingTeamInvitation[] = [];
    const tenantSettings = (tenantRow?.settings || {}) as Record<string, unknown>;
    const pendingRoleMap = (tenantSettings.pending_role_assignments || {}) as Record<
      string,
      unknown
    >;

    if (
      tenant.clerkOrgId &&
      tenant.clerkOrgId !== "org_demo_1111" &&
      process.env.NODE_ENV !== "test"
    ) {
      try {
        const client = await clerkClient();
        const [memData, invData] = await Promise.all([
          fetchAllOrganizationMemberships(client, tenant.clerkOrgId),
          fetchAllPendingInvitations(client, tenant.clerkOrgId),
        ]);

        for (const clerkMem of memData) {
          const pub = clerkMem.publicUserData;
          if (!pub?.userId) continue;
          const first = pub.firstName || null;
          const last = pub.lastName || null;
          const full = [first, last].filter(Boolean).join(" ").trim() || pub.identifier || pub.userId;
          clerkUserMap.set(pub.userId, {
            firstName: first,
            lastName: last,
            fullName: full,
            email: pub.identifier || "",
            imageUrl: pub.imageUrl || null,
            clerkMembershipId: clerkMem.id,
          });
        }

        // Enrich any Supabase user IDs missing from organizationMembershipList in batches of 100
        const missingUserIds = (membershipRows || [])
          .map((m) => m.user_id)
          .filter((uid) => !clerkUserMap.has(uid) && uid.startsWith("user_"));

        for (let i = 0; i < missingUserIds.length; i += 100) {
          const chunk = missingUserIds.slice(i, i + 100);
          try {
            const usersPage = await client.users.getUserList({
              userId: chunk,
              limit: 100,
            });
            for (const u of usersPage.data) {
              const first = u.firstName || null;
              const last = u.lastName || null;
              const email =
                u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ||
                u.emailAddresses[0]?.emailAddress ||
                "";
              const full = [first, last].filter(Boolean).join(" ").trim() || email || u.id;
              clerkUserMap.set(u.id, {
                firstName: first,
                lastName: last,
                fullName: full,
                email,
                imageUrl: u.imageUrl || null,
                clerkMembershipId: null,
              });
            }
          } catch {
            // Non-blocking fallback
          }
        }

        for (const inv of invData) {
          const emailLower = inv.emailAddress.toLowerCase().trim();
          const metaRole = (inv.publicMetadata as Record<string, unknown> | undefined)?.canonicalRole;
          const mappedRole: CanonicalRole = isCanonicalRole(metaRole)
            ? metaRole
            : isCanonicalRole(pendingRoleMap[emailLower])
              ? (pendingRoleMap[emailLower] as CanonicalRole)
              : inv.role === "org:admin"
                ? "CHIEF_COMPLIANCE_OFFICER"
                : "MARKETING_GROWTH";

          const roleMeta = getRoleMetadata(mappedRole);
          invitations.push({
            id: inv.id,
            emailAddress: inv.emailAddress,
            role: mappedRole,
            roleLabel: roleMeta.label,
            status: inv.status || "pending",
            createdAt: new Date(inv.createdAt).toISOString(),
          });
        }
      } catch (clerkErr) {
        logger.warn("Unable to hydrate team profiles/invitations from Clerk", {
          tenantId: tenant.tenantId,
          error: clerkErr instanceof Error ? clerkErr.message : String(clerkErr),
        });
      }
    } else if (tenant.clerkOrgId === "org_demo_1111") {
      // Populate pending role map for local dev preview
      for (const [email, roleVal] of Object.entries(pendingRoleMap)) {
        if (!isCanonicalRole(roleVal)) continue;
        const roleMeta = getRoleMetadata(roleVal);
        invitations.push({
          id: `demo_inv_${email}`,
          emailAddress: email,
          role: roleVal,
          roleLabel: roleMeta.label,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }
    }

    const members: EnrichedTeamMember[] = (membershipRows || []).map((row) => {
      const profile = clerkUserMap.get(row.user_id);
      const canonicalRole: CanonicalRole = isCanonicalRole(row.role)
        ? row.role
        : "MARKETING_GROWTH";
      const roleMeta = getRoleMetadata(canonicalRole);

      return {
        id: row.id,
        userId: row.user_id,
        clerkMembershipId: row.clerk_membership_id || profile?.clerkMembershipId || null,
        role: canonicalRole,
        roleLabel: roleMeta.label,
        roleShortLabel: roleMeta.shortLabel,
        status: (row.status as "ACTIVE" | "INVITED" | "SUSPENDED") || "ACTIVE",
        firstName: profile?.firstName || null,
        lastName: profile?.lastName || null,
        fullName:
          profile?.fullName ||
          (row.user_id === tenant.clerkUserId ? "Workspace Owner" : row.user_id),
        email: profile?.email || "",
        imageUrl: profile?.imageUrl || null,
        joinedAt: row.joined_at || row.created_at || new Date().toISOString(),
        isCurrentUser: row.user_id === tenant.clerkUserId,
      };
    });

    return {
      members,
      invitations,
      canManageTeam: tenant.permissions.has("user.manage"),
    };
  }

  public async inviteTeamMembers(
    tenant: TenantContext,
    input: InviteTeamMembersInput,
  ): Promise<{
    invited: Array<{ email: string; role: CanonicalRole; invitationId?: string }>;
    skipped: Array<{ email: string; role: CanonicalRole; reason: string }>;
    failed: Array<{ email: string; role: CanonicalRole; message: string }>;
  }> {
    const supabase = createAdminSupabaseClient();

    const { data: tenantRow, error: fetchErr } = await supabase
      .from("tenants")
      .select("id, clerk_org_id, settings")
      .eq("id", tenant.tenantId)
      .single();

    if (fetchErr || !tenantRow) {
      throw new AppApiError("NOT_FOUND", "Workspace tenant record not found.", 404);
    }

    const existingSettings = (tenantRow.settings || {}) as Record<string, unknown>;
    const existingPendingRoles = {
      ...((existingSettings.pending_role_assignments || {}) as Record<string, CanonicalRole>),
    };

    // Deduplicate by normalized lowercase email
    const dedupedMap = new Map<string, CanonicalRole>();
    for (const entry of input.invitations) {
      dedupedMap.set(entry.email.trim().toLowerCase(), entry.role);
    }

    const invited: Array<{ email: string; role: CanonicalRole; invitationId?: string }> = [];
    const skipped: Array<{ email: string; role: CanonicalRole; reason: string }> = [];
    const failed: Array<{ email: string; role: CanonicalRole; message: string }> = [];

    const useClerk =
      Boolean(tenantRow.clerk_org_id) &&
      tenantRow.clerk_org_id !== "org_demo_1111" &&
      process.env.NODE_ENV !== "test";

    let client: ClerkServerClient | null = null;
    const activeMemberEmails = new Set<string>();
    const pendingInvitationEmails = new Set<string>();

    if (useClerk && tenantRow.clerk_org_id) {
      client = await clerkClient();
      try {
        const [memData, invData] = await Promise.all([
          fetchAllOrganizationMemberships(client, tenantRow.clerk_org_id),
          fetchAllPendingInvitations(client, tenantRow.clerk_org_id),
        ]);
        for (const m of memData) {
          const email = m.publicUserData?.identifier?.toLowerCase().trim();
          if (email) activeMemberEmails.add(email);
        }
        for (const inv of invData) {
          const email = inv.emailAddress?.toLowerCase().trim();
          if (email) pendingInvitationEmails.add(email);
        }
      } catch {
        // Non-blocking: fall back to direct per-email invitation dispatch
      }
    }

    let pendingRolesChanged = false;

    for (const [email, role] of dedupedMap.entries()) {
      if (activeMemberEmails.has(email)) {
        skipped.push({
          email,
          role,
          reason: "Already an active workspace member — update their role in Current Team below.",
        });
        continue;
      }

      if (pendingInvitationEmails.has(email)) {
        existingPendingRoles[email] = role;
        pendingRolesChanged = true;
        skipped.push({
          email,
          role,
          reason: "Pending invitation already exists; assigned role updated.",
        });
        continue;
      }

      let invitationId: string | undefined;

      if (useClerk && client && tenantRow.clerk_org_id) {
        try {
          const created = await client.organizations.createOrganizationInvitation({
            organizationId: tenantRow.clerk_org_id,
            emailAddress: email,
            inviterUserId: tenant.clerkUserId,
            role: mapCanonicalRoleToClerkOrgRole(role),
            publicMetadata: { canonicalRole: role },
          });
          invitationId = created.id;
        } catch (clerkErr: unknown) {
          const detail = extractClerkErrorMessage(clerkErr, "Failed to dispatch Clerk invitation");
          failed.push({ email, role, message: detail });
          continue;
        }
      }

      existingPendingRoles[email] = role;
      pendingRolesChanged = true;
      invited.push({ email, role, invitationId });
    }

    if (pendingRolesChanged) {
      await supabase
        .from("tenants")
        .update({
          settings: {
            ...existingSettings,
            pending_role_assignments: existingPendingRoles,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", tenant.tenantId);
    }

    if (invited.length === 0 && skipped.length === 0 && failed.length > 0) {
      throw new AppApiError(
        "CONFLICT",
        failed.map((f) => `${f.email}: ${f.message}`).join(" | "),
        409,
      );
    }

    if (invited.length > 0 || skipped.length > 0) {
      try {
        await auditService.appendEvent({
          tenantId: tenant.tenantId,
          actorId: tenant.clerkUserId,
          actorType: "USER",
          action: "TEAM_MEMBER_INVITED",
          entityType: "TENANT",
          entityId: tenant.tenantId,
          eventData: { invited, skipped, failedCount: failed.length },
        });
      } catch {
        // Non-blocking audit logging
      }
    }

    return { invited, skipped, failed };
  }

  public async revokeInvitation(
    tenant: TenantContext,
    invitationId: string,
    email?: string,
  ): Promise<{ revoked: boolean; invitationId: string }> {
    const supabase = createAdminSupabaseClient();

    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("id, clerk_org_id, settings")
      .eq("id", tenant.tenantId)
      .single();

    let resolvedEmail = email?.toLowerCase().trim();

    if (
      tenantRow?.clerk_org_id &&
      tenantRow.clerk_org_id !== "org_demo_1111" &&
      process.env.NODE_ENV !== "test"
    ) {
      try {
        const client = await clerkClient();
        const revoked = await client.organizations.revokeOrganizationInvitation({
          organizationId: tenantRow.clerk_org_id,
          invitationId,
          requestingUserId: tenant.clerkUserId,
        });
        if (!resolvedEmail && revoked.emailAddress) {
          resolvedEmail = revoked.emailAddress.toLowerCase().trim();
        }
      } catch (clerkErr: unknown) {
        throw new AppApiError(
          "CONFLICT",
          clerkErr instanceof Error ? clerkErr.message : "Failed to revoke invitation",
          409,
        );
      }
    }

    if (tenantRow) {
      const existingSettings = (tenantRow.settings || {}) as Record<string, unknown>;
      const pendingRoles = {
        ...((existingSettings.pending_role_assignments || {}) as Record<string, unknown>),
      };
      if (resolvedEmail && resolvedEmail in pendingRoles) {
        delete pendingRoles[resolvedEmail];
        await supabase
          .from("tenants")
          .update({
            settings: {
              ...existingSettings,
              pending_role_assignments: pendingRoles,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", tenant.tenantId);
      }
    }

    try {
      await auditService.appendEvent({
        tenantId: tenant.tenantId,
        actorId: tenant.clerkUserId,
        actorType: "USER",
        action: "TEAM_INVITATION_REVOKED",
        entityType: "TENANT",
        entityId: tenant.tenantId,
        eventData: { invitationId, email: resolvedEmail || null },
      });
    } catch {
      // Non-blocking
    }

    return { revoked: true, invitationId };
  }

  private async assertNotLastActiveAdmin(
    tenantId: string,
    targetMembershipId: string,
    nextRole?: CanonicalRole,
    nextStatus?: "ACTIVE" | "SUSPENDED",
  ) {
    const supabase = createAdminSupabaseClient();
    const { data: activeMembers } = await supabase
      .from("tenant_memberships")
      .select("id, role, status")
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE");

    const activeAdmins = (activeMembers || []).filter((m) => ADMIN_CAPABLE_ROLES.has(m.role));
    const isTargetCurrentlyAdmin = activeAdmins.some((m) => m.id === targetMembershipId);

    if (!isTargetCurrentlyAdmin) return;

    const willRemainAdmin =
      (nextStatus === undefined || nextStatus === "ACTIVE") &&
      (nextRole === undefined || ADMIN_CAPABLE_ROLES.has(nextRole));

    if (!willRemainAdmin && activeAdmins.length <= 1) {
      throw new AppApiError(
        "CONFLICT",
        "Cannot remove or demote the last active workspace administrator. Assign another Chief Compliance Officer or Workspace Admin first.",
        409,
      );
    }
  }

  public async updateMemberRoleOrStatus(
    tenant: TenantContext,
    memberId: string,
    input: UpdateTeamMemberInput,
  ): Promise<{ id: string; userId: string; role: CanonicalRole; status: string }> {
    if (!input.role && !input.status) {
      throw new AppApiError("VALIDATION_FAILED", "Specify a role or status to update.", 400);
    }

    const supabase = createAdminSupabaseClient();

    const { data: member, error: fetchErr } = await supabase
      .from("tenant_memberships")
      .select("id, tenant_id, user_id, role, status")
      .eq("tenant_id", tenant.tenantId)
      .eq("id", memberId)
      .single();

    if (fetchErr || !member) {
      throw new AppApiError("NOT_FOUND", "Team member not found in this workspace.", 404);
    }

    await this.assertNotLastActiveAdmin(
      tenant.tenantId,
      member.id,
      input.role,
      input.status,
    );

    const nextRole = (input.role || member.role) as CanonicalRole;
    const nextStatus = input.status || member.status;

    const { error: updateErr } = await supabase
      .from("tenant_memberships")
      .update({
        role: nextRole,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenant.tenantId)
      .eq("id", member.id);

    if (updateErr) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to update team member: ${updateErr.message}`,
        500,
      );
    }

    // Sync updated role to Clerk organization membership + metadata
    if (
      input.role &&
      tenant.clerkOrgId &&
      tenant.clerkOrgId !== "org_demo_1111" &&
      process.env.NODE_ENV !== "test"
    ) {
      try {
        const client = await clerkClient();
        await client.organizations.updateOrganizationMembershipMetadata({
          organizationId: tenant.clerkOrgId,
          userId: member.user_id,
          publicMetadata: { canonicalRole: input.role },
        });
        await client.organizations.updateOrganizationMembership({
          organizationId: tenant.clerkOrgId,
          userId: member.user_id,
          role: mapCanonicalRoleToClerkOrgRole(input.role),
        });
      } catch (clerkErr) {
        logger.warn("Best-effort Clerk membership role sync failed", {
          tenantId: tenant.tenantId,
          memberId: member.id,
          error: clerkErr instanceof Error ? clerkErr.message : String(clerkErr),
        });
      }
    }

    try {
      await auditService.appendEvent({
        tenantId: tenant.tenantId,
        actorId: tenant.clerkUserId,
        actorType: "USER",
        action: input.role ? "TEAM_MEMBER_ROLE_UPDATED" : "TEAM_MEMBER_STATUS_UPDATED",
        entityType: "TENANT_MEMBERSHIP",
        entityId: member.id,
        eventData: {
          targetUserId: member.user_id,
          previousRole: member.role,
          newRole: nextRole,
          previousStatus: member.status,
          newStatus: nextStatus,
        },
      });
    } catch {
      // Non-blocking audit logging
    }

    return {
      id: member.id,
      userId: member.user_id,
      role: nextRole,
      status: nextStatus,
    };
  }

  public async removeTeamMember(
    tenant: TenantContext,
    memberId: string,
  ): Promise<{ removed: boolean; id: string }> {
    const supabase = createAdminSupabaseClient();

    const { data: member, error: fetchErr } = await supabase
      .from("tenant_memberships")
      .select("id, tenant_id, user_id, role, status")
      .eq("tenant_id", tenant.tenantId)
      .eq("id", memberId)
      .single();

    if (fetchErr || !member) {
      throw new AppApiError("NOT_FOUND", "Team member not found in this workspace.", 404);
    }

    if (member.user_id === tenant.clerkUserId) {
      throw new AppApiError(
        "CONFLICT",
        "You cannot remove your own active workspace membership from Team Settings.",
        409,
      );
    }

    await this.assertNotLastActiveAdmin(tenant.tenantId, member.id, undefined, "SUSPENDED");

    const { error: updateErr } = await supabase
      .from("tenant_memberships")
      .update({
        status: "SUSPENDED",
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenant.tenantId)
      .eq("id", member.id);

    if (updateErr) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to remove team member: ${updateErr.message}`,
        500,
      );
    }

    if (
      tenant.clerkOrgId &&
      tenant.clerkOrgId !== "org_demo_1111" &&
      process.env.NODE_ENV !== "test"
    ) {
      try {
        const client = await clerkClient();
        await client.organizations.deleteOrganizationMembership({
          organizationId: tenant.clerkOrgId,
          userId: member.user_id,
        });
      } catch (clerkErr) {
        logger.warn("Best-effort Clerk membership removal failed", {
          tenantId: tenant.tenantId,
          memberId: member.id,
          error: clerkErr instanceof Error ? clerkErr.message : String(clerkErr),
        });
      }
    }

    try {
      await auditService.appendEvent({
        tenantId: tenant.tenantId,
        actorId: tenant.clerkUserId,
        actorType: "USER",
        action: "TEAM_MEMBER_REMOVED",
        entityType: "TENANT_MEMBERSHIP",
        entityId: member.id,
        eventData: {
          targetUserId: member.user_id,
          previousRole: member.role,
        },
      });
    } catch {
      // Non-blocking
    }

    return { removed: true, id: member.id };
  }
}

export const settingsService = new SettingsService();
