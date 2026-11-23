/**
 * Cogent Regulatory Intelligence Platform
 * Persisted Deliverable Work Product Contracts
 * Document Reference: Document 14 & Document 15 (Section 3.5)
 */

import { z } from "zod";
import { jurisdictionCodeSchema } from "./search.contracts";

export const WORKFLOW_TYPES = [
  "PRODUCT_STRUCTURING_MEMO",
  "POLICY_GAP_REDLINE",
  "POLICY_DRAFT_NEW",
  "SUPERVISORY_DDQ_RESPONSE",
  "CROSS_BORDER_COMPARISON",
  "CAMPAIGN_COMPLIANCE_KIT",
] as const;
export type WorkflowType = (typeof WORKFLOW_TYPES)[number];

export const WORK_PRODUCT_ARTIFACT_TYPES = [
  "statutory_structuring_memo",
  "policy_gap_redline",
  "policy_draft_document",
  "supervisory_ddq_response",
  "cross_border_matrix",
  "compliant_ad_rewrite",
  "cbn_kfs_statement",
  "arcon_vetting_memo",
  "audit_dossier_summary",
] as const;
export type WorkProductArtifactType = (typeof WORK_PRODUCT_ARTIFACT_TYPES)[number];

export const WORK_PRODUCT_STATUSES = ["DRAFT", "REVIEWED", "FINALIZED", "ARCHIVED"] as const;
export type WorkProductStatus = (typeof WORK_PRODUCT_STATUSES)[number];

export const workProductCitationSchema = z.object({
  source_class: z.enum(["VERIFIED_OFFICIAL_SOURCE", "INTERNAL_PLAYBOOK", "LIVE_WEB_INTELLIGENCE"]),
  badge_label: z.string(),
  regulator: z.string().optional(),
  instrument_title: z.string().optional(),
  clause_reference: z.string().optional(),
  regulatory_clause_id: z.string().uuid().optional(),
  knowledge_rule_id: z.string().uuid().optional(),
  live_web_retrieval_id: z.string().uuid().optional(),
  retrieved_url: z.string().url().optional(),
  trust_tier: z.string().optional(),
  retrieved_at: z.string().optional(),
});
export type WorkProductCitation = z.infer<typeof workProductCitationSchema>;

export const workProductEvidenceGapSchema = z.object({
  gap_code: z.string(),
  section_or_question: z.string(),
  description: z.string(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("HIGH"),
  remediation_prompt: z.string().optional(),
});
export type WorkProductEvidenceGap = z.infer<typeof workProductEvidenceGapSchema>;

export const workProductGuardrailReportSchema = z.object({
  passed: z.boolean(),
  verified_vault_ids: z.array(z.string()).default([]),
  stripped_vault_ids: z.array(z.string()).default([]),
  verified_urls: z.array(z.string()).default([]),
  stripped_ungrounded_urls: z.array(z.string()).default([]),
  legal_floor_warnings: z.array(z.string()).default([]),
  evidence_gaps_count: z.number().int().nonnegative().default(0),
});
export type WorkProductGuardrailReport = z.infer<typeof workProductGuardrailReportSchema>;

export const createWorkProductSchema = z.object({
  work_product_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().nullable().optional(),
  message_id: z.string().uuid().nullable().optional(),
  workflow_type: z.enum(WORKFLOW_TYPES),
  artifact_type: z.enum(WORK_PRODUCT_ARTIFACT_TYPES),
  title: z.string().trim().min(3).max(240),
  jurisdiction_scope: z.array(jurisdictionCodeSchema).min(1).default(["NG"]),
  markdown_content: z.string().min(10).max(120000),
  structured_payload: z.record(z.unknown()).default({}),
  citations: z.array(workProductCitationSchema).default([]),
  evidence_gaps: z.array(workProductEvidenceGapSchema).default([]),
  guardrail_report: workProductGuardrailReportSchema.optional(),
  status: z.enum(WORK_PRODUCT_STATUSES).default("DRAFT"),
  change_summary: z.string().max(400).optional(),
});
export type CreateWorkProductInput = z.infer<typeof createWorkProductSchema>;

export const updateWorkProductSchema = z.object({
  title: z.string().trim().min(3).max(240).optional(),
  markdown_content: z.string().min(10).max(120000).optional(),
  structured_payload: z.record(z.unknown()).optional(),
  status: z.enum(WORK_PRODUCT_STATUSES).optional(),
  change_summary: z.string().max(400).optional(),
});
export type UpdateWorkProductInput = z.infer<typeof updateWorkProductSchema>;

export const exportWorkProductSchema = z.object({
  format: z.enum(["pdf", "docx", "md"]),
});
export type ExportWorkProductInput = z.infer<typeof exportWorkProductSchema>;

export interface WorkProductRecord {
  id: string;
  tenant_id: string;
  conversation_id: string | null;
  message_id: string | null;
  workflow_type: WorkflowType;
  artifact_type: WorkProductArtifactType;
  title: string;
  jurisdiction_scope: string[];
  markdown_content: string;
  structured_payload: Record<string, unknown>;
  citations: WorkProductCitation[];
  evidence_gaps: WorkProductEvidenceGap[];
  guardrail_report: WorkProductGuardrailReport | Record<string, unknown>;
  version_number: number;
  status: WorkProductStatus;
  source_hash_sha256: string;
  created_by: string;
  updated_by: string;
  last_exported_at: string | null;
  created_at: string;
  updated_at: string;
}
