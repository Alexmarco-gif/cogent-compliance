/**
 * Workflow Pack 6: Regulatory & Statutory Q&A Lookup
 * Actual Cogent Mode: REGULATORY_LOOKUP (Tier-1 Fast Grounded Regulatory Q&A)
 */

import type { WorkflowPackDefinition } from "@/contracts/agent-runtime.contracts";

export const REGULATORY_LOOKUP_PACK: WorkflowPackDefinition = {
  id: "REGULATORY_LOOKUP",
  displayName: "Regulatory & Statutory Q&A Lookup",
  description:
    "Answers standalone Nigerian, African, and global regulatory questions directly in clean editorial prose backed by the Statutory Vault and optional Live Web Intelligence.",
  workflowType: null,
  artifactType: null,
  isWorkProductWorkflow: false,
  densityTier: "TIER_1_CONVERSATIONAL",
  reasoningSteps: [
    "Identify the exact regulatory authority, statutory instrument, and lifecycle status governing the question.",
    "Retrieve primary statutory clauses from the Verified Statutory Vault and current circular developments from Live Web Intelligence when enabled.",
    "Explain applicability, thresholds, penalties, and operational nuance directly in crisp editorial prose with inline citations.",
  ],
  deterministicPreChecks: ["STATUTORY_REFERENCE_MATRIX"],
  allowedTools: [
    "get_conversation_context",
    "search_regulatory_evidence",
    "get_regulatory_provision",
    "verify_regulatory_evidence",
    "assess_regulatory_applicability",
    "search_institutional_knowledge",
    "search_live_web",
    "fetch_live_url_content",
    "search_nigerian_regulations",
    "recall_institutional_precedents",
  ],
  maxToolRounds: 3,
  temperature: 0.2,
  prefersLiveWebSearch: false,
  systemPromptOverlay: `ACTIVE ASSIGNMENT: STANDALONE REGULATORY Q&A
Answer the user's regulatory question directly and thoroughly in clean editorial Markdown prose with inline statutory citations (e.g., \`[CBN CPR 2019 Regulation 4.2.5]\`, \`[FCCPA 2018 Section 115]\`, \`[ARCON Act 2022 Section 54]\`).
- Scale response depth naturally to the complexity of the question (DOC-10-ACPC Tier 1 / Tier 2).
- Do NOT force a campaign audit checklist, KFS table, or rigid multi-part board memo template when the user simply asked a regulatory question.
- Explicitly qualify any breaking update retrieved from external web sources vs. verified statutory provisions.`,
  requiredDeliverableSections: [],
  escalationPolicy: {
    verdictOptions: ["INFORMATIONAL_GUIDANCE", "LEGAL_COUNSEL_VERIFICATION_RECOMMENDED"],
    evidenceGapMarker: "[PENDING_OFFICIAL_GAZETTE_CONFIRMATION]",
    requiresHumanApprovalForFinalization: false,
    authorizedSignOffRoles: [],
    failClosedConditions: [
      "Provision is superseded, repealed, or absent from verified records — explicitly state verification status instead of guessing.",
    ],
  },
};
