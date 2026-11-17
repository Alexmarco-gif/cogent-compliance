/**
 * Cogent Marketing Shield - AI Telemetry & Live Web Contracts
 * Document Reference: Document 03 (Section 12), Document 04 (Tool 9), Document 05
 */

import { z } from "zod";
import {
  LIVE_SEARCH_PROVIDERS,
  SEARCH_JURISDICTIONS,
  SOURCE_TRUST_TIERS,
} from "./search.contracts";

export const aiTaskTypeSchema = z.enum([
  "CHAT_RESPONSE",
  "ASSESSMENT_REASONING",
  "CLAIM_EXTRACTION",
  "OCR_EXTRACTION",
  "REWRITE_GENERATION",
  "EMBEDDING_GENERATION",
  "LIVE_WEB_SEARCH",
  "DRIFT_INSPECTION",
  "WORKFLOW_SYNTHESIS",
  "WORK_PRODUCT_GUARDRAIL",
]);

export type AiTaskType = z.infer<typeof aiTaskTypeSchema>;

export const aiModelRunSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional().nullable(),
  conversationId: z.string().uuid().optional().nullable(),
  messageId: z.string().uuid().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
  assessmentId: z.string().uuid().optional().nullable(),
  provider: z.string().default("GOOGLE_GEMINI"),
  modelName: z.string().min(1),
  modelVersion: z.string().default("1.0"),
  taskType: aiTaskTypeSchema,
  status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]).default("COMPLETED"),
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  estimatedCost: z.number().nonnegative().default(0),
  latencyMs: z.number().int().nonnegative().default(0),
  errorCode: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

export type AiModelRun = z.infer<typeof aiModelRunSchema>;

export const liveWebSearchArgsSchema = z.object({
  query: z.string().min(2, "Search query must be at least 2 characters"),
  prioritize_official_regulators: z.boolean().default(false),
  jurisdictions: z.array(z.enum(SEARCH_JURISDICTIONS)).default(["NG"]).optional(),
  search_intent: z
    .enum(["REGULATORY_CIRCULAR", "LEGAL_ANALYSIS", "NEWS_ENFORCEMENT", "CROSS_BORDER"])
    .default("REGULATORY_CIRCULAR")
    .optional(),
  include_news: z.boolean().default(true).optional(),
  tenant_id: z.string().uuid().optional(),
});

export type LiveWebSearchArgs = z.infer<typeof liveWebSearchArgsSchema>;

export const liveWebSearchResultSchema = z.object({
  live_web_retrieval_id: z.string().uuid(),
  provider: z.enum(LIVE_SEARCH_PROVIDERS).default("GEMINI_GOOGLE_SEARCH").optional(),
  jurisdiction_code: z.string().default("NG").optional(),
  trust_tier: z.enum(SOURCE_TRUST_TIERS).default("GENERAL_LIVE_WEB").optional(),
  trust_badge_label: z.string().optional(),
  page_title: z.string().default("Regulatory Intelligence Citation"),
  retrieved_url: z.string().url(),
  domain: z.string().optional(),
  is_pdf: z.boolean().optional(),
  published_at: z.string().nullable().optional(),
  snippet_content: z.string().min(1),
  full_content_excerpt: z.string().optional(),
  highlights: z.array(z.string()).default([]).optional(),
  relevance_score: z.number().optional(),
  retrieved_at: z.string().datetime(),
  cache_hit: z.boolean().default(false).optional(),
  source_class: z.literal("LIVE_WEB_INTELLIGENCE").default("LIVE_WEB_INTELLIGENCE"),
  metadata: z.record(z.unknown()).optional(),
});

export type LiveWebSearchResult = z.infer<typeof liveWebSearchResultSchema>;

export const liveWebSearchResponseSchema = z.object({
  source_class: z.literal("LIVE_WEB_INTELLIGENCE"),
  results: z.array(liveWebSearchResultSchema),
  web_summary: z.string().optional(),
  status: z.string().optional(),
  providers_used: z.array(z.enum(LIVE_SEARCH_PROVIDERS)).optional(),
  cache_hit: z.boolean().optional(),
  latency_ms: z.number().int().nonnegative().optional(),
  upgrade_required: z.boolean().optional(),
});

export type LiveWebSearchResponse = z.infer<typeof liveWebSearchResponseSchema>;

export const fetchLiveUrlContentArgsSchema = z.object({
  url: z.string().url("Valid HTTPS URL is required").refine((u) => u.startsWith("https://"), {
    message: "HTTPS scheme is required for live URL inspection",
  }),
  campaign_id: z.string().uuid().optional(),
});

export type FetchLiveUrlContentArgs = z.infer<typeof fetchLiveUrlContentArgsSchema>;

export const fetchLiveUrlContentResponseSchema = z.object({
  success: z.boolean(),
  url: z.string().url(),
  page_title: z.string(),
  content_text: z.string(),
  text_length: z.number().int(),
  retrieved_at: z.string().datetime(),
  source_class: z.literal("UNTRUSTED_USER_MATERIAL").default("UNTRUSTED_USER_MATERIAL"),
  sha256_hash: z.string(),
  asset_id: z.string().uuid().optional(),
});

export type FetchLiveUrlContentResponse = z.infer<typeof fetchLiveUrlContentResponseSchema>;
