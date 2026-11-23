/**
 * Cogent Compliance OS — Policy Workflow REST API Route Contract & RBAC Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getPermissionsForRole } from "@/modules/auth-tenancy/permissions";
import type { CanonicalRole, TenantContext } from "@/modules/auth-tenancy/types";

let activeMockTenant: TenantContext;

function setMockRole(role: CanonicalRole, userId = "user_api_test_1") {
  activeMockTenant = {
    tenantId: "11111111-1111-1111-1111-111111111111",
    userId,
    clerkOrgId: "org_api_test",
    clerkUserId: userId,
    orgSlug: "api-test-fintech",
    orgName: "API Test Fintech Ltd",
    role,
    permissions: getPermissionsForRole(role),
    status: "ACTIVE",
  };
}

const mockDashboard = vi.fn().mockResolvedValue({
  kpis: {
    total_policies: 4,
    under_review: 1,
    awaiting_approval: 1,
    overdue_reviews: 1,
    published_active: 1,
    open_feasibility_blockers: 0,
    open_implementation_tasks: 2,
    pending_attestations: 3,
  },
  policies: [],
});

const mockCreatePolicy = vi.fn().mockResolvedValue({
  policy: {
    id: "22222222-2222-2222-2222-222222222222",
    policy_ref_no: "POL-AML-2026-001",
    title: "AML/CFT Policy",
  },
});

const mockHandleApproval = vi.fn();

vi.mock("@/modules/auth-tenancy/tenant.resolver", () => ({
  resolveTenantContext: vi.fn(async () => activeMockTenant),
}));

vi.mock("@/modules/policies", () => ({
  policyWorkflowService: {
    getDashboardAndRegister: (...args: unknown[]) => mockDashboard(...args),
    createPolicy: (...args: unknown[]) => mockCreatePolicy(...args),
    handleApprovalAction: (...args: unknown[]) => mockHandleApproval(...args),
  },
}));

import { GET as getPolicies, POST as postPolicy } from "@/app/api/marketing-shield/v1/policies/route";
import { POST as postApproval } from "@/app/api/marketing-shield/v1/policies/[id]/approvals/route";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";

describe("Policy Workflow REST API Routes (/api/marketing-shield/v1/policies/*)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockRole("CHIEF_COMPLIANCE_OFFICER");
  });

  it("GET /policies returns standard Document 04 envelope with Policy Dashboard KPIs", async () => {
    const req = new NextRequest("http://localhost:3000/api/marketing-shield/v1/policies?overdue_only=true");
    const res = await getPolicies(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.kpis.total_policies).toBe(4);
    expect(json.data.kpis.overdue_reviews).toBe(1);
    expect(mockDashboard).toHaveBeenCalledWith(
      activeMockTenant,
      expect.objectContaining({ overdue_only: true }),
    );
  });

  it("POST /policies creates a policy for CCO/Analyst and returns HTTP 201", async () => {
    const req = new NextRequest("http://localhost:3000/api/marketing-shield/v1/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "AML/CFT Policy",
        domain: "AML_CFT_CPF",
        approval_tier: "TIER_3_BOARD",
      }),
    });
    const res = await postPolicy(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.policy.policy_ref_no).toBe("POL-AML-2026-001");
  });

  it("POST /policies rejects INTERNAL_AUDIT with HTTP 403 FORBIDDEN (advisory-only 3rd line)", async () => {
    setMockRole("INTERNAL_AUDIT", "auditor_api_1");
    const req = new NextRequest("http://localhost:3000/api/marketing-shield/v1/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Unauthorized Policy Draft",
        domain: "AML_CFT_CPF",
      }),
    });
    const res = await postPolicy(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
    expect(mockCreatePolicy).not.toHaveBeenCalled();
  });

  it("POST /policies/[id]/approvals propagates AUDIT_INDEPENDENCE_VIOLATION as HTTP 403", async () => {
    setMockRole("INTERNAL_AUDIT", "auditor_api_1");
    mockHandleApproval.mockRejectedValueOnce(
      new AuthTenancyError(
        "AUDIT_INDEPENDENCE_VIOLATION",
        "Internal Audit cannot approve compliance policies.",
        403,
      ),
    );

    const req = new NextRequest(
      "http://localhost:3000/api/marketing-shield/v1/policies/22222222-2222-2222-2222-222222222222/approvals",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DECIDE",
          step_id: "33333333-3333-3333-3333-333333333333",
          decision: "APPROVED",
          decision_reason: "Attempting unauthorized approval",
        }),
      },
    );

    const res = await postApproval(req, {
      params: Promise.resolve({ id: "22222222-2222-2222-2222-222222222222" }),
    });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("AUDIT_INDEPENDENCE_VIOLATION");
  });
});
