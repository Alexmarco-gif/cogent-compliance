/**
 * Cogent Marketing Shield - AI Telemetry & Live Web Contracts
 * Document Reference: Document 03 (Section 12), Document 04 (Tool 9), Document 05
 */

import { z } from "zod";

export const aiTaskTypeSchema = z.enum([
  "CHAT_RESPONSE",
  "ASSESSMENT_REASONING",
  "CLAIM_EXTRACTION",
  "OCR_EXTRACTION",
  "REWRITE_GENERATION",
  "EMBEDDING_GENERATION",
  "LIVE_WEB_SEARCH",
  "DRIFT_INSPECTION",
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
  prioritize_official_regulators: z.boolean().default(true),
  tenant_id: z.string().uuid().optional(),
});

export type LiveWebSearchArgs = z.infer<typeof liveWebSearchArgsSchema>;

export const liveWebSearchResultSchema = z.object({
  live_web_retrieval_id: z.string().uuid(),
  page_title: z.string().default("Regulatory Intelligence Citation"),
  retrieved_url: z.string().url(),
  snippet_content: z.string().min(1),
  retrieved_at: z.string().datetime(),
  source_class: z.literal("LIVE_WEB_INTELLIGENCE").default("LIVE_WEB_INTELLIGENCE"),
  metadata: z.record(z.unknown()).optional(),
});

export type LiveWebSearchResult = z.infer<typeof liveWebSearchResultSchema>;

export const liveWebSearchResponseSchema = z.object({
  source_class: z.literal("LIVE_WEB_INTELLIGENCE"),
  results: z.array(liveWebSearchResultSchema),
});

export type LiveWebSearchResponse = z.infer<typeof liveWebSearchResponseSchema>;
