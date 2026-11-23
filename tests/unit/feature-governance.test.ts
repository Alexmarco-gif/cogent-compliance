/**
 * Cogent Compliance Platform — Full Feature Structuring Pack, Three Lines of Defence RBAC,
 * Interactive Launch Readiness Gate, PIR / Material Change & Feature Regulatory Ripple Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { featureStructuringEngine } from "@/modules/feature-governance/feature-structuring.engine";
import { featureGovernanceService } from "@/modules/feature-governance/feature-governance.service";
import { regulatoryRippleService } from "@/modules/regulatory-vault/regulatory-ripple.service";
import { PRODUCT_STRUCTURING_PACK } from "@/modules/agent-runtime/roles/compliance-officer/packs/product-structuring.pack";
import {
  getPermissionsForRole,
  mapClerkRoleToCanonical,
} from "@/modules/auth-tenancy/permissions";
import {
  assertCanDecideFeatureGate,
  assertThirdLineIndependence,
  hasPermission,
  requirePermission,
} from "@/modules/auth-tenancy/rbac.guard";
import type { CanonicalRole, TenantContext } from "@/modules/auth-tenancy/types";
import type {
  FeatureControlRecord,
  ProductFeatureRecord,
} from "@/contracts/feature-governance.contracts";
import { createAdminSupabaseClient } from "@/lib/supabase";

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
    appendEvent: vi.fn().mockResolvedValue({ id: "audit_feat_001" }),
  },
}));

function makeCtx(role: CanonicalRole, userId: string = "user_01"): TenantContext {
  return {
    tenantId: "11111111-1111-1111-1111-111111111111",
    userId,
    clerkOrgId: "org_fintech_ng",
    clerkUserId: userId,
    orgSlug: "fintech-ng",
    orgName: "Fintech NG Ltd",
    role,
    permissions: getPermissionsForRole(role),
    status: "ACTIVE",
  };
}

describe("Product Feature Governance, Full Structuring Pack & Three Lines of Defence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Full Feature Structuring Pack Engine", () => {
    it("classifies Automated Recurring Payments and generates Multi-Domain RIA, Risk & Control Matrix, Compliance-to-Build specs, and 10-Point Gate", () => {
      const bp = featureStructuringEngine.buildFeatureStructuringBlueprint({
        featureName: "Automated Recurring Payments",
        description:
          "Customers instruct the platform to automatically debit their accounts and transfer money to another bank account on a scheduled date.",
        businessObjective: "Automate standing-order bill & vendor transfers.",
      });

      expect(bp.financial_activity_type).toBe("RECURRING_DEBIT");
      expect(bp.change_classification).toBe("NEW_FEATURE");
      expect(bp.materiality_tier).toBe("HIGH");
      expect(bp.applicable_regulators).toEqual(
        expect.arrayContaining(["CBN", "NFIU", "NDPC", "FCCPC"])
      );
      expect(bp.ria_matrix.length).toBeGreaterThanOrEqual(8);
      expect(
        bp.ria_matrix.some((r) =>
          r.statutory_basis.includes("CBN Baseline Standards for Automated AML/CFT/CPF Solutions")
        )
      ).toBe(true);

      // Risk & Control Matrix covers Preventive, Detective, and Corrective controls
      const types = new Set(bp.controls.map((c) => c.control_type));
      expect(types.has("PREVENTIVE")).toBe(true);
      expect(types.has("DETECTIVE")).toBe(true);
      expect(types.has("CORRECTIVE")).toBe(true);

      // Every control translates full Compliance-to-Build chain
      for (const ctrl of bp.controls) {
        expect(ctrl.product_requirement.length).toBeGreaterThan(10);
        expect(ctrl.engineering_spec.length).toBeGreaterThan(10);
        expect(ctrl.operational_sop_trigger.length).toBeGreaterThan(10);
        expect(ctrl.qa_test_case.length).toBeGreaterThan(10);
      }

      // Prompt context block includes all 4 governance sections
      const xmlBlock = featureStructuringEngine.formatPromptContext(bp);
      expect(xmlBlock).toContain("<deterministic_feature_governance_pack>");
      expect(xmlBlock).toContain("MULTI_DOMAIN_RIA_BASELINE:");
      expect(xmlBlock).toContain("RISK_AND_CONTROL_MATRIX_BASELINE:");
      expect(xmlBlock).toContain("COMPLIANCE_TO_BUILD_TRANSLATION_BASELINE:");
      expect(xmlBlock).toContain("LAUNCH_READINESS_CHECKLIST_10_POINT_GATE:");
    });

    it("classifies USD Virtual Card + BNPL as CRITICAL materiality with lending perimeter controls", () => {
      const bp = featureStructuringEngine.buildFeatureStructuringBlueprint({
        featureName: "USD Virtual Card & BNPL Checkout",
        description:
          "Launch a new product issuing USD virtual cards funded from Naira wallets with 3-month BNPL credit.",
      });

      expect(bp.materiality_tier).toBe("CRITICAL");
      expect(bp.controls.some((c) => c.control_code === "CTRL-CRED-09")).toBe(true);
    });

    it("PRODUCT_STRUCTURING_PACK includes Full Feature Structuring Pack sections while preserving core benchmark sections", () => {
      expect(PRODUCT_STRUCTURING_PACK.displayName).toBe("Full Feature Structuring Pack");
      expect(PRODUCT_STRUCTURING_PACK.systemPromptOverlay).toContain("Risk & Control Matrix");
      expect(PRODUCT_STRUCTURING_PACK.systemPromptOverlay).toContain("Compliance-to-Build Translation Table");
      expect(PRODUCT_STRUCTURING_PACK.systemPromptOverlay).toContain("Launch Readiness Checklist");
      expect(PRODUCT_STRUCTURING_PACK.escalationPolicy.authorizedSignOffRoles).toEqual(
        expect.arrayContaining(["CHIEF_COMPLIANCE_OFFICER", "LEGAL_COUNSEL", "RISK_OFFICER", "AML_FRAUD_OFFICER", "INFOSEC_OFFICER"])
      );
    });
  });

  describe("2. Three Lines of Defence RBAC Enforcement", () => {
    it("denies 1st-Line roles (Product, Engineering, Operations, Marketing) from deciding Launch Gates or verifying controls", () => {
      const firstLineRoles: CanonicalRole[] = [
        "PRODUCT_MANAGER",
        "ENGINEERING_LEAD",
        "OPERATIONS_LEAD",
        "MARKETING_GROWTH",
      ];

      for (const role of firstLineRoles) {
        const ctx = makeCtx(role, `user_${role}`);
        expect(hasPermission(ctx, "feature.read")).toBe(true);
        expect(hasPermission(ctx, "feature.evidence.attach")).toBe(true);
        expect(hasPermission(ctx, "feature.gate.decide")).toBe(false);
        expect(hasPermission(ctx, "feature.control.verify")).toBe(false);
        expect(() => requirePermission(ctx, "feature.gate.decide")).toThrowError(
          expect.objectContaining({ code: "APPROVAL_NOT_PERMITTED", statusCode: 403 })
        );
      }
    });

    it("grants 2nd-Line authorities Launch Gate decision rights while enforcing anti-self-approval", () => {
      const secondLineApprovers: CanonicalRole[] = [
        "CHIEF_COMPLIANCE_OFFICER",
        "LEGAL_COUNSEL",
        "RISK_OFFICER",
        "AML_FRAUD_OFFICER",
        "INFOSEC_OFFICER",
      ];

      for (const role of secondLineApprovers) {
        const approverCtx = makeCtx(role, `approver_${role}`);
        expect(hasPermission(approverCtx, "feature.gate.decide")).toBe(true);
        expect(hasPermission(approverCtx, "feature.control.verify")).toBe(true);
        // Allowed for someone else's feature
        expect(() => assertCanDecideFeatureGate(approverCtx, "pm_author_01")).not.toThrow();
        // Blocked for self-authored feature under dual control
        expect(() => assertCanDecideFeatureGate(approverCtx, `approver_${role}`)).toThrowError(
          expect.objectContaining({ code: "SELF_APPROVAL_VIOLATION", statusCode: 403 })
        );
      }
    });

    it("enforces strict 3rd-Line Internal Audit independence (read + assurance notes only, zero operational/gate authority)", () => {
      const auditorCtx = makeCtx("INTERNAL_AUDITOR", "auditor_01");

      expect(hasPermission(auditorCtx, "feature.read")).toBe(true);
      expect(hasPermission(auditorCtx, "audit.read")).toBe(true);
      expect(hasPermission(auditorCtx, "audit.assurance_note")).toBe(true);

      // Strictly denied operational ownership & approvals
      expect(hasPermission(auditorCtx, "feature.create")).toBe(false);
      expect(hasPermission(auditorCtx, "feature.update")).toBe(false);
      expect(hasPermission(auditorCtx, "feature.control.manage")).toBe(false);
      expect(hasPermission(auditorCtx, "feature.control.verify")).toBe(false);
      expect(hasPermission(auditorCtx, "feature.gate.decide")).toBe(false);

      expect(() => assertThirdLineIndependence(auditorCtx, "feature.create")).toThrowError(
        expect.objectContaining({ code: "THIRD_LINE_INDEPENDENCE_VIOLATION", statusCode: 403 })
      );
      expect(() => assertCanDecideFeatureGate(auditorCtx, "pm_01")).toThrowError(
        expect.objectContaining({ code: "THIRD_LINE_INDEPENDENCE_VIOLATION", statusCode: 403 })
      );
    });

    it("maps Three Lines of Defence Clerk slugs cleanly to canonical roles", () => {
      expect(mapClerkRoleToCanonical("org:risk_officer")).toBe("RISK_OFFICER");
      expect(mapClerkRoleToCanonical("mlro")).toBe("AML_FRAUD_OFFICER");
      expect(mapClerkRoleToCanonical("ciso")).toBe("INFOSEC_OFFICER");
      expect(mapClerkRoleToCanonical("internal_auditor")).toBe("INTERNAL_AUDITOR");
      expect(mapClerkRoleToCanonical("product_manager")).toBe("PRODUCT_MANAGER");
      expect(mapClerkRoleToCanonical("engineering_lead")).toBe("ENGINEERING_LEAD");
      expect(mapClerkRoleToCanonical("operations_lead")).toBe("OPERATIONS_LEAD");
    });
  });

  describe("3. Interactive Launch Readiness Gate & Non-Overridable Blockers", () => {
    const featureId = "22222222-2222-2222-2222-222222222222";
    const bp = featureStructuringEngine.buildFeatureStructuringBlueprint({
      featureName: "Automated Recurring Payments",
      description: "Automated recurring debits to external Nigerian bank accounts.",
      businessObjective: "Automate bill payments.",
    });

    const mockFeature: ProductFeatureRecord = {
      id: featureId,
      tenant_id: "11111111-1111-1111-1111-111111111111",
      feature_code: bp.feature_code,
      feature_name: bp.feature_name,
      summary: "Automated recurring debits to external Nigerian bank accounts.",
      business_objective: "Automate bill payments.",
      financial_activity_type: "RECURRING_DEBIT",
      change_classification: "NEW_FEATURE",
      materiality_tier: "HIGH",
      target_market: "INDIVIDUALS_AND_BUSINESSES",
      revenue_model: "₦50 per debit",
      third_party_dependencies: ["NIBSS NIP"],
      applicable_regulators: bp.applicable_regulators,
      regulatory_domains: bp.regulatory_domains,
      ria_matrix: bp.ria_matrix,
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
    };

    function buildControls(verified: boolean): FeatureControlRecord[] {
      return bp.controls.map((c, idx) => ({
        ...c,
        id: `33333333-3333-3333-3333-33333333330${idx}`,
        tenant_id: mockFeature.tenant_id,
        feature_id: featureId,
        verification_status: verified ? "VERIFIED" : "PENDING",
        evidence_attachments: verified
          ? [
              {
                id: `ev_${idx}`,
                title: `Test Evidence ${c.control_code}`,
                evidence_type: "TEST_LOG",
                reference_url_or_key: `r2://evidence/${c.control_code}.pdf`,
                submitted_by: "eng_01",
                submitted_role: "ENGINEERING_LEAD",
                submitted_at: new Date().toISOString(),
                sha256_hash: "a".repeat(64),
              },
            ]
          : [],
        verified_by: verified ? "cco_01" : null,
        verified_role: verified ? "CHIEF_COMPLIANCE_OFFICER" : null,
        verified_at: verified ? new Date().toISOString() : null,
        verification_notes: verified ? "Verified in staging" : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    it("hard-blocks unconditional APPROVED when mandatory controls are unverified", async () => {
      const unverifiedControls = buildControls(false);
      const mockSupabase = createAdminSupabaseClient();
      vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
        if (table === "product_features") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockFeature, error: null }),
          } as any;
        }
        if (table === "feature_controls") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: unverifiedControls, error: null }),
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      });

      const ccoCtx = makeCtx("CHIEF_COMPLIANCE_OFFICER", "cco_approver_02");

      await expect(
        featureGovernanceService.handleLaunchGate(ccoCtx, featureId, {
          action: "RECORD_DECISION",
          decision: "APPROVED",
          decision_rationale: "Attempting launch approval before control verification.",
          conditions: [],
        })
      ).rejects.toThrow(/Unconditional Launch Approval blocked/i);
    });

    it("seals unconditional APPROVED with 10/10 score once all mandatory controls have evidence & 2nd-line verification", async () => {
      const verifiedControls = buildControls(true);
      const insertedGates: any[] = [];
      const mockSupabase = createAdminSupabaseClient();
      vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
        if (table === "product_features") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockFeature, error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          } as any;
        }
        if (table === "feature_controls") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: verifiedControls, error: null }),
          } as any;
        }
        if (table === "feature_readiness_gates") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: insertedGates, error: null }),
            insert: vi.fn().mockImplementation((row: any) => {
              insertedGates.push({ id: "gate_01", ...row, created_at: new Date().toISOString() });
              return Promise.resolve({ error: null });
            }),
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      });

      const ccoCtx = makeCtx("CHIEF_COMPLIANCE_OFFICER", "cco_approver_02");
      const res = await featureGovernanceService.handleLaunchGate(ccoCtx, featureId, {
        action: "RECORD_DECISION",
        decision: "APPROVED",
        decision_rationale: "All 9 pre-launch readiness checks and mandatory controls verified.",
        conditions: [],
      });

      expect(insertedGates).toHaveLength(1);
      expect(insertedGates[0].decision).toBe("APPROVED");
      expect(insertedGates[0].readiness_score_numerator).toBe(10);
      expect(insertedGates[0].snapshot_hash_sha256).toHaveLength(64);
      expect(res.readiness.numerator).toBe(10);
    });
  });

  describe("4. Regulatory Ripple Engine -> Live Features, Controls & 3LoD Owners", () => {
    it("maps CBN March 10, 2026 Automated AML Baseline Standards onto live features, AML controls & accountable owners", async () => {
      const mockSupabase = createAdminSupabaseClient();
      const updatedControls: any[] = [];
      vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
        if (table === "campaign_products" || table === "marketing_campaigns") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            then: (resolve: (val: any) => void) => resolve({ data: [], error: null }),
          } as any;
        }
        if (table === "product_features") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "feat_rec_01",
                  feature_code: "NPA-REC-AUTO-101",
                  feature_name: "Automated Recurring Payments",
                  financial_activity_type: "RECURRING_DEBIT",
                  lifecycle_stage: "POST_LAUNCH_MONITORING",
                  applicable_regulators: ["CBN", "NFIU", "NDPC", "FCCPC"],
                  regulatory_domains: ["AML_CFT_CPF", "TRANSACTION_MONITORING", "SANCTIONS"],
                  owner_role: "PRODUCT_MANAGER",
                },
              ],
              error: null,
            }),
          } as any;
        }
        if (table === "feature_controls") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockImplementation((patch: any) => {
              updatedControls.push(patch);
              return {
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    in: vi.fn().mockResolvedValue({ error: null }),
                  }),
                }),
              };
            }),
            then: (resolve: (val: any) => void) =>
              resolve({
                data: [
                  {
                    id: "ctrl_aml_03",
                    control_code: "CTRL-AML-03",
                    compliance_domain: "TRANSACTION_MONITORING",
                    regulator: "CBN / NFIU",
                    owner_role: "AML_FRAUD_OFFICER",
                    control_objective: "Automated AML transaction monitoring",
                    verification_status: "VERIFIED",
                  },
                  {
                    id: "ctrl_aud_08",
                    control_code: "CTRL-AUD-08",
                    compliance_domain: "RECORD_KEEPING",
                    regulator: "CBN / NFIU",
                    owner_role: "ENGINEERING_LEAD",
                    control_objective: "5-year audit trail retention",
                    verification_status: "VERIFIED",
                  },
                ],
                error: null,
              }),
          } as any;
        }
        if (table === "regulatory_ripple_alerts") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() =>
                  Promise.resolve({ data: null, error: null })
                ),
              }),
            }),
          } as any;
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "conv_ripple_01" }, error: null }),
            }),
          }),
        } as any;
      });

      const alerts = await regulatoryRippleService.scanTenantForCircularRipple(
        "11111111-1111-1111-1111-111111111111",
        {
          regulator: "CBN",
          title: "CBN Baseline Standards for Automated AML/CFT/CPF Solutions (March 10, 2026)",
          summaryText:
            "Requires automated detection and 24-hour NFIU goAML reporting of suspicious transactions with 18/24 month rollout.",
        }
      );

      expect(alerts).toHaveLength(1);
      const alert = alerts[0]!;
      expect(alert.impacted_feature_id).toBe("feat_rec_01");
      expect(alert.impacted_feature_name).toBe("Automated Recurring Payments");
      expect(alert.impacted_control_codes).toEqual(["CTRL-AML-03", "CTRL-AUD-08"]);
      expect(alert.impacted_owner_roles).toEqual(
        expect.arrayContaining(["PRODUCT_MANAGER", "AML_FRAUD_OFFICER", "ENGINEERING_LEAD", "CHIEF_COMPLIANCE_OFFICER"])
      );
      expect(alert.severity).toBe("CRITICAL");
      expect(updatedControls.some((u) => u.verification_status === "REASSESSMENT_REQUIRED")).toBe(true);
    });
  });
});
