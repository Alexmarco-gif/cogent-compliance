/**
 * Workflow Pack 8: On-Demand Compliance Document & Operational Work Product
 * Actual Cogent Workflow: GENERAL_COMPLIANCE_DOCUMENT -> compliance_document
 *
 * Handles ANY ad-hoc compliance document creation request (board briefs, executive memos,
 * circular impact summaries, operational checklists, contract/vendor risk reviews,
 * regulator correspondence, incident briefs, risk registers, training guides, or turning
 * an existing chat research thread / uploaded PDF into a downloadable Word/PDF document)
 * without requiring the user to pick one of the preset specialized workflows first.
 */

import type { WorkflowPackDefinition } from "@/contracts/agent-runtime.contracts";

export const GENERAL_COMPLIANCE_DOCUMENT_PACK: WorkflowPackDefinition = {
  id: "GENERAL_COMPLIANCE_DOCUMENT",
  displayName: "On-Demand Compliance Document & Work Product",
  description:
    "Synthesizes any ad-hoc compliance document—executive briefs, memos, circular summaries, operational checklists, contract risk reviews, regulator letters, incident reports, or risk registers—grounded in uploaded files, conversation history, the Statutory Vault, internal knowledge, and live web intelligence, saved directly to the editable Studio Canvas for PDF/DOCX export.",
  workflowType: "GENERAL_COMPLIANCE_DOCUMENT",
  artifactType: "compliance_document",
  isWorkProductWorkflow: true,
  densityTier: "TIER_3_EXECUTIVE_DELIVERABLE",
  reasoningSteps: [
    "Review the user's exact deliverable request, any uploaded document/PDF/DOCX extracts (including earlier attachments in the thread), and prior conversation findings.",
    "Cross-reference applicable statutory obligations from the Verified Statutory Vault, institutional truth from the tenant Knowledge Base & Rate Cards, and current external updates from Live Web Intelligence.",
    "Choose the most appropriate executive document architecture for the specific artifact requested (e.g., Executive Memo, Regulatory Impact Brief, Compliance Checklist, Contract Risk Review, Regulator Letter, Incident Report, or Operational Playbook).",
    "Draft a complete, thorough, self-contained, board-ready Markdown document with exact citations, concrete obligations/deadlines/owners, and explicit `[NEEDS_INTERNAL_EVIDENCE]` flags wherever tenant-specific operational facts are unverified.",
    "Persist the completed deliverable via `upsert_work_product_artifact` (`workflow_type: 'GENERAL_COMPLIANCE_DOCUMENT'`, `artifact_type: 'compliance_document'`) so the user can edit inline and export immediately to PDF or Word (.docx).",
  ],
  deterministicPreChecks: ["STATUTORY_REFERENCE_MATRIX"],
  allowedTools: [
    "get_conversation_context",
    "search_regulatory_evidence",
    "get_regulatory_provision",
    "verify_regulatory_evidence",
    "assess_regulatory_applicability",
    "search_institutional_knowledge",
    "get_product_approved_terms",
    "recall_institutional_precedents",
    "search_live_web",
    "fetch_live_url_content",
    "search_nigerian_regulations",
    "calculate_effective_apr_and_drip_fees",
    "verify_license_scope_matrix",
    "compare_african_jurisdictions",
    "upsert_work_product_artifact",
  ],
  maxToolRounds: 4,
  temperature: 0.2,
  prefersLiveWebSearch: true,
  systemPromptOverlay: `ACTIVE ASSIGNMENT: ON-DEMAND COMPLIANCE DOCUMENT & WORK PRODUCT SYNTHESIS
Produce a complete, publication-ready, standalone compliance document tailored precisely to what the user requested (for example: Executive Brief, Board Memo, Circular Impact Assessment, Compliance Checklist, Contract / Vendor Risk Review, Regulator Correspondence / Response Letter, Incident Report, Risk Register, Training Note, or Summary Report).

DOCUMENT QUALITY & DEPTH STANDARDS:
- Deliver the FULL finished document directly—never output a 3-line stub, placeholder outline, or refusal telling the user to select a workflow.
- Start with a crisp, descriptive \`###\` document title and a structured Document Control / Executive Metadata block (Prepared For, Date / Scope, Regulatory Authorities, Overall Risk / Status) followed by clear \`###\` and \`####\` sections tailored to the requested deliverable.
- Ground every substantive point in:
  1. Verbatim facts, clauses, dates, and figures from any uploaded PDF/DOCX/file or prior thread messages;
  2. Verified statutory provisions with human-readable citations (e.g., \`[CBN CPR 2019 Reg. 4.2.5]\`, \`[NDPA 2023 Section 40(1)]\`, \`[FCCPA 2018 Section 115]\`);
  3. Internal workspace product truth / knowledge rules when present;
  4. Real-time external updates from live web evidence (explicitly qualified with clickable Markdown links ONLY for exact retrieved URLs).
- Use clean Markdown tables wherever comparing obligations, clauses, risks, deadlines, owners, or controls, and numbered remediation / implementation steps with clear ownership and timelines.
- Never fabricate internal operational facts, past filings, or unverified URLs; mark any missing institution-specific detail with \`[NEEDS_INTERNAL_EVIDENCE]\`.
- Do NOT force an unrelated marketing KFS or campaign flyer audit template onto non-marketing compliance documents.
- Persist the finished document via \`upsert_work_product_artifact\` using \`workflow_type: "GENERAL_COMPLIANCE_DOCUMENT"\` and \`artifact_type: "compliance_document"\` (the Work Product Studio also automatically saves your document for inline Word editing and PDF/DOCX export).`,
  requiredDeliverableSections: [
    {
      key: "document_header_or_summary",
      label: "Executive Summary / Overview",
      headingPatterns: [
        "executive\\s+summary",
        "overview",
        "purpose",
        "background",
        "summary",
        "subject",
      ],
      required: true,
    },
    {
      key: "actionable_analysis_or_checklist",
      label: "Detailed Analysis, Obligations & Action Plan",
      headingPatterns: [
        "obligations?",
        "findings?",
        "analysis",
        "risks?",
        "requirements?",
        "checklist",
        "action\\s+plan",
        "recommendations?",
        "next\\s+steps",
        "remediation",
      ],
      required: true,
    },
  ],
  escalationPolicy: {
    verdictOptions: [
      "ACTION_REQUIRED",
      "CONDITIONAL_COMPLIANCE",
      "INFORMATIONAL_BRIEF",
      "LEGAL_COUNSEL_REVIEW_RECOMMENDED",
    ],
    evidenceGapMarker: "[NEEDS_INTERNAL_EVIDENCE]",
    requiresHumanApprovalForFinalization: true,
    authorizedSignOffRoles: ["LEGAL_COUNSEL", "CHIEF_COMPLIANCE_OFFICER"],
    failClosedConditions: [
      "Never fabricate institution-specific metrics, incident root causes, filing dates, or external URLs—mark missing internal facts with [NEEDS_INTERNAL_EVIDENCE].",
      "Never weaken statutory legal floors or claim formal regulatory approval without Legal/CCO sign-off.",
    ],
  },
  buildExecutionPlan: ({ hasAttachmentsOrUrls }) => [
    {
      step_id: "wf_hydrate",
      step_number: 1,
      title: hasAttachmentsOrUrls
        ? "Extract Uploaded Document / URL Context & Workspace Truth"
        : "Hydrate Conversation History, Workspace & Institutional Context",
      status: "RUNNING",
    },
    {
      step_id: "wf_retrieve",
      step_number: 2,
      title: "Cross-Reference Statutory Vault, Internal Playbooks & Real-Time Web Intelligence",
      status: "PENDING",
    },
    {
      step_id: "wf_synthesize",
      step_number: 3,
      title: "Draft Publication-Ready Compliance Document & Save to Studio Canvas",
      status: "PENDING",
    },
  ],
  buildTurnGuidance: () =>
    `Draft the complete, thorough, publication-ready compliance document directly now using the uploaded document content, conversation history, verified statutory vault, internal knowledge base, and live web evidence above. Do NOT write a brief meta-summary or tell the user to run a workflow—write the full standalone document directly in clean editorial Markdown (the Work Product Studio will save and open it for immediate inline editing and PDF/DOCX export).`,
};
