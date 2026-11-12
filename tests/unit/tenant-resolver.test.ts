/**
 * Cogent Marketing Shield - Tenant & RBAC Resolver Unit Tests
 * Document Reference: Document 07 (Section 3 & 4) & Document 08 (Phase 3)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";

// Mock @clerk/nextjs/server auth()
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

// Mock Supabase admin client
const mockSingleTenant = vi.fn();
const mockSingleMembership = vi.fn();

vi.mock("@/lib/supabase", () => {
  return {
    createAdminSupabaseClient: vi.fn().mockReturnValue({
      from: (table: string) => {
        if (table === "tenants") {
          return {
            select: () => ({
              eq: () => ({
                single: mockSingleTenant,
              }),
            }),
          };
        }
        if (table === "tenant_memberships") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: mockSingleMembership,
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      },
    }),
  };
});

describe("Server-Side Tenant & RBAC Context Resolver (resolveTenantContext)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return resolved test context when testContext override is passed in test environment", async () => {
    const ctx = await resolveTenantContext(undefined, {
      testContext: {
        role: "LEGAL_COUNSEL",
        orgSlug: "stanbic-ibtc",
        orgName: "Stanbic IBTC Bank",
      },
    });

    expect(ctx.role).toBe("LEGAL_COUNSEL");
    expect(ctx.orgSlug).toBe("stanbic-ibtc");
    expect(ctx.permissions.has("approval.decide")).toBe(true);
    expect(ctx.permissions.has("user.manage")).toBe(false);
  });

  it("should throw HTTP 401 UNAUTHENTICATED when no active Clerk session exists", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      orgId: null,
    });

    await expect(resolveTenantContext()).rejects.toThrowError(
      expect.objectContaining({
        code: "UNAUTHENTICATED",
        statusCode: 401,
      }),
    );
  });

  it("should throw HTTP 403 TENANT_CONTEXT_INVALID when user is authenticated but has not selected an organization", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_test_123",
      orgId: null, // No active organization
    });

    await expect(resolveTenantContext()).rejects.toThrowError(
      expect.objectContaining({
        code: "TENANT_CONTEXT_INVALID",
        statusCode: 403,
      }),
    );
  });

  it("should throw HTTP 403 TENANT_SUSPENDED when tenant institution account is suspended", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_test_123",
      orgId: "org_suspended_bank",
    });

    mockSingleTenant.mockResolvedValue({
      data: {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Suspended Bank PLC",
        slug: "suspended-bank",
        status: "SUSPENDED",
      },
      error: null,
    });

    await expect(resolveTenantContext()).rejects.toThrowError(
      expect.objectContaining({
        code: "TENANT_SUSPENDED",
        statusCode: 403,
      }),
    );
  });

  it("should throw HTTP 403 TENANT_SUSPENDED when individual membership is suspended", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_suspended_member",
      orgId: "org_gtbank",
    });

    mockSingleTenant.mockResolvedValue({
      data: {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Guaranty Trust Bank",
        slug: "gtbank",
        status: "ACTIVE",
      },
      error: null,
    });

    mockSingleMembership.mockResolvedValue({
      data: {
        id: "00000000-0000-0000-0000-000000000002",
        role: "COMPLIANCE_ANALYST",
        status: "SUSPENDED",
      },
      error: null,
    });

    await expect(resolveTenantContext()).rejects.toThrowError(
      expect.objectContaining({
        code: "TENANT_SUSPENDED",
        statusCode: 403,
      }),
    );
  });

  it("should resolve valid active session, map role, and bind authoritative permission set", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_cco_active",
      orgId: "org_gtbank",
      orgRole: "org:chief_compliance_officer",
      orgSlug: "gtbank",
    });

    mockSingleTenant.mockResolvedValue({
      data: {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Guaranty Trust Bank",
        slug: "gtbank",
        status: "ACTIVE",
      },
      error: null,
    });

    mockSingleMembership.mockResolvedValue({
      data: {
        id: "00000000-0000-0000-0000-000000000002",
        role: "CHIEF_COMPLIANCE_OFFICER",
        status: "ACTIVE",
      },
      error: null,
    });

    const ctx = await resolveTenantContext();

    expect(ctx.tenantId).toBe("00000000-0000-0000-0000-000000000001");
    expect(ctx.clerkUserId).toBe("user_cco_active");
    expect(ctx.role).toBe("CHIEF_COMPLIANCE_OFFICER");
    expect(ctx.permissions.has("approval.decide")).toBe(true);
    expect(ctx.permissions.has("audit.read")).toBe(true);
    expect(ctx.permissions.has("user.manage")).toBe(true);
    expect(ctx.status).toBe("ACTIVE");
  });
});
