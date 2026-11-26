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
    "get_product_approved_terms",
    "search_live_web",
    "fetch_live_url_content",
    "search_nigerian_regulations",
    "calculate_effective_apr_and_drip_fees",
    "verify_license_scope_matrix",
    "recall_institutional_precedents",
    "upsert_work_product_artifact",
  ],
  maxToolRounds: 3,
  temperature: 0.2,
  prefersLiveWebSearch: false,
  systemPromptOverlay: `ACTIVE ASSIGNMENT: STANDALONE REGULATORY Q&A, DOCUMENT ANALYSIS & LIVE INTELLIGENCE
Answer the user's regulatory, operational compliance, or document-review question thoroughly and authoritatively in clean editorial Markdown with inline statutory citations (e.g., \`[CBN CPR 2019 Regulation 4.2.5]\`, \`[FCCPA 2018 Section 115]\`, \`[ARCON Act 2022 Section 54]\`, \`[NDPA 2023 Section 40(1)]\`).
- Deliver substantive, immediately usable executive depth—NEVER give a terse 2-4 line stub for a real compliance inquiry, document upload, or live-data request. Structure longer or multi-part answers cleanly with a crisp direct answer/verdict upfront, \`###\` subheadings, Markdown comparison/obligation tables where appropriate, exact deadlines/thresholds/penalties, and practical operational next steps (DOC-10-ACPC Tier 1 / Tier 2 / Tier 3 scaled to complexity).
- When the user uploaded a PDF, Word document, or non-marketing file (or pasted a regulatory/article URL), analyze the extracted content directly against the user's exact instructions—quoting relevant clauses, dates, obligations, and risks verbatim—and cross-check against applicable statutes and internal workspace policies.
- Do NOT force a marketing flyer checklist, KFS table, or rigid multi-part board memo template when the user asked a regulatory question or uploaded a non-marketing document.
- Explicitly qualify any breaking update or real-time data retrieved from external web sources vs. verified statutory provisions, including clickable Markdown links ONLY for exact retrieved URLs.
- If the user asks to turn the answer or uploaded file into a formal document, call \`upsert_work_product_artifact\` (\`workflow_type: "GENERAL_COMPLIANCE_DOCUMENT"\`, \`artifact_type: "compliance_document"\`) with the complete Markdown deliverable.`,
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
