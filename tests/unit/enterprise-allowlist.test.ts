import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseInternalEnterpriseEmails,
  parseInternalEnterpriseOrgIds,
  provisionEnterpriseForAllowlistedCreator,
} from "@/modules/billing/enterprise-allowlist.service";
import * as supabaseModule from "@/lib/supabase";
import { paystackBillingService, DEFAULT_PLANS } from "@/modules/billing/paystack.service";
import { auditService } from "@/modules/audit/audit.service";

const mockGetUser = vi.fn();
const mockGetOrganization = vi.fn();
const mockGetOrganizationMembershipList = vi.fn();
const mockUpdateOrgMembershipMetadata = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn().mockResolvedValue({
    users: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    organizations: {
      getOrganization: (...args: unknown[]) => mockGetOrganization(...args),
      getOrganizationMembershipList: (...args: unknown[]) =>
        mockGetOrganizationMembershipList(...args),
      updateOrganizationMembershipMetadata: (...args: unknown[]) =>
        mockUpdateOrgMembershipMetadata(...args),
    },
  }),
}));

describe("Internal Enterprise Allowlist Provisioning", () => {
  const originalEnv = process.env.INTERNAL_ENTERPRISE_EMAILS;
  const originalOrgEnv = process.env.INTERNAL_ENTERPRISE_ORG_IDS;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_ENTERPRISE_EMAILS;
    delete process.env.INTERNAL_ENTERPRISE_ORG_IDS;
    vi.spyOn(paystackBillingService, "getPlan").mockResolvedValue(DEFAULT_PLANS.enterprise);
    vi.spyOn(auditService, "appendEvent").mockResolvedValue({} as never);
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.INTERNAL_ENTERPRISE_EMAILS;
    } else {
      process.env.INTERNAL_ENTERPRISE_EMAILS = originalEnv;
    }
    if (originalOrgEnv === undefined) {
      delete process.env.INTERNAL_ENTERPRISE_ORG_IDS;
    } else {
      process.env.INTERNAL_ENTERPRISE_ORG_IDS = originalOrgEnv;
    }
  });

  it("parses comma-separated emails and normalizes case/whitespace", () => {
    const parsed = parseInternalEnterpriseEmails(" MarcoAlex201804@gmail.com , team@cogent.ng ");
    expect(parsed.has("marcoalex201804@gmail.com")).toBe(true);
    expect(parsed.has("team@cogent.ng")).toBe(true);
    expect(parsed.size).toBe(2);
  });

  it("skips when INTERNAL_ENTERPRISE_EMAILS is not configured", async () => {
    const res = await provisionEnterpriseForAllowlistedCreator({
      tenantId: "tenant-1",
      clerkUserId: "user_1",
      clerkOrgId: "org_1",
    });
    expect(res.granted).toBe(false);
    expect(res.reason).toBe("ALLOWLIST_EMPTY");
  });

  it("rejects unverified allowlisted emails", async () => {
    process.env.INTERNAL_ENTERPRISE_EMAILS = "marcoalex201804@gmail.com";

    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "tenant-1", clerk_org_id: "org_1", settings: {} },
              error: null,
            }),
          };
        }
        return {};
      }),
    } as never);

    mockGetUser.mockResolvedValue({
      id: "user_1",
      emailAddresses: [
        {
          emailAddress: "marcoalex201804@gmail.com",
          verification: { status: "unverified" },
        },
      ],
    });

    const res = await provisionEnterpriseForAllowlistedCreator({
      tenantId: "tenant-1",
      clerkUserId: "user_1",
      clerkOrgId: "org_1",
    });

    expect(res.granted).toBe(false);
    expect(res.reason).toBe("NOT_ALLOWLISTED_OR_UNVERIFIED");
  });

  it("does not upgrade third-party orgs where the allowlisted user is not the creator", async () => {
    process.env.INTERNAL_ENTERPRISE_EMAILS = "marcoalex201804@gmail.com";

    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "tenant-other", clerk_org_id: "org_other", settings: {} },
              error: null,
            }),
          };
        }
        return {};
      }),
    } as never);

    mockGetUser.mockResolvedValue({
      id: "user_marco",
      emailAddresses: [
        {
          emailAddress: "marcoalex201804@gmail.com",
          verification: { status: "verified" },
        },
      ],
    });

    mockGetOrganization.mockResolvedValue({
      id: "org_other",
      createdBy: "user_someone_else",
    });

    const res = await provisionEnterpriseForAllowlistedCreator({
      tenantId: "tenant-other",
      clerkUserId: "user_marco",
      clerkOrgId: "org_other",
    });

    expect(res.granted).toBe(false);
    expect(res.reason).toBe("NOT_ORG_CREATOR");
  });

  it("rejects second organization if the user/email already received first-org Enterprise comp", async () => {
    process.env.INTERNAL_ENTERPRISE_EMAILS = "marcoalex201804@gmail.com";

    const updateEq = vi.fn().mockResolvedValue({ error: null });

    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [{ id: "tenant-first-org" }],
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "tenant-second-org", clerk_org_id: "org_second", settings: {} },
              error: null,
            }),
            update: vi.fn().mockReturnValue({ eq: updateEq }),
          };
        }
        return {};
      }),
    } as never);

    mockGetUser.mockResolvedValue({
      id: "user_marco",
      emailAddresses: [
        {
          emailAddress: "marcoalex201804@gmail.com",
          verification: { status: "verified" },
        },
      ],
    });

    mockGetOrganization.mockResolvedValue({
      id: "org_second",
      createdBy: "user_marco",
    });

    const res = await provisionEnterpriseForAllowlistedCreator({
      tenantId: "tenant-second-org",
      clerkUserId: "user_marco",
      clerkOrgId: "org_second",
    });

    expect(res.granted).toBe(false);
    expect(res.reason).toBe("FIRST_ORG_ALREADY_COMPED");
    expect(updateEq).toHaveBeenCalledWith("id", "tenant-second-org");
  });

  it("provisions Enterprise plan and promotes creator to CHIEF_COMPLIANCE_OFFICER on first org", async () => {
    process.env.INTERNAL_ENTERPRISE_EMAILS = "marcoalex201804@gmail.com";

    const subUpsert = vi.fn().mockResolvedValue({ error: null });
    const tenantUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const tenantUpdate = vi.fn().mockReturnValue({ eq: tenantUpdateEq });
    const memUpsert = vi.fn().mockResolvedValue({ error: null });

    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "tenant-first-org", clerk_org_id: "org_first", settings: {} },
              error: null,
            }),
            update: tenantUpdate,
          };
        }
        if (table === "tenant_subscriptions") {
          return {
            upsert: subUpsert,
          };
        }
        if (table === "tenant_memberships") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "mem-1", role: "WORKSPACE_ADMIN" },
              error: null,
            }),
            upsert: memUpsert,
          };
        }
        return {};
      }),
    } as never);

    mockGetUser.mockResolvedValue({
      id: "user_marco",
      emailAddresses: [
        {
          emailAddress: "MarcoAlex201804@gmail.com",
          verification: { status: "verified" },
        },
      ],
    });

    mockGetOrganization.mockResolvedValue({
      id: "org_first",
      createdBy: "user_marco",
    });

    const res = await provisionEnterpriseForAllowlistedCreator({
      tenantId: "tenant-first-org",
      clerkUserId: "user_marco",
      clerkOrgId: "org_first",
    });

    expect(res.granted).toBe(true);
    expect(res.planSlug).toBe("enterprise");
    expect(res.matchedEmail).toBe("marcoalex201804@gmail.com");

    expect(subUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "tenant-first-org",
        plan_id: DEFAULT_PLANS.enterprise.id,
        status: "active",
        billing_interval: "annual",
      }),
      { onConflict: "tenant_id" },
    );

    expect(tenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          enterprise_comp_owner_user_id: "user_marco",
          enterprise_comp_email: "marcoalex201804@gmail.com",
          subscription: expect.objectContaining({
            plan_slug: "enterprise",
            status: "active",
            source: "INTERNAL_ENTERPRISE_ALLOWLIST",
          }),
        }),
      }),
    );

    expect(memUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "tenant-first-org",
        user_id: "user_marco",
        role: "CHIEF_COMPLIANCE_OFFICER",
        status: "ACTIVE",
      }),
      { onConflict: "tenant_id,user_id" },
    );
  });

  it("parses INTERNAL_ENTERPRISE_ORG_IDS and grants Enterprise directly to allowlisted team orgs", async () => {
    const parsedOrgs = parseInternalEnterpriseOrgIds(" org_team_1 , org_team_2 ");
    expect(parsedOrgs.has("org_team_1")).toBe(true);
    expect(parsedOrgs.has("org_team_2")).toBe(true);
    expect(parsedOrgs.size).toBe(2);

    process.env.INTERNAL_ENTERPRISE_ORG_IDS = "org_team_1";

    const subUpsert = vi.fn().mockResolvedValue({ error: null });
    const tenantUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const tenantUpdate = vi.fn().mockReturnValue({ eq: tenantUpdateEq });
    const memUpsert = vi.fn().mockResolvedValue({ error: null });

    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "tenant-team-1",
                clerk_org_id: "org_team_1",
                status: "ACTIVE",
                settings: { enterprise_comp_checked_at: "2026-11-10T00:00:00Z" },
              },
              error: null,
            }),
            update: tenantUpdate,
          };
        }
        if (table === "tenant_subscriptions") {
          return { upsert: subUpsert };
        }
        if (table === "tenant_memberships") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "mem-mkt", role: "MARKETING_GROWTH" },
              error: null,
            }),
            upsert: memUpsert,
          };
        }
        return {};
      }),
    } as never);

    const res = await provisionEnterpriseForAllowlistedCreator({
      tenantId: "tenant-team-1",
      clerkUserId: "user_teammate",
      clerkOrgId: "org_team_1",
    });

    expect(res.granted).toBe(true);
    expect(res.planSlug).toBe("enterprise");
    expect(res.matchedOrgId).toBe("org_team_1");
    expect(subUpsert).toHaveBeenCalledOnce();
    // Should NOT overwrite MARKETING_GROWTH member's role
    expect(memUpsert).not.toHaveBeenCalled();
  });

  it("allows Dashboard-created orgs (missing createdBy) with multiple team members when user is an allowlisted admin", async () => {
    process.env.INTERNAL_ENTERPRISE_EMAILS = "marcoalex201804@gmail.com";

    const neqMock = vi.fn().mockReturnThis();
    const subUpsert = vi.fn().mockResolvedValue({ error: null });
    const tenantUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const tenantUpdate = vi.fn().mockReturnValue({ eq: tenantUpdateEq });
    const memUpsert = vi.fn().mockResolvedValue({ error: null });

    vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: neqMock,
            or: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "tenant-dash-org", clerk_org_id: "org_dash", status: "ACTIVE", settings: {} },
              error: null,
            }),
            update: tenantUpdate,
          };
        }
        if (table === "tenant_subscriptions") {
          return { upsert: subUpsert };
        }
        if (table === "tenant_memberships") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "mem-1", role: "WORKSPACE_ADMIN" },
              error: null,
            }),
            upsert: memUpsert,
          };
        }
        return {};
      }),
    } as never);

    mockGetUser.mockResolvedValue({
      id: "user_marco",
      emailAddresses: [
        {
          emailAddress: "marcoalex201804@gmail.com",
          verification: { status: "verified" },
        },
      ],
    });

    mockGetOrganization.mockResolvedValue({
      id: "org_dash",
      createdBy: null,
    });

    mockGetOrganizationMembershipList.mockResolvedValue({
      totalCount: 4,
      data: [
        { role: "org:member", publicUserData: { userId: "user_team_1" } },
        { role: "org:workspace_admin", publicUserData: { userId: "user_marco" } },
      ],
    });

    const res = await provisionEnterpriseForAllowlistedCreator({
      tenantId: "tenant-dash-org",
      clerkUserId: "user_marco",
      clerkOrgId: "org_dash",
    });

    expect(res.granted).toBe(true);
    expect(res.planSlug).toBe("enterprise");
    expect(neqMock).toHaveBeenCalledWith("status", "INACTIVE");
  });
});
