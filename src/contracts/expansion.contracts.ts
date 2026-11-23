/**
 * Cogent Compliance OS — Cross-Border Expansion OS Contracts (Stages 1–8)
 *
 * Canonical Zod validation schemas & TypeScript contracts for the full
 * 8-Stage Cross-Border Compliance Operating Lifecycle:
 *   1. Market Entry Assessment
 *   2. Regulatory Licensing & Authorisation
 *   3. Regulatory & Compliance Framework Localisation (Group → Local Policy OS)
 *   4. Country-Specific & Enterprise Risk Assessment
 *   5. Operational Compliance Infrastructure & Control Implementation
 *   6. Pre-Launch Compliance Validation & Formal CCO / Board Go-Live Gate
 *   7. Live Operations, Regulatory Reporting Calendar & Incident Register
 *   8. Ongoing Compliance & Multi-Country Regulatory Change Management
 */

import { z } from "zod";

export const EXPANSION_STAGES = [
  "MARKET_ENTRY_ASSESSMENT",
  "LICENSING_AUTHORISATION",
  "FRAMEWORK_LOCALISATION",
  "RISK_ASSESSMENT",
  "CONTROL_IMPLEMENTATION",
  "PRE_LAUNCH_VALIDATION",
  "LIVE_OPERATIONS",
  "ONGOING_OVERSIGHT",
] as const;
export type ExpansionStage = (typeof EXPANSION_STAGES)[number];

export const EXPANSION_STAGE_META: ReadonlyArray<{
  stage: ExpansionStage;
  number: number;
  label: string;
  shortLabel: string;
  deliverable: string;
}> = [
  {
    stage: "MARKET_ENTRY_ASSESSMENT",
    number: 1,
    label: "Market Entry Assessment",
    shortLabel: "1. Market Entry",
    deliverable: "Market-entry regulatory assessment & operating model recommendation",
  },
  {
    stage: "LICENSING_AUTHORISATION",
    number: 2,
    label: "Licensing & Authorisation",
    shortLabel: "2. Licensing",
    deliverable: "Regulatory authorisation, documented permissions, or approved partner structure",
  },
  {
    stage: "FRAMEWORK_LOCALISATION",
    number: 3,
    label: "Framework Localisation",
    shortLabel: "3. Localisation",
    deliverable: "Localised compliance framework, policy suite, control matrix & governance",
  },
  {
    stage: "RISK_ASSESSMENT",
    number: 4,
    label: "Country Risk Assessment",
    shortLabel: "4. Risk",
    deliverable: "Documented country risk assessment, risk register & approved risk appetite",
  },
  {
    stage: "CONTROL_IMPLEMENTATION",
    number: 5,
    label: "Operational Infrastructure",
    shortLabel: "5. Controls",
    deliverable: "Configured KYC, AML, sanctions, TM, STR & recordkeeping control specs",
  },
  {
    stage: "PRE_LAUNCH_VALIDATION",
    number: 6,
    label: "Pre-Launch Validation",
    shortLabel: "6. Validation & Gate",
    deliverable: "Compliance readiness assessment, testing evidence & formal go-live approval",
  },
  {
    stage: "LIVE_OPERATIONS",
    number: 7,
    label: "Live Operations & Reporting",
    shortLabel: "7. Live Ops",
    deliverable: "Active reporting calendar, monitoring cadence & compliance incident register",
  },
  {
    stage: "ONGOING_OVERSIGHT",
    number: 8,
    label: "Ongoing Regulatory Change",
    shortLabel: "8. Reg Change",
    deliverable: "Continuous multi-country regulatory change log & periodic assurance reviews",
  },
];

export const EXPANSION_PRODUCT_SCOPES = [
  "PAYMENTS",
  "REMITTANCE",
  "DIGITAL_LENDING",
  "E_MONEY_WALLET",
  "FX_CARDS",
  "WEALTHTECH",
  "BANKING_MFB",
  "MULTI_PRODUCT",
] as const;
export type ExpansionProductScope = (typeof EXPANSION_PRODUCT_SCOPES)[number];

export const EXPANSION_PRODUCT_SCOPE_LABELS: Record<ExpansionProductScope, string> = {
  PAYMENTS: "Payments & PSP Gateway",
  REMITTANCE: "Cross-Border Remittance / IMTO",
  DIGITAL_LENDING: "Digital Lending & Consumer Credit",
  E_MONEY_WALLET: "E-Money & Digital Wallets",
  FX_CARDS: "FX & Virtual / Physical Cards",
  WEALTHTECH: "WealthTech & Investments",
  BANKING_MFB: "Microfinance / Commercial Banking",
  MULTI_PRODUCT: "Multi-Product Financial Suite",
};

export const EXPANSION_OPERATING_MODELS = [
  "DIRECT_LICENSE",
  "PARTNER_LED",
  "PASSPORTING",
  "HYBRID",
  "UNDECIDED",
] as const;
export type ExpansionOperatingModel = (typeof EXPANSION_OPERATING_MODELS)[number];

export const EXPANSION_OPERATING_MODEL_LABELS: Record<ExpansionOperatingModel, string> = {
  DIRECT_LICENSE: "Direct Local Licence",
  PARTNER_LED: "Licensed Local Partner Model",
  PASSPORTING: "Cross-Border Permissions / Passporting",
  HYBRID: "Hybrid (Partner Launch → Direct Licence)",
  UNDECIDED: "Under Assessment",
};

export const EXPANSION_PROGRAM_STATUSES = [
  "ACTIVE",
  "ON_HOLD",
  "GO_LIVE_PENDING",
  "LIVE",
  "SUSPENDED",
  "ARCHIVED",
] as const;
export type ExpansionProgramStatus = (typeof EXPANSION_PROGRAM_STATUSES)[number];

export const COUNTRY_GOVERNANCE_ROLES = [
  "GROUP_CCO_SPONSOR",
  "COUNTRY_COMPLIANCE_OFFICER",
  "COUNTRY_MLRO",
  "REGULATORY_AFFAIRS_LEAD",
  "LOCAL_LEGAL_COUNSEL",
  "ENGINEERING_CONTROLS_LEAD",
  "OPERATIONS_READINESS_LEAD",
  "LOCAL_PARTNER_LIAISON",
  "INTERNAL_AUDIT_OBSERVER",
] as const;
export type CountryGovernanceRole = (typeof COUNTRY_GOVERNANCE_ROLES)[number];

export const COUNTRY_GOVERNANCE_ROLE_LABELS: Record<CountryGovernanceRole, string> = {
  GROUP_CCO_SPONSOR: "Group Chief Compliance Officer (Sponsor)",
  COUNTRY_COMPLIANCE_OFFICER: "Country Compliance Officer",
  COUNTRY_MLRO: "Country MLRO / AML Reporting Officer",
  REGULATORY_AFFAIRS_LEAD: "Regulatory Affairs & Licensing Lead",
  LOCAL_LEGAL_COUNSEL: "Local Legal Counsel",
  ENGINEERING_CONTROLS_LEAD: "Engineering & Controls Lead",
  OPERATIONS_READINESS_LEAD: "Compliance Operations Lead",
  LOCAL_PARTNER_LIAISON: "Local Banking / PSP Partner Liaison",
  INTERNAL_AUDIT_OBSERVER: "Internal Audit (Independent Assurance)",
};

export const FIT_PROPER_STATUSES = [
  "NOT_REQUIRED",
  "PENDING",
  "SUBMITTED_TO_REGULATOR",
  "APPROVED",
  "REJECTED",
] as const;
export type FitProperStatus = (typeof FIT_PROPER_STATUSES)[number];

export const OBLIGATION_STAGE_CATEGORIES = [
  "MARKET_ENTRY",
  "LICENSING",
  "GOVERNANCE_FIT_PROPER",
  "CAPITAL_ESCROW",
  "AML_CFT",
  "DATA_PROTECTION",
  "FX_CURRENCY",
  "CONSUMER_PROTECTION",
  "PARTNER_APPROVAL",
  "REPORTING",
] as const;
export type ObligationStageCategory = (typeof OBLIGATION_STAGE_CATEGORIES)[number];

export const OBLIGATION_GAP_STATUSES = [
  "UNASSESSED",
  "COMPLIANT",
  "PARTIAL_GAP",
  "CRITICAL_GAP",
  "NOT_APPLICABLE",
] as const;
export type ObligationGapStatus = (typeof OBLIGATION_GAP_STATUSES)[number];

export const LICENSING_STATUSES = [
  "NOT_REQUIRED",
  "NOT_STARTED",
  "IN_PREPARATION",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CONDITIONAL_APPROVAL",
  "APPROVED",
  "REJECTED",
] as const;
export type LicensingStatus = (typeof LICENSING_STATUSES)[number];

export const LOCALISATION_COMPLIANCE_AREAS = [
  "KYC",
  "AML_CFT",
  "SANCTIONS",
  "TRANSACTION_MONITORING",
  "DATA_PROTECTION",
  "CONSUMER_PROTECTION",
  "RECORDKEEPING",
  "REGULATORY_REPORTING",
] as const;
export type LocalisationComplianceArea = (typeof LOCALISATION_COMPLIANCE_AREAS)[number];

export const LOCALISATION_STATUSES = [
  "NOT_STARTED",
  "GAP_IDENTIFIED",
  "DRAFTING",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
] as const;
export type LocalisationStatus = (typeof LOCALISATION_STATUSES)[number];

export const EXPANSION_RISK_CATEGORIES = [
  "MONEY_LAUNDERING",
  "TERRORIST_FINANCING",
  "SANCTIONS",
  "FRAUD",
  "REGULATORY_LICENSING",
  "DATA_PROTECTION",
  "THIRD_PARTY_PARTNER",
  "CURRENCY_FX",
  "CONSUMER_PROTECTION",
  "OPERATIONAL_RESILIENCE",
] as const;
export type ExpansionRiskCategory = (typeof EXPANSION_RISK_CATEGORIES)[number];

export const RISK_RATINGS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type RiskRating = (typeof RISK_RATINGS)[number];

export const RISK_APPETITE_DECISIONS = [
  "MITIGATE",
  "PROHIBIT",
  "ACCEPT_WITH_ESCALATION",
  "TRANSFER",
] as const;
export type RiskAppetiteDecision = (typeof RISK_APPETITE_DECISIONS)[number];

export const RISK_STATUSES = [
  "OPEN",
  "MITIGATING",
  "MITIGATED",
  "ACCEPTED",
  "PROHIBITED_BLOCKED",
] as const;
export type RiskStatus = (typeof RISK_STATUSES)[number];

export const WORKSTREAM_TEAMS = [
  "REGULATORY_AFFAIRS",
  "LEGAL",
  "AML_COMPLIANCE",
  "RISK",
  "PROCUREMENT_PARTNERS",
  "ENGINEERING",
  "INFOSEC",
  "OPERATIONS",
  "HR_TRAINING",
  "FINANCE",
  "LOCAL_PARTNER",
  "MANAGEMENT_COMPLIANCE",
] as const;
export type WorkstreamTeam = (typeof WORKSTREAM_TEAMS)[number];

export const WORKSTREAM_TEAM_LABELS: Record<WorkstreamTeam, string> = {
  REGULATORY_AFFAIRS: "Regulatory Affairs",
  LEGAL: "Legal & Compliance",
  AML_COMPLIANCE: "AML / MLRO Team",
  RISK: "Risk Management",
  PROCUREMENT_PARTNERS: "Compliance + Procurement",
  ENGINEERING: "Engineering + Compliance",
  INFOSEC: "Information Security",
  OPERATIONS: "Compliance Operations",
  HR_TRAINING: "HR + Compliance Training",
  FINANCE: "Finance & Treasury",
  LOCAL_PARTNER: "Local Banking / PSP Partner",
  MANAGEMENT_COMPLIANCE: "Management + CCO",
};

export const WORKSTREAM_PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
export type WorkstreamPriority = (typeof WORKSTREAM_PRIORITIES)[number];

export const WORKSTREAM_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "EVIDENCE_SUBMITTED",
  "VERIFIED",
] as const;
export type WorkstreamStatus = (typeof WORKSTREAM_STATUSES)[number];

export const VALIDATION_TEST_CATEGORIES = [
  "KYC_VERIFICATION",
  "SANCTIONS_SCREENING",
  "TRANSACTION_MONITORING",
  "ALERT_ESCALATION",
  "REGULATORY_REPORTING",
  "DATA_PROTECTION",
  "OPERATIONAL_RESILIENCE",
  "PARTNER_DUE_DILIGENCE",
  "STAFF_TRAINING",
  "POLICY_APPROVAL",
] as const;
export type ValidationTestCategory = (typeof VALIDATION_TEST_CATEGORIES)[number];

export const VALIDATION_TEST_STATUSES = [
  "PENDING",
  "PASSED",
  "FAILED",
  "REMEDIATING",
  "WAIVED",
] as const;
export type ValidationTestStatus = (typeof VALIDATION_TEST_STATUSES)[number];

export const GO_LIVE_DECISIONS = [
  "APPROVED_FOR_LAUNCH",
  "CONDITIONAL_LAUNCH",
  "BLOCKED_REMEDIATION_REQUIRED",
] as const;
export type GoLiveDecision = (typeof GO_LIVE_DECISIONS)[number];

export const REPORTING_FREQUENCIES = [
  "REAL_TIME",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "ANNUALLY",
  "AS_REQUIRED",
] as const;
export type ReportingFrequency = (typeof REPORTING_FREQUENCIES)[number];

export const REPORTING_STATUSES = [
  "SCHEDULED",
  "IN_PREPARATION",
  "SUBMITTED",
  "OVERDUE",
  "EXEMPT",
] as const;
export type ReportingStatus = (typeof REPORTING_STATUSES)[number];

export const INCIDENT_CATEGORIES = [
  "COMPLIANCE_BREACH",
  "AML_STR_ESCALATION",
  "SANCTIONS_HIT",
  "DATA_BREACH",
  "PARTNER_FAILURE",
  "REGULATORY_INQUIRY",
  "CONTROL_FAILURE",
] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const INCIDENT_STATUSES = [
  "OPEN",
  "INVESTIGATING",
  "REMEDIATING",
  "REGULATOR_NOTIFIED",
  "CLOSED",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const REG_CHANGE_STATUSES = [
  "DETECTED",
  "IMPACT_ASSESSING",
  "IMPLEMENTING",
  "EVIDENCE_VERIFIED",
  "CLOSED",
] as const;
export type RegChangeStatus = (typeof REG_CHANGE_STATUSES)[number];

export const CORE_ARTEFACT_TYPES = [
  "REGULATORY_OBLIGATIONS_REGISTER",
  "REGULATORY_GAP_ASSESSMENT",
  "COUNTRY_RISK_ASSESSMENT",
  "AML_CFT_POLICY",
  "KYC_CDD_PROCEDURES",
  "SANCTIONS_SCREENING_POLICY",
  "COMPLIANCE_RISK_REGISTER",
  "REGULATORY_REPORTING_CALENDAR",
  "COMPLIANCE_MONITORING_PLAN",
  "COMPLIANCE_TESTING_REPORT",
  "REGULATORY_CHANGE_LOG",
  "COMPLIANCE_INCIDENT_REGISTER",
  "MARKET_ENTRY_COMPLIANCE_ASSESSMENT",
] as const;
export type CoreArtefactType = (typeof CORE_ARTEFACT_TYPES)[number];

export const ARTEFACT_STATUSES = ["MISSING", "DRAFT", "IN_REVIEW", "APPROVED", "LIVE"] as const;
export type ArtefactStatus = (typeof ARTEFACT_STATUSES)[number];

// ==============================================================================
// Entity Record Interfaces
// ==============================================================================

export interface ExpansionProgramRecord {
  id: string;
  tenant_id: string;
  program_ref_no: string;
  title: string;
  home_jurisdiction: string;
  target_jurisdiction: string;
  target_country_name: string;
  primary_regulators: string[];
  product_scope: ExpansionProductScope;
  operating_model: ExpansionOperatingModel;
  operating_model_rationale: string | null;
  current_stage: ExpansionStage;
  status: ExpansionProgramStatus;
  risk_appetite_statement: string | null;
  prohibited_activities: string[];
  target_launch_date: string | null;
  source_work_product_id: string | null;
  go_live_approved_at: string | null;
  go_live_approved_by: string | null;
  go_live_approval_hash: string | null;
  readiness_score: number;
  executive_summary: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExpansionCountryRoleRecord {
  id: string;
  tenant_id: string;
  expansion_id: string;
  jurisdiction_code: string;
  governance_role: CountryGovernanceRole;
  assignee_user_id: string | null;
  assignee_name: string;
  assignee_email: string | null;
  entity_or_partner: string | null;
  fit_and_proper_status: FitProperStatus;
  appointed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpansionObligationRecord {
  id: string;
  tenant_id: string;
  expansion_id: string;
  stage_category: ObligationStageCategory;
  regulator: string;
  statute_reference: string;
  obligation_title: string;
  obligation_summary: string;
  gap_status: ObligationGapStatus;
  licensing_status: LicensingStatus;
  is_mandatory_for_go_live: boolean;
  owner_department: string;
  owner_name: string | null;
  due_date: string | null;
  evidence_ref: string | null;
  source_url: string | null;
  linked_policy_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpansionPolicyLocalisationRecord {
  id: string;
  tenant_id: string;
  expansion_id: string;
  compliance_area: LocalisationComplianceArea;
  area_title: string;
  local_requirements_summary: string;
  gap_summary: string | null;
  group_policy_id: string | null;
  local_policy_id: string | null;
  localisation_status: LocalisationStatus;
  owner_name: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpansionRiskRecord {
  id: string;
  tenant_id: string;
  expansion_id: string;
  risk_category: ExpansionRiskCategory;
  risk_title: string;
  risk_description: string;
  inherent_likelihood: number;
  inherent_impact: number;
  inherent_rating: RiskRating;
  appetite_decision: RiskAppetiteDecision;
  mitigation_plan: string;
  residual_likelihood: number;
  residual_impact: number;
  residual_rating: RiskRating;
  status: RiskStatus;
  owner_name: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpansionWorkstreamRecord {
  id: string;
  tenant_id: string;
  expansion_id: string;
  workstream_code: string;
  title: string;
  description: string;
  stage: ExpansionStage;
  responsible_team: WorkstreamTeam;
  priority: WorkstreamPriority;
  status: WorkstreamStatus;
  control_specification: string | null;
  expected_evidence: string;
  completion_evidence_ref: string | null;
  owner_name: string | null;
  due_date: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpansionValidationTestRecord {
  id: string;
  tenant_id: string;
  expansion_id: string;
  test_category: ValidationTestCategory;
  test_name: string;
  test_objective: string;
  is_critical_gate: boolean;
  status: ValidationTestStatus;
  evidence_ref: string | null;
  actual_result: string | null;
  remediation_log: string | null;
  tested_by: string | null;
  tested_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpansionGoLiveGateRecord {
  id: string;
  tenant_id: string;
  expansion_id: string;
  decision: GoLiveDecision;
  approver_role: "CHIEF_COMPLIANCE_OFFICER" | "COMMITTEE_MEMBER" | "BOARD_MEMBER";
  approver_user_id: string;
  approver_name: string | null;
  readiness_score: number;
  cco_questions_snapshot: CcoReadinessQuestionResult[];
  conditions_or_notes: string | null;
  readiness_dossier_markdown: string | null;
  approval_hash_sha256: string;
  created_at: string;
}

export interface ExpansionReportingItemRecord {
  id: string;
  tenant_id: string;
  expansion_id: string;
  regulator: string;
  report_name: string;
  frequency: ReportingFrequency;
  submission_channel: string;
  statutory_reference: string | null;
  owner_name: string | null;
  next_due_date: string | null;
  last_submitted_at: string | null;
  last_submission_ref: string | null;
  status: ReportingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpansionIncidentRecord {
  id: string;
  tenant_id: string;
  expansion_id: string;
  incident_ref_no: string;
  title: string;
  description: string;
  severity: RiskRating;
  category: IncidentCategory;
  regulator_notification_required: boolean;
  regulator_notified_at: string | null;
  status: IncidentStatus;
  owner_name: string | null;
  root_cause: string | null;
  remediation_summary: string | null;
  detected_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpansionRegulatoryChangeRecord {
  id: string;
  tenant_id: string;
  expansion_id: string;
  jurisdiction_code: string;
  regulator: string;
  circular_title: string;
  source_url: string | null;
  detected_source: "MANUAL" | "RIPPLE_SENTINEL" | "LIVE_WEB_MONITOR";
  impact_severity: RiskRating;
  impact_summary: string;
  impacted_areas: string[];
  assigned_owner: string | null;
  implementation_deadline: string | null;
  status: RegChangeStatus;
  evidence_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpansionArtefactRecord {
  id: string;
  tenant_id: string;
  expansion_id: string;
  artefact_type: CoreArtefactType;
  title: string;
  purpose: string;
  status: ArtefactStatus;
  linked_policy_id: string | null;
  linked_work_product_id: string | null;
  evidence_ref: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ==============================================================================
// Deterministic 6-Question CCO Go-Live Readiness Evaluation
// ==============================================================================

export interface CcoReadinessQuestionResult {
  key:
    | "LEGALLY_PERMITTED"
    | "APPROVALS_OBTAINED"
    | "CONTROLS_IMPLEMENTED"
    | "STAFF_PARTNERS_PREPARED"
    | "CONTROLS_PROVEN_EFFECTIVE"
    | "MONITORING_REPORTING_ACTIVE";
  number: number;
  question: string;
  status: "PASS" | "BLOCKED" | "WARNING";
  summary: string;
  blockers: string[];
  evidence_count: number;
}

export interface ExpansionReadinessReport {
  overall_score: number;
  go_live_eligible: boolean;
  hard_blocker_count: number;
  warning_count: number;
  questions: CcoReadinessQuestionResult[];
  artefacts_ready_count: number;
  artefacts_total_count: number;
  evaluated_at: string;
}

export interface ExpansionDashboardSummary {
  kpis: {
    total_programs: number;
    active_expansions: number;
    live_markets: number;
    go_live_ready: number;
    critical_blockers: number;
    open_regulatory_changes: number;
    overdue_filings: number;
  };
  programs: Array<
    ExpansionProgramRecord & {
      obligations_count: number;
      critical_gaps_count: number;
      localised_policies_count: number;
      total_localisations_count: number;
      passed_tests_count: number;
      total_tests_count: number;
      open_changes_count: number;
    }
  >;
}

export interface ExpansionDetailBundle {
  program: ExpansionProgramRecord;
  readiness: ExpansionReadinessReport;
  country_roles: ExpansionCountryRoleRecord[];
  obligations: ExpansionObligationRecord[];
  policy_localisations: ExpansionPolicyLocalisationRecord[];
  risks: ExpansionRiskRecord[];
  workstreams: ExpansionWorkstreamRecord[];
  validation_tests: ExpansionValidationTestRecord[];
  go_live_gates: ExpansionGoLiveGateRecord[];
  reporting_calendar: ExpansionReportingItemRecord[];
  incidents: ExpansionIncidentRecord[];
  regulatory_changes: ExpansionRegulatoryChangeRecord[];
  artefacts: ExpansionArtefactRecord[];
}

// ==============================================================================
// Zod Request Validation Schemas
// ==============================================================================

export const listExpansionsQuerySchema = z.object({
  status: z.enum(EXPANSION_PROGRAM_STATUSES).optional(),
  stage: z.enum(EXPANSION_STAGES).optional(),
  jurisdiction: z.string().trim().max(32).optional(),
  q: z.string().trim().max(120).optional(),
});

export const createExpansionSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  home_jurisdiction: z.string().trim().min(2).max(24).default("NG"),
  target_jurisdiction: z.string().trim().min(2).max(40),
  product_scope: z.enum(EXPANSION_PRODUCT_SCOPES).default("PAYMENTS"),
  operating_model: z.enum(EXPANSION_OPERATING_MODELS).default("UNDECIDED"),
  operating_model_rationale: z.string().max(2000).optional(),
  risk_appetite_statement: z.string().max(2000).optional(),
  target_launch_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  source_work_product_id: z.string().uuid().optional().nullable(),
  auto_populate_blueprint: z.boolean().default(true),
});
export type CreateExpansionInput = z.infer<typeof createExpansionSchema>;

export const updateExpansionSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  product_scope: z.enum(EXPANSION_PRODUCT_SCOPES).optional(),
  operating_model: z.enum(EXPANSION_OPERATING_MODELS).optional(),
  operating_model_rationale: z.string().max(2000).optional().nullable(),
  current_stage: z.enum(EXPANSION_STAGES).optional(),
  status: z.enum(EXPANSION_PROGRAM_STATUSES).optional(),
  risk_appetite_statement: z.string().max(2000).optional().nullable(),
  prohibited_activities: z.array(z.string().trim().min(1).max(200)).optional(),
  target_launch_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  executive_summary: z.string().max(8000).optional().nullable(),
});
export type UpdateExpansionInput = z.infer<typeof updateExpansionSchema>;

export const createObligationSchema = z.object({
  stage_category: z.enum(OBLIGATION_STAGE_CATEGORIES),
  regulator: z.string().trim().min(2).max(160),
  statute_reference: z.string().trim().min(2).max(240),
  obligation_title: z.string().trim().min(3).max(240),
  obligation_summary: z.string().trim().min(5).max(3000),
  gap_status: z.enum(OBLIGATION_GAP_STATUSES).default("UNASSESSED"),
  licensing_status: z.enum(LICENSING_STATUSES).default("NOT_REQUIRED"),
  is_mandatory_for_go_live: z.boolean().default(true),
  owner_department: z.string().trim().min(2).max(120).default("Regulatory Affairs"),
  owner_name: z.string().trim().max(120).optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  evidence_ref: z.string().max(1000).optional().nullable(),
  source_url: z.string().url().optional().nullable().or(z.literal("")),
  notes: z.string().max(2000).optional().nullable(),
});
export type CreateObligationInput = z.infer<typeof createObligationSchema>;

export const updateObligationSchema = z.object({
  obligation_id: z.string().uuid(),
  gap_status: z.enum(OBLIGATION_GAP_STATUSES).optional(),
  licensing_status: z.enum(LICENSING_STATUSES).optional(),
  is_mandatory_for_go_live: z.boolean().optional(),
  owner_department: z.string().trim().max(120).optional(),
  owner_name: z.string().trim().max(120).optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  evidence_ref: z.string().max(1000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
export type UpdateObligationInput = z.infer<typeof updateObligationSchema>;

export const localisationActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("UPDATE_LOCALISATION"),
    localisation_id: z.string().uuid(),
    localisation_status: z.enum(LOCALISATION_STATUSES).optional(),
    gap_summary: z.string().max(2000).optional().nullable(),
    group_policy_id: z.string().uuid().optional().nullable(),
    local_policy_id: z.string().uuid().optional().nullable(),
    owner_name: z.string().max(120).optional().nullable(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  }),
  z.object({
    action: z.literal("SPAWN_LOCAL_POLICY"),
    localisation_id: z.string().uuid(),
    approval_tier: z.enum(["TIER_1_CCO", "TIER_2_COMMITTEE", "TIER_3_BOARD"]).default("TIER_2_COMMITTEE"),
  }),
]);
export type LocalisationActionInput = z.infer<typeof localisationActionSchema>;

export const createRiskSchema = z.object({
  risk_category: z.enum(EXPANSION_RISK_CATEGORIES),
  risk_title: z.string().trim().min(3).max(240),
  risk_description: z.string().trim().min(5).max(3000),
  inherent_likelihood: z.number().int().min(1).max(5).default(3),
  inherent_impact: z.number().int().min(1).max(5).default(4),
  appetite_decision: z.enum(RISK_APPETITE_DECISIONS).default("MITIGATE"),
  mitigation_plan: z.string().trim().min(3).max(3000),
  residual_likelihood: z.number().int().min(1).max(5).default(2),
  residual_impact: z.number().int().min(1).max(5).default(2),
  owner_name: z.string().max(120).optional().nullable(),
});
export type CreateRiskInput = z.infer<typeof createRiskSchema>;

export const updateRiskSchema = z.object({
  risk_id: z.string().uuid(),
  inherent_likelihood: z.number().int().min(1).max(5).optional(),
  inherent_impact: z.number().int().min(1).max(5).optional(),
  appetite_decision: z.enum(RISK_APPETITE_DECISIONS).optional(),
  mitigation_plan: z.string().max(3000).optional(),
  residual_likelihood: z.number().int().min(1).max(5).optional(),
  residual_impact: z.number().int().min(1).max(5).optional(),
  status: z.enum(RISK_STATUSES).optional(),
  owner_name: z.string().max(120).optional().nullable(),
});
export type UpdateRiskInput = z.infer<typeof updateRiskSchema>;

export const createWorkstreamSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(2000),
  stage: z.enum(EXPANSION_STAGES).default("CONTROL_IMPLEMENTATION"),
  responsible_team: z.enum(WORKSTREAM_TEAMS),
  priority: z.enum(WORKSTREAM_PRIORITIES).default("P1"),
  control_specification: z.string().max(3000).optional().nullable(),
  expected_evidence: z.string().trim().min(3).max(1000),
  owner_name: z.string().max(120).optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});
export type CreateWorkstreamInput = z.infer<typeof createWorkstreamSchema>;

export const updateWorkstreamSchema = z.object({
  workstream_id: z.string().uuid(),
  status: z.enum(WORKSTREAM_STATUSES).optional(),
  priority: z.enum(WORKSTREAM_PRIORITIES).optional(),
  control_specification: z.string().max(3000).optional().nullable(),
  completion_evidence_ref: z.string().max(1000).optional().nullable(),
  owner_name: z.string().max(120).optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});
export type UpdateWorkstreamInput = z.infer<typeof updateWorkstreamSchema>;

export const createValidationTestSchema = z.object({
  test_category: z.enum(VALIDATION_TEST_CATEGORIES),
  test_name: z.string().trim().min(3).max(200),
  test_objective: z.string().trim().min(5).max(2000),
  is_critical_gate: z.boolean().default(true),
});
export type CreateValidationTestInput = z.infer<typeof createValidationTestSchema>;

export const updateValidationTestSchema = z.object({
  test_id: z.string().uuid(),
  status: z.enum(VALIDATION_TEST_STATUSES),
  evidence_ref: z.string().max(1000).optional().nullable(),
  actual_result: z.string().max(2000).optional().nullable(),
  remediation_log: z.string().max(2000).optional().nullable(),
  verify: z.boolean().optional(),
});
export type UpdateValidationTestInput = z.infer<typeof updateValidationTestSchema>;

export const goLiveGateActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("GENERATE_DOSSIER"),
  }),
  z.object({
    action: z.literal("SUBMIT_DECISION"),
    decision: z.enum(GO_LIVE_DECISIONS),
    conditions_or_notes: z.string().max(3000).optional().nullable(),
    force_conditional_override: z.boolean().default(false),
  }),
]);
export type GoLiveGateActionInput = z.infer<typeof goLiveGateActionSchema>;

export const expansionOperationsSchema = z.discriminatedUnion("entity", [
  z.object({
    entity: z.literal("COUNTRY_ROLE"),
    mode: z.enum(["CREATE", "UPDATE"]),
    role_id: z.string().uuid().optional(),
    governance_role: z.enum(COUNTRY_GOVERNANCE_ROLES).optional(),
    assignee_name: z.string().trim().min(2).max(160).optional(),
    assignee_email: z.string().email().optional().nullable().or(z.literal("")),
    entity_or_partner: z.string().max(160).optional().nullable(),
    fit_and_proper_status: z.enum(FIT_PROPER_STATUSES).optional(),
    notes: z.string().max(1000).optional().nullable(),
  }),
  z.object({
    entity: z.literal("REPORTING_ITEM"),
    mode: z.enum(["CREATE", "UPDATE"]),
    item_id: z.string().uuid().optional(),
    regulator: z.string().trim().min(2).max(160).optional(),
    report_name: z.string().trim().min(3).max(200).optional(),
    frequency: z.enum(REPORTING_FREQUENCIES).optional(),
    submission_channel: z.string().trim().min(2).max(200).optional(),
    statutory_reference: z.string().max(240).optional().nullable(),
    owner_name: z.string().max(120).optional().nullable(),
    next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    last_submission_ref: z.string().max(500).optional().nullable(),
    status: z.enum(REPORTING_STATUSES).optional(),
    notes: z.string().max(1000).optional().nullable(),
  }),
  z.object({
    entity: z.literal("INCIDENT"),
    mode: z.enum(["CREATE", "UPDATE"]),
    incident_id: z.string().uuid().optional(),
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().min(5).max(3000).optional(),
    severity: z.enum(RISK_RATINGS).optional(),
    category: z.enum(INCIDENT_CATEGORIES).optional(),
    regulator_notification_required: z.boolean().optional(),
    status: z.enum(INCIDENT_STATUSES).optional(),
    owner_name: z.string().max(120).optional().nullable(),
    root_cause: z.string().max(2000).optional().nullable(),
    remediation_summary: z.string().max(2000).optional().nullable(),
  }),
  z.object({
    entity: z.literal("REGULATORY_CHANGE"),
    mode: z.enum(["CREATE", "UPDATE"]),
    change_id: z.string().uuid().optional(),
    regulator: z.string().trim().min(2).max(160).optional(),
    circular_title: z.string().trim().min(3).max(240).optional(),
    source_url: z.string().url().optional().nullable().or(z.literal("")),
    impact_severity: z.enum(RISK_RATINGS).optional(),
    impact_summary: z.string().trim().min(5).max(3000).optional(),
    impacted_areas: z.array(z.string().max(80)).optional(),
    assigned_owner: z.string().max(120).optional().nullable(),
    implementation_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    status: z.enum(REG_CHANGE_STATUSES).optional(),
    evidence_ref: z.string().max(1000).optional().nullable(),
  }),
  z.object({
    entity: z.literal("ARTEFACT"),
    mode: z.literal("UPDATE"),
    artefact_id: z.string().uuid(),
    status: z.enum(ARTEFACT_STATUSES),
    evidence_ref: z.string().max(1000).optional().nullable(),
  }),
]);
export type ExpansionOperationsInput = z.infer<typeof expansionOperationsSchema>;
