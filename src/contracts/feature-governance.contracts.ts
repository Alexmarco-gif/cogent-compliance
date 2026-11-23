/**
 * Cogent Compliance Platform — Product Feature Governance & NPA Lifecycle Contracts
 * Covers:
 * - Structured Feature Proposal & Materiality Classification
 * - Multi-Domain Regulatory Impact Assessment (RIA)
 * - Risk & Control Matrix + Compliance-to-Build Translation
 * - Interactive 10-Point Launch Readiness Gate & Three Lines of Defence Sign-Offs
 * - Post-Implementation Reviews (PIR), Material Change Reassessments & 3LoD Assurance
 */

import { z } from "zod";
import { CANONICAL_ROLES, type CanonicalRole } from "@/modules/auth-tenancy/types";

export const FINANCIAL_ACTIVITY_TYPES = [
  "PAYMENTS_TRANSFER",
  "RECURRING_DEBIT",
  "DIGITAL_LENDING_BNPL",
  "WALLET_DEPOSIT_SAVINGS",
  "FX_CROSS_BORDER",
  "CARD_ISSUANCE",
  "INVESTMENT_WEALTHTECH",
  "AGENCY_BANKING",
  "OPEN_BANKING_API",
  "OTHER_FINANCIAL_SERVICE",
] as const;
export type FinancialActivityType = (typeof FINANCIAL_ACTIVITY_TYPES)[number];

export const CHANGE_CLASSIFICATIONS = [
  "NEW_PRODUCT",
  "NEW_FEATURE",
  "MATERIAL_MODIFICATION",
  "MINOR_CHANGE",
] as const;
export type ChangeClassification = (typeof CHANGE_CLASSIFICATIONS)[number];

export const MATERIALITY_TIERS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type MaterialityTier = (typeof MATERIALITY_TIERS)[number];

export const TARGET_MARKETS = [
  "INDIVIDUALS",
  "BUSINESSES",
  "INDIVIDUALS_AND_BUSINESSES",
  "AGENTS_MERCHANTS",
] as const;
export type TargetMarket = (typeof TARGET_MARKETS)[number];

export const FEATURE_LIFECYCLE_STAGES = [
  "PROPOSAL",
  "REGULATORY_SCREENING",
  "RISK_AND_CONTROL_DESIGN",
  "PRODUCT_OPS_DESIGN",
  "IMPLEMENTATION",
  "VALIDATION_TESTING",
  "LAUNCH_GATE",
  "POST_LAUNCH_MONITORING",
  "MODIFICATION_OR_RETIREMENT",
  "SUSPENDED",
  "RETIRED",
] as const;
export type FeatureLifecycleStage = (typeof FEATURE_LIFECYCLE_STAGES)[number];

export const LAUNCH_GATE_STATUSES = [
  "NOT_READY",
  "PENDING_GATE",
  "APPROVED",
  "CONDITIONALLY_APPROVED",
  "REJECTED",
] as const;
export type LaunchGateStatus = (typeof LAUNCH_GATE_STATUSES)[number];

export const COMPLIANCE_DOMAINS = [
  "KYC_CDD",
  "AML_CFT_CPF",
  "TRANSACTION_MONITORING",
  "SANCTIONS",
  "CONSUMER_PROTECTION",
  "DATA_PROTECTION",
  "RECORD_KEEPING",
  "DISPUTES_COMPLAINTS",
  "FRAUD_PREVENTION",
  "LICENSING_PERIMETER",
  "INFOSEC",
] as const;
export type ComplianceDomain = (typeof COMPLIANCE_DOMAINS)[number];

export const CONTROL_TYPES = ["PREVENTIVE", "DETECTIVE", "CORRECTIVE"] as const;
export type ControlType = (typeof CONTROL_TYPES)[number];

export const CONTROL_VERIFICATION_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "EVIDENCE_SUBMITTED",
  "VERIFIED",
  "FAILED",
  "WAIVED_WITH_CONDITION",
  "REASSESSMENT_REQUIRED",
] as const;
export type ControlVerificationStatus = (typeof CONTROL_VERIFICATION_STATUSES)[number];

export const POST_LAUNCH_REVIEW_TYPES = [
  "POST_IMPLEMENTATION_REVIEW",
  "MATERIAL_CHANGE_REASSESSMENT",
  "INCIDENT_ESCALATION",
  "SUSPENSION_REVIEW",
  "RETIREMENT_REVIEW",
  "INTERNAL_AUDIT_ASSURANCE",
] as const;
export type PostLaunchReviewType = (typeof POST_LAUNCH_REVIEW_TYPES)[number];

export const POST_LAUNCH_REVIEW_STATUSES = [
  "OPEN",
  "IN_REVIEW",
  "REMEDIATION_REQUIRED",
  "CLOSED",
] as const;
export type PostLaunchReviewStatus = (typeof POST_LAUNCH_REVIEW_STATUSES)[number];

export interface RiaMatrixItem {
  domain: ComplianceDomain;
  regulator: string;
  statutory_basis: string;
  assessment_question: string;
  required_outcome: string;
  risk_level: MaterialityTier;
  pre_launch_condition: string;
}

export interface ControlEvidenceAttachment {
  id: string;
  title: string;
  evidence_type:
    | "TEST_LOG"
    | "AUTHORIZATION_AUDIT"
    | "LIMIT_CONFIG"
    | "SOP_DOCUMENT"
    | "DISCLOSURE_SCREENSHOT"
    | "SECURITY_PENTEST"
    | "SANCTIONS_SCREENING_LOG"
    | "REGULATORY_FILING"
    | "OTHER";
  reference_url_or_key: string;
  notes?: string;
  submitted_by: string;
  submitted_role: CanonicalRole;
  submitted_at: string;
  sha256_hash: string;
}

export interface ReadinessChecklistItem {
  key: string;
  label: string;
  owner_line: "FIRST_LINE" | "SECOND_LINE";
  owner_label: string;
  mandatory: boolean;
  satisfied: boolean;
  detail: string;
}

export interface ReadinessEvaluation {
  numerator: number;
  denominator: number;
  is_ready_for_unconditional_approval: boolean;
  mandatory_blockers: string[];
  checklist: ReadinessChecklistItem[];
}

export interface GateConditionItem {
  id: string;
  description: string;
  owner_role: CanonicalRole;
  due_date: string;
  status: "OPEN" | "MET";
}

export interface GateSignoffRecord {
  user_id: string;
  role: CanonicalRole;
  defence_line: import("@/modules/auth-tenancy/types").DefenceLine;
  decision: "APPROVED" | "CONDITIONALLY_APPROVED" | "REJECTED";
  rationale: string;
  signed_at: string;
}

export interface PostLaunchMonitoringMetrics {
  transaction_monitoring_alerts?: number;
  suspicious_activity_reports_filed?: number;
  unauthorized_or_fraud_attempts?: number;
  customer_complaints_and_disputes?: number;
  failed_or_duplicate_transactions?: number;
  control_failures_open?: number;
  monthly_transaction_volume_ngn?: number;
  regulatory_reports_on_time?: boolean;
  notes?: string;
}

export interface ProductFeatureRecord {
  id: string;
  tenant_id: string;
  feature_code: string;
  feature_name: string;
  summary: string;
  business_objective: string;
  financial_activity_type: FinancialActivityType;
  change_classification: ChangeClassification;
  materiality_tier: MaterialityTier;
  target_market: TargetMarket;
  revenue_model: string;
  third_party_dependencies: string[];
  applicable_regulators: string[];
  regulatory_domains: ComplianceDomain[];
  ria_matrix: RiaMatrixItem[];
  lifecycle_stage: FeatureLifecycleStage;
  gate_status: LaunchGateStatus;
  readiness_score_numerator: number;
  readiness_score_denominator: number;
  work_product_id: string | null;
  conversation_id: string | null;
  linked_product_id: string | null;
  created_by: string;
  owner_user_id: string;
  owner_role: CanonicalRole;
  launched_at: string | null;
  next_pir_due_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FeatureControlRecord {
  id: string;
  tenant_id: string;
  feature_id: string;
  control_code: string;
  compliance_domain: ComplianceDomain;
  regulator: string;
  statutory_citation: string;
  risk_statement: string;
  risk_severity: MaterialityTier;
  control_type: ControlType;
  control_objective: string;
  product_requirement: string;
  engineering_spec: string;
  operational_sop_trigger: string;
  qa_test_case: string;
  owner_line: "FIRST_LINE" | "SECOND_LINE";
  owner_role: CanonicalRole;
  required_evidence_description: string;
  is_mandatory_launch_blocker: boolean;
  verification_status: ControlVerificationStatus;
  evidence_attachments: ControlEvidenceAttachment[];
  verified_by: string | null;
  verified_role: CanonicalRole | null;
  verified_at: string | null;
  verification_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureReadinessGateRecord {
  id: string;
  tenant_id: string;
  feature_id: string;
  gate_number: number;
  decision: "APPROVED" | "CONDITIONALLY_APPROVED" | "REJECTED";
  readiness_score_numerator: number;
  readiness_score_denominator: number;
  checklist_snapshot: ReadinessChecklistItem[];
  conditions: GateConditionItem[];
  signoffs: GateSignoffRecord[];
  decided_by: string;
  decided_role: CanonicalRole;
  decision_rationale: string;
  snapshot_hash_sha256: string;
  created_at: string;
}

export interface FeaturePostLaunchReviewRecord {
  id: string;
  tenant_id: string;
  feature_id: string;
  review_type: PostLaunchReviewType;
  status: PostLaunchReviewStatus;
  title: string;
  trigger_summary: string;
  monitoring_metrics: PostLaunchMonitoringMetrics;
  change_impact_summary: string | null;
  requires_reapproval: boolean;
  remediation_actions: Array<{
    action: string;
    owner_role: CanonicalRole;
    due_date?: string;
    status: "OPEN" | "DONE";
  }>;
  conducted_by: string;
  conducted_role: CanonicalRole;
  concluded_at: string | null;
  conclusion_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Zod Request Validation Schemas
// ---------------------------------------------------------------------------

export const createFeatureSchema = z.object({
  feature_name: z.string().trim().min(3).max(200),
  summary: z.string().trim().min(10).max(4000),
  business_objective: z.string().trim().max(1500).default(""),
  financial_activity_type: z.enum(FINANCIAL_ACTIVITY_TYPES).optional(),
  change_classification: z.enum(CHANGE_CLASSIFICATIONS).optional(),
  materiality_tier: z.enum(MATERIALITY_TIERS).optional(),
  target_market: z.enum(TARGET_MARKETS).default("INDIVIDUALS_AND_BUSINESSES"),
  revenue_model: z.string().trim().max(1000).default(""),
  third_party_dependencies: z.array(z.string().trim().min(1).max(200)).default([]),
  work_product_id: z.string().uuid().optional().nullable(),
  conversation_id: z.string().uuid().optional().nullable(),
  linked_product_id: z.string().uuid().optional().nullable(),
  auto_generate_controls: z.boolean().default(true),
});

export const promoteWorkProductToFeatureSchema = z.object({
  work_product_id: z.string().uuid(),
  feature_name: z.string().trim().min(3).max(200).optional(),
  change_classification: z.enum(CHANGE_CLASSIFICATIONS).optional(),
  target_market: z.enum(TARGET_MARKETS).optional(),
  revenue_model: z.string().trim().max(1000).optional(),
  third_party_dependencies: z.array(z.string().trim().min(1).max(200)).optional(),
});

export const updateFeatureSchema = z.object({
  feature_name: z.string().trim().min(3).max(200).optional(),
  summary: z.string().trim().min(10).max(4000).optional(),
  business_objective: z.string().trim().max(1500).optional(),
  change_classification: z.enum(CHANGE_CLASSIFICATIONS).optional(),
  materiality_tier: z.enum(MATERIALITY_TIERS).optional(),
  target_market: z.enum(TARGET_MARKETS).optional(),
  revenue_model: z.string().trim().max(1000).optional(),
  third_party_dependencies: z.array(z.string().trim().min(1).max(200)).optional(),
  lifecycle_stage: z.enum(FEATURE_LIFECYCLE_STAGES).optional(),
  next_pir_due_at: z.string().datetime().nullable().optional(),
});

export const createControlSchema = z.object({
  control_code: z.string().trim().min(3).max(40),
  compliance_domain: z.enum(COMPLIANCE_DOMAINS),
  regulator: z.string().trim().min(2).max(40).default("CBN"),
  statutory_citation: z.string().trim().min(3).max(300),
  risk_statement: z.string().trim().min(5).max(1000),
  risk_severity: z.enum(MATERIALITY_TIERS).default("HIGH"),
  control_type: z.enum(CONTROL_TYPES),
  control_objective: z.string().trim().min(5).max(1000),
  product_requirement: z.string().trim().min(5).max(1000),
  engineering_spec: z.string().trim().min(5).max(1200),
  operational_sop_trigger: z.string().trim().min(5).max(1000),
  qa_test_case: z.string().trim().min(5).max(1000),
  owner_line: z.enum(["FIRST_LINE", "SECOND_LINE"]).default("FIRST_LINE"),
  owner_role: z.enum(CANONICAL_ROLES).default("ENGINEERING_LEAD"),
  required_evidence_description: z.string().trim().min(3).max(600),
  is_mandatory_launch_blocker: z.boolean().default(true),
});

export const attachControlEvidenceSchema = z.object({
  control_id: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  evidence_type: z
    .enum([
      "TEST_LOG",
      "AUTHORIZATION_AUDIT",
      "LIMIT_CONFIG",
      "SOP_DOCUMENT",
      "DISCLOSURE_SCREENSHOT",
      "SECURITY_PENTEST",
      "SANCTIONS_SCREENING_LOG",
      "REGULATORY_FILING",
      "OTHER",
    ])
    .default("TEST_LOG"),
  reference_url_or_key: z.string().trim().min(2).max(500),
  notes: z.string().trim().max(1500).optional(),
  content_digest_input: z.string().max(10000).optional(),
});

export const verifyControlSchema = z.object({
  control_id: z.string().uuid(),
  verification_status: z.enum([
    "IN_PROGRESS",
    "VERIFIED",
    "FAILED",
    "WAIVED_WITH_CONDITION",
    "REASSESSMENT_REQUIRED",
  ]),
  verification_notes: z.string().trim().min(3).max(1500),
});

export const submitGateActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("SUBMIT_FOR_GATE"),
    submission_notes: z.string().trim().max(1000).optional(),
  }),
  z.object({
    action: z.literal("RECORD_DECISION"),
    decision: z.enum(["APPROVED", "CONDITIONALLY_APPROVED", "REJECTED"]),
    decision_rationale: z.string().trim().min(10).max(2500),
    conditions: z
      .array(
        z.object({
          description: z.string().trim().min(5).max(600),
          owner_role: z.enum(CANONICAL_ROLES),
          due_date: z.string().trim().min(4).max(40),
        })
      )
      .default([]),
    allow_self_approval_override: z.boolean().optional().default(false),
  }),
]);

export const createPostLaunchReviewSchema = z.object({
  review_type: z.enum(POST_LAUNCH_REVIEW_TYPES),
  title: z.string().trim().min(4).max(240),
  trigger_summary: z.string().trim().min(8).max(2000),
  monitoring_metrics: z
    .object({
      transaction_monitoring_alerts: z.number().int().nonnegative().optional(),
      suspicious_activity_reports_filed: z.number().int().nonnegative().optional(),
      unauthorized_or_fraud_attempts: z.number().int().nonnegative().optional(),
      customer_complaints_and_disputes: z.number().int().nonnegative().optional(),
      failed_or_duplicate_transactions: z.number().int().nonnegative().optional(),
      control_failures_open: z.number().int().nonnegative().optional(),
      monthly_transaction_volume_ngn: z.number().nonnegative().optional(),
      regulatory_reports_on_time: z.boolean().optional(),
      notes: z.string().max(2000).optional(),
    })
    .default({}),
  change_impact_summary: z.string().trim().max(2000).optional().nullable(),
  requires_reapproval: z.boolean().default(false),
  suspend_feature_immediately: z.boolean().default(false),
  retire_feature: z.boolean().default(false),
  remediation_actions: z
    .array(
      z.object({
        action: z.string().trim().min(4).max(600),
        owner_role: z.enum(CANONICAL_ROLES),
        due_date: z.string().trim().max(40).optional(),
        status: z.enum(["OPEN", "DONE"]).default("OPEN"),
      })
    )
    .default([]),
  conclusion_notes: z.string().trim().max(2000).optional().nullable(),
});
