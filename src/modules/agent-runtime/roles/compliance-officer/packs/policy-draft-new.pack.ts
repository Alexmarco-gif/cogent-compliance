/**
 * Workflow Pack 8: Net-New Institutional Compliance Policy Drafter
 * Actual Cogent Workflow: POLICY_DRAFT_NEW -> policy_draft_document
 *
 * Drafts a complete, Board-ready institutional compliance policy from scratch for
 * Nigerian regulated fintechs and financial institutions, explicitly separating
 * Policy Rules, Operational Procedures, and Enforcing Controls across all 11
 * canonical policy components, plus a Statutory Clock Register, P0–P3 Implementation
 * Schedule, and Board Adoption Resolution ready to compile into the Policy Workflow OS.
 */

import type { WorkflowPackDefinition } from "@/contracts/agent-runtime.contracts";

export const POLICY_DRAFT_NEW_PACK: WorkflowPackDefinition = {
  id: "POLICY_DRAFT_NEW",
  displayName: "Draft New Compliance Policy",
  description:
    "Drafts a complete, Board-ready compliance policy from scratch grounded in Nigerian statutory floors (CBN, NFIU, NDPC, FCCPC, SEC), separating Policy Rules, Procedures, and Enforcing Controls alongside a Statutory Clock Register, P0–P3 Implementation Plan, and Board Adoption Resolution.",
  workflowType: "POLICY_DRAFT_NEW",
  artifactType: "policy_draft_document",
  isWorkProductWorkflow: true,
  densityTier: "TIER_3_EXECUTIVE_DELIVERABLE",
  reasoningSteps: [
    "Establish institutional licensing perimeter, applicable Nigerian regulators (CBN, NFIU, NDPC, FCCPC, SEC), and required Delegated Approval tier (CCO vs. Management Committee vs. Board).",
    "Structure all 11 mandatory institutional policy components: Purpose, Scope, Regulatory Basis, Definitions, Three-Lines Responsibilities, Binding Requirements, Procedures & Enforcing Controls, Exceptions & Escalation, Record Retention, Review Cycle, and Implementation.",
    "Enforce non-negotiable statutory floors (NFIU >= 5-year retention under MLPPA 2022 s. 8, NDPA <= 72-hour breach notice under s. 40, CBN Day-0 BVN/NIN verification under PSM/DIR/PUB/CIR/001/053, zero-threshold 24h STR, FCCPC DEON 2025 fair collections).",
    "Explicitly separate Policy Rule vs. Operational Procedure vs. Enforcing Control for every binding requirement so Cogent can compile them into live operational controls.",
    "Compile a Mandatory Statutory Timing & Operational Clock Register, Prioritized P0–P3 Implementation Schedule, and Formal Board/Committee Adoption Resolution.",
  ],
  deterministicPreChecks: ["STATUTORY_REFERENCE_MATRIX"],
  allowedTools: [
    "search_regulatory_evidence",
    "get_regulatory_provision",
    "verify_regulatory_evidence",
    "assess_regulatory_applicability",
    "search_institutional_knowledge",
    "search_live_web",
    "fetch_live_url_content",
    "recall_institutional_precedents",
    "search_nigerian_regulations",
    "upsert_work_product_artifact",
  ],
  maxToolRounds: 3,
  temperature: 0.15,
  prefersLiveWebSearch: true,
  systemPromptOverlay: `ACTIVE ASSIGNMENT: NET-NEW INSTITUTIONAL COMPLIANCE POLICY DRAFTING
Draft a complete, audit-ready, Board-grade institutional compliance policy from scratch adapted dynamically to the user's regulatory perimeter and policy domain:
1. **Section 1 — Purpose, Scope, Regulatory Basis & Governance Classification**: State the institution's licensing scope, applicable Nigerian statutes/circulars with operative dates, definitions, and recommended Delegated Approval Tier (Tier 1 CCO, Tier 2 Management Committee, or Tier 3 Board of Directors — e.g., CBN mandates Board approval for AML/CFT/CPF policies).
2. **Section 2 — Three Lines of Defense Accountability**: Assign clear responsibilities across First Line (Business, Product, Operations, Technology, InfoSec), Second Line (Compliance, Risk, Legal, CCO), Third Line (Internal Audit — independent assurance, advisory-only), and Board/Committee oversight.
3. **Section 3 — Binding Policy Clauses, Procedures & Enforcing Controls Matrix**: Present core policy obligations in structured section-titled tables using the 5-column compiler schema (\`| Clause Reference | Current Non-Compliant Text | Specific Statutory Breach | Exact Compliant Replacement Text | Statutory Floor & Governing Authority |\`, placing \`N/A — Net-New Policy Baseline\` in Column 2 and the regulatory obligation trigger in Column 3), explicitly stating for each clause the **Policy Rule**, **Operational Procedure**, and **Enforcing Control**.
4. **Section 4 — Mandatory Statutory Timing & Operational Clock Register**: Render an SLA table (\`| Operational Event / Trigger | Binding Statutory Timing / SLA | Governing Legal Basis |\`) covering all binding statutory clocks applicable to the policy domain.
5. **Section 5 — Additional Governance Clauses Required (Exceptions, Escalation, Retention & Review Cycle)**: Draft binding clauses governing time-bound exceptions, escalation of control failures, NFIU >= 5-year record retention, employee training/attestation, and periodic review triggers.
6. **Section 6 — Prioritized Implementation Schedule & Board Adoption Resolution**: Render a P0–P3 Implementation Schedule (\`| Priority | Mandatory Remediation Action | Accountable Owner | Target / Statutory Deadline |\`) followed by formal **Board / Committee Adoption Resolution Wording**. Persist via \`upsert_work_product_artifact\` (\`policy_draft_document\`).`,
  requiredDeliverableSections: [
    {
      key: "purpose_scope_basis",
      label: "Section 1 — Purpose, Scope & Regulatory Basis",
      headingPatterns: ["purpose", "scope", "regulatory\\s+basis", "application"],
      required: true,
    },
    {
      key: "three_lines_responsibilities",
      label: "Section 2 — Three Lines of Defense Accountability",
      headingPatterns: ["three\\s+lines", "responsibilities", "accountability"],
      required: true,
    },
    {
      key: "policy_clauses_controls",
      label: "Section 3 — Binding Policy Clauses, Procedures & Controls",
      headingPatterns: ["policy\\s+clauses", "clause\\s+reference", "binding\\s+policy"],
      required: true,
    },
    {
      key: "operational_clock_register",
      label: "Section 4 — Mandatory Statutory Timing & Operational Clock Register",
      headingPatterns: ["operational\\s+clock\\s+register", "statutory\\s+timing"],
      required: true,
    },
    {
      key: "governance_clauses",
      label: "Section 5 — Exceptions, Escalation, Retention & Review Governance",
      headingPatterns: ["governance\\s+clauses", "exceptions", "record\\s+retention"],
      required: true,
    },
    {
      key: "implementation_and_resolution",
      label: "Section 6 — Implementation Schedule & Board Adoption Resolution",
      headingPatterns: ["implementation\\s+schedule", "board\\s+(?:approval|adoption|resolution)"],
      required: true,
    },
  ],
  escalationPolicy: {
    verdictOptions: [
      "APPROVE — Ready for Cross-Functional Stakeholder Review & Governance Approval",
      "CONDITIONAL APPROVAL — Requires Internal Evidence Before Board Submission",
    ],
    evidenceGapMarker: "[NEEDS_INTERNAL_EVIDENCE]",
    requiresHumanApprovalForFinalization: true,
    authorizedSignOffRoles: [
      "CHIEF_COMPLIANCE_OFFICER",
      "COMMITTEE_MEMBER",
      "BOARD_MEMBER",
    ],
    failClosedConditions: [
      "Draft weakens NFIU 5-year record retention under MLPPA 2022 Section 8.",
      "Draft exceeds 72-hour NDPC data breach notification ceiling under NDPA 2023 Section 40.",
      "Draft waives mandatory Day-0 electronic BVN/NIN verification under CBN Circular PSM/DIR/PUB/CIR/001/053.",
    ],
  },
  buildExecutionPlan: () => [
    {
      step_id: "wf_hydrate",
      step_number: 1,
      title: "Load Institutional Licensing Scope & Internal Playbook Context",
      status: "RUNNING",
    },
    {
      step_id: "wf_retrieve",
      step_number: 2,
      title: "Search Verified Statutory Vault & Live Regulatory Sources",
      status: "PENDING",
    },
    {
      step_id: "wf_synthesize",
      step_number: 3,
      title: "Draft Structured Policy, Operational Controls & Board Resolution",
      status: "PENDING",
    },
  ],
  buildSynthesisDirective: () => `\n<policy_draft_new_execution_blueprint>
MANDATORY 6-PART NET-NEW INSTITUTIONAL COMPLIANCE POLICY ARCHITECTURE (POLICY_DRAFT_NEW):
- Explicitly separate Policy Rule (the binding rule), Operational Procedure (how staff execute it), and Enforcing Control (system/manual check verifying compliance) inside each clause in Section 3.
- Use the 5-column Markdown table schema (\`| Clause Reference | Current Non-Compliant Text | Specific Statutory Breach | Exact Compliant Replacement Text | Statutory Floor & Governing Authority |\`) in Section 3 so the Cogent Policy Compiler can deterministically compile a Clean vNext Policy, Controls, Clocks, and Tasks into the Policy Workflow OS.
- Include the Statutory Timing & Operational Clock Register table (\`| Operational Event / Trigger | Binding Statutory Timing / SLA | Governing Legal Basis |\`).
- Include the P0–P3 Implementation Schedule table (\`| Priority | Mandatory Remediation Action | Accountable Owner | Target / Statutory Deadline |\`) and formal Board Adoption Resolution wording.
- Never fabricate institution-specific board member names or system tool names not provided; mark missing institution-specific facts with \`[NEEDS_INTERNAL_EVIDENCE]\`.
</policy_draft_new_execution_blueprint>`,
  buildTurnGuidance: () =>
    `Execute workflow intent 'POLICY_DRAFT_NEW' directly now using the hydrated statutory vault, statutory reference matrix, institutional records, and live regulatory evidence above. Write the complete, citation-backed institutional policy draft directly (the Policy Workflow OS and Work Product Studio automatically extract structured clauses, clocks, controls, and tasks from your output).`,
};
