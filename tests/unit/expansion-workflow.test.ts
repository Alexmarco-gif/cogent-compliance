/**
 * Unit Tests for Cross-Border Expansion Operating System (Stages 1–8)
 *
 * Verifies:
 *   1. Jurisdiction Blueprints (Ghana BoG Act 987/1044/843, Kenya CBK NPS/POCAMLA/DPA, Open-World fallback)
 *   2. Core 13 Compliance Artefacts completeness
 *   3. Deterministic 6-Question CCO Go-Live Readiness Gate evaluator (blocked vs. eligible states)
 *   4. Three Lines of Defense Go-Live Approval RBAC gate (Internal Audit blocked, Marketing blocked, CCO/Committee/Board allowed)
 *   5. Zod schema validation across all 8 stages
 */

import { describe, expect, it } from "vitest";
import {
  buildJurisdictionBlueprint,
  computeRiskRating,
  CORE_13_ARTEFACT_DEFINITIONS,
} from "@/modules/expansions/expansion-blueprints";
import { expansionWorkflowService } from "@/modules/expansions/expansion-workflow.service";
import {
  createExpansionSchema,
  EXPANSION_STAGE_META,
  goLiveGateActionSchema,
  localisationActionSchema,
  type ExpansionArtefactRecord,
  type ExpansionCountryRoleRecord,
  type ExpansionObligationRecord,
  type ExpansionPolicyLocalisationRecord,
  type ExpansionProgramRecord,
  type ExpansionReportingItemRecord,
  type ExpansionRiskRecord,
  type ExpansionValidationTestRecord,
  type ExpansionWorkstreamRecord,
} from "@/contracts/expansion.contracts";
import { assertExpansionGoLiveAuthority } from "@/modules/auth-tenancy/rbac.guard";
import { getPermissionsForRole } from "@/modules/auth-tenancy/permissions";
import type { CanonicalRole, TenantContext } from "@/modules/auth-tenancy/types";

function makeTenantContext(role: CanonicalRole): TenantContext {
  return {
    tenantId: "11111111-1111-1111-1111-111111111111",
    userId: "user_test_001",
    clerkOrgId: "org_test_001",
    clerkUserId: "user_test_001",
    orgSlug: "stem-fintech",
    orgName: "Stem Fintech Ltd",
    role,
    permissions: getPermissionsForRole(role),
    status: "ACTIVE",
  };
}

describe("Cross-Border Expansion OS (Stages 1–8)", () => {
  it("defines all 8 canonical cross-border stages and 13 core compliance artefacts", () => {
    expect(EXPANSION_STAGE_META).toHaveLength(8);
    expect(EXPANSION_STAGE_META.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(CORE_13_ARTEFACT_DEFINITIONS).toHaveLength(13);
  });

  it("seeds Ghana (GH) blueprint with BoG Act 987, AML Act 1044, DPC Act 843, 8 localisation pillars, 10 workstreams, and 7 validation tests", () => {
    const gh = buildJurisdictionBlueprint("GH", "NG", "PAYMENTS");
    expect(gh.jurisdictionCode).toBe("GH");
    expect(gh.countryName).toBe("Ghana");
    expect(gh.primaryRegulators.some((r) => r.includes("Bank of Ghana"))).toBe(true);
    expect(gh.obligations.length).toBeGreaterThanOrEqual(6);
    expect(gh.obligations.some((o) => o.statute_reference.includes("Act 987"))).toBe(true);
    expect(gh.localisations).toHaveLength(8);
    expect(gh.workstreams).toHaveLength(10);
    expect(gh.validationTests).toHaveLength(7);
    expect(gh.reportingCalendar.length).toBeGreaterThanOrEqual(4);
  });

  it("seeds Kenya (KE) blueprint with CBK NPS Regulations, Trust Account rules, POCAMLA, and ODPC DPA 2019", () => {
    const ke = buildJurisdictionBlueprint("Kenya", "NG", "REMITTANCE");
    expect(ke.jurisdictionCode).toBe("KE");
    expect(ke.countryName).toBe("Kenya");
    expect(ke.obligations.some((o) => o.obligation_title.includes("Trust Account"))).toBe(true);
    expect(ke.localisations).toHaveLength(8);
    expect(ke.workstreams).toHaveLength(10);
    expect(ke.validationTests).toHaveLength(7);
  });

  it("Evaluates the 6 CCO Go-Live Readiness Questions deterministically and blocks launch when evidence is incomplete", () => {
    const program: ExpansionProgramRecord = {
      id: "22222222-2222-2222-2222-222222222222",
      tenant_id: "11111111-1111-1111-1111-111111111111",
      program_ref_no: "EXP-NG-GH-001",
      title: "NG → Ghana Expansion",
      home_jurisdiction: "NG",
      target_jurisdiction: "GH",
      target_country_name: "Ghana",
      primary_regulators: ["Bank of Ghana (BoG)"],
      product_scope: "PAYMENTS",
      operating_model: "UNDECIDED",
      operating_model_rationale: null,
      current_stage: "MARKET_ENTRY_ASSESSMENT",
      status: "ACTIVE",
      risk_appetite_statement: "Strict BoG compliance",
      prohibited_activities: [],
      target_launch_date: null,
      source_work_product_id: null,
      go_live_approved_at: null,
      go_live_approved_by: null,
      go_live_approval_hash: null,
      readiness_score: 0,
      executive_summary: null,
      metadata: {},
      created_by: "user_1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const blockedReport = expansionWorkflowService.evaluateReadiness({
      program,
      obligations: [],
      localisations: [],
      risks: [],
      workstreams: [],
      validationTests: [],
      reportingCalendar: [],
      countryRoles: [],
      artefacts: [],
    });

    expect(blockedReport.go_live_eligible).toBe(false);
    expect(blockedReport.hard_blocker_count).toBeGreaterThan(0);
    expect(blockedReport.questions).toHaveLength(6);
    expect(blockedReport.questions[0]?.status).toBe("BLOCKED");
  });

  it("Marks all 6 CCO Go-Live Readiness Questions as PASS when licensing, local policies, P0 workstreams, Country MLRO, validation tests, and reporting calendar are complete", () => {
    const now = new Date().toISOString();
    const program: ExpansionProgramRecord = {
      id: "22222222-2222-2222-2222-222222222222",
      tenant_id: "11111111-1111-1111-1111-111111111111",
      program_ref_no: "EXP-NG-GH-001",
      title: "NG → Ghana Expansion",
      home_jurisdiction: "NG",
      target_jurisdiction: "GH",
      target_country_name: "Ghana",
      primary_regulators: ["Bank of Ghana (BoG)"],
      product_scope: "PAYMENTS",
      operating_model: "DIRECT_LICENSE",
      operating_model_rationale: "BoG Enhanced PSP Licence obtained",
      current_stage: "PRE_LAUNCH_VALIDATION",
      status: "GO_LIVE_PENDING",
      risk_appetite_statement: "Strict BoG compliance",
      prohibited_activities: [],
      target_launch_date: null,
      source_work_product_id: null,
      go_live_approved_at: null,
      go_live_approved_by: null,
      go_live_approval_hash: null,
      readiness_score: 0,
      executive_summary: null,
      metadata: {},
      created_by: "user_1",
      created_at: now,
      updated_at: now,
    };

    const obligations: ExpansionObligationRecord[] = [
      {
        id: "33333333-3333-3333-3333-333333333333",
        tenant_id: program.tenant_id,
        expansion_id: program.id,
        stage_category: "LICENSING",
        regulator: "Bank of Ghana",
        statute_reference: "Act 987 § 8",
        obligation_title: "BoG PSP Licence",
        obligation_summary: "Obtain BoG PSP Licence",
        gap_status: "COMPLIANT",
        licensing_status: "APPROVED",
        is_mandatory_for_go_live: true,
        owner_department: "Regulatory Affairs",
        owner_name: "Kwame Mensah",
        due_date: null,
        evidence_ref: "BOG-LIC-2026-009",
        source_url: null,
        linked_policy_id: null,
        notes: null,
        created_at: now,
        updated_at: now,
      },
    ];

    const localisations: ExpansionPolicyLocalisationRecord[] = [
      {
        id: "44444444-4444-4444-4444-444444444444",
        tenant_id: program.tenant_id,
        expansion_id: program.id,
        compliance_area: "AML_CFT",
        area_title: "Local AML/CFT Policy",
        local_requirements_summary: "Act 1044",
        gap_summary: "Resolved",
        group_policy_id: null,
        local_policy_id: "55555555-5555-5555-5555-555555555555",
        localisation_status: "PUBLISHED",
        owner_name: "Ama Osei",
        due_date: null,
        created_at: now,
        updated_at: now,
      },
    ];

    const risks: ExpansionRiskRecord[] = [
      {
        id: "66666666-6666-6666-6666-666666666666",
        tenant_id: program.tenant_id,
        expansion_id: program.id,
        risk_category: "MONEY_LAUNDERING",
        risk_title: "Corridor Structuring",
        risk_description: "Structuring below GHS 50k",
        inherent_likelihood: 4,
        inherent_impact: 5,
        inherent_rating: computeRiskRating(4, 5),
        appetite_decision: "MITIGATE",
        mitigation_plan: "Ghana Card + velocity caps",
        residual_likelihood: 2,
        residual_impact: 2,
        residual_rating: computeRiskRating(2, 2),
        status: "MITIGATED",
        owner_name: "Ama Osei",
        accepted_by: null,
        accepted_at: null,
        created_at: now,
        updated_at: now,
      },
    ];

    const workstreams: ExpansionWorkstreamRecord[] = [
      {
        id: "77777777-7777-7777-7777-777777777777",
        tenant_id: program.tenant_id,
        expansion_id: program.id,
        workstream_code: "WS-01",
        title: "Engineering Controls",
        description: "Configure KYC & Sanctions",
        stage: "CONTROL_IMPLEMENTATION",
        responsible_team: "ENGINEERING",
        priority: "P0",
        status: "VERIFIED",
        control_specification: "Synchronous screening",
        expected_evidence: "UAT Report",
        completion_evidence_ref: "UAT-GH-001",
        owner_name: null,
        due_date: null,
        verified_by: "user_1",
        verified_at: now,
        created_at: now,
        updated_at: now,
      },
      {
        id: "77777777-7777-7777-7777-777777777778",
        tenant_id: program.tenant_id,
        expansion_id: program.id,
        workstream_code: "WS-02",
        title: "Staff Training",
        description: "Train Ghana ops team",
        stage: "PRE_LAUNCH_VALIDATION",
        responsible_team: "HR_TRAINING",
        priority: "P1",
        status: "VERIFIED",
        control_specification: "100% completion",
        expected_evidence: "Training Log",
        completion_evidence_ref: "TRN-GH-001",
        owner_name: null,
        due_date: null,
        verified_by: "user_1",
        verified_at: now,
        created_at: now,
        updated_at: now,
      },
    ];

    const validationTests: ExpansionValidationTestRecord[] = [
      {
        id: "88888888-8888-8888-8888-888888888888",
        tenant_id: program.tenant_id,
        expansion_id: program.id,
        test_category: "SANCTIONS_SCREENING",
        test_name: "Sanctions Block Test",
        test_objective: "Block OFAC/FIC hits",
        is_critical_gate: true,
        status: "PASSED",
        evidence_ref: "TST-001",
        actual_result: "Blocked 100% of test hits",
        remediation_log: null,
        tested_by: "user_1",
        tested_at: now,
        verified_by: "user_1",
        verified_at: now,
        created_at: now,
        updated_at: now,
      },
    ];

    const reportingCalendar: ExpansionReportingItemRecord[] = [
      {
        id: "99999999-9999-9999-9999-999999999999",
        tenant_id: program.tenant_id,
        expansion_id: program.id,
        regulator: "FIC Ghana",
        report_name: "24h STR Filing",
        frequency: "AS_REQUIRED",
        submission_channel: "FIC goAML",
        statutory_reference: "Act 1044",
        owner_name: "Ama Osei",
        next_due_date: "2027-01-15",
        last_submitted_at: null,
        last_submission_ref: null,
        status: "SCHEDULED",
        notes: null,
        created_at: now,
        updated_at: now,
      },
    ];

    const countryRoles: ExpansionCountryRoleRecord[] = [
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        tenant_id: program.tenant_id,
        expansion_id: program.id,
        jurisdiction_code: "GH",
        governance_role: "COUNTRY_COMPLIANCE_OFFICER",
        assignee_user_id: null,
        assignee_name: "Ama Osei (Ghana CCO & MLRO)",
        assignee_email: "ama@example.com",
        entity_or_partner: "Stem Ghana Ltd",
        fit_and_proper_status: "APPROVED",
        appointed_at: now,
        notes: null,
        created_at: now,
        updated_at: now,
      },
    ];

    const artefacts: ExpansionArtefactRecord[] = [];

    const readyReport = expansionWorkflowService.evaluateReadiness({
      program,
      obligations,
      localisations,
      risks,
      workstreams,
      validationTests,
      reportingCalendar,
      countryRoles,
      artefacts,
    });

    expect(readyReport.go_live_eligible).toBe(true);
    expect(readyReport.hard_blocker_count).toBe(0);
    expect(readyReport.overall_score).toBe(100);
    expect(readyReport.questions.every((q) => q.status === "PASS")).toBe(true);
  });

  it("Enforces Three Lines of Defense independence on the Go-Live Gate (Internal Audit & Marketing blocked; CCO & Board permitted)", () => {
    const auditCtx = makeTenantContext("INTERNAL_AUDIT");
    expect(() => assertExpansionGoLiveAuthority(auditCtx)).toThrow(
      /Internal Audit \(3rd Line\) is strictly advisory-only/,
    );

    const marketingCtx = makeTenantContext("MARKETING_GROWTH");
    expect(() => assertExpansionGoLiveAuthority(marketingCtx)).toThrow(
      /not authorized to issue formal Cross-Border Go-Live approval/,
    );

    const ccoCtx = makeTenantContext("CHIEF_COMPLIANCE_OFFICER");
    expect(assertExpansionGoLiveAuthority(ccoCtx)).toBe("CHIEF_COMPLIANCE_OFFICER");

    const boardCtx = makeTenantContext("BOARD_MEMBER");
    expect(assertExpansionGoLiveAuthority(boardCtx)).toBe("BOARD_MEMBER");
  });

  it("Validates Zod schemas for creating expansion programs, spawning local policies, and submitting Go-Live Gate decisions", () => {
    const parsedCreate = createExpansionSchema.parse({
      target_jurisdiction: "GH",
      product_scope: "REMITTANCE",
      operating_model: "PARTNER_LED",
    });
    expect(parsedCreate.home_jurisdiction).toBe("NG");
    expect(parsedCreate.auto_populate_blueprint).toBe(true);

    const parsedSpawn = localisationActionSchema.parse({
      action: "SPAWN_LOCAL_POLICY",
      localisation_id: "44444444-4444-4444-4444-444444444444",
    });
    expect(parsedSpawn.action).toBe("SPAWN_LOCAL_POLICY");

    const parsedGate = goLiveGateActionSchema.parse({
      action: "SUBMIT_DECISION",
      decision: "APPROVED_FOR_LAUNCH",
      conditions_or_notes: "All 6 CCO readiness questions verified.",
    });
    expect(parsedGate.action).toBe("SUBMIT_DECISION");
  });

  it("Edge Case: Submitting a licence application (SUBMITTED / UNDER_REVIEW) does NOT pass CCO Question 2 (Approvals Obtained)", () => {
    const now = new Date().toISOString();
    const program: ExpansionProgramRecord = {
      id: "22222222-2222-2222-2222-222222222222",
      tenant_id: "11111111-1111-1111-1111-111111111111",
      program_ref_no: "EXP-NG-GH-002",
      title: "NG → Ghana Remittance",
      home_jurisdiction: "NG",
      target_jurisdiction: "GH",
      target_country_name: "Ghana",
      primary_regulators: ["Bank of Ghana (BoG)"],
      product_scope: "REMITTANCE",
      operating_model: "DIRECT_LICENSE",
      operating_model_rationale: null,
      current_stage: "LICENSING_AUTHORISATION",
      status: "ACTIVE",
      risk_appetite_statement: null,
      prohibited_activities: [],
      target_launch_date: null,
      source_work_product_id: null,
      go_live_approved_at: null,
      go_live_approved_by: null,
      go_live_approval_hash: null,
      readiness_score: 0,
      executive_summary: null,
      metadata: {},
      created_by: "user_1",
      created_at: now,
      updated_at: now,
    };

    const submittedOnlyObligation: ExpansionObligationRecord = {
      id: "33333333-3333-3333-3333-333333333333",
      tenant_id: program.tenant_id,
      expansion_id: program.id,
      stage_category: "LICENSING",
      regulator: "Bank of Ghana",
      statute_reference: "Act 987 § 8",
      obligation_title: "BoG DEMI Licence Application",
      obligation_summary: "Obtain BoG authorisation",
      gap_status: "PARTIAL_GAP",
      licensing_status: "SUBMITTED",
      is_mandatory_for_go_live: true,
      owner_department: "Regulatory Affairs",
      owner_name: null,
      due_date: null,
      evidence_ref: "APP-2026-101",
      source_url: null,
      linked_policy_id: null,
      notes: null,
      created_at: now,
      updated_at: now,
    };

    const report = expansionWorkflowService.evaluateReadiness({
      program,
      obligations: [submittedOnlyObligation],
      localisations: [],
      risks: [],
      workstreams: [],
      validationTests: [],
      reportingCalendar: [],
      countryRoles: [],
      artefacts: [],
    });

    const q2 = report.questions.find((q) => q.key === "APPROVALS_OBTAINED");
    expect(q2?.status).toBe("BLOCKED");
    expect(q2?.blockers[0]).toMatch(/submitting an application does not authorise operations/i);
  });

  it("Edge Case: Open CRITICAL residual risk, FAILED validation test, or OVERDUE statutory return deterministically blocks Go-Live", () => {
    const now = new Date().toISOString();
    const program: ExpansionProgramRecord = {
      id: "22222222-2222-2222-2222-222222222222",
      tenant_id: "11111111-1111-1111-1111-111111111111",
      program_ref_no: "EXP-NG-KE-001",
      title: "NG → Kenya Expansion",
      home_jurisdiction: "NG",
      target_jurisdiction: "KE",
      target_country_name: "Kenya",
      primary_regulators: ["Central Bank of Kenya (CBK)"],
      product_scope: "PAYMENTS",
      operating_model: "PARTNER_LED",
      operating_model_rationale: null,
      current_stage: "PRE_LAUNCH_VALIDATION",
      status: "ACTIVE",
      risk_appetite_statement: "CBK Trust Account compliance",
      prohibited_activities: [],
      target_launch_date: null,
      source_work_product_id: null,
      go_live_approved_at: null,
      go_live_approved_by: null,
      go_live_approval_hash: null,
      readiness_score: 0,
      executive_summary: null,
      metadata: {},
      created_by: "user_1",
      created_at: now,
      updated_at: now,
    };

    const report = expansionWorkflowService.evaluateReadiness({
      program,
      obligations: [
        {
          id: "33333333-3333-3333-3333-333333333333",
          tenant_id: program.tenant_id,
          expansion_id: program.id,
          stage_category: "PARTNER_APPROVAL",
          regulator: "CBK",
          statute_reference: "NPS Reg 12",
          obligation_title: "Partner Approval",
          obligation_summary: "Approved",
          gap_status: "COMPLIANT",
          licensing_status: "APPROVED",
          is_mandatory_for_go_live: true,
          owner_department: "Legal",
          owner_name: null,
          due_date: null,
          evidence_ref: null,
          source_url: null,
          linked_policy_id: null,
          notes: null,
          created_at: now,
          updated_at: now,
        },
      ],
      localisations: [],
      risks: [
        {
          id: "66666666-6666-6666-6666-666666666666",
          tenant_id: program.tenant_id,
          expansion_id: program.id,
          risk_category: "SANCTIONS",
          risk_title: "Unscreened Beneficiaries",
          risk_description: "No sanctions block",
          inherent_likelihood: 5,
          inherent_impact: 5,
          inherent_rating: "CRITICAL",
          appetite_decision: "PROHIBIT",
          mitigation_plan: "Pending",
          residual_likelihood: 4,
          residual_impact: 5,
          residual_rating: "CRITICAL",
          status: "OPEN",
          owner_name: null,
          accepted_by: null,
          accepted_at: null,
          created_at: now,
          updated_at: now,
        },
      ],
      workstreams: [],
      validationTests: [
        {
          id: "88888888-8888-8888-8888-888888888888",
          tenant_id: program.tenant_id,
          expansion_id: program.id,
          test_category: "KYC_VERIFICATION",
          test_name: "IPRS ID Test",
          test_objective: "Reject invalid IDs",
          is_critical_gate: true,
          status: "FAILED",
          evidence_ref: null,
          actual_result: "Accepted expired ID",
          remediation_log: "Fixing regex",
          tested_by: "user_1",
          tested_at: now,
          verified_by: null,
          verified_at: null,
          created_at: now,
          updated_at: now,
        },
      ],
      reportingCalendar: [
        {
          id: "99999999-9999-9999-9999-999999999999",
          tenant_id: program.tenant_id,
          expansion_id: program.id,
          regulator: "CBK",
          report_name: "Monthly Trust Return",
          frequency: "MONTHLY",
          submission_channel: "CBK Portal",
          statutory_reference: "NPS Reg 14",
          owner_name: null,
          next_due_date: "2026-01-10",
          last_submitted_at: null,
          last_submission_ref: null,
          status: "OVERDUE",
          notes: null,
          created_at: now,
          updated_at: now,
        },
      ],
      countryRoles: [],
      artefacts: [],
    });

    expect(report.go_live_eligible).toBe(false);
    expect(report.questions.find((q) => q.key === "CONTROLS_IMPLEMENTED")?.status).toBe("BLOCKED");
    expect(report.questions.find((q) => q.key === "CONTROLS_PROVEN_EFFECTIVE")?.status).toBe("BLOCKED");
    expect(report.questions.find((q) => q.key === "MONITORING_REPORTING_ACTIVE")?.status).toBe("BLOCKED");

    const dossier = expansionWorkflowService.compileReadinessDossierMarkdown({
      program,
      readiness: report,
      country_roles: [],
      obligations: [],
      policy_localisations: [],
      risks: [],
      workstreams: [],
      validation_tests: [],
      go_live_gates: [],
      reporting_calendar: [],
      incidents: [],
      regulatory_changes: [],
      artefacts: [],
    });
    expect(dossier).toContain("CROSS-BORDER COMPLIANCE READINESS & GO-LIVE DOSSIER");
    expect(dossier).toContain("EXP-NG-KE-001");
  });

  it("Scenario: Open-World country blueprint dynamically synthesizes full 8-stage seed for non-preset countries (e.g., Tanzania, Singapore, Brazil)", () => {
    for (const country of ["Tanzania", "SG", "Brazil"]) {
      const bp = buildJurisdictionBlueprint(country, "NG", "E_MONEY_WALLET");
      expect(bp.obligations.length).toBeGreaterThanOrEqual(5);
      expect(bp.localisations).toHaveLength(8);
      expect(bp.workstreams).toHaveLength(10);
      expect(bp.validationTests).toHaveLength(7);
      expect(bp.reportingCalendar.length).toBeGreaterThanOrEqual(3);
    }

    expect(computeRiskRating(1, 2)).toBe("LOW");
    expect(computeRiskRating(2, 3)).toBe("MEDIUM");
    expect(computeRiskRating(3, 4)).toBe("HIGH");
    expect(computeRiskRating(4, 5)).toBe("CRITICAL");
  });
});

