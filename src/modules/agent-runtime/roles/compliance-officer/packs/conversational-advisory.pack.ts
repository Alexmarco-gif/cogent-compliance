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
    "Hydrate workspace product truth and any prior structured audit context in the active thread.",
    "Respond directly in plain business language—prioritizing concrete next steps without dumping rigid audit templates or AI jargon.",
  ],
  deterministicPreChecks: [],
  allowedTools: [
    "get_conversation_context",
    "search_regulatory_evidence",
    "search_institutional_knowledge",
    "get_product_approved_terms",
    "recall_institutional_precedents",
    "search_live_web",
  ],
  maxToolRounds: 3,
  temperature: 0.25,
  prefersLiveWebSearch: false,
  systemPromptOverlay: `ACTIVE ASSIGNMENT: CONVERSATIONAL ADVISORY & FOLLOW-UP GUIDANCE
- Respond directly, warmly, and practically as the user's Chief Compliance Officer partner.
- For greetings or capability questions, explain in concise, plain business language how you help compliance, legal, and product teams in practice (zero AI or software engineering jargon).
- For follow-ups on an existing review, build directly on prior findings without re-rendering full tables or rigid audit templates.`,
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
