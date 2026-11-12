/**
 * Cogent Marketing Shield - Remediation, Layer 6 Rewrite & Revision Contracts
 * Document Reference: Document 04 (Section 5.1–5.3), Document 05 (Section 7.1 Layer 6), Document 08 (Phase 8)
 */

import { z } from "zod";

export const REWRITE_TONES = [
  "PROFESSIONAL",
  "CONCISE_SMS",
  "CONVERSATIONAL_SOCIAL",
  "FORMAL_LEGAL",
] as const;

export type RewriteTone = (typeof REWRITE_TONES)[number];

export const generateRewriteInputSchema = z.object({
  finding_id: z.string().uuid("Invalid finding_id UUID"),
  tone: z.enum(REWRITE_TONES).default("PROFESSIONAL"),
  custom_instructions: z.string().max(1000).optional(),
});

export type GenerateRewriteInput = z.infer<typeof generateRewriteInputSchema>;

export const layer6ValidationReportSchema = z.object({
  validation_status: z.enum(["PASSED", "FAILED"]),
  original_issue_addressed: z.boolean(),
  new_prohibited_terms_detected: z.boolean(),
  product_rate_fee_match: z.enum(["PASSED", "FAILED", "NOT_APPLICABLE"]),
  mandatory_disclosures_present: z.boolean(),
  failure_reasons: z.array(z.string()).default([]),
});

export type Layer6ValidationReport = z.infer<typeof layer6ValidationReportSchema>;

export const rewriteSuggestionSchema = z.object({
  suggestion_id: z.string(),
  finding_id: z.string().uuid(),
  original_text: z.string(),
  proposed_text: z.string(),
  explanation: z.string(),
  layer_6_validation: layer6ValidationReportSchema,
});

export type RewriteSuggestion = z.infer<typeof rewriteSuggestionSchema>;

export const createCampaignRevisionSchema = z.object({
  parent_revision_id: z.string().uuid("Invalid parent_revision_id UUID"),
  content_text: z.string().min(1, "content_text cannot be empty"),
  revision_source: z
    .enum(["USER_EDIT", "AI_REWRITE_ACCEPTED", "INITIAL_IMPORT"])
    .default("AI_REWRITE_ACCEPTED"),
  change_summary: z.string().min(1, "change_summary is required"),
  auto_reassess: z.boolean().default(true),
});

export type CreateCampaignRevisionInput = {
  parent_revision_id: string;
  content_text: string;
  revision_source?: "USER_EDIT" | "AI_REWRITE_ACCEPTED" | "INITIAL_IMPORT";
  change_summary: string;
  auto_reassess?: boolean;
};

export const compareRevisionsQuerySchema = z.object({
  from_revision_id: z.string().uuid("Invalid from_revision_id UUID"),
  to_revision_id: z.string().uuid("Invalid to_revision_id UUID"),
});

export type CompareRevisionsQuery = z.infer<typeof compareRevisionsQuerySchema>;

export const diffSegmentSchema = z.object({
  type: z.enum(["added", "removed", "unchanged"]),
  value: z.string(),
});

export type DiffSegment = z.infer<typeof diffSegmentSchema>;

export const compareRevisionsResponseSchema = z.object({
  campaign_id: z.string().uuid(),
  from_revision: z.object({
    id: z.string(),
    revision_number: z.number(),
    content_text: z.string(),
    created_at: z.string(),
    created_by: z.string().optional(),
  }),
  to_revision: z.object({
    id: z.string(),
    revision_number: z.number(),
    content_text: z.string(),
    created_at: z.string(),
    created_by: z.string().optional(),
  }),
  text_diff: z.array(diffSegmentSchema),
  resolved_findings_count: z.number(),
  remaining_findings_count: z.number(),
  resolved_findings: z.array(z.record(z.string(), z.unknown())),
  remaining_findings: z.array(z.record(z.string(), z.unknown())),
  locks_comparison: z.object({
    from_passed: z.boolean(),
    to_passed: z.boolean(),
    from_breach_count: z.number(),
    to_breach_count: z.number(),
    breaches_delta: z.number(),
  }),
});

export type CompareRevisionsResponse = z.infer<typeof compareRevisionsResponseSchema>;
