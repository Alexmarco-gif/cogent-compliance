/**
 * Workflow Pack 2: Internal Policy & SOP Statutory Gap Redline
 * Actual Cogent Workflow: POLICY_GAP_REDLINE -> policy_gap_redline
 */

import type { WorkflowPackDefinition } from "@/contracts/agent-runtime.contracts";

export const POLICY_GAP_REDLINE_PACK: WorkflowPackDefinition = {
  id: "POLICY_GAP_REDLINE",
  displayName: "Internal Policy & SOP Gap Redline",
  description:
    "Audits internal compliance policies and SOPs against Nigerian statutory floors and regulatory circulars, outputting a 6-part executive legal redline package with atomic sub-clause replacements.",
  workflowType: "POLICY_GAP_REDLINE",
  artifactType: "policy_gap_redline",
  isWorkProductWorkflow: true,
  densityTier: "TIER_3_EXECUTIVE_DELIVERABLE",
  reasoningSteps: [
    "Establish institutional licensing perimeter and operative dates of governing statutes and circulars.",
    "Decompose every section of the submitted policy into atomic legal obligations without dropping or collapsing sections.",
    "Map each defective clause against non-negotiable statutory floors (NFIU 5-year retention, NDPA 72-hour breach notice, CBN 24h/48h clocks, DEON 2025, CBN Guide to Charges).",
    "Draft drop-in compliant replacement clauses in institutional legal prose alongside a Statutory Operational Clock Register.",
    "Sequence remediation actions (P0–P3) with accountable owners and provide ready-to-sign Board withdrawal/adoption resolutions.",
  ],
  deterministicPreChecks: [
    "POLICY_STATUTORY_GAP_DIFF",
    "STATUTORY_REFERENCE_MATRIX",
  ],
  allowedTools: [
    "compare_policy_against_regulation",
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
  systemPromptOverlay: `ACTIVE ASSIGNMENT: INTERNAL POLICY & SOP GAP REDLINE
Deliver a production-grade 6-part Statutory Gap Audit & Redline Package adapted dynamically to the submitted document:
1. **Executive Decision Header & Section 1 — Application and Drafting Basis**: State the evidence-based compliance verdict (e.g., \`REJECT — Immediate Withdrawal and Replacement Required\` when critical statutory breaches exist, \`CONDITIONAL APPROVAL — Mandatory Redlines Required\`, or \`APPROVE\`), clarify relevant institutional licensing boundaries (e.g., PSSP vs. licensed Lender of Record under \`FCCPC DEON Regulations 2025 Regs. 8 & 10–13\`, direct applicability of \`CBN AML/CFT/CPF Regulations 2022\` to PSPs/Financial Institutions, MFB default tariff caps under \`CBN Guide to Charges 2020 Part 2(A), Section 2.5 & Footnote 3\` [1% flat/month after mandatory 3-day grace period under \`CBN CPR 2019 Reg. 4.6(b)–(c)\`]), and note operative dates (\`FCCPC DEON 2025\` eff. 21 July 2025; \`NDPC GAID 2025\` issued 20 March 2025, commenced 19 September 2025).
2. **Section 2 — Policy Gap Redline Matrix (Section-by-Section Titled Tables with Atomic Sub-Clause Splitting)**: Mirror the submitted policy's actual sections sequentially in separate section-titled Markdown tables (\`| Clause Reference | Current Non-Compliant Text | Specific Statutory Breach | Exact Compliant Replacement Text | Statutory Floor & Governing Authority |\`), splitting compound clauses into atomic sub-clauses (\`X.1, X.2, ...\`) where distinct obligations arise. Never weaken NFIU at-least-5-year retention (\`MLPPA 2022 Section 8\`), NDPC 72-hour breach notice (\`NDPA 2023 Section 40\`), or CBN KYC limits.
3. **Section 3 — Mandatory Statutory Timing & Operational Clock Register**: Render an SLA & statutory clock table (\`| Operational Event / Trigger | Binding Statutory Timing / SLA | Governing Legal Basis |\`) covering all statutory clocks applicable to the policy (complaint 24h acknowledgement \`CBN CPR 2019 Regs. 6.2.2 & 6.3.2\` vs 5-day enquiry rule \`Reg. 3.2.6\`, \`DEON Reg. 22(d)\` 24h–48h lending complaint SLA, \`DEON Reg. 21(b)\` 24h usage statement, \`CBN Instant EFT 2018\` clocks, \`CBN 29 May 2020\` 24h/48h dispense error circular, 3-day default grace period & 8 a.m.–9 p.m. window, \`NDPA s. 40\` breach clocks, \`MLPPA 2022\` 24h STR / 7d CTR / 1d FTR / 5y retention, and \`CBN Payments Data Localisation Circular (15 June 2026) & FAQ (4 Nov 2026)\` 1 January 2027 deadline).
4. **Section 4 — Additional Governance Clauses Required**: Draft missing mandatory governance clauses across the relevant policy domains.
5. **Section 5 — Prioritized Remediation & Implementation Schedule**: Render a structured Markdown table (\`| Priority | Mandatory Remediation Action | Accountable Owner | Target / Statutory Deadline |\`).
6. **Section 6 — Board Approval / Adoption & Withdrawal Resolution Wording**: Draft formal Board resolution text aligned with the verdict. Persist via \`upsert_work_product_artifact\` (\`policy_gap_redline\`).`,
  requiredDeliverableSections: [
    {
      key: "application_basis",
      label: "Section 1 — Application and Drafting Basis",
      headingPatterns: ["application\\s+(?:&|and)\\s+drafting\\s+basis", "executive\\s+decision"],
      required: true,
    },
    {
      key: "redline_matrix",
      label: "Section 2 — Policy Gap Redline Matrix",
      headingPatterns: ["policy\\s+gap\\s+redline\\s+matrix", "clause\\s+reference"],
      required: true,
    },
    {
      key: "operational_clock_register",
      label: "Section 3 — Mandatory Statutory Timing & Operational Clock Register",
      headingPatterns: ["operational\\s+clock\\s+register", "statutory\\s+timing"],
      required: true,
    },
    {
      key: "governance_clauses",
      label: "Section 4 — Additional Governance Clauses Required",
      headingPatterns: ["additional\\s+governance\\s+clauses"],
      required: true,
    },
    {
      key: "remediation_schedule",
      label: "Section 5 — Prioritized Remediation & Implementation Schedule",
      headingPatterns: ["prioritized\\s+remediation", "implementation\\s+schedule"],
      required: true,
    },
    {
      key: "board_resolution",
      label: "Section 6 — Board Approval / Adoption & Withdrawal Resolution Wording",
      headingPatterns: ["board\\s+(?:approval|adoption|resolution)"],
      required: true,
    },
  ],
  escalationPolicy: {
    verdictOptions: [
      "REJECT — Immediate Withdrawal and Replacement Required",
      "CONDITIONAL APPROVAL — Mandatory Redlines Required",
      "APPROVE",
    ],
    evidenceGapMarker: "[NEEDS_INTERNAL_EVIDENCE]",
    requiresHumanApprovalForFinalization: true,
    authorizedSignOffRoles: ["LEGAL_COUNSEL", "CHIEF_COMPLIANCE_OFFICER"],
    failClosedConditions: [
      "Replacement clause weakens NFIU 5-year record retention under MLPPA 2022 Section 8.",
      "Replacement clause exceeds 72-hour NDPC data breach notification window under NDPA 2023 Section 40.",
      "Policy permits 30-day BVN/NIN onboarding deferral or contact-scraping/shaming collections.",
    ],
  },
  buildExecutionPlan: () => [
    {
      step_id: "wf_hydrate",
      step_number: 1,
      title: "Load Internal Policy Manual & Playbook Rules",
      status: "RUNNING",
    },
    {
      step_id: "wf_retrieve",
      step_number: 2,
      title: "Search 141-PDF Statutory Vault & Gated Live Regulatory Web",
      status: "PENDING",
    },
    {
      step_id: "wf_synthesize",
      step_number: 3,
      title: "Draft Guardrail-Verified Deliverable Work Product",
      status: "PENDING",
    },
  ],
  buildSynthesisDirective: () => `\n<policy_gap_redline_execution_blueprint>
MANDATORY 6-PART EXECUTIVE LEGAL DELIVERABLE ARCHITECTURE FOR POLICY_GAP_REDLINE:
1. **Executive Decision Header & Section 1 — Application and Drafting Basis**:
   - Determine the formal compliance decision dynamically from your statutory findings (e.g., \`Decision: REJECT [Policy Version] — Immediate Withdrawal and Replacement Required\` when critical statutory breaches exist; \`CONDITIONAL APPROVAL — Mandatory Redlines Required Prior to Issuance\` for moderate/minor omissions; or \`APPROVE\` if fully compliant). Identify the exact institution name and policy title/version from the user prompt and \`internal_institutional_truth\`.
   - Explicitly set out the applicable **Institutional Licensing Scope & Statutory Framework**:
     * Use \`policy_gap_analysis.institutional_scope_guidance\` and \`internal_institutional_truth.license_tier\` (where present) to clarify licensing boundaries relevant to the policy's subject matter—for example: PSSP vs. Licensed Lender of Record under \`FCCPC DEON Regulations 2025 Regs. 8 & 10–13\` (eff. 21 July 2025) if consumer lending is involved; direct accountability of Financial Institutions and PSPs under \`CBN AML/CFT/CPF Regulations 2022\` if KYC/AML is involved; MFB default tariff caps (\`1% flat/month\` after a mandatory minimum \`3-day grace period\` under \`CBN Guide to Charges 2020 Part 2(A), Section 2.5 & Footnote 3\` and \`CBN CPR 2019 Reg. 4.6(b)–(c)\`) if penalty pricing is involved; and operative status of \`NDPA 2023\` & \`NDPC GAID 2025\` (issued 20 March 2025, commenced 19 Sept 2025) if personal data processing is involved.
2. **Section 2 — Policy Gap Redline Matrix (Section-by-Section Titled Tables with Atomic Sub-Clause Splitting)**:
   - Mirror EVERY actual section and clause of the submitted policy in sequential order using separate section-titled Markdown tables (e.g., \`#### [Actual Section Heading from the SOP/Policy]\`). Do NOT collapse multi-section policies into a single coarse summary table, and do NOT invent sections absent from the submitted document.
   - Whenever a policy section combines multiple distinct legal obligations (e.g., bundled consent + opt-out + device permissions + telemetry; OR default rate + contact hours + third-party contact + public defamation; OR retention + cross-border hosting + breach notice; OR channels + acknowledgement + EFT/chargeback SLAs + post-resolution remedies; OR KYC waivers + EDD + STR + CTR/FTR + tipping-off), split it into atomic sub-clauses (\`X.1, X.2, X.3...\`) using the 5-column Markdown schema:
     \`| Clause Reference | Current Non-Compliant Text | Specific Statutory Breach | Exact Compliant Replacement Text | Statutory Floor & Governing Authority |\`
   - Ground every breach and replacement clause in exact subsections from \`policy_gap_analysis.subclause_gap_matrix\`, \`verified_statutory_vault\`, and \`untrusted_live_web_evidence\` (distinguishing e.g. \`NDPA 2023 Sections 25(1)(a) & 26(2)\` for conditional/bundled consent vs. \`Section 35\` for withdrawal of consent, \`NDPA s. 40\` for 72h breach notice, \`MLPPA 2022 s. 8\` for 5-year retention, \`s. 7\` for 24h zero-threshold STR vs. \`s. 11\` 7-day CTR vs. \`s. 3(1)\` 1-day FTR, \`CBN CPR 2019 Regs. 6.2.2 & 6.3.2\` 24h complaint acknowledgement vs. \`Reg. 3.2.6\` 5-day enquiry rule, \`CBN Instant EFT Reg 2018\`, \`CBN Circular 29 May 2020\`, and \`CBN Payments Data Localisation Circular 15 June 2026 & FAQ 4 Nov 2026\`).
3. **Section 3 — Mandatory Statutory Timing & Operational Clock Register**:
   - Render a Markdown table (\`| Operational Event / Trigger | Binding Statutory Timing / SLA | Governing Legal Basis |\`) covering every statutory clock applicable to the reviewed policy from \`policy_gap_analysis.mandatory_operational_clocks\` and verified sources, followed by practical operational cautions.
4. **Section 4 — Additional Governance Clauses Required**:
   - Draft missing mandatory governance clauses required to make the policy audit-ready (grouped logically by the domains covered in the policy, e.g., Privacy/DPO/DPIA accountability, Collections/Lender-of-Record oversight, or Complaint Management & MLRO/Board AML governance).
5. **Section 5 — Prioritized Remediation & Implementation Schedule**:
   - Render a structured Markdown table (\`| Priority | Mandatory Remediation Action | Accountable Owner | Target / Statutory Deadline |\`) prioritized by urgency (P0 Immediate / Day 0–24h, P1 Short-Term / 72h, P2 Medium-Term / 7–14 Days, P3 Long-Term / Statutory Milestone) tailored to the actual gaps found.
6. **Section 6 — Board Approval / Adoption & Withdrawal Resolution Wording**:
   - Provide formal, ready-to-sign Board Resolution wording tailored to the exact decision (withdrawing/superseding defective SOP version if rejected, adopting the redlined compliant version, and mandating technical & regulatory compliance certification).
</policy_gap_redline_execution_blueprint>`,
  buildTurnGuidance: () =>
    `Execute workflow intent 'POLICY_GAP_REDLINE' directly now using the hydrated statutory vault, statutory reference matrix, institutional records, and live evidence above. Do NOT repeat redundant search tool calls unless a critical gap remains; write the complete citation-backed deliverable directly (the Work Product Studio automatically saves your output).`,
};
