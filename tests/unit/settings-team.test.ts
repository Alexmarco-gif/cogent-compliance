/**
 * Cogent Marketing Shield - Workspace Settings & Team Governance Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { settingsService } from "@/modules/settings/settings.service";
import { getPermissionsForRole } from "@/modules/auth-tenancy/permissions";
import type { TenantContext } from "@/modules/auth-tenancy/types";
import * as supabaseModule from "@/lib/supabase";

vi.mock("@/modules/audit/audit.service", () => ({
  auditService: {
    appendEvent: vi.fn().mockResolvedValue({ id: "audit-settings-1" }),
  },
}));

describe("SettingsService & Functional Team RBAC Governance", () => {
  const tenantId = "11111111-1111-1111-1111-111111111111";

  const adminTenant: TenantContext = {
    tenantId,
    userId: "mem-admin-1",
    clerkOrgId: "org_test_1",
    clerkUserId: "user_cco_1",
    orgSlug: "zenith-mfb",
    orgName: "Zenith Microfinance",
    role: "CHIEF_COMPLIANCE_OFFICER",
    permissions: getPermissionsForRole("CHIEF_COMPLIANCE_OFFICER"),
    status: "ACTIVE",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges organization profile, business address, compliance policy, and active scopes cleanly", async () => {
    let savedSettings: any = null;
    let savedName: string | undefined;

    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: tenantId,
                name: savedName || "Zenith Microfinance",
                slug: "zenith-mfb",
                clerk_org_id: "org_test_1",
                settings: savedSettings || { onboarding_step: 3 },
              },
              error: null,
            }),
            update: vi.fn().mockImplementation((payload: any) => {
              savedSettings = payload.settings;
              if (payload.name) savedName = payload.name;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }
        return {};
      }),
    } as any);

    const updated = await settingsService.updateWorkspaceSettings(adminTenant, {
      organization_name: "Zenith Digital Bank",
      active_regulatory_scopes: ["DIGITAL_LENDING", "BANKING_DEPOSIT"],
      organization_profile: {
        registration_number: "RC-882910",
        phone: "+234 800 555 0101",
        address: {
          country: "Nigeria",
          state_region: "Lagos",
          city: "Victoria Island",
          street_address: "10 Akin Adesola",
        },
      },
      compliance_policy: {
        enforce_dual_control_approval: false,
        cco_alert_email: "cco@zenithdigital.ng",
        default_drift_frequency: "HOURLY",
      },
    });

    expect(savedName).toBe("Zenith Digital Bank");
    expect(savedSettings.onboarding_step).toBe(3);
    expect(savedSettings.organization_profile.registration_number).toBe("RC-882910");
    expect(savedSettings.organization_profile.address.city).toBe("Victoria Island");
    expect(savedSettings.compliance_policy.enforce_dual_control_approval).toBe(false);
    expect(savedSettings.compliance_policy.cco_alert_email).toBe("cco@zenithdigital.ng");
    expect(updated.organizationName).toBe("Zenith Digital Bank");
    expect(updated.activeRegulatoryScopes).toEqual(["DIGITAL_LENDING", "BANKING_DEPOSIT"]);
  });

  it("persists pending_role_assignments when inviting multiple team members with distinct roles", async () => {
    let savedSettings: any = null;

    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: tenantId,
                clerk_org_id: "org_test_1",
                settings: {},
              },
              error: null,
            }),
            update: vi.fn().mockImplementation((payload: any) => {
              savedSettings = payload.settings;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }
        return {};
      }),
    } as any);

    const res = await settingsService.inviteTeamMembers(adminTenant, {
      invitations: [
        { email: "Legal@Zenith.ng ", role: "LEGAL_COUNSEL" },
        { email: "pm@zenith.ng", role: "MARKETING_GROWTH" },
      ],
    });

    expect(res.invited).toHaveLength(2);
    expect(savedSettings.pending_role_assignments).toEqual({
      "legal@zenith.ng": "LEGAL_COUNSEL",
      "pm@zenith.ng": "MARKETING_GROWTH",
    });
  });

  it("blocks demoting or suspending the last active administrator (lockout protection)", async () => {
    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "tenant_memberships") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((_col: string, val: string) => {
              // Single member lookup returns admin; active-members list returns only that 1 admin
              return {
                eq: vi.fn().mockImplementation((col2: string, val2: string) => {
                  if (col2 === "status" && val2 === "ACTIVE") {
                    return Promise.resolve({
                      data: [{ id: "mem-admin-1", role: "CHIEF_COMPLIANCE_OFFICER", status: "ACTIVE" }],
                      error: null,
                    });
                  }
                  return {
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: "mem-admin-1",
                        tenant_id: tenantId,
                        user_id: "user_cco_1",
                        role: "CHIEF_COMPLIANCE_OFFICER",
                        status: "ACTIVE",
                      },
                      error: null,
                    }),
                  };
                }),
              };
            }),
          };
        }
        return {};
      }),
    } as any);

    await expect(
      settingsService.updateMemberRoleOrStatus(adminTenant, "mem-admin-1", {
        role: "MARKETING_GROWTH",
      }),
    ).rejects.toThrow(/last active workspace administrator/i);
  });

  it("updates a team member role when another active admin exists", async () => {
    let updatedPayload: any = null;

    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "tenant_memberships") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col2: string, val2: string) => {
                if (col2 === "status" && val2 === "ACTIVE") {
                  return Promise.resolve({
                    data: [
                      { id: "mem-admin-1", role: "CHIEF_COMPLIANCE_OFFICER", status: "ACTIVE" },
                      { id: "mem-pm-2", role: "MARKETING_GROWTH", status: "ACTIVE" },
                    ],
                    error: null,
                  });
                }
                return {
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "mem-pm-2",
                      tenant_id: tenantId,
                      user_id: "user_pm_2",
                      role: "MARKETING_GROWTH",
                      status: "ACTIVE",
                    },
                    error: null,
                  }),
                };
              }),
            }),
            update: vi.fn().mockImplementation((payload: any) => {
              updatedPayload = payload;
              return {
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              };
            }),
          };
        }
        return {};
      }),
    } as any);

    const res = await settingsService.updateMemberRoleOrStatus(adminTenant, "mem-pm-2", {
      role: "LEGAL_COUNSEL",
    });

    expect(res.role).toBe("LEGAL_COUNSEL");
    expect(updatedPayload.role).toBe("LEGAL_COUNSEL");
  });
});
