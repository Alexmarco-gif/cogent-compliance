/**
 * Cogent Compliance Operations - Path A: End-to-End DDQ Operations Contracts
 * Covers:
 *   1. Central Evidence Repository (versioned documents, categories, owners, expiry dates)
 *   2. Approved Q&A Knowledge Library (canonical answers, reuse counts, staleness checks)
 *   3. DDQ Engagements, 150+ Questions, Responsibility Matrix, Annexures, Executive Sign-Offs & Follow-Ups
 */

import { z } from "zod";

// ==============================================================================
// Shared Taxonomy Enums (Domains, Departments, Evidence Categories)
// ==============================================================================

export const COMPLIANCE_DEPARTMENTS = [
  "COMPLIANCE",
  "RISK",
  "LEGAL",
  "INFOSEC",
  "TECHNOLOGY",
  "FINANCE",
  "OPERATIONS",
  "HR",
  "INTERNAL_AUDIT",
  "EXECUTIVE",
] as const;

export const ComplianceDepartmentSchema = z.enum(COMPLIANCE_DEPARTMENTS);
export type ComplianceDepartment = z.infer<typeof ComplianceDepartmentSchema>;

export const DEPARTMENT_LABELS: Record<ComplianceDepartment, string> = {
  COMPLIANCE: "Compliance & MLRO",
  RISK: "Enterprise Risk",
  LEGAL: "Legal & Regulatory",
  INFOSEC: "Information Security (CISO)",
  TECHNOLOGY: "Technology & Engineering",
  FINANCE: "Finance & Treasury",
  OPERATIONS: "Operations & Settlement",
  HR: "Human Resources",
  INTERNAL_AUDIT: "Internal Audit",
  EXECUTIVE: "Executive Management",
};

export const DDQ_DOMAINS = [
  "AML_CFT",
  "KYC_CDD",
  "SANCTIONS",
  "LICENSING_REGULATORY",
  "GOVERNANCE",
  "CYBERSECURITY",
  "DATA_PROTECTION",
  "RISK_MANAGEMENT",
  "OPERATIONS_SETTLEMENT",
  "FINANCIAL",
  "LEGAL",
  "TECHNOLOGY_INFRASTRUCTURE",
  "HR_TRAINING",
  "BUSINESS_CONTINUITY",
  "FRAUD_MANAGEMENT",
  "THIRD_PARTY_MERCHANTS",
  "OTHER",
] as const;

export const DdqDomainSchema = z.enum(DDQ_DOMAINS);
export type DdqDomain = z.infer<typeof DdqDomainSchema>;

export const DOMAIN_LABELS: Record<DdqDomain, string> = {
  AML_CFT: "AML / CFT & NFIU",
  KYC_CDD: "KYC / CDD Onboarding",
  SANCTIONS: "Sanctions & PEP Screening",
  LICENSING_REGULATORY: "Licensing & Regulatory",
  GOVERNANCE: "Corporate Governance",
  CYBERSECURITY: "Cybersecurity & VAPT",
  DATA_PROTECTION: "Data Protection (NDPA)",
  RISK_MANAGEMENT: "Enterprise Risk Management",
  OPERATIONS_SETTLEMENT: "Operations & Settlement",
  FINANCIAL: "Financials & Capital",
  LEGAL: "Legal & Contracts",
  TECHNOLOGY_INFRASTRUCTURE: "Technology & Infrastructure",
  HR_TRAINING: "HR, Screening & Training",
  BUSINESS_CONTINUITY: "Business Continuity & DR",
  FRAUD_MANAGEMENT: "Fraud & Dispute Management",
  THIRD_PARTY_MERCHANTS: "Third-Party & Sub-Merchants",
  OTHER: "General / Other",
};

export const EVIDENCE_CATEGORIES = [
  "AML_CFT_POLICY",
  "KYC_CDD_PROCEDURES",
  "SANCTIONS_SCREENING",
  "LICENCE_AUTHORISATION",
  "TRANSACTION_MONITORING",
  "DATA_PROTECTION_NDPA",
  "CYBERSECURITY_VAPT",
  "GOVERNANCE_BOARD",
  "RISK_MANAGEMENT",
  "BUSINESS_CONTINUITY",
  "FINANCIAL_AUDITED_ACCOUNTS",
  "STAFF_TRAINING",
  "REGULATORY_FILING_RECEIPT",
  "SETTLEMENT_RECONCILIATION",
  "FRAUD_MANAGEMENT",
  "CONTRACT_SLA",
  "OTHER",
] as const;

export const EvidenceCategorySchema = z.enum(EVIDENCE_CATEGORIES);
export type EvidenceCategory = z.infer<typeof EvidenceCategorySchema>;

export const EVIDENCE_CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  AML_CFT_POLICY: "AML/CFT Policy",
  KYC_CDD_PROCEDURES: "KYC & Onboarding SOP",
  SANCTIONS_SCREENING: "Sanctions Screening",
  LICENCE_AUTHORISATION: "CBN / Regulator Licence",
  TRANSACTION_MONITORING: "Transaction Monitoring",
  DATA_PROTECTION_NDPA: "Data Protection / NDPC CAR",
  CYBERSECURITY_VAPT: "Cybersecurity & VAPT Report",
  GOVERNANCE_BOARD: "Board & Committee Governance",
  RISK_MANAGEMENT: "Enterprise Risk Assessment",
  BUSINESS_CONTINUITY: "Business Continuity / DRP",
  FINANCIAL_AUDITED_ACCOUNTS: "Audited Financial Statements",
  STAFF_TRAINING: "Staff Training & Attendance",
  REGULATORY_FILING_RECEIPT: "Regulatory Filing Receipt",
  SETTLEMENT_RECONCILIATION: "Settlement & Nominee Reconciliations",
  FRAUD_MANAGEMENT: "Fraud Management Controls",
  CONTRACT_SLA: "Partner Contracts & SLAs",
  OTHER: "Other Compliance Evidence",
};

export const EVIDENCE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "EXPIRING_SOON",
  "EXPIRED",
  "SUPERSEDED",
  "ARCHIVED",
] as const;
export const EvidenceStatusSchema = z.enum(EVIDENCE_STATUSES);
export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;

// ==============================================================================
// Pillar 1: Central Evidence Repository Contracts
// ==============================================================================

export const createEvidenceItemSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(220),
  description: z.string().trim().max(2000).optional(),
  category: EvidenceCategorySchema.default("OTHER"),
  owner_department: ComplianceDepartmentSchema.default("COMPLIANCE"),
  owner_user_id: z.string().trim().max(120).optional(),
  owner_name: z.string().trim().max(160).optional(),
  version_number: z.number().int().positive().default(1).optional(),
  parent_evidence_id: z.string().uuid().optional(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().nullable(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().nullable(),
  review_cycle_days: z.number().int().min(30).max(1825).default(365).optional(),
  file_name: z.string().trim().max(255).optional(),
  mime_type: z.string().trim().max(160).optional(),
  extracted_text: z.string().max(500000).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]).optional(),
});

export type CreateEvidenceItemInput = z.input<typeof createEvidenceItemSchema>;

export const updateEvidenceItemSchema = z.object({
  title: z.string().trim().min(3).max(220).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  category: EvidenceCategorySchema.optional(),
  owner_department: ComplianceDepartmentSchema.optional(),
  owner_user_id: z.string().trim().max(120).optional().nullable(),
  owner_name: z.string().trim().max(160).optional().nullable(),
  status: EvidenceStatusSchema.optional(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  review_cycle_days: z.number().int().min(30).max(1825).optional(),
  extracted_text: z.string().max(500000).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  approve: z.boolean().optional(),
});

export type UpdateEvidenceItemInput = z.infer<typeof updateEvidenceItemSchema>;

export interface EvidenceItemRecord {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  category: EvidenceCategory;
  owner_department: ComplianceDepartment;
  owner_user_id: string | null;
  owner_name: string | null;
  version_number: number;
  parent_evidence_id: string | null;
  status: EvidenceStatus;
  computed_health: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "DRAFT" | "SUPERSEDED" | "ARCHIVED";
  days_until_expiry: number | null;
  effective_date: string | null;
  expiry_date: string | null;
  review_cycle_days: number;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  storage_key: string | null;
  sha256_hash: string | null;
  extracted_text: string | null;
  knowledge_document_id: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  uploaded_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

// ==============================================================================
// Pillar 2: Approved Q&A Knowledge Library Contracts
// ==============================================================================

export const QA_LIBRARY_STATUSES = ["ACTIVE", "NEEDS_REVIEW", "STALE", "ARCHIVED"] as const;
export const QaLibraryStatusSchema = z.enum(QA_LIBRARY_STATUSES);
export type QaLibraryStatus = z.infer<typeof QaLibraryStatusSchema>;

export const statutoryCitationItemSchema = z.object({
  authority: z.string().trim().min(1).max(200),
  reference: z.string().trim().min(1).max(240),
  summary: z.string().trim().max(500).optional(),
});

export type StatutoryCitationItem = z.infer<typeof statutoryCitationItemSchema>;

export const createQaLibraryEntrySchema = z.object({
  canonical_question: z.string().trim().min(6, "Question must be at least 6 characters").max(2000),
  approved_answer: z.string().trim().min(10, "Approved answer must be at least 10 characters").max(12000),
  domain: DdqDomainSchema.default("OTHER"),
  owner_department: ComplianceDepartmentSchema.default("COMPLIANCE"),
  linked_evidence_ids: z.array(z.string().uuid()).max(20).default([]).optional(),
  statutory_citations: z.array(statutoryCitationItemSchema).max(20).default([]).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]).optional(),
  source_ddq_id: z.string().uuid().optional(),
  source_question_id: z.string().uuid().optional(),
  review_cycle_days: z.number().int().min(30).max(730).default(180).optional(),
});

export type CreateQaLibraryEntryInput = z.input<typeof createQaLibraryEntrySchema>;

export const updateQaLibraryEntrySchema = z.object({
  canonical_question: z.string().trim().min(6).max(2000).optional(),
  approved_answer: z.string().trim().min(10).max(12000).optional(),
  domain: DdqDomainSchema.optional(),
  owner_department: ComplianceDepartmentSchema.optional(),
  linked_evidence_ids: z.array(z.string().uuid()).max(20).optional(),
  statutory_citations: z.array(statutoryCitationItemSchema).max(20).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  status: QaLibraryStatusSchema.optional(),
  revalidate: z.boolean().optional(),
  review_cycle_days: z.number().int().min(30).max(730).optional(),
});

export type UpdateQaLibraryEntryInput = z.infer<typeof updateQaLibraryEntrySchema>;

export interface QaLibraryEntryRecord {
  id: string;
  tenant_id: string;
  canonical_question: string;
  approved_answer: string;
  domain: DdqDomain;
  owner_department: ComplianceDepartment;
  linked_evidence_ids: string[];
  statutory_citations: StatutoryCitationItem[];
  tags: string[];
  source_ddq_id: string | null;
  source_question_id: string | null;
  status: QaLibraryStatus;
  is_stale: boolean;
  staleness_reasons: string[];
  approved_by: string;
  approved_by_name: string | null;
  approved_at: string;
  review_due_at: string;
  times_reused: number;
  last_reused_at: string | null;
  created_at: string;
  updated_at: string;
}

// ==============================================================================
// Pillar 3: DDQ Engagement, Questions, Sign-Offs & Follow-Ups Contracts
// ==============================================================================

export const DDQ_REQUESTER_TYPES = [
  "SPONSOR_BANK",
  "COMMERCIAL_BANK",
  "PAYMENT_PROCESSOR",
  "ACQUIRER",
  "REGULATOR",
  "INVESTOR",
  "ENTERPRISE_CUSTOMER",
  "OTHER",
] as const;
export const DdqRequesterTypeSchema = z.enum(DDQ_REQUESTER_TYPES);
export type DdqRequesterType = z.infer<typeof DdqRequesterTypeSchema>;

export const REQUESTER_TYPE_LABELS: Record<DdqRequesterType, string> = {
  SPONSOR_BANK: "Sponsor Bank",
  COMMERCIAL_BANK: "Commercial Banking Partner",
  PAYMENT_PROCESSOR: "Payment Processor / Switch",
  ACQUIRER: "Acquiring Institution",
  REGULATOR: "Regulator / Supervisory Authority",
  INVESTOR: "Institutional Investor",
  ENTERPRISE_CUSTOMER: "Enterprise Customer",
  OTHER: "Other Counterparty",
};

export const DDQ_ENGAGEMENT_STATUSES = [
  "DRAFT",
  "INGESTING",
  "IN_PROGRESS",
  "UNDER_CCO_REVIEW",
  "PENDING_EXECUTIVE_SIGNOFF",
  "APPROVED",
  "SUBMITTED",
  "FOLLOW_UP",
  "CLOSED_APPROVED",
  "CLOSED_CONDITIONAL",
  "CLOSED_REJECTED",
  "ARCHIVED",
] as const;
export const DdqEngagementStatusSchema = z.enum(DDQ_ENGAGEMENT_STATUSES);
export type DdqEngagementStatus = z.infer<typeof DdqEngagementStatusSchema>;

export const DDQ_QUESTION_STATUSES = [
  "UNASSIGNED",
  "ASSIGNED",
  "AI_DRAFTED",
  "NEEDS_EVIDENCE",
  "IN_REVIEW",
  "CCO_VALIDATED",
  "APPROVED",
] as const;
export const DdqQuestionStatusSchema = z.enum(DDQ_QUESTION_STATUSES);
export type DdqQuestionStatus = z.infer<typeof DdqQuestionStatusSchema>;

export const DDQ_ANSWER_SOURCES = [
  "NONE",
  "QA_LIBRARY_EXACT",
  "QA_LIBRARY_STALE",
  "AI_EVIDENCE_GROUNDED",
  "AI_GAP_FLAGGED",
  "MANUAL",
] as const;
export const DdqAnswerSourceSchema = z.enum(DDQ_ANSWER_SOURCES);
export type DdqAnswerSource = z.infer<typeof DdqAnswerSourceSchema>;

export const DDQ_GROUNDING_CLASSIFICATIONS = [
  "VERIFIED_EVIDENCE",
  "MANAGEMENT_ASSERTION",
  "PROSPECTIVE_COMMITMENT",
  "MISSING_EVIDENCE",
] as const;
export const DdqGroundingClassificationSchema = z.enum(DDQ_GROUNDING_CLASSIFICATIONS);
export type DdqGroundingClassification = z.infer<typeof DdqGroundingClassificationSchema>;

export const DDQ_SIGNOFF_ROLES = [
  "CCO_MLRO",
  "CEO",
  "CFO",
  "CISO",
  "GENERAL_COUNSEL",
  "HEAD_OF_RISK",
  "INTERNAL_AUDIT",
] as const;
export const DdqSignoffRoleSchema = z.enum(DDQ_SIGNOFF_ROLES);
export type DdqSignoffRole = z.infer<typeof DdqSignoffRoleSchema>;

export const SIGNOFF_ROLE_LABELS: Record<DdqSignoffRole, string> = {
  CCO_MLRO: "Chief Compliance Officer / MLRO",
  CEO: "Chief Executive Officer / MD",
  CFO: "Chief Financial Officer",
  CISO: "Chief Information Security Officer",
  GENERAL_COUNSEL: "General Counsel / Legal",
  HEAD_OF_RISK: "Head of Enterprise Risk",
  INTERNAL_AUDIT: "Head of Internal Audit",
};

export const createDdqEngagementSchema = z.object({
  title: z.string().trim().min(3, "DDQ title must be at least 3 characters").max(220),
  requesting_institution: z.string().trim().min(2, "Requesting institution is required").max(200),
  requester_type: DdqRequesterTypeSchema.default("SPONSOR_BANK"),
  reference_code: z.string().trim().max(100).optional(),
  contact_name: z.string().trim().max(160).optional(),
  contact_email: z.string().trim().email("Invalid contact email").optional().or(z.literal("")),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().nullable(),
  raw_text: z.string().max(500000).optional(),
  auto_process: z.boolean().default(true).optional(),
  required_signoff_roles: z
    .array(DdqSignoffRoleSchema)
    .default(["CCO_MLRO", "CEO", "CISO", "CFO"])
    .optional(),
});

export type CreateDdqEngagementInput = z.input<typeof createDdqEngagementSchema>;

export const updateDdqEngagementSchema = z.object({
  title: z.string().trim().min(3).max(220).optional(),
  requesting_institution: z.string().trim().min(2).max(200).optional(),
  requester_type: DdqRequesterTypeSchema.optional(),
  reference_code: z.string().trim().max(100).optional().nullable(),
  contact_name: z.string().trim().max(160).optional().nullable(),
  contact_email: z.string().trim().email().optional().nullable().or(z.literal("")),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: DdqEngagementStatusSchema.optional(),
  decision_notes: z.string().trim().max(4000).optional().nullable(),
});

export type UpdateDdqEngagementInput = z.infer<typeof updateDdqEngagementSchema>;

export const updateDdqQuestionSchema = z.object({
  domain: DdqDomainSchema.optional(),
  assigned_department: ComplianceDepartmentSchema.optional(),
  assigned_user_id: z.string().trim().max(120).optional().nullable(),
  assigned_user_name: z.string().trim().max(160).optional().nullable(),
  assigned_email: z.string().trim().email().optional().nullable().or(z.literal("")),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: DdqQuestionStatusSchema.optional(),
  draft_answer: z.string().max(12000).optional().nullable(),
  final_answer: z.string().max(12000).optional().nullable(),
  grounding_classification: DdqGroundingClassificationSchema.optional(),
  evidence_gap_flag: z.boolean().optional(),
  evidence_gap_reason: z.string().max(1000).optional().nullable(),
  reviewer_notes: z.string().max(4000).optional().nullable(),
  link_evidence_ids: z.array(z.string().uuid()).max(20).optional(),
  unlink_evidence_ids: z.array(z.string().uuid()).max(20).optional(),
  validate_as_cco: z.boolean().optional(),
  promote_to_qa_library: z.boolean().optional(),
});

export type UpdateDdqQuestionInput = z.infer<typeof updateDdqQuestionSchema>;

export const bulkAssignQuestionsSchema = z.object({
  question_ids: z.array(z.string().uuid()).min(1).max(500).optional(),
  filter_department: ComplianceDepartmentSchema.optional(),
  filter_domain: DdqDomainSchema.optional(),
  assigned_department: ComplianceDepartmentSchema.optional(),
  assigned_user_id: z.string().trim().max(120).optional().nullable(),
  assigned_user_name: z.string().trim().max(160).optional().nullable(),
  assigned_email: z.string().trim().email().optional().nullable().or(z.literal("")),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  auto_route_by_domain: z.boolean().optional(),
});

export type BulkAssignQuestionsInput = z.infer<typeof bulkAssignQuestionsSchema>;

export const recordDdqSignoffSchema = z.object({
  signoff_role: DdqSignoffRoleSchema,
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "WAIVED"]),
  signer_name: z.string().trim().max(160).optional(),
  signer_email: z.string().trim().email().optional().or(z.literal("")),
  attestation_statement: z.string().trim().max(2000).optional(),
  comments: z.string().trim().max(2000).optional(),
});

export type RecordDdqSignoffInput = z.infer<typeof recordDdqSignoffSchema>;

export const createDdqFollowupSchema = z.object({
  question_id: z.string().uuid().optional().nullable(),
  round_number: z.number().int().positive().default(1).optional(),
  requester_query: z.string().trim().min(5).max(4000),
  response_text: z.string().trim().max(12000).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(["OPEN", "ANSWERED", "RESOLVED"]).default("OPEN").optional(),
});

export type CreateDdqFollowupInput = z.input<typeof createDdqFollowupSchema>;

export const updateDdqFollowupSchema = z.object({
  followup_id: z.string().uuid(),
  response_text: z.string().trim().max(12000).optional(),
  status: z.enum(["OPEN", "ANSWERED", "RESOLVED"]).optional(),
});

export interface DdqEngagementRecord {
  id: string;
  tenant_id: string;
  title: string;
  requesting_institution: string;
  requester_type: DdqRequesterType;
  reference_code: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: DdqEngagementStatus;
  due_date: string | null;
  submitted_at: string | null;
  decision_notes: string | null;
  source_file_name: string | null;
  source_mime_type: string | null;
  source_storage_key: string | null;
  source_sha256: string | null;
  source_format: "XLSX" | "DOCX" | "PDF" | "CSV" | "TEXT";
  source_structure: Record<string, unknown>;
  total_questions: number;
  answered_count: number;
  auto_matched_count: number;
  validated_count: number;
  evidence_gap_count: number;
  created_by: string;
  cco_owner_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DdqQuestionEvidenceLinkRecord {
  id: string;
  tenant_id: string;
  ddq_id: string;
  question_id: string;
  evidence_item_id: string;
  annexure_label: string;
  relevance_note: string | null;
  linked_by: string;
  created_at: string;
  evidence_item?: Partial<EvidenceItemRecord>;
}

export interface DdqQuestionRecord {
  id: string;
  tenant_id: string;
  ddq_id: string;
  question_index: number;
  question_code: string;
  section_name: string | null;
  question_text: string;
  domain: DdqDomain;
  assigned_department: ComplianceDepartment;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  assigned_email: string | null;
  due_date: string | null;
  source_sheet_name: string | null;
  source_row_number: number | null;
  source_question_col: number | null;
  source_answer_col: number | null;
  source_evidence_col: number | null;
  status: DdqQuestionStatus;
  answer_source: DdqAnswerSource;
  matched_qa_id: string | null;
  match_confidence: number | null;
  draft_answer: string | null;
  final_answer: string | null;
  grounding_classification: DdqGroundingClassification;
  evidence_gap_flag: boolean;
  evidence_gap_reason: string | null;
  statutory_citations: StatutoryCitationItem[];
  ai_confidence: number | null;
  reviewer_notes: string | null;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
  evidence_links?: DdqQuestionEvidenceLinkRecord[];
}

export interface DdqSignoffRecord {
  id: string;
  tenant_id: string;
  ddq_id: string;
  signoff_role: DdqSignoffRole;
  signer_user_id: string | null;
  signer_name: string | null;
  signer_email: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WAIVED";
  attestation_statement: string | null;
  comments: string | null;
  snapshot_sha256: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DdqFollowupRecord {
  id: string;
  tenant_id: string;
  ddq_id: string;
  question_id: string | null;
  round_number: number;
  requester_query: string;
  response_text: string | null;
  status: "OPEN" | "ANSWERED" | "RESOLVED";
  due_date: string | null;
  created_by: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}
