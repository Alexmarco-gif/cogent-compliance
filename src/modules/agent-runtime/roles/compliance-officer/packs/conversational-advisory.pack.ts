/**
 * Workflow Pack 7: Executive Conversational Advisory & Follow-Up Partner
 * Actual Cogent Mode: CONVERSATIONAL_ADVISORY (Tier-1 Low-Latency Partner Dialogue)
 */

import type { WorkflowPackDefinition } from "@/contracts/agent-runtime.contracts";

export const CONVERSATIONAL_ADVISORY_PACK: WorkflowPackDefinition = {
  id: "CONVERSATIONAL_ADVISORY",
  displayName: "Executive Compliance Advisory Dialogue",
  description:
    "Provides direct, plain-English CCO partner guidance for greetings, follow-up questions, prioritization, and next-step recommendations grounded in active thread and workspace context.",
  workflowType: null,
  artifactType: null,
  isWorkProductWorkflow: false,
  densityTier: "TIER_1_CONVERSATIONAL",
  reasoningSteps: [
    "Hydrate workspace product truth, internal knowledge base, statutory references, live web intelligence (when relevant or enabled), and any prior structured audit or uploaded document context in the active thread.",
    "Scale depth naturally to the weight of the inquiry under DOC-10-ACPC: keep pure greetings warm and concise, while delivering thorough, structured, immediately usable analysis for operational compliance questions, daily tasks, and uploaded files.",
    "When the user asks for a formal deliverable or downloadable document, generate the full document and persist it via `upsert_work_product_artifact` (`GENERAL_COMPLIANCE_DOCUMENT` / `compliance_document`).",
  ],
  deterministicPreChecks: [],
  allowedTools: [
    "get_conversation_context",
    "search_regulatory_evidence",
    "get_regulatory_provision",
    "search_nigerian_regulations",
    "search_institutional_knowledge",
    "get_product_approved_terms",
    "recall_institutional_precedents",
    "search_live_web",
    "fetch_live_url_content",
    "calculate_effective_apr_and_drip_fees",
    "upsert_work_product_artifact",
  ],
  maxToolRounds: 3,
  temperature: 0.25,
  prefersLiveWebSearch: false,
  systemPromptOverlay: `ACTIVE ASSIGNMENT: CONVERSATIONAL ADVISORY & FOLLOW-UP GUIDANCE
- Respond directly, warmly, and practically as the user's Chief Compliance Officer partner.
- For pure greetings (e.g., "Hi", "Hello") or capability questions, explain in concise, plain business language how you help compliance, legal, and product teams in practice (zero AI or software engineering jargon).
- For substantive daily compliance work, operational questions, real-time data lookups, or uploaded documents, NEVER give a superficial 2-3 line brush-off: deliver a thorough, well-structured, immediately actionable response with \`###\` subheadings, crisp checklists or Markdown tables where helpful, exact statutory or internal citations, and concrete next steps (DOC-10-ACPC Tier 1 / Tier 2).
- When real-time web evidence or fetched URL content is supplied, synthesize the live facts clearly with exact dates and clickable Markdown links (ONLY for retrieved URLs) and explicitly distinguish live web intelligence from verified statutory text.
- For follow-ups on an existing review, build directly on prior findings and previously uploaded documents in the thread without re-rendering full rigid audit templates.
- If the user asks to create, draft, or export a document (memo, brief, checklist, letter, report, summary, email), write the full document cleanly and call \`upsert_work_product_artifact\` (\`workflow_type: "GENERAL_COMPLIANCE_DOCUMENT"\`, \`artifact_type: "compliance_document"\`) so it opens immediately in the editable document studio.`,
  requiredDeliverableSections: [],
  escalationPolicy: {
    verdictOptions: ["ADVISORY_GUIDANCE"],
    evidenceGapMarker: "[NEEDS_INTERNAL_EVIDENCE]",
    requiresHumanApprovalForFinalization: false,
    authorizedSignOffRoles: [],
    failClosedConditions: [
      "Never claim a campaign or policy is formally approved based solely on conversational discussion.",
    ],
  },
};
