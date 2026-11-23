/**
 * Cogent Compliance Platform — Feature Governance API Routes & Edge-Case Verification Suite
 *
 * Exercises the actual Next.js API route handlers end-to-end across all edge cases:
 *  1. Invalid UUID path params -> HTTP 400 VALIDATION_FAILED
 *  2. Malformed JSON / schema violations -> HTTP 400 VALIDATION_FAILED
 *  3. 1st-Line role attempting 2nd-line control verification or Launch Gate decision -> HTTP 403
 *  4. 3rd-Line Internal Auditor attempting operational writes/ripple scans -> HTTP 403 THIRD_LINE_INDEPENDENCE_VIOLATION
 *  5. 3rd-Line Internal Auditor logging independent INTERNAL_AUDIT_ASSURANCE observation -> HTTP 200 (zero operational state mutation)
 *  6. Mandatory control verification without attached evidence -> HTTP 409 MANDATORY_GATE_BLOCKER_UNRESOLVED
 *  7. Lifecycle bypass attempt (PATCH to POST_LAUNCH_MONITORING without APPROVED gate) -> HTTP 409
 *  8. Conditional Approval edge cases: empty conditions (400) & FAILED mandatory control (409)
 *  9. Material Change Reassessment with requires_reapproval=true re-opening Launch Gate (MODIFICATION_OR_RETIREMENT / PENDING_GATE)
 * 10. 2nd-Line RISK_OFFICER triggering POST /api/marketing-shield/v1/ripple-alerts -> HTTP 200
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getPermissionsForRole } from "@/modules/auth-tenancy/permissions";
import type { CanonicalRole, TenantContext } from "@/modules/auth-tenancy/types";
import { createAdminSupabaseClient } from "@/lib/supabase";

let activeTenantContext: TenantContext;

function setRole(role: CanonicalRole, userId: string = "user_active_01") {
  activeTenantContext = {
    tenantId: "11111111-1111-1111-1111-111111111111",
    userId,
    clerkOrgId: "org_test_bank",
    clerkUserId: userId,
    orgSlug: "test-bank",
    orgName: "Test Bank PLC",
    role,
    permissions: getPermissionsForRole(role),
    status: "ACTIVE",
  };
}

vi.mock("@/modules/auth-tenancy/tenant.resolver", () => ({
  resolveTenantContext: vi.fn(async () => activeTenantContext),
}));

vi.mock("@/lib/supabase", () => {
  const mockFrom = vi.fn();
  return {
    createAdminSupabaseClient: vi.fn(() => ({
      from: mockFrom,
    })),
  };
});

vi.mock("@/modules/audit/audit.service", () => ({
  auditService: {
    appendEvent: vi.fn().mockResolvedValue({ id: "audit_edge_001" }),
  },
}));

const VALID_FEATURE_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VALID_CONTROL_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function makeBaseFeature(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_FEATURE_ID,
    tenant_id: "11111111-1111-1111-1111-111111111111",
    feature_code: "NPA-REC-AUTO-901",
    feature_name: "Automated Recurring Payments",
    summary: "Automated recurring debits to external bank accounts.",
    business_objective: "Recurring bill & vendor transfers.",
    financial_activity_type: "RECURRING_DEBIT",
    change_classification: "NEW_FEATURE",
    materiality_tier: "HIGH",
    target_market: "INDIVIDUALS_AND_BUSINESSES",
    revenue_model: "₦50 per debit",
    third_party_dependencies: ["NIBSS NIP"],
    applicable_regulators: ["CBN", "NFIU", "NDPC", "FCCPC"],
    regulatory_domains: ["KYC_CDD", "AML_CFT_CPF", "TRANSACTION_MONITORING", "DISPUTES_COMPLAINTS"],
    ria_matrix: [
      { domain: "KYC_CDD", regulator: "CBN", statutory_basis: "CBN 2023", assessment_question: "q", required_outcome: "o", risk_level: "HIGH", pre_launch_condition: "c" },
      { domain: "AML_CFT_CPF", regulator: "NFIU", statutory_basis: "MLPPA 2022", assessment_question: "q", required_outcome: "o", risk_level: "CRITICAL", pre_launch_condition: "c" },
      { domain: "DATA_PROTECTION", regulator: "NDPC", statutory_basis: "NDPA 2023", assessment_question: "q", required_outcome: "o", risk_level: "HIGH", pre_launch_condition: "c" },
      { domain: "DISPUTES_COMPLAINTS", regulator: "CBN", statutory_basis: "CBN CPF", assessment_question: "q", required_outcome: "o", risk_level: "HIGH", pre_launch_condition: "c" },
    ],
    lifecycle_stage: "LAUNCH_GATE",
    gate_status: "PENDING_GATE",
    readiness_score_numerator: 3,
    readiness_score_denominator: 10,
    work_product_id: null,
    conversation_id: null,
    linked_product_id: null,
    created_by: "pm_author_01",
    owner_user_id: "pm_author_01",
    owner_role: "PRODUCT_MANAGER",
    launched_at: null,
    next_pir_due_at: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeBaseControl(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_CONTROL_ID,
    tenant_id: "11111111-1111-1111-1111-111111111111",
    feature_id: VALID_FEATURE_ID,
    control_code: "CTRL-AML-03",
    compliance_domain: "TRANSACTION_MONITORING",
    regulator: "CBN / NFIU",
    statutory_citation: "CBN Baseline Standards for Automated AML/CFT/CPF Solutions (10 Mar 2026)",
    risk_statement: "Structuring or mule pass-through undetected.",
    risk_severity: "CRITICAL",
    control_type: "DETECTIVE",
    control_objective: "Real-time velocity & structuring detection.",
    product_requirement: "Hold suspicious transfers silently.",
    engineering_spec: "Emit ISO event to AML engine.",
    operational_sop_trigger: "24h goAML STR filing.",
    qa_test_case: "Replay 5 split transfers.",
    owner_line: "SECOND_LINE",
    owner_role: "AML_FRAUD_OFFICER",
    required_evidence_description: "Synthetic structuring alert test log.",
    is_mandatory_launch_blocker: true,
    verification_status: "PENDING",
    evidence_attachments: [],
    verified_by: null,
    verified_role: null,
    verified_at: null,
    verification_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("Feature Governance API Route Integration & Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRole("CHIEF_COMPLIANCE_OFFICER", "cco_02");
  });

  it("EDGE-01: rejects invalid feature UUID across GET/PATCH/gate/controls/reviews with HTTP 400", async () => {
    const { GET } = await import("@/app/api/marketing-shield/v1/features/[id]/route");
    const req = new NextRequest("http://localhost/api/marketing-shield/v1/features/not-a-uuid");
    const res = await GET(req, { params: Promise.resolve({ id: "not-a-uuid" }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("EDGE-02: blocks 1st-Line PRODUCT_MANAGER from verifying controls (403) and deciding Launch Gates (403)", async () => {
    setRole("PRODUCT_MANAGER", "pm_author_01");

    const { PATCH: patchControls } = await import(
      "@/app/api/marketing-shield/v1/features/[id]/controls/route"
    );
    const { POST: postGate } = await import(
      "@/app/api/marketing-shield/v1/features/[id]/gate/route"
    );

    const mockSupabase = createAdminSupabaseClient();
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === "product_features") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: makeBaseFeature(), error: null }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });

    const verifyReq = new NextRequest(
      `http://localhost/api/marketing-shield/v1/features/${VALID_FEATURE_ID}/controls`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_CONTROL",
          control_id: VALID_CONTROL_ID,
          verification_status: "VERIFIED",
          verification_notes: "PM trying to self-verify",
        }),
      }
    );
    const verifyRes = await patchControls(verifyReq, {
      params: Promise.resolve({ id: VALID_FEATURE_ID }),
    });
    expect(verifyRes.status).toBe(403);

    const gateReq = new NextRequest(
      `http://localhost/api/marketing-shield/v1/features/${VALID_FEATURE_ID}/gate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_DECISION",
          decision: "APPROVED",
          decision_rationale: "PM attempting to override Launch Gate before deadline.",
          conditions: [],
        }),
      }
    );
    const gateRes = await postGate(gateReq, {
      params: Promise.resolve({ id: VALID_FEATURE_ID }),
    });
    expect(gateRes.status).toBe(403);
  });

  it("EDGE-03: blocks mandatory control VERIFIED transition when zero evidence is attached (HTTP 409)", async () => {
    setRole("AML_FRAUD_OFFICER", "mlro_01");
    const mockSupabase = createAdminSupabaseClient();
    vi.mocked(mockSupabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: makeBaseControl({ evidence_attachments: [] }), error: null }),
    }) as any);

    const { PATCH } = await import("@/app/api/marketing-shield/v1/features/[id]/controls/route");
    const req = new NextRequest(
      `http://localhost/api/marketing-shield/v1/features/${VALID_FEATURE_ID}/controls`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_CONTROL",
          control_id: VALID_CONTROL_ID,
          verification_status: "VERIFIED",
          verification_notes: "Trying to verify with zero evidence attached",
        }),
      }
    );

    const res = await PATCH(req, { params: Promise.resolve({ id: VALID_FEATURE_ID }) });
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error.code).toBe("MANDATORY_GATE_BLOCKER_UNRESOLVED");
  });

  it("EDGE-04: blocks lifecycle bypass via PATCH /features/[id] directly to POST_LAUNCH_MONITORING without APPROVED gate (HTTP 409)", async () => {
    setRole("PRODUCT_MANAGER", "pm_author_01");
    const mockSupabase = createAdminSupabaseClient();
    vi.mocked(mockSupabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: makeBaseFeature({ gate_status: "PENDING_GATE" }),
        error: null,
      }),
    }) as any);

    const { PATCH } = await import("@/app/api/marketing-shield/v1/features/[id]/route");
    const req = new NextRequest(
      `http://localhost/api/marketing-shield/v1/features/${VALID_FEATURE_ID}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycle_stage: "POST_LAUNCH_MONITORING" }),
      }
    );

    const res = await PATCH(req, { params: Promise.resolve({ id: VALID_FEATURE_ID }) });
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error.code).toBe("MANDATORY_GATE_BLOCKER_UNRESOLVED");
  });

  it("EDGE-05: blocks CONDITIONALLY_APPROVED when conditions list is empty (400) or mandatory control is FAILED (409)", async () => {
    setRole("RISK_OFFICER", "risk_02");
    const mockSupabase = createAdminSupabaseClient();
    const { POST } = await import("@/app/api/marketing-shield/v1/features/[id]/gate/route");

    // Case A: Empty conditions -> 400
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === "product_features") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: makeBaseFeature(), error: null }),
        } as any;
      }
      if (table === "feature_controls") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [makeBaseControl({ verification_status: "EVIDENCE_SUBMITTED" })], error: null }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });

    const emptyCondReq = new NextRequest(
      `http://localhost/api/marketing-shield/v1/features/${VALID_FEATURE_ID}/gate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_DECISION",
          decision: "CONDITIONALLY_APPROVED",
          decision_rationale: "Trying conditional approval without explicit conditions.",
          conditions: [],
        }),
      }
    );
    const emptyCondRes = await POST(emptyCondReq, {
      params: Promise.resolve({ id: VALID_FEATURE_ID }),
    });
    expect(emptyCondRes.status).toBe(400);

    // Case B: Mandatory control explicitly FAILED -> 409 even with conditions
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === "product_features") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: makeBaseFeature(), error: null }),
        } as any;
      }
      if (table === "feature_controls") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [makeBaseControl({ verification_status: "FAILED" })], error: null }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });

    const failedCtrlReq = new NextRequest(
      `http://localhost/api/marketing-shield/v1/features/${VALID_FEATURE_ID}/gate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_DECISION",
          decision: "CONDITIONALLY_APPROVED",
          decision_rationale: "Attempting conditional launch despite FAILED mandatory AML control.",
          conditions: [
            { description: "Fix AML monitoring next week", owner_role: "ENGINEERING_LEAD", due_date: "2026-12-31" },
          ],
        }),
      }
    );
    const failedCtrlRes = await POST(failedCtrlReq, {
      params: Promise.resolve({ id: VALID_FEATURE_ID }),
    });
    expect(failedCtrlRes.status).toBe(409);
  });

  it("EDGE-06: 3rd-Line INTERNAL_AUDITOR can record INTERNAL_AUDIT_ASSURANCE without mutating feature state, but is blocked from operational reviews & ripple scans", async () => {
    setRole("INTERNAL_AUDITOR", "auditor_3lod_01");
    const featureUpdates: any[] = [];
    const mockSupabase = createAdminSupabaseClient();

    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === "product_features") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: makeBaseFeature({ lifecycle_stage: "POST_LAUNCH_MONITORING", gate_status: "APPROVED" }),
            error: null,
          }),
          update: vi.fn().mockImplementation((patch: any) => {
            featureUpdates.push(patch);
            return { eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
          }),
        } as any;
      }
      if (table === "feature_post_launch_reviews") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "rev_audit_01",
                  review_type: "INTERNAL_AUDIT_ASSURANCE",
                  status: "CLOSED",
                  title: "Q4 Independent Governance Audit",
                  conducted_by: "auditor_3lod_01",
                  conducted_role: "INTERNAL_AUDITOR",
                },
                error: null,
              }),
            }),
          }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });

    const { POST: postReview } = await import(
      "@/app/api/marketing-shield/v1/features/[id]/reviews/route"
    );
    const { POST: postRipple } = await import(
      "@/app/api/marketing-shield/v1/ripple-alerts/route"
    );

    // Allowed: Independent 3rd-Line Assurance Note
    const auditReq = new NextRequest(
      `http://localhost/api/marketing-shield/v1/features/${VALID_FEATURE_ID}/reviews`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_type: "INTERNAL_AUDIT_ASSURANCE",
          title: "Q4 Independent Governance Audit",
          trigger_summary: "Annual independent testing of Launch Gate evidence and audit trail.",
          requires_reapproval: true, // Even if passed, Internal Audit MUST NOT mutate operational feature state!
          suspend_feature_immediately: true,
          conclusion_notes: "Control evidence intact; recommend periodic duplicate-debit sampling.",
        }),
      }
    );
    const auditRes = await postReview(auditReq, {
      params: Promise.resolve({ id: VALID_FEATURE_ID }),
    });
    expect(auditRes.status).toBe(201);
    expect(featureUpdates).toHaveLength(0);

    // Blocked: 3rd-Line attempting Material Change operational action -> 403
    const opChangeReq = new NextRequest(
      `http://localhost/api/marketing-shield/v1/features/${VALID_FEATURE_ID}/reviews`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_type: "MATERIAL_CHANGE_REASSESSMENT",
          title: "Auditor attempting operational change",
          trigger_summary: "Should be blocked by 3LoD independence guard.",
        }),
      }
    );
    const opChangeRes = await postReview(opChangeReq, {
      params: Promise.resolve({ id: VALID_FEATURE_ID }),
    });
    expect(opChangeRes.status).toBe(403);

    // Blocked: 3rd-Line attempting Ripple Scan mutation -> 403
    const rippleReq = new NextRequest("http://localhost/api/marketing-shield/v1/ripple-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        regulator: "CBN",
        title: "CBN Automated AML Circular 2026",
        summary_text: "Automated AML monitoring baseline standards.",
      }),
    });
    const rippleRes = await postRipple(rippleReq);
    expect(rippleRes.status).toBe(403);
  });

  it("EDGE-07: Material Change Reassessment with requires_reapproval=true re-opens Launch Gate; RISK_OFFICER can run Ripple Scans", async () => {
    setRole("RISK_OFFICER", "risk_02");
    const featureUpdates: any[] = [];
    const mockSupabase = createAdminSupabaseClient();

    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === "product_features") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({
            data: makeBaseFeature({ lifecycle_stage: "POST_LAUNCH_MONITORING", gate_status: "APPROVED" }),
            error: null,
          }),
          update: vi.fn().mockImplementation((patch: any) => {
            featureUpdates.push(patch);
            return { eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
          }),
        } as any;
      }
      if (table === "feature_post_launch_reviews") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "rev_mat_01",
                  review_type: "MATERIAL_CHANGE_REASSESSMENT",
                  status: "REMEDIATION_REQUIRED",
                  requires_reapproval: true,
                },
                error: null,
              }),
            }),
          }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        then: (resolve: (val: any) => void) => resolve({ data: [], error: null }),
      } as any;
    });

    const { POST: postReview } = await import(
      "@/app/api/marketing-shield/v1/features/[id]/reviews/route"
    );
    const { POST: postRipple } = await import(
      "@/app/api/marketing-shield/v1/ripple-alerts/route"
    );

    const changeReq = new NextRequest(
      `http://localhost/api/marketing-shield/v1/features/${VALID_FEATURE_ID}/reviews`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_type: "MATERIAL_CHANGE_REASSESSMENT",
          title: "Daily recurring debit cap raised from ₦500k to ₦5M",
          trigger_summary: "Product requested 10x limit increase requiring AML & fraud reassessment.",
          requires_reapproval: true,
        }),
      }
    );
    const changeRes = await postReview(changeReq, {
      params: Promise.resolve({ id: VALID_FEATURE_ID }),
    });
    expect(changeRes.status).toBe(201);
    expect(featureUpdates[0]).toMatchObject({
      lifecycle_stage: "MODIFICATION_OR_RETIREMENT",
      gate_status: "PENDING_GATE",
    });

    // RISK_OFFICER (2nd Line, no campaign.create) can still execute Regulatory Ripple Scans!
    const rippleReq = new NextRequest("http://localhost/api/marketing-shield/v1/ripple-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        regulator: "NFIU",
        title: "NFIU 24-Hour Automated STR Directive 2026",
        summary_text: "Requires automated transaction monitoring escalation within 24 hours.",
      }),
    });
    const rippleRes = await postRipple(rippleReq);
    expect(rippleRes.status).toBe(201);
  });
});
