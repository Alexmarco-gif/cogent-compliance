/**
 * Cogent Compliance OS — Policy Workflow OS Contracts (Phase 1 & Phase 2)
 * Covers Stages 2, 3, 4, 5, 6, 7, 8:
 *   - Policy Register, Versions & Regulatory Obligation Mappings
 *   - Structured Redline & Net-New Policy Payload Schema
 *   - Clean vNext Policy Compiler Input/Output
 *   - Post-Draft Statutory Floor QA Gate Report
 *   - Cross-Functional Three-Lines Stakeholder Review & Feasibility Blockers
 *   - Multi-Tier Delegated Approval Routing (CCO / Management Committee / Board) & Board Packs
 *   - Publication Delta Briefs, Employee Attestations & Live Operationalization (Controls, Clocks, Tasks)
 */

import { z } from "zod";
import { CANONICAL_ROLES } from "@/modules/auth-tenancy/types";

export const POLICY_DOMAINS = [
  "AML_CFT_CPF",
  "KYC_CDD",
  "DATA_PROTECTION",
  "CONSUMER_PROTECTION",
  "DIGITAL_LENDING",
  "PAYMENTS_EFT",
  "FRAUD_CYBER",
  "ENTERPRISE_RISK",
  "MARKETING_COMMS",
  "GOVERNANCE_OTHER",
] as const;
export type PolicyDomain = (typeof POLICY_DOMAINS)[number];

export const POLICY_DOMAIN_LABELS: Record<PolicyDomain, string> = {
  AML_CFT_CPF: "AML / CFT / CPF",
  KYC_CDD: "KYC / CDD / EDD",
  DATA_PROTECTION: "Data Protection (NDPA)",
  CONSUMER_PROTECTION: "Consumer Protection",
  DIGITAL_LENDING: "Digital Lending & Collections",
  PAYMENTS_EFT: "Payments & Instant EFT",
  FRAUD_CYBER: "Fraud & Cybersecurity",
  ENTERPRISE_RISK: "Enterprise Risk Management",
  MARKETING_COMMS: "Marketing & Financial Promotions",
  GOVERNANCE_OTHER: "Corporate Governance & Other",
};

export const POLICY_APPROVAL_TIERS = [
  "TIER_1_CCO",
  "TIER_2_COMMITTEE",
  "TIER_3_BOARD",
] as const;
export type PolicyApprovalTier = (typeof POLICY_APPROVAL_TIERS)[number];

export const POLICY_APPROVAL_TIER_LABELS: Record<PolicyApprovalTier, string> = {
  TIER_1_CCO: "Tier 1 — CCO Approval",
  TIER_2_COMMITTEE: "Tier 2 — CCO → Management Committee",
  TIER_3_BOARD: "Tier 3 — CCO → Committee → Board of Directors",
};

export const POLICY_LIFECYCLE_STATUSES = [
  "INITIATED",
  "DRAFTING",
  "STAKEHOLDER_REVIEW",
  "COMPLIANCE_VALIDATION",
  "AWAITING_APPROVAL",
  "APPROVED",
  "PUBLISHED",
  "IMPLEMENTING",
  "ACTIVE_MONITORING",
  "UNDER_REVIEW",
  "SUPERSEDED",
  "RETIRED",
] as const;
export type PolicyLifecycleStatus = (typeof POLICY_LIFECYCLE_STATUSES)[number];

export const POLICY_CHANGE_TYPES = [
  "NEW_POLICY",
  "AMENDMENT",
  "NO_CHANGE_REVIEW",
] as const;
export type PolicyChangeType = (typeof POLICY_CHANGE_TYPES)[number];

export const POLICY_TRIGGER_SOURCES = [
  "REGULATORY_CHANGE",
  "AUDIT_FINDING",
  "NEW_PRODUCT",
  "PERIODIC_REVIEW",
  "INCIDENT",
  "MANUAL",
] as const;
export type PolicyTriggerSource = (typeof POLICY_TRIGGER_SOURCES)[number];

export const POLICY_QA_STATUSES = ["PENDING", "PASSED", "FAILED"] as const;
export type PolicyQaStatus = (typeof POLICY_QA_STATUSES)[number];

export const POLICY_APPROVER_ROLES = [
  "CHIEF_COMPLIANCE_OFFICER",
  "COMMITTEE_MEMBER",
  "BOARD_MEMBER",
] as const;
export type PolicyApproverRole = (typeof POLICY_APPROVER_ROLES)[number];

export const POLICY_COMMENT_TYPES = [
  "GENERAL",
  "LEGAL_ISSUE",
  "RISK_CONCERN",
  "FEASIBILITY_BLOCKER",
  "AUDIT_OBSERVATION",
  "EDITORIAL",
] as const;
export type PolicyCommentType = (typeof POLICY_COMMENT_TYPES)[number];

export const POLICY_COMMENT_STATUSES = [
  "OPEN",
  "RESOLVED",
  "DEFERRED_TO_EXCEPTION",
  "REJECTED",
] as const;
export type PolicyCommentStatus = (typeof POLICY_COMMENT_STATUSES)[number];

export const POLICY_TASK_PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
export type PolicyTaskPriority = (typeof POLICY_TASK_PRIORITIES)[number];

export const POLICY_TASK_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "VERIFIED",
] as const;
export type PolicyTaskStatus = (typeof POLICY_TASK_STATUSES)[number];

// ==============================================================================
// Structured JSON Payload Emitted by POLICY_GAP_REDLINE & POLICY_DRAFT_NEW
// ==============================================================================

export const structuredRedlineClauseSchema = z.object({
  clause_reference: z.string().min(1),
  section_heading: z.string().min(1),
  current_text: z.string().default(""),
  statutory_breach: z.string().default(""),
  compliant_replacement_text: z.string().min(1),
  statutory_floor: z.string().default(""),
  governing_authority: z.string().default(""),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("HIGH"),
  procedure_summary: z.string().optional(),
  control_statement: z.string().optional(),
  control_type: z.enum(["PREVENTIVE", "DETECTIVE", "CORRECTIVE"]).default("PREVENTIVE"),
  automation_level: z.enum(["AUTOMATED", "SEMI_AUTOMATED", "MANUAL"]).default("SEMI_AUTOMATED"),
  owner_department: z.string().default("Operations"),
  accepted: z.boolean().default(true),
});
export type StructuredRedlineClause = z.infer<typeof structuredRedlineClauseSchema>;

export const structuredOperationalClockSchema = z.object({
  event_trigger: z.string().min(2),
  binding_sla: z.string().min(1),
  sla_hours: z.number().int().positive().nullable().optional(),
  governing_authority: z.string().min(2),
  owner_department: z.string().default("Compliance"),
  escalation_path: z.string().optional(),
});
export type StructuredOperationalClock = z.infer<typeof structuredOperationalClockSchema>;

export const structuredGovernanceClauseSchema = z.object({
  section_heading: z.string().min(2),
  clause_reference: z.string().min(1),
  clause_text: z.string().min(5),
  domain: z.string().default("Governance"),
  statutory_basis: z.string().optional(),
});
export type StructuredGovernanceClause = z.infer<typeof structuredGovernanceClauseSchema>;

export const structuredRemediationItemSchema = z.object({
  priority: z.enum(POLICY_TASK_PRIORITIES).default("P1"),
  action: z.string().min(3),
  accountable_owner: z.string().min(2),
  owner_department: z.string().default("Operations"),
  target_deadline: z.string().min(2),
});
export type StructuredRemediationItem = z.infer<typeof structuredRemediationItemSchema>;

export const structuredObligationMappingSchema = z.object({
  regulator: z.string().min(2),
  instrument_title: z.string().min(2),
  clause_reference: z.string().min(1),
  obligation_summary: z.string().min(3),
  mapped_policy_clause: z.string().optional(),
  coverage_status: z.enum(["COVERED", "PARTIAL", "GAP", "NOT_APPLICABLE"]).default("COVERED"),
});
export type StructuredObligationMapping = z.infer<typeof structuredObligationMappingSchema>;

export const structuredPolicyRedlinePayloadSchema = z.object({
  schema_version: z.literal("2.0").default("2.0"),
  workflow_source: z.enum(["POLICY_GAP_REDLINE", "POLICY_DRAFT_NEW", "MANUAL"]).default("POLICY_GAP_REDLINE"),
  decision: z.enum(["REJECT", "CONDITIONAL_APPROVAL", "APPROVE"]).default("CONDITIONAL_APPROVAL"),
  decision_headline: z.string().default(""),
  policy_title: z.string().default(""),
  policy_domain: z.enum(POLICY_DOMAINS).default("GOVERNANCE_OTHER"),
  recommended_approval_tier: z.enum(POLICY_APPROVAL_TIERS).default("TIER_2_COMMITTEE"),
  licensing_scope_summary: z.string().default(""),
  clauses: z.array(structuredRedlineClauseSchema).default([]),
  operational_clocks: z.array(structuredOperationalClockSchema).default([]),
  governance_clauses: z.array(structuredGovernanceClauseSchema).default([]),
  remediation_schedule: z.array(structuredRemediationItemSchema).default([]),
  obligation_mappings: z.array(structuredObligationMappingSchema).default([]),
  board_resolution_text: z.string().default(""),
});
export type StructuredPolicyRedlinePayload = z.infer<typeof structuredPolicyRedlinePayloadSchema>;

// ==============================================================================
// Post-Draft Statutory Floor QA Validation Report
// ==============================================================================

export const policyQaCheckItemSchema = z.object({
  check_code: z.string(),
  category: z.enum([
    "STATUTORY_FLOOR",
    "CITATION_INTEGRITY",
    "EVIDENCE_COMPLETENESS",
    "STAKEHOLDER_BLOCKERS",
    "GOVERNANCE_STRUCTURE",
  ]),
  label: z.string(),
  passed: z.boolean(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  details: z.string(),
  governing_authority: z.string().optional(),
});
export type PolicyQaCheckItem = z.infer<typeof policyQaCheckItemSchema>;

export const policyQaValidationReportSchema = z.object({
  passed: z.boolean(),
  checked_at: z.string(),
  checked_by: z.string(),
  total_checks: z.number().int().nonnegative(),
  failed_critical_count: z.number().int().nonnegative(),
  failed_high_count: z.number().int().nonnegative(),
  open_feasibility_blockers_count: z.number().int().nonnegative(),
  unresolved_evidence_markers_count: z.number().int().nonnegative(),
  checks: z.array(policyQaCheckItemSchema),
  summary: z.string(),
});
export type PolicyQaValidationReport = z.infer<typeof policyQaValidationReportSchema>;

// ==============================================================================
// API Request Contracts
// ==============================================================================

export const listPoliciesQuerySchema = z.object({
  status: z.enum(POLICY_LIFECYCLE_STATUSES).optional(),
  domain: z.enum(POLICY_DOMAINS).optional(),
  approval_tier: z.enum(POLICY_APPROVAL_TIERS).optional(),
  overdue_only: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((v) => v === true || v === "true")
    .optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});
export type ListPoliciesQuery = z.infer<typeof listPoliciesQuerySchema>;

export const createPolicySchema = z.object({
  title: z.string().trim().min(3, "Policy title must be at least 3 characters").max(200),
  domain: z.enum(POLICY_DOMAINS),
  description: z.string().trim().max(1500).optional(),
  owner_department: z.string().trim().min(2).max(100).default("Compliance"),
  owner_name: z.string().trim().max(120).optional(),
  approval_tier: z.enum(POLICY_APPROVAL_TIERS).default("TIER_2_COMMITTEE"),
  review_cycle_months: z.number().int().min(1).max(60).default(12),
  change_type: z.enum(POLICY_CHANGE_TYPES).default("NEW_POLICY"),
  trigger_source: z.enum(POLICY_TRIGGER_SOURCES).default("MANUAL"),
  trigger_reference: z.string().trim().max(120).optional(),
  change_summary: z.string().trim().max(500).optional(),
  source_work_product_id: z.string().uuid().optional(),
  markdown_content: z.string().min(10).max(200000).optional(),
  effective_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "effective_date must be YYYY-MM-DD")
    .optional(),
  next_review_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "next_review_date must be YYYY-MM-DD")
    .optional(),
});
export type CreatePolicyInput = z.input<typeof createPolicySchema>;

export const updatePolicySchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  domain: z.enum(POLICY_DOMAINS).optional(),
  description: z.string().trim().max(1500).optional(),
  owner_department: z.string().trim().min(2).max(100).optional(),
  owner_name: z.string().trim().max(120).optional(),
  approval_tier: z.enum(POLICY_APPROVAL_TIERS).optional(),
  review_cycle_months: z.number().int().min(1).max(60).optional(),
  effective_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  next_review_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  status: z.enum(POLICY_LIFECYCLE_STATUSES).optional(),
});
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;

export const compilePolicyRedlineSchema = z.object({
  version_id: z.string().uuid().optional(),
  accepted_clause_refs: z.array(z.string()).optional(),
  clause_overrides: z
    .array(
      z.object({
        clause_reference: z.string().min(1),
        compliant_replacement_text: z.string().min(5),
        accepted: z.boolean().default(true),
      }),
    )
    .optional(),
  custom_clean_markdown: z.string().min(20).max(200000).optional(),
  include_governance_clauses: z.boolean().default(true),
  include_operational_clocks_appendix: z.boolean().default(true),
  institution_name: z.string().trim().max(160).optional(),
});
export type CompilePolicyRedlineInput = z.input<typeof compilePolicyRedlineSchema>;

export const assignPolicyReviewersSchema = z.object({
  action: z.literal("ASSIGN_REVIEWERS"),
  version_id: z.string().uuid().optional(),
  due_days: z.number().int().min(1).max(90).default(7),
  reviewers: z
    .array(
      z.object({
        reviewer_department: z.string().trim().min(2).max(100),
        reviewer_role: z.enum(CANONICAL_ROLES),
        reviewer_user_id: z.string().optional(),
        reviewer_name: z.string().trim().max(120).optional(),
      }),
    )
    .min(1, "Assign at least one departmental reviewer"),
});

export const createPolicyClauseCommentSchema = z.object({
  action: z.literal("ADD_COMMENT"),
  version_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
  clause_reference: z.string().trim().min(1).max(80),
  section_heading: z.string().trim().max(200).optional(),
  comment_type: z.enum(POLICY_COMMENT_TYPES).default("GENERAL"),
  is_feasibility_blocker: z.boolean().default(false),
  blocker_impact: z.string().trim().max(500).optional(),
  comment_text: z.string().trim().min(5).max(4000),
  proposed_change: z.string().trim().max(4000).optional(),
  author_department: z.string().trim().max(100).optional(),
  author_name: z.string().trim().max(120).optional(),
  spawn_remediation_task: z.boolean().default(true),
});

export const policyReviewPostSchema = z.discriminatedUnion("action", [
  assignPolicyReviewersSchema,
  createPolicyClauseCommentSchema,
]);
export type PolicyReviewPostInput = z.input<typeof policyReviewPostSchema>;

export const resolvePolicyCommentSchema = z.object({
  action: z.literal("RESOLVE_COMMENT"),
  comment_id: z.string().uuid(),
  status: z.enum(["RESOLVED", "DEFERRED_TO_EXCEPTION", "REJECTED"]),
  resolution_notes: z.string().trim().min(3).max(2000),
});

export const completeReviewAssignmentSchema = z.object({
  action: z.literal("COMPLETE_ASSIGNMENT"),
  assignment_id: z.string().uuid(),
  status: z.enum(["APPROVED_WITH_COMMENTS", "FEASIBILITY_BLOCKER", "SIGNED_OFF"]),
  summary_notes: z.string().trim().max(2000).optional(),
});

export const policyReviewPatchSchema = z.discriminatedUnion("action", [
  resolvePolicyCommentSchema,
  completeReviewAssignmentSchema,
]);
export type PolicyReviewPatchInput = z.input<typeof policyReviewPatchSchema>;

export const runPolicyQaSchema = z.object({
  version_id: z.string().uuid().optional(),
  strict_evidence_markers: z.boolean().default(true),
});
export type RunPolicyQaInput = z.input<typeof runPolicyQaSchema>;

export const submitPolicyApprovalSchema = z.object({
  action: z.literal("SUBMIT"),
  version_id: z.string().uuid().optional(),
  approval_tier: z.enum(POLICY_APPROVAL_TIERS).optional(),
  submission_notes: z.string().trim().max(2000).optional(),
});

export const decidePolicyApprovalSchema = z.object({
  action: z.literal("DECIDE"),
  version_id: z.string().uuid().optional(),
  step_id: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  decision_reason: z.string().trim().min(5, "Decision reason must be at least 5 characters").max(2000),
  board_minutes_ref: z.string().trim().max(160).optional(),
  effective_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  enforce_dual_control: z.boolean().default(true),
});

export const policyApprovalPostSchema = z.discriminatedUnion("action", [
  submitPolicyApprovalSchema,
  decidePolicyApprovalSchema,
]);
export type PolicyApprovalPostInput = z.input<typeof policyApprovalPostSchema>;

export const publishPolicySchema = z.object({
  version_id: z.string().uuid().optional(),
  effective_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sync_to_knowledge_base: z.boolean().default(true),
  compile_operational_objects: z.boolean().default(true),
  attestation_due_days: z.number().int().min(1).max(90).default(14),
  attestation_recipients: z
    .array(
      z.object({
        recipient_user_id: z.string().optional(),
        recipient_email: z.string().email().optional(),
        recipient_name: z.string().trim().min(2).max(120),
        department: z.string().trim().min(2).max(100),
        role: z.string().trim().max(80).optional(),
        requires_training: z.boolean().default(false),
      }),
    )
    .default([]),
});
export type PublishPolicyInput = z.input<typeof publishPolicySchema>;

export const updatePolicyControlOpSchema = z.object({
  entity: z.literal("CONTROL"),
  control_id: z.string().uuid(),
  status: z.enum(["DRAFT", "ACTIVE", "NEEDS_REMEDIATION", "RETIRED"]).optional(),
  owner_department: z.string().trim().min(2).max(100).optional(),
  test_frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"]).optional(),
});

export const updatePolicyTaskOpSchema = z.object({
  entity: z.literal("TASK"),
  task_id: z.string().uuid(),
  status: z.enum(POLICY_TASK_STATUSES),
  evidence_notes: z.string().trim().max(2000).optional(),
});

export const acknowledgePolicyAttestationOpSchema = z.object({
  entity: z.literal("ATTESTATION"),
  attestation_id: z.string().uuid(),
  training_completed: z.boolean().default(false),
});

export const policyOperationsPatchSchema = z.discriminatedUnion("entity", [
  updatePolicyControlOpSchema,
  updatePolicyTaskOpSchema,
  acknowledgePolicyAttestationOpSchema,
]);
export type PolicyOperationsPatchInput = z.input<typeof policyOperationsPatchSchema>;

// ==============================================================================
// Persisted Record Interfaces (DTOs)
// ==============================================================================

export interface CompliancePolicyRecord {
  id: string;
  tenant_id: string;
  policy_ref_no: string;
  title: string;
  domain: PolicyDomain;
  description: string | null;
  owner_user_id: string;
  owner_name: string | null;
  owner_department: string;
  approval_tier: PolicyApprovalTier;
  review_cycle_months: number;
  status: PolicyLifecycleStatus;
  current_version_id: string | null;
  published_version_id: string | null;
  approving_authority: string | null;
  approved_at: string | null;
  effective_date: string | null;
  next_review_date: string | null;
  knowledge_document_id: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyVersionRecord {
  id: string;
  tenant_id: string;
  policy_id: string;
  version_number: number;
  status: PolicyLifecycleStatus;
  change_type: PolicyChangeType;
  trigger_source: PolicyTriggerSource;
  trigger_reference: string | null;
  change_summary: string | null;
  source_work_product_id: string | null;
  markdown_content: string;
  clean_compiled_markdown: string | null;
  structured_payload: StructuredPolicyRedlinePayload | Record<string, unknown>;
  delta_brief_markdown: string | null;
  board_pack_markdown: string | null;
  qa_validation_status: PolicyQaStatus;
  qa_validation_report: PolicyQaValidationReport | Record<string, unknown>;
  qa_validated_at: string | null;
  qa_validated_by: string | null;
  source_hash_sha256: string;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  published_by: string | null;
  published_at: string | null;
  retired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolicyObligationMappingRecord {
  id: string;
  tenant_id: string;
  policy_id: string;
  policy_version_id: string;
  regulatory_clause_id: string | null;
  regulatory_obligation_id: string | null;
  regulator: string;
  instrument_title: string;
  clause_reference: string;
  obligation_summary: string;
  coverage_status: "COVERED" | "PARTIAL" | "GAP" | "NOT_APPLICABLE";
  mapped_policy_clause: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolicyApprovalWorkflowRecord {
  id: string;
  tenant_id: string;
  policy_id: string;
  policy_version_id: string;
  approval_tier: PolicyApprovalTier;
  status: "IN_PROGRESS" | "APPROVED" | "REJECTED" | "CANCELLED";
  submitted_by: string;
  submitted_at: string;
  completed_at: string | null;
  board_pack_hash_sha256: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolicyApprovalStepRecord {
  id: string;
  tenant_id: string;
  workflow_id: string;
  policy_id: string;
  policy_version_id: string;
  step_order: number;
  approver_role: PolicyApproverRole;
  approver_label: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
  decided_by: string | null;
  decided_by_name: string | null;
  decided_by_role: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  board_minutes_ref: string | null;
  decision_hash_sha256: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolicyReviewAssignmentRecord {
  id: string;
  tenant_id: string;
  policy_id: string;
  policy_version_id: string;
  reviewer_department: string;
  reviewer_role: string;
  defense_line: "FIRST_LINE" | "SECOND_LINE" | "THIRD_LINE" | "GOVERNANCE";
  reviewer_user_id: string | null;
  reviewer_name: string | null;
  is_advisory_only: boolean;
  status: "PENDING" | "IN_REVIEW" | "APPROVED_WITH_COMMENTS" | "FEASIBILITY_BLOCKER" | "SIGNED_OFF";
  summary_notes: string | null;
  due_at: string | null;
  completed_at: string | null;
  assigned_by: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyClauseCommentRecord {
  id: string;
  tenant_id: string;
  policy_id: string;
  policy_version_id: string;
  assignment_id: string | null;
  clause_reference: string;
  section_heading: string | null;
  comment_type: PolicyCommentType;
  is_feasibility_blocker: boolean;
  blocker_impact: string | null;
  comment_text: string;
  proposed_change: string | null;
  author_user_id: string;
  author_name: string | null;
  author_role: string;
  author_department: string;
  status: PolicyCommentStatus;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  linked_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolicyControlRecord {
  id: string;
  tenant_id: string;
  policy_id: string;
  policy_version_id: string;
  control_code: string;
  clause_reference: string;
  policy_rule_summary: string;
  procedure_steps: string;
  control_statement: string;
  control_type: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE";
  automation_level: "AUTOMATED" | "SEMI_AUTOMATED" | "MANUAL";
  owner_department: string;
  owner_role: string | null;
  test_frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL";
  statutory_basis: string | null;
  status: "DRAFT" | "ACTIVE" | "NEEDS_REMEDIATION" | "RETIRED";
  created_at: string;
  updated_at: string;
}

export interface PolicyOperationalClockRecord {
  id: string;
  tenant_id: string;
  policy_id: string;
  policy_version_id: string;
  event_trigger: string;
  binding_sla: string;
  sla_hours: number | null;
  governing_authority: string;
  owner_department: string;
  escalation_path: string | null;
  status: "ACTIVE" | "SUSPENDED" | "RETIRED";
  created_at: string;
  updated_at: string;
}

export interface PolicyImplementationTaskRecord {
  id: string;
  tenant_id: string;
  policy_id: string;
  policy_version_id: string;
  priority: PolicyTaskPriority;
  title: string;
  description: string | null;
  accountable_owner: string;
  owner_department: string;
  target_deadline: string | null;
  due_at: string | null;
  source_type: "REMEDIATION_SCHEDULE" | "FEASIBILITY_BLOCKER" | "GOVERNANCE_CLAUSE" | "MANUAL";
  source_clause_ref: string | null;
  status: PolicyTaskStatus;
  evidence_notes: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolicyAttestationRecord {
  id: string;
  tenant_id: string;
  policy_id: string;
  policy_version_id: string;
  recipient_user_id: string | null;
  recipient_email: string | null;
  recipient_name: string;
  department: string;
  role: string | null;
  requires_training: boolean;
  status: "PENDING" | "ACKNOWLEDGED" | "TRAINING_COMPLETED" | "OVERDUE";
  due_at: string | null;
  acknowledged_at: string | null;
  acknowledgement_hash: string | null;
  training_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolicyDashboardSummary {
  kpis: {
    total_policies: number;
    under_review: number;
    awaiting_approval: number;
    overdue_reviews: number;
    published_active: number;
    open_feasibility_blockers: number;
    open_implementation_tasks: number;
    pending_attestations: number;
  };
  policies: CompliancePolicyRecord[];
}

export interface PolicyDetailBundle {
  policy: CompliancePolicyRecord;
  current_version: PolicyVersionRecord | null;
  versions: PolicyVersionRecord[];
  obligation_mappings: PolicyObligationMappingRecord[];
  review_assignments: PolicyReviewAssignmentRecord[];
  clause_comments: PolicyClauseCommentRecord[];
  approval_workflow: PolicyApprovalWorkflowRecord | null;
  approval_steps: PolicyApprovalStepRecord[];
  controls: PolicyControlRecord[];
  operational_clocks: PolicyOperationalClockRecord[];
  implementation_tasks: PolicyImplementationTaskRecord[];
  attestations: PolicyAttestationRecord[];
}
