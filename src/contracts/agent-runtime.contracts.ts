/**
 * Cogent Regulatory Intelligence Platform
 * Professional Agent Engineering — Core Role Profile, Workflow Pack & Benchmark Contracts
 *
 * Implements the 7-layer Professional Agent Architecture grounded in Cogent's actual
 * runtime:
 *  01. Professional Identity      (AgentIdentityProfile)
 *  02. Personality Engineering    (AgentPersonalityAttribute[])
 *  03. Domain Expertise           (AgentKnowledgeScope)
 *  04. Reasoning Framework        (WorkflowPackDefinition.reasoningSteps + deterministicPreChecks)
 *  05. Communication Engineering  (CommunicationConstitution — DOC-10-ACPC)
 *  06. Output Architecture        (DeliverableSectionContract + WorkProductArtifactType)
 *  07. Judgment & Operational Rules (EscalationPolicy + OperationalBoundary[])
 */

import { z } from "zod";
import type { FunctionDeclaration } from "@google/genai";
import type { SearchJurisdiction } from "./search.contracts";
import type {
  WorkflowType,
  WorkProductArtifactType,
} from "./work-product.contracts";
import type { ExecutionPlanStep } from "./conversation.contracts";

/**
 * Operational turn intents supported by the Cogent Compliance Officer role
 * (and extensible to custom string IDs for additional enterprise roles).
 */
export const COMPLIANCE_TURN_INTENTS = [
  "PRODUCT_STRUCTURING_MEMO",
  "POLICY_GAP_REDLINE",
  "POLICY_DRAFT_NEW",
  "SUPERVISORY_DDQ_RESPONSE",
  "CROSS_BORDER_COMPARISON",
  "FULL_COMPLIANCE_AUDIT",
  "REGULATORY_LOOKUP",
  "CONVERSATIONAL_ADVISORY",
] as const;

export type ComplianceTurnIntent = (typeof COMPLIANCE_TURN_INTENTS)[number];

export const RESPONSE_DENSITY_TIERS = [
  "TIER_1_CONVERSATIONAL",
  "TIER_2_WORKFLOW",
  "TIER_3_EXECUTIVE_DELIVERABLE",
] as const;

export type ResponseDensityTier = (typeof RESPONSE_DENSITY_TIERS)[number];

export const DETERMINISTIC_CHECK_IDS = [
  "MECHANICAL_LOCKS",
  "APR_AND_DRIP_PRICING",
  "LICENSE_SCOPE_MATRIX",
  "VISUAL_FORENSICS",
  "APP_STORE_AUDIT",
  "KFS_AND_CHANNEL_KIT",
  "POLICY_STATUTORY_GAP_DIFF",
  "DDQ_EVIDENCE_ALIGNMENT",
  "STATUTORY_REFERENCE_MATRIX",
  "MISSING_ATTACHMENT_CHECK",
] as const;

export type DeterministicCheckId = (typeof DETERMINISTIC_CHECK_IDS)[number];

export const agentPersonalityAttributeSchema = z.object({
  attribute: z.string().min(2),
  expectedBehavior: z.string().min(5),
});
export type AgentPersonalityAttribute = z.infer<typeof agentPersonalityAttributeSchema>;

export const communicationConstitutionSchema = z.object({
  constitutionId: z.string().min(2),
  version: z.string().min(1),
  voiceSummary: z.string().min(10),
  forbiddenJargon: z.array(z.string()).default([]),
  forbiddenSymbols: z.array(z.string()).default([]),
  citationStyle: z.string().min(5),
  currencyDiscipline: z.string().min(5),
  confidentialityTags: z.array(z.string()).default([]),
});
export type CommunicationConstitution = z.infer<typeof communicationConstitutionSchema>;

export const agentIdentityProfileSchema = z.object({
  roleId: z.string().regex(/^[a-z][a-z0-9_]*$/),
  displayName: z.string().min(2),
  professionalTitle: z.string().min(2),
  targetAudience: z.array(z.string()).min(1),
  disposition: z.array(agentPersonalityAttributeSchema).min(1),
  workStandards: z.array(z.string()).min(1),
  operationalBoundaries: z.array(z.string()).min(1),
  communicationConstitution: communicationConstitutionSchema,
});
export type AgentIdentityProfile = z.infer<typeof agentIdentityProfileSchema>;

export const agentKnowledgeScopeSchema = z.object({
  authorizedSourceClasses: z
    .array(
      z.enum([
        "VERIFIED_OFFICIAL_SOURCE",
        "OFFICIAL_EXPLANATORY_GUIDANCE",
        "INTERNAL_PLAYBOOK",
        "LIVE_WEB_INTELLIGENCE",
      ])
    )
    .min(1),
  primaryAuthorities: z.array(z.string()).min(1),
  panAfricanRegulators: z.array(z.string()).default([]),
  globalCorridors: z.array(z.string()).default([]),
  defaultJurisdictions: z.array(z.string()).min(1),
  usesPrecedentMemory: z.boolean().default(true),
});
export type AgentKnowledgeScope = z.infer<typeof agentKnowledgeScopeSchema>;

export const deliverableSectionContractSchema = z.object({
  key: z.string().min(2),
  label: z.string().min(2),
  /** Case-insensitive regex pattern strings confirming section presence in rendered Markdown */
  headingPatterns: z.array(z.string().min(1)).min(1),
  required: z.boolean().default(true),
});
export type DeliverableSectionContract = z.infer<typeof deliverableSectionContractSchema>;

export const escalationPolicySchema = z.object({
  verdictOptions: z.array(z.string()).min(1),
  evidenceGapMarker: z.string().default("[NEEDS_INTERNAL_EVIDENCE]"),
  requiresHumanApprovalForFinalization: z.boolean().default(true),
  authorizedSignOffRoles: z.array(z.string()).default([]),
  failClosedConditions: z.array(z.string()).default([]),
});
export type EscalationPolicy = z.infer<typeof escalationPolicySchema>;

export interface WorkflowSynthesisContext {
  userPrompt: string;
  requestedJurisdictions: SearchJurisdiction[];
  hasMissingNamedAttachment: boolean;
  missingAttachmentFilename?: string | null;
  hasComputedFinancials: boolean;
  hasInternalKnowledgeRefs: boolean;
}

export interface WorkflowQueryInput {
  userPrompt: string;
  productName?: string | null;
  extractedText?: string | null;
}

export interface WorkflowPackDefinition {
  /** Unique pack identifier (matches ComplianceTurnIntent for the flagship Compliance Officer role) */
  id: string;
  displayName: string;
  description: string;
  /** Mapped WorkProduct workflow type when this pack produces a persisted Studio deliverable */
  workflowType: WorkflowType | null;
  /** Mapped WorkProduct artifact type when persisted */
  artifactType: WorkProductArtifactType | null;
  /** Whether this workflow runs the heavy Work Product Studio pipeline */
  isWorkProductWorkflow: boolean;
  densityTier: ResponseDensityTier;
  /** Layer 4: Ordered professional reasoning steps for this job assignment */
  reasoningSteps: string[];
  /** Deterministic backend engines executed before Gemini synthesis */
  deterministicPreChecks: DeterministicCheckId[];
  /** Scoped subset of tool names exposed to Gemini for this workflow (empty = no restriction) */
  allowedTools: string[];
  /** Max tool-calling rounds for this workflow */
  maxToolRounds: number;
  /** Sampling temperature calibrated to the risk profile of this assignment */
  temperature: number;
  /** Whether Live Web Intelligence is enabled by default for this workflow */
  prefersLiveWebSearch: boolean;
  /** Layer 5 & 6: Scoped prompt overlay loaded ONLY when this workflow pack is active */
  systemPromptOverlay: string;
  /** Layer 6: Structural deliverable contract used for post-generation & Golden Benchmark grading */
  requiredDeliverableSections: DeliverableSectionContract[];
  /** Layer 7: Judgment, fail-closed, and RBAC escalation boundaries */
  escalationPolicy: EscalationPolicy;
  /** Builds SSE execution plan steps tailored to this workflow */
  buildExecutionPlan?: (ctx: {
    requestedJurisdictions: SearchJurisdiction[];
    hasAttachmentsOrUrls: boolean;
  }) => ExecutionPlanStep[];
  /** Builds per-turn synthesis directives injected alongside hydrated evidence */
  buildSynthesisDirective?: (ctx: WorkflowSynthesisContext) => string;
  /** Builds the final turn-level execution instruction appended after evidence tags */
  buildTurnGuidance?: (ctx: WorkflowSynthesisContext) => string;
  /** Optional workflow-specific query decomposition */
  buildQueries?: (input: WorkflowQueryInput) => {
    vaultQueries: string[];
    webQueries: string[];
  };
}

export interface AgentRoleProfile {
  /** Layer 1 & 2: Professional Identity, Disposition & Communication Constitution */
  identity: AgentIdentityProfile;
  /** Layer 3: Authorized Domain Expertise & Grounding Scopes */
  knowledgeScope: AgentKnowledgeScope;
  /** Layers 4–7: Modular job-function Workflow Packs owned by this role */
  workflowPacks: Record<string, WorkflowPackDefinition>;
  /** Fallback workflow pack when intent is open-ended conversational advisory */
  defaultWorkflowId: string;
  /** Organizational RBAC roles authorized to approve final deliverables from this agent */
  rbacApprovalRoles: string[];
  /** Composes the base system prompt for this role (without cross-workflow bloat) */
  buildBaseSystemPrompt: () => string;
}

export interface ResolvedAgentTurnPlan {
  role: AgentRoleProfile;
  workflowPack: WorkflowPackDefinition;
  turnIntent: string;
  systemInstruction: string;
  scopedToolDeclarations: FunctionDeclaration[];
  maxToolRounds: number;
  temperature: number;
}

/**
 * Golden Benchmark Evaluation Contracts (Document 09 + Professional Agent Standards)
 */
export interface GoldenBenchmarkCase {
  id: string;
  name: string;
  roleId: string;
  expectedWorkflowId: string;
  userPrompt: string;
  workflowHint?: WorkflowType | null;
  searchJurisdictions?: SearchJurisdiction[];
  hasMissingAttachment?: boolean;
  hasInternalKnowledgeRefs?: boolean;
  /** Expected locked financial figures that must appear verbatim if computed */
  expectedLockedFigures?: string[];
  /** Statutory references / concepts that must be present */
  requiredStatutoryAnchors: string[];
  /** Forbidden hallucination patterns or weak legal floors */
  forbiddenPatterns?: string[];
  /** Minimum weighted score (0-100) to pass the Golden Benchmark gate */
  minPassScore: number;
}

export interface GoldenDimensionScore {
  dimension:
    | "OUTPUT_HYGIENE_AND_CITATIONS"
    | "EXECUTIVE_VOICE_AND_ACPC"
    | "DETERMINISTIC_AND_LEGAL_FLOOR_FIDELITY"
    | "EPISTEMIC_HONESTY_AND_JUDGMENT"
    | "DELIVERABLE_STRUCTURE_COMPLETENESS"
    | "RUNTIME_SCOPING_DISCIPLINE";
  score: number;
  maxScore: number;
  passed: boolean;
  findings: string[];
}

export interface GoldenBenchmarkEvaluationResult {
  caseId: string;
  caseName: string;
  roleId: string;
  workflowId: string;
  passed: boolean;
  overallScore: number;
  minPassScore: number;
  hardGateFailures: string[];
  dimensions: GoldenDimensionScore[];
}
