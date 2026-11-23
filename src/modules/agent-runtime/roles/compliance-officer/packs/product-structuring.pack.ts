/**
 * Workflow Pack 1: Statutory Product & Feature Structuring Memo
 * Actual Cogent Workflow: PRODUCT_STRUCTURING_MEMO -> statutory_structuring_memo
 */

import type { WorkflowPackDefinition } from "@/contracts/agent-runtime.contracts";

export const PRODUCT_STRUCTURING_PACK: WorkflowPackDefinition = {
  id: "PRODUCT_STRUCTURING_MEMO",
  displayName: "Full Feature Structuring Pack",
  description:
    "Produces an institutional-grade Full Feature Structuring Pack in minutes: Structured Feature Proposal & Materiality Classification, Multi-Domain RIA (CBN/NFIU/NDPC/FCCPC/Disputes/Record-Keeping), Risk & Control Matrix (Preventive/Detective/Corrective + 3LoD Owner + Evidence), Compliance-to-Build Translation Table, 10-Point Non-Overridable Launch Readiness Checklist, APR/EAR Math, and Board Resolutions.",
  workflowType: "PRODUCT_STRUCTURING_MEMO",
  artifactType: "statutory_structuring_memo",
  isWorkProductWorkflow: true,
  densityTier: "TIER_3_EXECUTIVE_DELIVERABLE",
  reasoningSteps: [
    "Classify the proposed feature (New Product / New Feature / Material Modification), financial activity, dependencies, and materiality tier.",
    "Map every activity across CBN, NFIU/AML (incl. March 2026 Automated AML Baseline Standards), NDPC, FCCPC, SEC, NDIC, ARCON, Disputes, and Record-Keeping.",
    "Run deterministic Feature Governance Pack, APR/EAR, license-scope, app-store, and mechanical lock checks before drafting.",
    "Construct the Risk & Control Matrix (Preventive/Detective/Corrective + Line-of-Defence Owner + Required Evidence) and Compliance-to-Build Translation Table (Obligation -> Control -> Product Req -> Engineering Spec -> SOP -> QA Test Case).",
    "Emit the 10-Point Non-Overridable Launch Readiness Checklist, compliant launch sequencing, disclosures, board resolutions, and persist the Work Product.",
  ],
  deterministicPreChecks: [
    "FEATURE_GOVERNANCE_PACK",
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
  systemPromptOverlay: `ACTIVE ASSIGNMENT: PRODUCT & FEATURE STRUCTURING MEMO (FULL FEATURE STRUCTURING PACK)
Output an executive, board-ready Full Feature Structuring Pack covering:
1. **Structured Feature Proposal & Materiality Classification**: Establish Business Objective, Customer Impact, Financial Activity (initiate/receive/hold/transfer/lend), Change Classification (\`NEW_PRODUCT\` / \`NEW_FEATURE\` / \`MATERIAL_MODIFICATION\` / \`MINOR_CHANGE\`), Materiality Tier (\`CRITICAL\` / \`HIGH\` / \`MEDIUM\` / \`LOW\`), Target Market, Revenue Model, Third-Party Dependencies, and Operational Impact.
2. **Executive Verdict & Activity-by-Activity Licensing Matrix** (\`| Proposed Activity | Regulatory Character & Governing Law | Current License Sufficient? | Compliant Restructuring Pathway |\`).
3. **Full Multi-Domain Regulatory Impact Assessment (RIA)** & **Pillar-by-Pillar Statutory & Circular Audit**: Cover KYC/CDD, AML/CFT/CPF (including CBN March 10, 2026 Baseline Standards for Automated AML/CFT/CPF Solutions & NFIU goAML 24h STR), Transaction Monitoring, Sanctions Screening, Consumer Protection, Data Protection (NDPA 2023 / GAID 2025 / CBN 15 June 2026 in-country payment data residency), Record-Keeping (>= 5-year MLPPA/BOFIA reconstruction), and Complaints/Disputes (48h/72h CBN SLAs). Cite exact sections and circular numbers from your grounded evidence (e.g., \`BOFIA 2020 Sections 2, 58, and 59\`, \`CBN New Licence Categorisation Requirements 2021 (PSSP vs. MMO)\`, \`CBN PSHC Guidelines 2021 Section 3.1.2\`, \`CBN Revised MFB Guidelines 2020 Sections 2 & 5\`, \`SEC Rules on Collective Investment Schemes & ISA 2025\`, \`FCCPC DEON Consumer Lending Regulations 2025 Regulations 15, 17, 18, 21 & 27\`, \`CBN Circular PSM/DIR/PUB/CIR/001/053 of 1 December 2023 (mandatory BVN or NIN at onboarding for Tier-1 wallets — never state that Tier-1 allows phone/name only without BVN/NIN)\`, \`Foreign Exchange (Monitoring and Miscellaneous Provisions) Act 1995 Sections 1, 5 & 6 & CBN Revised IMTO Guidelines 2024\`, \`CBN Circular PSS/DIR/PUB/CIR/001/004 of 15 June 2026\`, \`NDPA 2023 Sections 24–27 & 41–43 & NDPC GAID 2025 Article 45 & Schedule 5\`, \`NDIC Act 2023\`, \`ARCON Act 2022 Sections 2, 8, 9, 54 & 57\`, and \`NLRC Act 2005\`).
4. **Risk & Control Matrix (Preventive / Detective / Corrective + Three Lines of Defence Ownership)**: Table mapping \`| Control ID | Compliance Domain | Identified Risk & Severity | Control Type (Preventive / Detective / Corrective) | Required Control | Accountable Owner (1st / 2nd Line) | Required Validation Evidence |\`. Note that 3rd Line Internal Audit provides independent assurance only and never owns operational controls.
5. **Compliance-to-Build Translation Table**: Map the end-to-end chain \`| Regulatory Obligation | Compliance Control | Product Requirement | Engineering Specification | Operational SOP Trigger | QA / Compliance Test Case |\` so Product, Engineering, Operations, and QA can build and validate directly without breaking the compliance chain.
6. **Verified Financial & APR Mathematics Block** (whenever credit rates, weekly/daily convenience fees, or late penalties apply): Display the exact step-by-step mathematical formulas and figures from \`<canonical_computed_financials>\`.
7. **Launch Readiness Checklist (10-Point Non-Overridable Gate) & Compliant Restructuring Pathway**: Include the 10-point non-overridable Launch Readiness Gate checklist (specifying Approved / Conditionally Approved / Rejected criteria), \`Immediate Compliant Launch Scope vs. Deferred Features\` matrix, \`Exact Compliant Footer & Disclosure Replacement\` copy, Post-Launch Monitoring & PIR KPIs, and \`Recommended Board Resolutions\`. Persist the deliverable via \`upsert_work_product_artifact\` (\`statutory_structuring_memo\`).`,
  requiredDeliverableSections: [
    {
      key: "feature_proposal_materiality",
      label: "Structured Feature Proposal & Materiality Classification",
      headingPatterns: ["feature\\s+proposal", "materiality\\s+classification"],
      required: false,
    },
    {
      key: "licensing_matrix",
      label: "Activity-by-Activity Licensing & Structure Matrix",
      headingPatterns: ["activity[- ]by[- ]activity\\s+licensing", "licensing\\s+(?:&|and)\\s+structure\\s+matrix"],
      required: true,
    },
    {
      key: "statutory_audit",
      label: "Pillar-by-Pillar Statutory & Circular Audit / Multi-Domain RIA",
      headingPatterns: ["pillar[- ]by[- ]pillar", "statutory\\s+(?:&|and)\\s+circular\\s+audit", "regulatory\\s+(?:analysis|impact\\s+assessment)"],
      required: true,
    },
    {
      key: "risk_control_matrix",
      label: "Risk & Control Matrix (Preventive / Detective / Corrective)",
      headingPatterns: ["risk\\s+(?:&|and)\\s+control\\s+matrix"],
      required: false,
    },
    {
      key: "compliance_to_build",
      label: "Compliance-to-Build Translation Table",
      headingPatterns: ["compliance[- ]to[- ]build", "product\\s+(?:&|and)\\s+engineering\\s+translation"],
      required: false,
    },
    {
      key: "launch_readiness_checklist",
      label: "Launch Readiness Checklist (Non-Overridable Gate)",
      headingPatterns: ["launch\\s+readiness\\s+checklist", "readiness\\s+gate"],
      required: false,
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
    authorizedSignOffRoles: [
      "LEGAL_COUNSEL",
      "CHIEF_COMPLIANCE_OFFICER",
      "RISK_OFFICER",
      "AML_FRAUD_OFFICER",
      "INFOSEC_OFFICER",
    ],
    failClosedConditions: [
      "Unlicensed deposit-taking, pooled commercial paper yield, or FX dealing outside permitted license scope.",
      "Unit MFB partner deployed nationwide beyond single-LGA scope without National MFB or DMB sponsor.",
      "Offshore primary payment hosting breaching CBN 15 June 2026 data localisation mandate.",
      "Mandatory Preventive/Detective AML, KYC/BVN-NIN, Sanctions, or Authorization controls unverified prior to launch.",
    ],
  },
  buildExecutionPlan: () => [
    {
      step_id: "wf_hydrate",
      step_number: 1,
      title: "Classify Feature Materiality, Institutional Profile & Product Schedule",
      status: "RUNNING",
    },
    {
      step_id: "wf_retrieve",
      step_number: 2,
      title: "Search 141-PDF Statutory Vault & Gated Live Regulatory Web (CBN/NFIU/NDPC/FCCPC)",
      status: "PENDING",
    },
    {
      step_id: "wf_synthesize",
      step_number: 3,
      title: "Compile Full Feature Structuring Pack (RIA, Risk & Control Matrix, Compliance-to-Build, 10-Point Gate)",
      status: "PENDING",
    },
  ],
  buildSynthesisDirective: () =>
    `\nCRITICAL FULL FEATURE STRUCTURING PACK REQUIREMENTS:\n1. Open with '### Structured Feature Proposal & Materiality Classification' (Business Objective, Financial Activity, Change Classification, Materiality Tier, Target Market, Revenue Model, Dependencies, Operational Impact).\n2. Include a Markdown table titled '### Activity-by-Activity Licensing & Structure Matrix' with columns: | Proposed Activity | Regulatory Character & Governing Law | Current License Sufficient? | Compliant Restructuring Pathway |.\n3. Include a dedicated '### Full Multi-Domain Regulatory Impact Assessment (RIA) & Pillar-by-Pillar Statutory Audit' covering KYC/CDD, AML/CFT/CPF (including CBN 10 Mar 2026 Automated AML Baseline Standards & NFIU goAML 24h STR), Transaction Monitoring, Sanctions, Consumer Protection, Data Protection (NDPA 2023 / GAID 2025 / CBN 15 Jun 2026 data localisation), Record-Keeping (>= 5 years), and Disputes/Complaints (48h/72h CBN SLAs), incorporating every statutory violation and circular reference identified in <deterministic_structuring_findings>, <deterministic_feature_governance_pack>, and <verified_statutory_vault>.\n4. Include '### Risk & Control Matrix (Preventive / Detective / Corrective)' mapping every material risk to Control ID, Domain, Risk & Severity, Control Type, Required Control, Accountable Owner (1st Line / 2nd Line), and Required Evidence.\n5. Include '### Compliance-to-Build Translation Table' mapping | Regulatory Obligation | Compliance Control | Product Requirement | Engineering Specification | Operational SOP Trigger | QA / Compliance Test Case |.\n6. Include a dedicated '### Verified Financial & APR Mathematics' section displaying the exact formulas and locked figures from <canonical_computed_financials> whenever loan pricing or fees are present.\n7. Include '### Launch Readiness Checklist (10-Point Non-Overridable Gate)' (specifying non-overridable mandatory blockers and 2nd-Line sign-off rules; noting 3rd-Line Internal Audit provides independent assurance only), followed by '### Immediate Compliant Launch Scope vs. Deferred Features', '### Exact Compliant Footer & Disclosure Replacement', and '### Recommended Board Resolutions'.`,
  buildTurnGuidance: () =>
    `Execute workflow intent 'PRODUCT_STRUCTURING_MEMO' directly now using the hydrated statutory vault, deterministic feature governance pack, statutory reference matrix, institutional records, and live evidence above. Do NOT repeat redundant search tool calls unless a critical gap remains; write the complete Full Feature Structuring Pack directly (the Work Product Studio automatically saves your output and enables 1-click promotion to the Feature Governance Registry).`,
};
