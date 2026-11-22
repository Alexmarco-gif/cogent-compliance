/**
 * Workflow Pack 1: Statutory Product & Feature Structuring Memo
 * Actual Cogent Workflow: PRODUCT_STRUCTURING_MEMO -> statutory_structuring_memo
 */

import type { WorkflowPackDefinition } from "@/contracts/agent-runtime.contracts";

export const PRODUCT_STRUCTURING_PACK: WorkflowPackDefinition = {
  id: "PRODUCT_STRUCTURING_MEMO",
  displayName: "Product & Feature Structuring Memo",
  description:
    "Produces board-ready Nigerian & multi-regulator product structuring memos covering license permissibility, APR/EAR mathematics, KYC/FX/data residency, and compliant launch sequencing.",
  workflowType: "PRODUCT_STRUCTURING_MEMO",
  artifactType: "statutory_structuring_memo",
  isWorkProductWorkflow: true,
  densityTier: "TIER_3_EXECUTIVE_DELIVERABLE",
  reasoningSteps: [
    "Deconstruct each proposed product activity and map it against CBN, SEC, FCCPC, NDPC, NDIC, ARCON, and NLRC statutory perimeters.",
    "Verify whether the institution's current license tier and partner bank tier lawfully cover every proposed activity.",
    "Run deterministic APR/EAR, license-scope, app-store, and mechanical lock checks before drafting narrative conclusions.",
    "Separate immediate compliant launch scope from deferred features requiring licensing, partner restructuring, or regulatory clearance.",
    "Draft board-ready resolutions, exact compliant disclosure replacements, and persist the validated Work Product.",
  ],
  deterministicPreChecks: [
    "APR_AND_DRIP_PRICING",
    "LICENSE_SCOPE_MATRIX",
    "APP_STORE_AUDIT",
    "MECHANICAL_LOCKS",
    "STATUTORY_REFERENCE_MATRIX",
  ],
  allowedTools: [
    "search_regulatory_evidence",
    "get_regulatory_provision",
    "verify_regulatory_evidence",
    "assess_regulatory_applicability",
    "search_institutional_knowledge",
    "get_product_approved_terms",
    "search_live_web",
    "fetch_live_url_content",
    "calculate_effective_apr_and_drip_fees",
    "calculate_cbn_apr_and_drip_pricing",
    "verify_license_scope_matrix",
    "audit_app_store_listing",
    "run_deterministic_compliance_locks",
    "recall_institutional_precedents",
    "match_product_rate_card",
    "search_nigerian_regulations",
    "upsert_work_product_artifact",
  ],
  maxToolRounds: 3,
  temperature: 0.2,
  prefersLiveWebSearch: true,
  systemPromptOverlay: `ACTIVE ASSIGNMENT: PRODUCT & FEATURE STRUCTURING MEMO
Output an executive, board-ready Statutory Product Structuring Memo covering:
1. **Executive Verdict & Activity-by-Activity Licensing Matrix** (\`| Proposed Activity | Regulatory Character & Governing Law | Current License Sufficient? | Compliant Restructuring Pathway |\`).
2. **Pillar-by-Pillar Statutory & Circular Audit**: Cite exact sections and circular numbers from your grounded evidence (e.g., \`BOFIA 2020 Sections 2, 58, and 59\`, \`CBN New Licence Categorisation Requirements 2021 (PSSP vs. MMO)\`, \`CBN PSHC Guidelines 2021 Section 3.1.2\`, \`CBN Revised MFB Guidelines 2020 Sections 2 & 5 (Unit MFB single-LGA geographic restriction vs. National MFB)\`, \`SEC Rules on Collective Investment Schemes & ISA 2025 (commercial paper pooling)\`, \`FCCPC DEON Consumer Lending Regulations 2025 Regulations 15, 17, 18, 21 & 27\`, \`CBN Circular PSM/DIR/PUB/CIR/001/053 of 1 December 2023 (mandatory BVN or NIN at onboarding for Tier-1 wallets — never state that Tier-1 allows phone/name only without BVN/NIN)\`, \`Foreign Exchange (Monitoring and Miscellaneous Provisions) Act 1995 Sections 1, 5 & 6 & CBN Revised IMTO Guidelines 2024\`, \`CBN Circular PSS/DIR/PUB/CIR/001/004 of 15 June 2026 (mandatory in-country Nigerian payment data localization — never claim foreign cloud regions like AWS Cape Town satisfy primary Nigerian payment data residency)\`, \`NDPA 2023 Sections 24–27 & 41–43 & NDPC GAID 2025 Article 45 & Schedule 5\`, \`NDIC Act 2023 (₦2,000,000 MFB / ₦5,000,000 DMB coverage limits)\`, \`ARCON Act 2022 Sections 2, 8, 9, 54 & 57\`, and \`National Lottery Regulatory Commission (NLRC) Act 2005\`).
3. **Verified Financial & APR Mathematics Block** (whenever credit rates, weekly/daily convenience fees, or late penalties apply): Display the exact step-by-step mathematical formulas and figures from \`<canonical_computed_financials>\` (Period Cost, Simple Nominal APR, Compound Effective Annual Rate [EAR], and Annualized Late Penalty Rate).
4. **Compliant Restructuring Pathway**: Include an \`Immediate Compliant Launch Scope vs. Deferred Features\` matrix, \`Exact Compliant Footer & Disclosure Replacement\` copy, and \`Recommended Board Resolutions\`. Persist the deliverable via \`upsert_work_product_artifact\` (\`statutory_structuring_memo\`).`,
  requiredDeliverableSections: [
    {
      key: "licensing_matrix",
      label: "Activity-by-Activity Licensing & Structure Matrix",
      headingPatterns: ["activity[- ]by[- ]activity\\s+licensing", "licensing\\s+(?:&|and)\\s+structure\\s+matrix"],
      required: true,
    },
    {
      key: "statutory_audit",
      label: "Pillar-by-Pillar Statutory & Circular Audit",
      headingPatterns: ["pillar[- ]by[- ]pillar", "statutory\\s+(?:&|and)\\s+circular\\s+audit", "regulatory\\s+analysis"],
      required: true,
    },
    {
      key: "launch_scope",
      label: "Immediate Compliant Launch Scope vs. Deferred Features",
      headingPatterns: ["immediate\\s+compliant\\s+launch\\s+scope", "deferred\\s+features"],
      required: true,
    },
    {
      key: "disclosure_replacement",
      label: "Exact Compliant Footer & Disclosure Replacement",
      headingPatterns: ["compliant\\s+footer", "disclosure\\s+replacement"],
      required: true,
    },
    {
      key: "board_resolutions",
      label: "Recommended Board Resolutions",
      headingPatterns: ["board\\s+resolution"],
      required: true,
    },
  ],
  escalationPolicy: {
    verdictOptions: ["HOLD — RESTRUCTURE REQUIRED", "CONDITIONAL LAUNCH", "PROCEED"],
    evidenceGapMarker: "[NEEDS_INTERNAL_EVIDENCE]",
    requiresHumanApprovalForFinalization: true,
    authorizedSignOffRoles: ["LEGAL_COUNSEL", "CHIEF_COMPLIANCE_OFFICER"],
    failClosedConditions: [
      "Unlicensed deposit-taking, pooled commercial paper yield, or FX dealing outside permitted license scope.",
      "Unit MFB partner deployed nationwide beyond single-LGA scope without National MFB or DMB sponsor.",
      "Offshore primary payment hosting breaching CBN 15 June 2026 data localisation mandate.",
    ],
  },
  buildExecutionPlan: () => [
    {
      step_id: "wf_hydrate",
      step_number: 1,
      title: "Hydrate Institutional Profile & Approved Product Schedule",
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
  buildSynthesisDirective: () =>
    `\nCRITICAL STRUCTURING MEMO REQUIREMENTS:\n1. Include a Markdown table titled '### Activity-by-Activity Licensing & Structure Matrix' with columns: | Proposed Activity | Regulatory Character & Governing Law | Current License Sufficient? | Compliant Restructuring Pathway |.\n2. Include a dedicated '### Verified Financial & APR Mathematics' section displaying the exact formulas and locked figures from <canonical_computed_financials> (Period Cost, Simple Nominal APR, Compound Effective Annual Rate [EAR], and Annualized Late Penalty Rate) whenever loan pricing or fees are present.\n3. Incorporate every statutory violation and circular reference identified in <deterministic_structuring_findings> and <verified_statutory_vault> (including BOFIA 2020 Sections 2, 58 & 59; CBN New Licence Categorisation 2021 PSSP vs. MMO capital & scope; CBN Revised MFB Guidelines 2020 Sections 2 & 5 on Unit MFB single-LGA geographic restriction vs. National MFB for nationwide apps; SEC Collective Investment Scheme [CIS] & ISA 2025 rules on pooling user funds into commercial papers; FCCPC DEON Consumer Lending Regulations 2025 Regulations 15, 17, 18, 21 & 27; CBN Circular PSM/DIR/PUB/CIR/001/053 of 1 Dec 2023 mandating BVN or NIN at onboarding for Tier-1 wallets; Foreign Exchange Act 1995 Sections 1, 5 & 6 and CBN Revised IMTO Guidelines 2024; CBN Circular PSS/DIR/PUB/CIR/001/004 of 15 June 2026 requiring in-country Nigerian payment data residency + NDPA 2023 Sections 24–27 & 41–43 + NDPC GAID 2025 Art. 45 & Schedule 5; NDIC Act 2023 ₦2,000,000 MFB coverage limit; ARCON Act 2022 Sections 2, 8, 9, 54 & 57; and NLRC Act 2005 lottery permits).\n4. Close with an '### Immediate Compliant Launch Scope vs. Deferred Features' table, '### Exact Compliant Footer & Disclosure Replacement' block, and '### Recommended Board Resolutions'.`,
  buildTurnGuidance: () =>
    `Execute workflow intent 'PRODUCT_STRUCTURING_MEMO' directly now using the hydrated statutory vault, statutory reference matrix, institutional records, and live evidence above. Do NOT repeat redundant search tool calls unless a critical gap remains; write the complete citation-backed deliverable directly (the Work Product Studio automatically saves your output).`,
};
