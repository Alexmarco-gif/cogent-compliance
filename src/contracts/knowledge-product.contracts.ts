/**
 * Cogent Marketing Shield - Knowledge Base & Product Truth Contracts
 * Document Reference: Document 04 (Section 6.2, 7.1, 7.2), Document 03 (Sections 3.3, 3.7)
 */

import { z } from "zod";

/**
 * Structured product rate, fee, APR, tenor, and disclosure truth.
 * Used by Deterministic Lock 2 to enforce truth-in-advertising.
 */
export const approvedTermsSchema = z.object({
  interest_rate_min: z.number().nonnegative().optional(),
  interest_rate_max: z.number().nonnegative().optional(),
  interest_rate_type: z.enum(["APR", "MONTHLY", "FLAT", "DAILY"]).default("APR").optional(),
  apr_min: z.number().nonnegative().optional(),
  apr_max: z.number().nonnegative().optional(),
  processing_fee_percent: z.number().nonnegative().optional(),
  management_fee_percent: z.number().nonnegative().optional(),
  penalty_fee_percent: z.number().nonnegative().optional(),
  tenor_min_days: z.number().int().positive().optional(),
  tenor_max_days: z.number().int().positive().optional(),
  repayment_frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "BULLET"]).optional(),
  required_disclosures: z.array(z.string()).default([]).optional(),
  custom_terms: z.record(z.string(), z.unknown()).default({}).optional(),
});

export type ApprovedTerms = z.infer<typeof approvedTermsSchema>;

/**
 * Create campaign product truth schema (POST /products).
 */
export const createProductSchema = z.object({
  product_name: z.string().trim().min(2, "Product name must be at least 2 characters").max(120),
  product_type: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).optional(),
  approved_terms: approvedTermsSchema.default({}),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE").optional(),
});

export type CreateProductInput = {
  product_name: string;
  product_type: string;
  description?: string;
  approved_terms?: ApprovedTerms;
  status?: "ACTIVE" | "INACTIVE";
};

/**
 * Update campaign product truth schema (PATCH /products/:id).
 */
export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/**
 * Serialized Campaign Product record.
 */
export const campaignProductSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  product_name: z.string(),
  product_type: z.string(),
  description: z.string().nullable().optional(),
  approved_terms: approvedTermsSchema,
  status: z.enum(["ACTIVE", "INACTIVE"]),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CampaignProduct = z.infer<typeof campaignProductSchema>;

/**
 * Document types supported in internal knowledge base.
 */
export const KnowledgeDocumentTypeEnum = z.enum([
  "MARKETING_POLICY",
  "BRAND_GUIDELINE",
  "PRODUCT_DISCLOSURE",
  "SOP",
  "OTHER",
]);
export type KnowledgeDocumentType = z.infer<typeof KnowledgeDocumentTypeEnum>;

/**
 * Register internal playbook document schema (POST /knowledge-base/documents).
 */
export const registerKnowledgeDocumentSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().max(1000).optional(),
  document_type: KnowledgeDocumentTypeEnum,
  asset_id: z.string().uuid().optional(),
  version_number: z.number().int().positive().default(1).optional(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
  initial_content: z.string().min(10, "Content must be at least 10 characters").optional(),
});

export type RegisterKnowledgeDocumentInput = {
  title: string;
  description?: string;
  document_type: KnowledgeDocumentType;
  asset_id?: string;
  version_number?: number;
  effective_date?: string;
  initial_content?: string;
};

/**
 * Serialized Knowledge Document record.
 */
export const knowledgeDocumentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  uploaded_by: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  document_type: KnowledgeDocumentTypeEnum,
  asset_id: z.string().nullable().optional(),
  version_number: z.number().int(),
  status: z.enum(["DRAFT", "ACTIVE", "SUPERSEDED", "ARCHIVED"]),
  effective_date: z.string().nullable().optional(),
  chunk_count: z.number().int().optional(),
  rule_count: z.number().int().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type KnowledgeDocument = z.infer<typeof knowledgeDocumentSchema>;

/**
 * Knowledge Rule types.
 */
export const KnowledgeRuleTypeEnum = z.enum([
  "PROHIBITED",
  "REQUIRED_DISCLOSURE",
  "APPROVED_LANGUAGE",
  "RATE_FEE_LIMIT",
  "SOP_RULE",
]);
export type KnowledgeRuleType = z.infer<typeof KnowledgeRuleTypeEnum>;

/**
 * Serialized Marketing Knowledge Rule.
 */
export const marketingKnowledgeRuleSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  knowledge_document_id: z.string().uuid(),
  rule_title: z.string(),
  rule_text: z.string(),
  rule_type: KnowledgeRuleTypeEnum,
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  status: z.enum(["DRAFT", "ACTIVE", "SUPERSEDED", "ARCHIVED"]),
  effective_date: z.string().nullable().optional(),
  document_title: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type MarketingKnowledgeRule = z.infer<typeof marketingKnowledgeRuleSchema>;

/**
 * Activate Knowledge Rule schema (POST /knowledge-base/rules/:id/activate).
 */
export const activateRuleSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

export type ActivateRuleInput = z.infer<typeof activateRuleSchema>;

/**
 * Query Knowledge Rules filter schema.
 */
export const queryKnowledgeRulesSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "SUPERSEDED", "ARCHIVED"]).optional(),
  rule_type: KnowledgeRuleTypeEnum.optional(),
  document_id: z.string().uuid().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

export type QueryKnowledgeRulesInput = z.infer<typeof queryKnowledgeRulesSchema>;

/**
 * Gemini Tool 7: search_institutional_knowledge argument schema.
 */
export const searchInstitutionalKnowledgeSchema = z.object({
  query: z.string().min(2, "Query must be at least 2 characters"),
  document_types: z.array(KnowledgeDocumentTypeEnum).optional(),
  limit: z.number().int().min(1).max(10).default(5).optional(),
});

export type SearchInstitutionalKnowledgeInput = z.infer<typeof searchInstitutionalKnowledgeSchema>;

/**
 * Gemini Tool 8: get_product_approved_terms argument schema.
 */
export const getProductApprovedTermsSchema = z.object({
  product_id: z.string().uuid().optional(),
  product_name_query: z.string().trim().optional(),
});

export type GetProductApprovedTermsInput = z.infer<typeof getProductApprovedTermsSchema>;
