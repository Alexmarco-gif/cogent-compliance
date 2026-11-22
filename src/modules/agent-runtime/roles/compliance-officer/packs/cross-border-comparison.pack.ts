/**
 * Workflow Pack 4: Pan-African & Global Cross-Border Regulatory Comparison
 * Actual Cogent Workflow: CROSS_BORDER_COMPARISON -> cross_border_matrix
 */

import type { WorkflowPackDefinition } from "@/contracts/agent-runtime.contracts";

export const CROSS_BORDER_COMPARISON_PACK: WorkflowPackDefinition = {
  id: "CROSS_BORDER_COMPARISON",
  displayName: "Cross-Border Regulatory Comparison Matrix",
  description:
    "Compares licensing, capital, escrow, local equity, residency, FX, and data residency rules side-by-side across African and global financial corridors.",
  workflowType: "CROSS_BORDER_COMPARISON",
  artifactType: "cross_border_matrix",
  isWorkProductWorkflow: true,
  densityTier: "TIER_3_EXECUTIVE_DELIVERABLE",
  reasoningSteps: [
    "Identify every requested sovereign jurisdiction and map its primary financial, payments, securities, and data-protection regulators.",
    "Execute parallel Vault + Live Web retrieval across each jurisdiction and pillar.",
    "Distinguish statutory issuance dates vs. effective deadlines, paid-up share capital vs. refundable central bank escrow deposits, and granular license tiers.",
    "Document local equity shareholding mandates, resident director/CEO requirements, and bank-led vs. standalone licensing models.",
    "Synthesize both a side-by-side Markdown comparison matrix and a pillar-by-pillar market-entry analysis.",
  ],
  deterministicPreChecks: ["STATUTORY_REFERENCE_MATRIX"],
  allowedTools: [
    "compare_african_jurisdictions",
    "search_live_web",
    "fetch_live_url_content",
    "search_regulatory_evidence",
    "get_regulatory_provision",
    "search_institutional_knowledge",
    "recall_institutional_precedents",
    "upsert_work_product_artifact",
  ],
  maxToolRounds: 4,
  temperature: 0.2,
  prefersLiveWebSearch: true,
  systemPromptOverlay: `ACTIVE ASSIGNMENT: CROSS-BORDER REGULATORY MATRIX & COMPARISON
Build both a comprehensive side-by-side Markdown comparison matrix AND a detailed pillar-by-pillar breakdown across every requested jurisdiction using Verified Vault + Live Web evidence. Persist via \`upsert_work_product_artifact\` (\`cross_border_matrix\`).
Universal Statutory Precision Standards (Strictly Grounded in Retrieved Evidence):
- **Circular Issuance Date vs. Effective Compliance Deadline**: Always distinguish the date an act, directive, or circular was issued from its effective compliance deadline, citing the exact reference code/bill title found in the retrieved evidence.
- **Paid-Up Share Capital vs. Refundable Security/Escrow Deposits**: Explicitly separate minimum paid-up share capital from refundable central bank security/escrow deposits and state any directionality or entity-eligibility restrictions (such as inbound-only vs. outbound remittance scope or bank/fintech holding restrictions) present in the retrieved sources.
- **Granular Statutory License Schedule Tiers**: Cite exact statutory schedule tiers and capital figures per license class from the retrieved primary sources rather than collapsing distinct license classes into vague ranges.
- **Local Equity & Board Residency Governance**: State both local equity shareholding percentages AND board composition / resident director / resident CEO requirements as specified in the retrieved evidence for each jurisdiction.
- **Bank-Led vs. Standalone Licensing & Settlement Models**: Specify whether wallet/e-money issuance, card BIN clearing, or FX settlement requires a direct license or a commercial bank / authorized dealer sponsorship arrangement.`,
  requiredDeliverableSections: [
    {
      key: "comparison_matrix",
      label: "Side-by-Side Cross-Border Regulatory Comparison Matrix",
      headingPatterns: ["comparison\\s+matrix", "side[- ]by[- ]side", "jurisdiction\\s+matrix", "regulatory\\s+matrix"],
      required: true,
    },
    {
      key: "pillar_breakdown",
      label: "Pillar-by-Pillar / Jurisdiction-by-Jurisdiction Breakdown",
      headingPatterns: ["licensing|capital|governance|data\\s+(?:residency|locali[sz]ation)|pillar|breakdown"],
      required: true,
    },
  ],
  escalationPolicy: {
    verdictOptions: ["MARKET ENTRY FEASIBLE", "PARTNER-LED ENTRY RECOMMENDED", "REGULATORY VERIFICATION REQUIRED"],
    evidenceGapMarker: "[NEEDS_LOCAL_COUNSEL_CONFIRMATION]",
    requiresHumanApprovalForFinalization: true,
    authorizedSignOffRoles: ["LEGAL_COUNSEL", "CHIEF_COMPLIANCE_OFFICER"],
    failClosedConditions: [
      "Live web retrieval returned no official primary source for a jurisdiction's exact capital figure — qualify explicitly rather than inventing numbers.",
    ],
  },
  buildExecutionPlan: ({ requestedJurisdictions }) => [
    {
      step_id: "wf_hydrate",
      step_number: 1,
      title: `Load Regulatory Profiles (${requestedJurisdictions.join(", ")})`,
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
  buildTurnGuidance: (ctx) =>
    `Execute workflow intent 'CROSS_BORDER_COMPARISON' across all target jurisdictions (${ctx.requestedJurisdictions.join(", ")}) using the hydrated statutory vault, jurisdiction profiles, and live web evidence above. If a specific country or statutory pillar still lacks a primary circular reference or capital figure, you may execute one targeted 'search_live_web' or 'fetch_live_url_content' call to fill that gap before writing the complete side-by-side matrix and pillar-by-pillar breakdown. Ensure you distinguish circular issuance dates vs. compliance effective deadlines, paid-up capital vs. refundable CBN/central bank escrow deposits, granular statutory license tiers, local equity % + board residency rules (including resident CEO mandates), and bank-led vs. standalone e-money rules.`,
};
