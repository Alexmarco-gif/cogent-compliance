/**
 * Cogent Compliance OS — End-to-End Policy Workflow OS Integration Tests (Phase 1 & Phase 2)
 *
 * Tests the complete operational policy lifecycle with an in-memory multi-table Supabase store:
 *  - Policy Register & Dashboard KPIs (Total | Under Review | Awaiting Approval | Overdue)
 *  - Stage 2 Initiation & Stage 3 Clean vNext Compiler
 *  - Stage 4 Three-Lines Stakeholder Review (Internal Audit forced advisory-only + Feasibility Blocker auto-task)
 *  - Stage 5 Fail-Closed Statutory Floor QA Gate (blocks on open blocker, passes once resolved)
 *  - Stage 6 Multi-Tier DoA Approval (CCO -> Management Committee -> Board), sequential enforcement,
 *    Internal Audit independence violation, anti-self-approval, & Auto-Assembled Board Pack
 *  - Stage 7 & 8 Publication, What Changed Delta Brief, Live Controls/Clocks/Tasks,
 *    Employee Attestation SHA-256 verification, and Knowledge Base RAG sync
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { getPermissionsForRole } from "@/modules/auth-tenancy/permissions";
import type { CanonicalRole, TenantContext } from "@/modules/auth-tenancy/types";
import { PolicyWorkflowService } from "@/modules/policies/policy-workflow.service";

// ==============================================================================
// In-Memory Multi-Table Supabase Test Double
// ==============================================================================
const dbTables: Record<string, Array<Record<string, unknown>>> = {};

function resetDb() {
  for (const key of Object.keys(dbTables)) {
    delete dbTables[key];
  }
  const names = [
    "compliance_policies",
    "policy_versions",
    "policy_obligation_mappings",
    "policy_approval_workflows",
    "policy_approval_steps",
    "policy_review_assignments",
    "policy_clause_comments",
    "policy_controls",
    "policy_operational_clocks",
    "policy_implementation_tasks",
    "policy_attestations",
    "work_product_artifacts",
    "regulatory_clauses",
    "live_web_retrievals",
  ];
  for (const n of names) {
    dbTables[n] = [];
  }
}

function createQueryBuilder(tableName: string) {
  let op: "select" | "insert" | "update" | "delete" = "select";
  let payload: unknown = null;
  let selectHeadOnly = false;
  let wantSingle = false;
  let wantMaybeSingle = false;
  let orderByCol: string | null = null;
  let orderAsc = true;
  let limitCount: number | null = null;
  const filters: Array<(row: Record<string, unknown>) => boolean> = [];

  const getRows = () => {
    if (!dbTables[tableName]) dbTables[tableName] = [];
    return dbTables[tableName]!;
  };

  const execute = async () => {
    const table = getRows();

    if (op === "insert") {
      const items = Array.isArray(payload) ? payload : [payload];
      const now = new Date().toISOString();
      const inserted = items.map((raw) => {
        const rec = {
          id: (raw as Record<string, unknown>).id || crypto.randomUUID(),
          created_at: now,
          updated_at: now,
          ...(raw as Record<string, unknown>),
        };
        table.push(rec);
        return rec;
      });
      if (wantSingle || wantMaybeSingle) {
        return { data: inserted[0] ?? null, error: null };
      }
      return { data: inserted, error: null };
    }

    if (op === "update") {
      const patch = payload as Record<string, unknown>;
      const matched: Array<Record<string, unknown>> = [];
      for (const row of table) {
        if (filters.every((fn) => fn(row))) {
          Object.assign(row, patch);
          matched.push(row);
        }
      }
      if (wantSingle || wantMaybeSingle) {
        return { data: matched[0] ?? null, error: null };
      }
      return { data: matched, error: null };
    }

    if (op === "delete") {
      const kept = table.filter((row) => !filters.every((fn) => fn(row)));
      dbTables[tableName] = kept;
      return { data: null, error: null };
    }

    // SELECT
    let matched = table.filter((row) => filters.every((fn) => fn(row)));
    if (orderByCol) {
      const col = orderByCol;
      matched = [...matched].sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (av === bv) return 0;
        const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
        return orderAsc ? cmp : -cmp;
      });
    }
    if (limitCount !== null) {
      matched = matched.slice(0, limitCount);
    }

    if (selectHeadOnly) {
      return { data: null, count: matched.length, error: null };
    }
    if (wantSingle) {
      return matched[0]
        ? { data: matched[0], error: null }
        : { data: null, error: { message: "Not found" } };
    }
    if (wantMaybeSingle) {
      return { data: matched[0] ?? null, error: null };
    }
    return { data: matched, count: matched.length, error: null };
  };

  const builder = {
    select(_cols?: string, opts?: { count?: string; head?: boolean }) {
      if (op === "select") {
        selectHeadOnly = Boolean(opts?.head);
      }
      return builder;
    },
    insert(data: unknown) {
      op = "insert";
      payload = data;
      return builder;
    },
    update(data: unknown) {
      op = "update";
      payload = data;
      return builder;
    },
    delete() {
      op = "delete";
      return builder;
    },
    eq(col: string, val: unknown) {
      filters.push((row) => row[col] === val);
      return builder;
    },
    in(col: string, vals: unknown[]) {
      filters.push((row) => vals.includes(row[col]));
      return builder;
    },
    order(col: string, opts?: { ascending?: boolean }) {
      orderByCol = col;
      orderAsc = opts?.ascending !== false;
      return builder;
    },
    limit(n: number) {
      limitCount = n;
      return builder;
    },
    single() {
      wantSingle = true;
      return execute();
    },
    maybeSingle() {
      wantMaybeSingle = true;
      return execute();
    },
    then(resolve: (val: unknown) => unknown, reject?: (err: unknown) => unknown) {
      return execute().then(resolve, reject);
    },
  };

  return builder;
}

const mockAuditAppend = vi.fn().mockResolvedValue({ id: "audit_1" });
const mockRegisterKbDoc = vi.fn().mockResolvedValue({ id: "kb_doc_synced_1" });

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => createQueryBuilder(table),
  }),
}));

vi.mock("@/modules/audit/audit.service", () => ({
  auditService: {
    appendEvent: (...args: unknown[]) => mockAuditAppend(...args),
  },
}));

vi.mock("@/modules/knowledge-base/playbook.service", () => ({
  playbookService: {
    registerDocument: (...args: unknown[]) => mockRegisterKbDoc(...args),
  },
}));

function makeTenant(role: CanonicalRole, userId: string): TenantContext {
  return {
    tenantId: "11111111-1111-1111-1111-111111111111",
    userId,
    clerkOrgId: "org_fintech_ng",
    clerkUserId: userId,
    orgSlug: "paycore-ng",
    orgName: "PayCore Nigeria Ltd",
    role,
    permissions: getPermissionsForRole(role),
    status: "ACTIVE",
  };
}

const REDLINE_DOC = `# KYC & AML/CFT/CPF Compliance Policy Redline

**Decision:** REJECT — Immediate Withdrawal and Replacement Required

## Section 1 — Application and Drafting Basis
Applies to all onboarding, KYC, and transaction monitoring workflows under CBN AML/CFT/CPF Regulations 2022.

## Section 2 — Policy Gap Redline Matrix

#### Customer Onboarding
| Clause Reference | Current Non-Compliant Text | Specific Statutory Breach | Exact Compliant Replacement Text | Statutory Floor & Governing Authority |
| --- | --- | --- | --- | --- |
| 1.1 | Allow 30-day BVN deferral. | Violates Day-0 BVN/NIN mandate. | Onboarding systems shall enforce mandatory Day-0 electronic BVN or NIN verification prior to account activation. | CBN Circular PSM/DIR/PUB/CIR/001/053 (2023) |
| 1.2 | Retain records for 2 years. | Violates 5-year NFIU retention floor. | All KYC and transaction records must be retained in immutable storage for at least five (5) years. | MLPPA 2022 Section 8 (NFIU) |

## Section 3 — Mandatory Statutory Timing & Operational Clock Register
| Operational Event / Trigger | Binding Statutory Timing / SLA | Governing Legal Basis |
| --- | --- | --- |
| Suspicious Transaction Report (STR) Filing | Within 24 hours | MLPPA 2022 Section 7 |
| NDPC Data Breach Notice | Within 72 hours | NDPA 2023 Section 40 |

## Section 4 — Additional Governance Clauses Required
### 4.1 Exceptions, Escalation & Annual Review
Exceptions require Risk and CCO sign-off with fixed expiry. Unapproved deviations are escalated immediately. Annual review cycle applies.

## Section 5 — Prioritized Remediation & Implementation Schedule
| Priority | Mandatory Remediation Action | Accountable Owner | Target / Statutory Deadline |
| --- | --- | --- | --- |
| P0 | Enforce Day-0 electronic BVN check in onboarding API | Technology Lead | 24 hours |
| P1 | Enable 5-year WORM archive on KYC storage bucket | InfoSec Lead | 72 hours |

## Section 6 — Board Approval / Adoption & Withdrawal Resolution Wording
RESOLVED THAT KYC & AML/CFT/CPF Policy v1.0 is adopted with immediate effect.
`;

describe("PolicyWorkflowService — Complete Phase 1 & Phase 2 Operational Lifecycle", () => {
  const service = new PolicyWorkflowService();
  const analyst = makeTenant("COMPLIANCE_ANALYST", "user_analyst_1");
  const techLead = makeTenant("TECHNOLOGY_LEAD", "user_tech_1");
  const internalAuditor = makeTenant("INTERNAL_AUDIT", "user_audit_1");
  const cco = makeTenant("CHIEF_COMPLIANCE_OFFICER", "user_cco_1");
  const committee = makeTenant("COMMITTEE_MEMBER", "user_comm_1");
  const boardMember = makeTenant("BOARD_MEMBER", "user_board_1");

  beforeEach(() => {
    resetDb();
    vi.clearAllMocks();
  });

  it("executes the full lifecycle: Initiate -> Compile -> 3-Lines Review & Blocker -> Statutory QA -> Tier-3 DoA Approval -> Publish, Controls, Clocks, Tasks & Attestations", async () => {
    // 1. Stage 2: Analyst initiates policy with Tier 3 Board approval
    const created = await service.createPolicy(analyst, {
      title: "KYC & AML/CFT/CPF Policy",
      domain: "AML_CFT_CPF",
      owner_department: "Compliance",
      approval_tier: "TIER_3_BOARD",
      review_cycle_months: 12,
      change_type: "AMENDMENT",
      trigger_source: "REGULATORY_CHANGE",
      trigger_reference: "REG-2026-014",
      markdown_content: REDLINE_DOC,
    });

    const policyId = created.policy.id;
    const versionId = created.current_version!.id;
    expect(created.policy.policy_ref_no).toMatch(/^POL-AML-\d{4}-001-/);
    expect(created.obligation_mappings.length).toBeGreaterThanOrEqual(2);

    // 2. Stage 3: Compile Clean vNext Policy from accepted redlines
    const compiled = await service.compileCleanVersion(analyst, policyId, {
      version_id: versionId,
      accepted_clause_refs: ["1.1", "1.2"],
    });
    expect(compiled.accepted_count).toBe(2);
    expect(compiled.version.clean_compiled_markdown).toContain(created.policy.policy_ref_no);
    expect(compiled.compiled_preview.controls_count).toBe(2);
    expect(compiled.compiled_preview.clocks_count).toBe(2);
    expect(compiled.compiled_preview.tasks_count).toBe(2);

    // 3. Stage 4: Assign Three-Lines Stakeholder Reviewers (Tech 1st Line + Internal Audit 3rd Line)
    const reviewStart = await service.handleStakeholderReviewPost(analyst, policyId, {
      action: "ASSIGN_REVIEWERS",
      version_id: versionId,
      due_days: 5,
      reviewers: [
        { reviewer_department: "Technology", reviewer_role: "TECHNOLOGY_LEAD" },
        { reviewer_department: "Internal Audit", reviewer_role: "INTERNAL_AUDIT" },
      ],
    });
    const techAssignment = reviewStart.assignments!.find(
      (a) => a.reviewer_role === "TECHNOLOGY_LEAD",
    )!;
    const auditAssignment = reviewStart.assignments!.find(
      (a) => a.reviewer_role === "INTERNAL_AUDIT",
    )!;
    // Internal Audit MUST be forced advisory-only to preserve 3rd-line independence
    expect(auditAssignment.is_advisory_only).toBe(true);
    expect(auditAssignment.defense_line).toBe("THIRD_LINE");
    expect(techAssignment.is_advisory_only).toBe(false);

    // Technology raises a Feasibility Blocker -> auto-spawns a P1 remediation task
    const blockerRes = await service.handleStakeholderReviewPost(techLead, policyId, {
      action: "ADD_COMMENT",
      version_id: versionId,
      assignment_id: techAssignment.id,
      clause_reference: "1.1",
      comment_type: "FEASIBILITY_BLOCKER",
      is_feasibility_blocker: true,
      blocker_impact: "Onboarding gateway needs BVN webhook timeout fallback",
      comment_text: "Current onboarding API cannot enforce hard block until fallback is deployed.",
      spawn_remediation_task: true,
    });
    expect(blockerRes.comment!.is_feasibility_blocker).toBe(true);
    expect(blockerRes.linked_task_id).toBeTruthy();

    // Dashboard KPIs reflect Under Review + 1 open Feasibility Blocker
    const midDash = await service.getDashboardAndRegister(cco);
    expect(midDash.kpis.total_policies).toBe(1);
    expect(midDash.kpis.under_review).toBe(1);
    expect(midDash.kpis.open_feasibility_blockers).toBe(1);

    // 4. Stage 5: Statutory QA Gate FAILS CLOSED while Feasibility Blocker is OPEN
    const failedQa = await service.runStatutoryQaGate(cco, policyId, { version_id: versionId });
    expect(failedQa.qa_report.passed).toBe(false);
    expect(failedQa.qa_report.open_feasibility_blockers_count).toBe(1);

    // Attempting to submit to Approval while QA failed MUST throw POLICY_QA_GATE_FAILED
    await expect(
      service.handleApprovalAction(cco, policyId, {
        action: "SUBMIT",
        version_id: versionId,
      }),
    ).rejects.toMatchObject({ code: "POLICY_QA_GATE_FAILED" });

    // Resolve the Feasibility Blocker & re-run Statutory QA Gate -> PASSES
    await service.handleStakeholderReviewPatch(analyst, policyId, {
      action: "RESOLVE_COMMENT",
      comment_id: blockerRes.comment!.id,
      status: "RESOLVED",
      resolution_notes: "Fallback webhook deployed and tracked via P1 implementation task.",
    });

    const passedQa = await service.runStatutoryQaGate(cco, policyId, { version_id: versionId });
    expect(passedQa.qa_report.passed).toBe(true);

    // 5. Stage 6: Submit for Tier 3 Delegated Approval -> Auto-assembles Board Pack & 3 sequential steps
    const submitted = await service.handleApprovalAction(cco, policyId, {
      action: "SUBMIT",
      version_id: versionId,
      approval_tier: "TIER_3_BOARD",
    });
    expect(submitted.steps).toHaveLength(3);
    expect(submitted.board_pack_markdown).toContain("Formal Governance Approval Pack");
    expect(submitted.board_pack_markdown).toContain("Feasibility Blockers & Operational Resolution Log");

    const [ccoStep, committeeStep, boardStep] = submitted.steps!;

    // Three-Lines Independence: Internal Audit MUST be blocked with AUDIT_INDEPENDENCE_VIOLATION
    await expect(
      service.handleApprovalAction(internalAuditor, policyId, {
        action: "DECIDE",
        version_id: versionId,
        step_id: ccoStep!.id,
        decision: "APPROVED",
        decision_reason: "Internal audit attempting unauthorized approval",
      }),
    ).rejects.toMatchObject({ code: "AUDIT_INDEPENDENCE_VIOLATION" });

    // Sequential DoA Guard: Board cannot approve before CCO and Committee
    await expect(
      service.handleApprovalAction(boardMember, policyId, {
        action: "DECIDE",
        version_id: versionId,
        step_id: boardStep!.id,
        decision: "APPROVED",
        decision_reason: "Attempting out-of-order board approval",
      }),
    ).rejects.toMatchObject({ code: "APPROVAL_SEQUENCE_VIOLATION" });

    // Step 1: CCO approves (different user from analyst author -> passes dual control)
    const step1 = await service.handleApprovalAction(cco, policyId, {
      action: "DECIDE",
      version_id: versionId,
      step_id: ccoStep!.id,
      decision: "APPROVED",
      decision_reason: "Validated against CBN & MLPPA statutory floors.",
    });
    expect(step1.fully_approved).toBe(false);

    // Step 2: Management Committee approves
    const step2 = await service.handleApprovalAction(committee, policyId, {
      action: "DECIDE",
      version_id: versionId,
      step_id: committeeStep!.id,
      decision: "APPROVED",
      decision_reason: "Operational readiness endorsed by Management Committee.",
    });
    expect(step2.fully_approved).toBe(false);

    // Step 3: Board of Directors approves -> policy becomes APPROVED & metadata minted
    const step3 = await service.handleApprovalAction(boardMember, policyId, {
      action: "DECIDE",
      version_id: versionId,
      step_id: boardStep!.id,
      decision: "APPROVED",
      decision_reason: "Formally adopted at Q4 Board meeting.",
      board_minutes_ref: "BOD-MIN-2026-Q4-09",
      effective_date: "2026-12-01",
    });
    expect(step3.fully_approved).toBe(true);

    // 6. Stages 7 & 8: Publish & Operationalize Policy
    const pub = await service.publishAndOperationalize(cco, policyId, {
      version_id: versionId,
      effective_date: "2026-12-01",
      sync_to_knowledge_base: true,
      compile_operational_objects: true,
      attestation_due_days: 14,
      attestation_recipients: [
        {
          recipient_name: "Onboarding Operations Lead",
          department: "Operations",
          requires_training: true,
        },
      ],
    });

    expect(pub.controls_compiled).toBe(2);
    expect(pub.clocks_compiled).toBe(2);
    expect(pub.tasks_compiled).toBe(2);
    expect(pub.attestations_dispatched).toBe(1);
    expect(pub.knowledge_document_id).toBe("kb_doc_synced_1");
    expect(pub.delta_brief_markdown).toContain("Policy Publication Delta Brief");
    expect(mockRegisterKbDoc).toHaveBeenCalledTimes(1);

    // 7. Verify live operational updates (Task completion + Attestation SHA-256 verification)
    const finalDetail = await service.getPolicyDetail(cco, policyId);
    expect(finalDetail.policy.approving_authority).toBe("Board of Directors");
    expect(finalDetail.policy.next_review_date).toBe("2027-12-01");
    expect(finalDetail.controls).toHaveLength(2);
    expect(finalDetail.operational_clocks).toHaveLength(2);
    // 2 from Section 5 + 1 auto-spawned from Feasibility Blocker = 3 tasks
    expect(finalDetail.implementation_tasks).toHaveLength(3);
    expect(finalDetail.attestations).toHaveLength(1);

    const taskUpdate = await service.handleOperationalUpdate(techLead, policyId, {
      entity: "TASK",
      task_id: finalDetail.implementation_tasks[0]!.id,
      status: "COMPLETED",
      evidence_notes: "Deployed PR #482 enforcing Day-0 BVN check.",
    });
    expect(taskUpdate.task!.status).toBe("COMPLETED");

    const attestUpdate = await service.handleOperationalUpdate(techLead, policyId, {
      entity: "ATTESTATION",
      attestation_id: finalDetail.attestations[0]!.id,
      training_completed: true,
    });
    expect(attestUpdate.attestation!.status).toBe("TRAINING_COMPLETED");
    expect(attestUpdate.attestation!.acknowledgement_hash).toHaveLength(64);
  });

  it("tracks overdue policy reviews accurately on the Policy Dashboard", async () => {
    await service.createPolicy(analyst, {
      title: "Legacy Fraud Management Policy",
      domain: "FRAUD_CYBER",
      owner_department: "Risk Management",
      approval_tier: "TIER_2_COMMITTEE",
      next_review_date: "2024-01-15",
      markdown_content: "# Legacy Fraud Policy\nInitial content for overdue review test.",
    });

    const dash = await service.getDashboardAndRegister(cco, { overdue_only: true });
    expect(dash.kpis.overdue_reviews).toBe(1);
    expect(dash.policies).toHaveLength(1);
    expect(dash.policies[0]!.title).toBe("Legacy Fraud Management Policy");
  });

  it("Scenario: Management Committee rejection returns Tier 2 policy to DRAFTING and resets Statutory QA Gate", async () => {
    const created = await service.createPolicy(analyst, {
      title: "Digital Lending & Fair Collections Policy",
      domain: "DIGITAL_LENDING",
      owner_department: "Operations",
      approval_tier: "TIER_2_COMMITTEE",
      markdown_content: REDLINE_DOC,
    });
    const policyId = created.policy.id;
    const versionId = created.current_version!.id;

    await service.compileCleanVersion(analyst, policyId, { version_id: versionId });
    const qa = await service.runStatutoryQaGate(cco, policyId, { version_id: versionId });
    expect(qa.qa_report.passed).toBe(true);

    const sub = await service.handleApprovalAction(cco, policyId, {
      action: "SUBMIT",
      version_id: versionId,
      approval_tier: "TIER_2_COMMITTEE",
    });
    expect(sub.steps).toHaveLength(2);

    // Step 1: CCO approves
    await service.handleApprovalAction(cco, policyId, {
      action: "DECIDE",
      version_id: versionId,
      step_id: sub.steps![0]!.id,
      decision: "APPROVED",
      decision_reason: "CCO recommends adoption.",
    });

    // Step 2: Management Committee rejects -> returns to DRAFTING & invalidates QA
    const rej = await service.handleApprovalAction(committee, policyId, {
      action: "DECIDE",
      version_id: versionId,
      step_id: sub.steps![1]!.id,
      decision: "REJECTED",
      decision_reason: "Clarify collections escalation handoff with third-party recovery partners.",
    });
    expect(rej.workflow_status).toBe("REJECTED");
    expect(rej.fully_approved).toBe(false);

    const afterReject = await service.getPolicyDetail(cco, policyId);
    expect(afterReject.policy.status).toBe("DRAFTING");
    expect(afterReject.current_version!.qa_validation_status).toBe("PENDING");

    // Cannot re-submit without passing QA again
    await expect(
      service.handleApprovalAction(cco, policyId, {
        action: "SUBMIT",
        version_id: versionId,
      }),
    ).rejects.toMatchObject({ code: "POLICY_QA_GATE_FAILED" });
  });

  it("Scenario: Enforces Anti-Self-Approval Dual Control when CCO authors a Tier 1 policy", async () => {
    const created = await service.createPolicy(cco, {
      title: "Marketing & Financial Promotions Policy",
      domain: "MARKETING_COMMS",
      owner_department: "Compliance",
      approval_tier: "TIER_1_CCO",
      markdown_content: REDLINE_DOC,
    });
    const policyId = created.policy.id;
    const versionId = created.current_version!.id;

    await service.compileCleanVersion(cco, policyId, { version_id: versionId });
    await service.runStatutoryQaGate(cco, policyId, { version_id: versionId });
    const sub = await service.handleApprovalAction(cco, policyId, {
      action: "SUBMIT",
      version_id: versionId,
      approval_tier: "TIER_1_CCO",
    });

    // Self-approval MUST fail when dual control is active
    await expect(
      service.handleApprovalAction(cco, policyId, {
        action: "DECIDE",
        version_id: versionId,
        step_id: sub.steps![0]!.id,
        decision: "APPROVED",
        decision_reason: "Attempting to self-approve authored policy",
        enforce_dual_control: true,
      }),
    ).rejects.toMatchObject({ code: "SELF_APPROVAL_VIOLATION" });

    // A second CCO officer can approve cleanly
    const secondCco = makeTenant("CHIEF_COMPLIANCE_OFFICER", "user_cco_2");
    const approved = await service.handleApprovalAction(secondCco, policyId, {
      action: "DECIDE",
      version_id: versionId,
      step_id: sub.steps![0]!.id,
      decision: "APPROVED",
      decision_reason: "Independent dual-control CCO sign-off.",
      enforce_dual_control: true,
    });
    expect(approved.fully_approved).toBe(true);
  });

  it("Scenario: Internal Audit (3rd Line) review completion is automatically kept advisory-only (never binding SIGNED_OFF)", async () => {
    const created = await service.createPolicy(analyst, {
      title: "Data Protection (NDPA 2023) Policy",
      domain: "DATA_PROTECTION",
      owner_department: "Information Security",
      approval_tier: "TIER_3_BOARD",
      markdown_content: REDLINE_DOC,
    });
    const policyId = created.policy.id;
    const versionId = created.current_version!.id;

    const assigned = await service.handleStakeholderReviewPost(analyst, policyId, {
      action: "ASSIGN_REVIEWERS",
      version_id: versionId,
      reviewers: [{ reviewer_department: "Internal Audit", reviewer_role: "INTERNAL_AUDIT" }],
    });
    const auditAssignment = assigned.assignments![0]!;
    expect(auditAssignment.is_advisory_only).toBe(true);

    // Even if caller passes SIGNED_OFF, backend downgrades to APPROVED_WITH_COMMENTS to preserve 3rd-line independence
    const completed = await service.handleStakeholderReviewPatch(internalAuditor, policyId, {
      action: "COMPLETE_ASSIGNMENT",
      assignment_id: auditAssignment.id,
      status: "SIGNED_OFF",
      summary_notes: "Control design reviewed from independent 3rd-line perspective.",
    });
    expect(completed.assignment!.status).toBe("APPROVED_WITH_COMMENTS");
  });

  it("Scenario: Promoting an existing Studio Work Product (source_work_product_id) auto-hydrates clauses & obligations", async () => {
    const wpId = crypto.randomUUID();
    dbTables.work_product_artifacts!.push({
      id: wpId,
      tenant_id: analyst.tenantId,
      workflow_type: "POLICY_GAP_REDLINE",
      artifact_type: "policy_gap_redline",
      title: "Studio Redlined KYC Policy",
      markdown_content: REDLINE_DOC,
      structured_payload: {},
      version_number: 1,
      status: "DRAFT",
    });

    const promoted = await service.createPolicy(analyst, {
      title: "Studio Redlined KYC Policy",
      domain: "KYC_CDD",
      owner_department: "Compliance",
      approval_tier: "TIER_3_BOARD",
      change_type: "AMENDMENT",
      trigger_source: "REGULATORY_CHANGE",
      source_work_product_id: wpId,
    });

    expect(promoted.current_version!.source_work_product_id).toBe(wpId);
    expect(promoted.obligation_mappings.length).toBeGreaterThanOrEqual(2);
    const sp = promoted.current_version!.structured_payload as { clauses?: unknown[] };
    expect(Array.isArray(sp.clauses) && sp.clauses.length).toBe(2);
  });

  it("Scenario: Post-review edit weakening statutory floor fails QA closed and blocks submission to Approval", async () => {
    const created = await service.createPolicy(analyst, {
      title: "Payments & Instant EFT Policy",
      domain: "PAYMENTS_EFT",
      owner_department: "Operations",
      approval_tier: "TIER_2_COMMITTEE",
      markdown_content: REDLINE_DOC,
    });
    const policyId = created.policy.id;
    const versionId = created.current_version!.id;

    // Simulate a stakeholder edit weakening NFIU 5-year retention to 2 years and NDPC notice to 10 days
    await service.compileCleanVersion(analyst, policyId, {
      version_id: versionId,
      custom_clean_markdown: `# Payments Policy\n## Purpose & Scope\nApplies to all staff.\n## Responsibilities & Controls\nOperations shall retain KYC and transaction records for 2 years and report any personal data breach to NDPC within 10 days.\n## Exceptions & Review Cycle\nAnnual review.`,
    });

    const qa = await service.runStatutoryQaGate(cco, policyId, { version_id: versionId });
    expect(qa.qa_report.passed).toBe(false);
    expect(qa.version.qa_validation_status).toBe("FAILED");

    await expect(
      service.handleApprovalAction(cco, policyId, {
        action: "SUBMIT",
        version_id: versionId,
      }),
    ).rejects.toMatchObject({ code: "POLICY_QA_GATE_FAILED" });
  });
});
