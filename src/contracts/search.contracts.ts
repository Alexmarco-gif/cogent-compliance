/**
 * Cogent Regulatory Intelligence Platform
 * Unified & Dual-Engine Nigeria/Pan-Africa Search Contracts
 * Document Reference: Document 14 & Document 15 (Section 3.4)
 */

import { z } from "zod";

export const SEARCH_JURISDICTIONS = [
  "NG",
  "GH",
  "KE",
  "ZA",
  "RW",
  "EG",
  "AFRICA_REGIONAL",
] as const;
export type SearchJurisdiction = (typeof SEARCH_JURISDICTIONS)[number];

export const LIVE_SEARCH_PROVIDERS = [
  "GEMINI_GOOGLE_SEARCH",
  "SERPAPI_GOOGLE",
  "SERPAPI_NEWS",
  "EXA_AI",
  "DIRECT_FETCH",
] as const;
export type LiveSearchProvider = (typeof LIVE_SEARCH_PROVIDERS)[number];

export const SOURCE_TRUST_TIERS = [
  "OFFICIAL_REGULATOR_WEB",
  "VERIFIED_AFRICAN_LEGAL_MEDIA",
  "GENERAL_LIVE_WEB",
] as const;
export type SourceTrustTier = (typeof SOURCE_TRUST_TIERS)[number];

export const unifiedSearchRequestSchema = z.object({
  query: z.string().trim().min(2, "Search query must be at least 2 characters").max(1000),
  mode: z.enum(["COMMAND_CENTER", "VAULT_ONLY", "HYBRID_LIVE_WEB"]).default("HYBRID_LIVE_WEB"),
  enable_live_web: z.boolean().default(false),
  jurisdictions: z.array(z.enum(SEARCH_JURISDICTIONS)).min(1).default(["NG"]),
  regulators: z.array(z.string()).optional(),
  search_intent: z
    .enum(["REGULATORY_CIRCULAR", "LEGAL_ANALYSIS", "NEWS_ENFORCEMENT", "CROSS_BORDER"])
    .default("REGULATORY_CIRCULAR"),
  include_news: z.boolean().default(true),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must follow YYYY-MM-DD").optional(),
  limit: z.number().int().min(1).max(20).default(10),
});
export type UnifiedSearchRequest = z.infer<typeof unifiedSearchRequestSchema>;

export const liveSearchEvidenceItemSchema = z.object({
  live_web_retrieval_id: z.string().uuid(),
  provider: z.enum(LIVE_SEARCH_PROVIDERS),
  jurisdiction_code: z.string(),
  trust_tier: z.enum(SOURCE_TRUST_TIERS),
  trust_badge_label: z.string(),
  page_title: z.string(),
  retrieved_url: z.string().url(),
  domain: z.string(),
  is_pdf: z.boolean(),
  published_at: z.string().nullable().optional(),
  snippet_content: z.string(),
  full_content_excerpt: z.string().optional(),
  highlights: z.array(z.string()).default([]),
  relevance_score: z.number(),
  retrieved_at: z.string().datetime(),
  cache_hit: z.boolean().default(false),
});
export type LiveSearchEvidenceItem = z.infer<typeof liveSearchEvidenceItemSchema>;

export const commandCenterHitSchema = z.object({
  entity_type: z.enum(["CONVERSATION", "WORK_PRODUCT", "PLAYBOOK", "STATUTORY_CLAUSE"]),
  entity_id: z.string().uuid(),
  title: z.string(),
  subtitle: z.string(),
  snippet: z.string(),
  route_href: z.string(),
  score: z.number(),
  updated_at: z.string(),
});
export type CommandCenterHit = z.infer<typeof commandCenterHitSchema>;

export const vaultSearchClauseHitSchema = z.object({
  clause_id: z.string().uuid(),
  regulator: z.string(),
  instrument_title: z.string(),
  clause_reference: z.string(),
  verbatim_excerpt: z.string(),
  similarity_score: z.number(),
});
export type VaultSearchClauseHit = z.infer<typeof vaultSearchClauseHitSchema>;

export const searchQuotaSnapshotSchema = z.object({
  plan_slug: z.enum(["evaluation", "growth", "scale", "enterprise"]),
  live_web_allowed: z.boolean(),
  cross_border_allowed: z.boolean(),
  allowed_jurisdictions: z.array(z.string()),
  used_this_month: z.number().int().nonnegative(),
  monthly_limit: z.number().int(), // -1 = unlimited
  remaining: z.number().int(), // -1 = unlimited
  trial_locked_reason: z.string().nullable().optional(),
});
export type SearchQuotaSnapshot = z.infer<typeof searchQuotaSnapshotSchema>;

export const promoteLiveWebRequestSchema = z.object({
  live_web_retrieval_id: z.string().uuid(),
  regulator_acronym: z.string().trim().min(2).max(24),
  instrument_title: z.string().trim().min(4).max(300),
  jurisdiction_code: z.string().trim().min(2).max(32).default("NG"),
  trigger_ripple_scan: z.boolean().default(true),
});
export type PromoteLiveWebRequest = z.infer<typeof promoteLiveWebRequestSchema>;
