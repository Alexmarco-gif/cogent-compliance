/**
 * Cogent Compliance OS — Policy Compiler, Draft New Policy Pack & Post-Draft Statutory QA Gate Tests
 */

import { describe, it, expect, vi } from "vitest";
import { policyCompilerService } from "@/modules/policies/policy-compiler.service";
import { policyQaService } from "@/modules/policies/policy-qa.service";
import { classifyComplianceTurnIntent } from "@/modules/agent-runtime/intent-router";
import {
  agentRoleRegistry,
  COMPLIANCE_OFFICER_ROLE_ID,
} from "@/modules/agent-runtime";
import { STATUTORY_TOOL_DECLARATIONS } from "@/modules/ai-orchestration/tools/statutory-tools";

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}));

const SAMPLE_REDLINE_MARKDOWN = `# Know Your Customer (KYC) & AML/CFT/CPF Policy Redline Package

**Decision:** REJECT — Immediate Withdrawal and Replacement Required

## Section 1 — Application and Drafting Basis
Applies to all Tier 1–3 customer wallets, onboarding workflows, and transaction monitoring operations conducted under the institution's CBN PSP/MFB license.

## Section 2 — Policy Gap Redline Matrix

#### Customer Onboarding & Identity Verification
| Clause Reference | Current Non-Compliant Text | Specific Statutory Breach | Exact Compliant Replacement Text | Statutory Floor & Governing Authority |
| --- | --- | --- | --- | --- |
| 2.1 | Customers may open Tier 1 wallets with phone number only and supply BVN within 30 days. | Violates mandatory Day-0 electronic BVN/NIN validation requirement. | Every customer must complete automated electronic BVN or NIN verification prior to wallet creation or account activation; the onboarding API shall hard-block activation until verification succeeds. | CBN Circular PSM/DIR/PUB/CIR/001/053 (1 Dec 2023) |
| 2.2 | KYC and transaction logs shall be retained for 2 years. | Falls below mandatory 5-year NFIU retention statutory floor. | All customer due diligence, KYC, STR, and transaction records must be retained in immutable storage for a minimum of five (5) years following transaction completion or account closure. | MLPPA 2022 Section 8 (NFIU) |

#### Data Breach & Incident Reporting
| Clause Reference | Current Non-Compliant Text | Specific Statutory Breach | Exact Compliant Replacement Text | Statutory Floor & Governing Authority |
| --- | --- | --- | --- | --- |
| 3.1 | Personal data breaches will be reported to NDPC within 14 business days. | Exceeds statutory 72-hour breach notification ceiling. | The Data Protection Officer shall notify the Nigeria Data Protection Commission (NDPC) within 72 hours of becoming aware of any personal data breach likely to result in risk to data subjects. | NDPA 2023 Section 40 & NDPC GAID 2025 |

## Section 3 — Mandatory Statutory Timing & Operational Clock Register

| Operational Event / Trigger | Binding Statutory Timing / SLA | Governing Legal Basis |
| --- | --- | --- |
| Suspicious Transaction Report (STR) Filing | Within 24 hours (zero monetary threshold) | MLPPA 2022 Section 7 (NFIU) |
| Personal Data Breach Notice to NDPC | Within 72 hours of awareness | NDPA 2023 Section 40 |
| Customer Complaint Acknowledgement | Within 24 hours | CBN CPR 2019 Regs. 6.2.2 & 6.3.2 |

## Section 4 — Additional Governance Clauses Required

### 4.1 Exceptions, Escalation & Periodic Review
Any exception to this policy requires documented Risk Management and Chief Compliance Officer sign-off with a fixed expiry date. Unapproved exceptions constitute reportable control failures. This policy shall undergo mandatory annual review.

## Section 5 — Prioritized Remediation & Implementation Schedule

| Priority | Mandatory Remediation Action | Accountable Owner | Target / Statutory Deadline |
| --- | --- | --- | --- |
| P0 | Disable 30-day BVN deferral flag in onboarding API and enforce Day-0 electronic validation | CTO / Technology Lead | Immediate (24 hours) |
| P1 | Configure immutable 5-year archival retention policy on KYC & transaction buckets | InfoSec & Engineering Lead | 72 hours |
| P2 | Conduct mandatory KYC/AML policy training and staff attestation across Onboarding Operations | Chief Compliance Officer | 14 Days |

## Section 6 — Board Approval / Adoption & Withdrawal Resolution Wording

RESOLVED THAT the prior KYC Policy v1.0 is hereby withdrawn with immediate effect and replaced by KYC & AML/CFT/CPF Policy v2.0, with Management mandated to execute P0–P2 remediation tasks.
`;

describe("PolicyCompilerService — Structured JSON Extraction & Clean vNext Compilation", () => {
  it("parses a 6-part Policy Gap Redline into structured JSON clauses, clocks, governance clauses, obligations, and P0-P3 tasks", () => {
    const payload = policyCompilerService.parseRedlineMarkdownToStructuredPayload(
      SAMPLE_REDLINE_MARKDOWN,
      "POLICY_GAP_REDLINE",
    );

    expect(payload.schema_version).toBe("2.0");
    expect(payload.decision).toBe("REJECT");
    expect(payload.policy_domain).toBe("AML_CFT_CPF");
    expect(payload.recommended_approval_tier).toBe("TIER_3_BOARD");

    expect(payload.clauses).toHaveLength(3);
    expect(payload.clauses[0]!.clause_reference).toBe("2.1");
    expect(payload.clauses[0]!.severity).toBe("CRITICAL");
    expect(payload.clauses[0]!.automation_level).toBe("AUTOMATED");
    expect(payload.clauses[0]!.control_statement).toContain("Clause 2.1");

    expect(payload.operational_clocks).toHaveLength(3);
    expect(payload.operational_clocks[0]!.sla_hours).toBe(24);
    expect(payload.operational_clocks[1]!.sla_hours).toBe(72);

    expect(payload.remediation_schedule).toHaveLength(3);
    expect(payload.remediation_schedule[0]!.priority).toBe("P0");
    expect(payload.remediation_schedule[0]!.owner_department).toBe("Technology");

    expect(payload.governance_clauses.length).toBeGreaterThanOrEqual(1);
    expect(payload.obligation_mappings.length).toBeGreaterThanOrEqual(3);
    expect(payload.board_resolution_text).toContain("RESOLVED THAT");
  });

  it("compiles accepted redlines into a Clean vNext Policy and compiles live Controls, Clocks & Tasks", () => {
    const payload = policyCompilerService.parseRedlineMarkdownToStructuredPayload(
      SAMPLE_REDLINE_MARKDOWN,
      "POLICY_GAP_REDLINE",
    );

    const compiled = policyCompilerService.compileCleanPolicyDocument(payload, {
      policyRefNo: "POL-AML-2026-001",
      policyTitle: "KYC & AML/CFT/CPF Policy",
      versionNumber: 2,
      ownerName: "Adaeze Okafor",
      ownerDepartment: "Compliance",
      approvalTier: "TIER_3_BOARD",
      institutionName: "PayCore Nigeria Ltd",
      acceptedClauseRefs: ["2.1", "2.2", "3.1"],
    });

    expect(compiled.acceptedCount).toBe(3);
    expect(compiled.rejectedCount).toBe(0);
    expect(compiled.cleanMarkdown).toContain("POL-AML-2026-001");
    expect(compiled.cleanMarkdown).toContain("Three Lines of Defense Accountability");
    expect(compiled.cleanMarkdown).toContain("Operational Procedure:");
    expect(compiled.cleanMarkdown).toContain("Enforcing Control");
    expect(compiled.cleanMarkdown).toContain("Appendix A — Mandatory Statutory Timing");

    const ops = policyCompilerService.extractOperationalObjects(
      compiled.updatedPayload,
      "POL-AML-2026-001",
    );
    expect(ops.controls).toHaveLength(3);
    expect(ops.controls[0]!.control_code).toBe("CTL-POL-AML-2026-001-01");
    expect(ops.operational_clocks).toHaveLength(3);
    expect(ops.implementation_tasks).toHaveLength(3);
  });
});

describe("POLICY_DRAFT_NEW Workflow Pack & Intent Routing", () => {
  it("routes net-new policy drafting requests to POLICY_DRAFT_NEW while keeping redlines on POLICY_GAP_REDLINE", () => {
    expect(
      classifyComplianceTurnIntent({
        userPrompt: "Draft a new Board-ready KYC and AML/CFT policy for our Nigerian fintech.",
      }),
    ).toBe("POLICY_DRAFT_NEW");

    expect(
      classifyComplianceTurnIntent({
        userPrompt: "Redline our internal AML policy against CBN 2023 circular.",
      }),
    ).toBe("POLICY_GAP_REDLINE");

    expect(
      classifyComplianceTurnIntent({
        userPrompt: "Help me with our data protection program",
        workflowHint: "POLICY_DRAFT_NEW",
      }),
    ).toBe("POLICY_DRAFT_NEW");
  });

  it("registers POLICY_DRAFT_NEW_PACK on the Compliance Officer role profile with scoped prompt isolation", () => {
    const role = agentRoleRegistry.getRole(COMPLIANCE_OFFICER_ROLE_ID);
    expect(role.workflowPacks.POLICY_DRAFT_NEW).toBeDefined();
    expect(role.workflowPacks.POLICY_DRAFT_NEW!.artifactType).toBe("policy_draft_document");

    const plan = agentRoleRegistry.resolveTurnPlan({
      intentInput: {
        userPrompt: "Create a comprehensive Data Protection Policy under NDPA 2023.",
      },
      allToolDeclarations: STATUTORY_TOOL_DECLARATIONS,
    });
    expect(plan.turnIntent).toBe("POLICY_DRAFT_NEW");
    expect(plan.systemInstruction).toContain(
      "ACTIVE ASSIGNMENT: NET-NEW INSTITUTIONAL COMPLIANCE POLICY DRAFTING",
    );
  });
});

describe("PolicyQaService — Fail-Closed Post-Draft Statutory Floor QA Gate", () => {
  const TENANT_ID = "11111111-1111-1111-1111-111111111111";

  it("PASSES a clean, compliant compiled policy with zero open blockers and zero evidence gaps", async () => {
    const payload = policyCompilerService.parseRedlineMarkdownToStructuredPayload(
      SAMPLE_REDLINE_MARKDOWN,
      "POLICY_GAP_REDLINE",
    );
    const { cleanMarkdown } = policyCompilerService.compileCleanPolicyDocument(payload, {
      policyRefNo: "POL-AML-2026-001",
      policyTitle: "KYC & AML/CFT/CPF Policy",
      versionNumber: 2,
      ownerName: "Adaeze Okafor",
      ownerDepartment: "Compliance",
      approvalTier: "TIER_3_BOARD",
    });

    const report = await policyQaService.evaluatePolicyDraft({
      tenantId: TENANT_ID,
      actorId: "cco_user_1",
      policyMarkdown: cleanMarkdown,
      openComments: [],
    });

    expect(report.passed).toBe(true);
    expect(report.failed_critical_count).toBe(0);
    expect(report.failed_high_count).toBe(0);
  });

  it("FAILS CLOSED if stakeholder edits weaken NFIU 5-year retention, NDPA 72h breach notice, or CBN Day-0 KYC", async () => {
    const weakenedDraft = `
# Weakened Policy Draft
## Purpose & Scope
Applies to all onboarding teams.
## Responsibilities & Controls
Operations may defer BVN verification for 30 days on Tier 1 wallets.
Compliance shall retain KYC and transaction records for 2 years.
Data Protection Officer will report any personal data breach to NDPC within 14 days.
Collections agents are permitted to scrape contacts and broadcast default notices.
Compliance will only file an STR above ₦5,000,000 and may inform the customer that an STR was filed.
Board review cycle: annual. [NEEDS_INTERNAL_EVIDENCE]
`;

    const report = await policyQaService.evaluatePolicyDraft({
      tenantId: TENANT_ID,
      actorId: "cco_user_1",
      policyMarkdown: weakenedDraft,
      openComments: [
        {
          id: "c1",
          tenant_id: TENANT_ID,
          policy_id: "p1",
          policy_version_id: "v1",
          assignment_id: null,
          clause_reference: "2.1",
          section_heading: "Onboarding",
          comment_type: "FEASIBILITY_BLOCKER",
          is_feasibility_blocker: true,
          blocker_impact: "Onboarding API cannot block activation yet",
          comment_text: "Need engineering sprint to enable BVN hard block",
          proposed_change: null,
          author_user_id: "tech_1",
          author_name: "CTO",
          author_role: "TECHNOLOGY_LEAD",
          author_department: "Technology",
          status: "OPEN",
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null,
          linked_task_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    });

    expect(report.passed).toBe(false);
    expect(report.failed_critical_count).toBeGreaterThanOrEqual(5);
    expect(report.open_feasibility_blockers_count).toBe(1);
    expect(report.unresolved_evidence_markers_count).toBe(1);

    const failedCodes = report.checks.filter((c) => !c.passed).map((c) => c.check_code);
    expect(failedCodes).toEqual(
      expect.arrayContaining([
        "STATUTORY_FLOOR_NFIU_5Y_RETENTION",
        "STATUTORY_FLOOR_NDPA_72H_BREACH",
        "STATUTORY_FLOOR_CBN_DAY0_KYC",
        "STATUTORY_FLOOR_FCCPC_DEON_COLLECTIONS",
        "STATUTORY_FLOOR_MLPPA_STR_TIPPING_OFF",
        "EVIDENCE_COMPLETENESS_MARKERS",
        "STAKEHOLDER_FEASIBILITY_BLOCKERS",
      ]),
    );
  });
});
