import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockResolveTenantContext = vi.fn();
const mockIsPlatformOwner = vi.fn();
const mockIsInternalWorkspace = vi.fn();
const mockSetInternalWorkspace = vi.fn();

vi.mock("@/modules/auth-tenancy/tenant.resolver", () => ({
  resolveTenantContext: (...args: unknown[]) => mockResolveTenantContext(...args),
}));

vi.mock("@/modules/billing/internal-workspace.service", async () => {
  const actual = await vi.importActual<typeof import("@/modules/billing/internal-workspace.service")>(
    "@/modules/billing/internal-workspace.service",
  );
  return {
    ...actual,
    isPlatformOwner: (...args: unknown[]) => mockIsPlatformOwner(...args),
    isInternalWorkspace: (...args: unknown[]) => mockIsInternalWorkspace(...args),
    setInternalWorkspace: (...args: unknown[]) => mockSetInternalWorkspace(...args),
  };
});

import { GET, POST } from "@/app/api/marketing-shield/v1/admin/internal-workspace/route";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";

const BASE_TENANT = {
  tenantId: "22222222-2222-2222-2222-222222222222",
  userId: "mem_1",
  clerkOrgId: "org_real_1",
  clerkUserId: "user_1",
  orgSlug: "cogent-internal",
  orgName: "Cogent Internal",
  role: "CHIEF_COMPLIANCE_OFFICER",
  permissions: [],
  status: "ACTIVE",
};

describe("API /api/marketing-shield/v1/admin/internal-workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveTenantContext.mockResolvedValue(BASE_TENANT);
  });

  it("returns 404 to non-owners on GET and POST (stealth)", async () => {
    mockIsPlatformOwner.mockResolvedValue(false);

    const getRes = await GET(new NextRequest("http://localhost/api/marketing-shield/v1/admin/internal-workspace"));
    expect(getRes.status).toBe(404);

    const postRes = await POST(
      new NextRequest("http://localhost/api/marketing-shield/v1/admin/internal-workspace", {
        method: "POST",
        body: JSON.stringify({ enabled: true }),
      }),
    );
    expect(postRes.status).toBe(404);
    expect(mockSetInternalWorkspace).not.toHaveBeenCalled();
  });

  it("returns 404 on unauthenticated / AuthTenancyError", async () => {
    mockResolveTenantContext.mockRejectedValue(new AuthTenancyError("UNAUTHENTICATED", "No session", 401));
    const res = await GET(new NextRequest("http://localhost/api/marketing-shield/v1/admin/internal-workspace"));
    expect(res.status).toBe(404);
  });

  it("returns status for the verified owner on GET", async () => {
    mockIsPlatformOwner.mockResolvedValue(true);
    mockIsInternalWorkspace.mockResolvedValue(true);

    const res = await GET(new NextRequest("http://localhost/api/marketing-shield/v1/admin/internal-workspace"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      isOwner: true,
      isInternal: true,
      isDemoTenant: false,
      orgName: "Cogent Internal",
    });
  });

  it("rejects toggling the shared demo tenant", async () => {
    mockIsPlatformOwner.mockResolvedValue(true);
    mockResolveTenantContext.mockResolvedValue({
      ...BASE_TENANT,
      tenantId: "11111111-1111-1111-1111-111111111111",
      clerkOrgId: "org_demo_1111",
    });

    const res = await POST(
      new NextRequest("http://localhost/api/marketing-shield/v1/admin/internal-workspace", {
        method: "POST",
        body: JSON.stringify({ enabled: true }),
      }),
    );
    expect(res.status).toBe(400);
    expect(mockSetInternalWorkspace).not.toHaveBeenCalled();
  });

  it("enables and disables the internal override for the owner", async () => {
    mockIsPlatformOwner.mockResolvedValue(true);
    mockSetInternalWorkspace.mockResolvedValue({ ok: true, isInternal: true });

    const res = await POST(
      new NextRequest("http://localhost/api/marketing-shield/v1/admin/internal-workspace", {
        method: "POST",
        body: JSON.stringify({ enabled: true }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ isOwner: true, isInternal: true });
    expect(mockSetInternalWorkspace).toHaveBeenCalledWith({
      tenantId: BASE_TENANT.tenantId,
      enabled: true,
      actorId: BASE_TENANT.clerkUserId,
      source: "OWNER_SETTINGS_TOGGLE",
    });
  });
});
