/**
 * Cogent Regulatory Intelligence Platform
 * Dual-Engine Live Web Search Router (SerpAPI + Exa AI + Gemini Fallback) & SSRF-Protected URL Fetcher
 * Document Reference: Document 04 (Tools 9 & 10), Document 05, Document 14, Document 15 (Section 4.4)
 */

import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import dns from "dns/promises";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { AI_MODELS } from "@/lib/ai/config";
import {
  type LiveWebSearchArgs,
  type LiveWebSearchResult,
  type LiveWebSearchResponse,
  type FetchLiveUrlContentArgs,
  type FetchLiveUrlContentResponse,
  liveWebSearchArgsSchema,
  fetchLiveUrlContentArgsSchema,
} from "@/contracts/ai.contracts";
import type {
  LiveSearchEvidenceItem,
  LiveSearchProvider,
  SearchJurisdiction,
  SourceTrustTier,
} from "@/contracts/search.contracts";
import {
  canonicalizeUrl,
  classifyDomainTrustTier,
  sanitizeExternalEvidenceText,
} from "./africa-regulators";
import { SerpApiClient, serpApiClient, type SerpApiNormalizedItem } from "./serpapi.client";
import { ExaClient, exaClient, type ExaNormalizedItem } from "./exa.client";

/**
 * Whitelisted official Nigerian regulatory and statutory domains.
 */
export const NIGERIAN_REGULATORY_DOMAINS = [
  "cbn.gov.ng",
  "fccpc.gov.ng",
  "arcon.gov.ng",
  "advertcouncil.gov.ng",
  "ndpc.gov.ng",
  "sec.gov.ng",
  "ndic.gov.ng",
  "nfiu.gov.ng",
] as const;

export interface WebSearchRouterOptions {
  customClient?: GoogleGenAI;
  customSerpApiClient?: SerpApiClient;
  customExaClient?: ExaClient;
}

export interface AfricaLiveSearchParams {
  query: string;
  jurisdictions?: SearchJurisdiction[];
  searchIntent?: "REGULATORY_CIRCULAR" | "LEGAL_ANALYSIS" | "NEWS_ENFORCEMENT" | "CROSS_BORDER";
  includeNews?: boolean;
  dateFrom?: string;
  limit?: number;
  timeoutMs?: number;
}

export interface AfricaLiveSearchResultBundle {
  results: LiveSearchEvidenceItem[];
  webSummary: string;
  providersUsed: LiveSearchProvider[];
  cacheHit: boolean;
  latencyMs: number;
  estimatedCostUsd: number;
  serpApiCalls: number;
  exaCalls: number;
}

interface CandidateAggregation {
  canonicalUrl: string;
  canonicalHash: string;
  title: string;
  snippet: string;
  fullText: string;
  highlights: string[];
  publishedAt: string | null;
  primaryProvider: LiveSearchProvider;
  providers: Set<LiveSearchProvider>;
  providerScore: number;
  trustTier: SourceTrustTier;
  trustBadgeLabel: string;
  authorityWeight: number;
  domain: string;
  jurisdictionCode: string;
  isPdf: boolean;
}

export class WebSearchRouter {
  private client: GoogleGenAI;
  private searchModel: string;
  private serpClient: SerpApiClient;
  private exa: ExaClient;
  private hasCustomGeminiClient: boolean;
  private hasCustomDualClients: boolean;

  constructor(options?: WebSearchRouterOptions) {
    this.hasCustomGeminiClient = Boolean(options?.customClient);
    this.hasCustomDualClients = Boolean(options?.customSerpApiClient || options?.customExaClient);
    this.client = options?.customClient || new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    this.searchModel = AI_MODELS.FLASH;
    this.serpClient = options?.customSerpApiClient || serpApiClient;
    this.exa = options?.customExaClient || exaClient;
  }

  public isDualEngineActive(): boolean {
    if (this.hasCustomGeminiClient && !this.hasCustomDualClients) {
      return false;
    }
    const flagEnabled =
      (process.env.ENABLE_DUAL_LIVE_WEB_SEARCH ?? env.ENABLE_DUAL_LIVE_WEB_SEARCH) !== "false";
    if (!flagEnabled) return false;
    return this.serpClient.isConfigured() || this.exa.isConfigured() || this.hasCustomDualClients;
  }

  private isModelFallbackEligibleError(err: unknown): boolean {
    const msg = ((err as Error)?.message || String(err || "")).toLowerCase();
    return (
      msg.includes("404") ||
      msg.includes("not_found") ||
      msg.includes("not found") ||
      msg.includes("not supported") ||
      msg.includes("unsupported") ||
      msg.includes("invalid model")
    );
  }

  /**
   * Computes deterministic SHA-256 cache key for normalized public search queries.
   */
  public computeSearchCacheKey(params: {
    query: string;
    jurisdictions: SearchJurisdiction[];
    searchIntent: string;
    includeNews: boolean;
    dateFrom?: string;
  }): { cacheKey: string; normalizedQuery: string } {
    const normalizedQuery = params.query.trim().toLowerCase().replace(/\s+/g, " ");
    const sortedJurisdictions = Array.from(new Set(params.jurisdictions)).sort();
    const rawKey = JSON.stringify({
      q: normalizedQuery,
      j: sortedJurisdictions,
      i: params.searchIntent,
      n: params.includeNews,
      d: params.dateFrom || "",
    });
    const cacheKey = crypto.createHash("sha256").update(rawKey).digest("hex");
    return { cacheKey, normalizedQuery };
  }

  /**
   * Executes Dual-Engine Africa Live Search (Cache -> Concurrent SerpAPI + Exa AI -> Trust-Tier Rank -> Sanitize & Persist).
   */
  public async searchAfricaLiveWeb(
    params: AfricaLiveSearchParams,
    tenantId: string,
  ): Promise<AfricaLiveSearchResultBundle> {
    const startedAt = Date.now();
    const jurisdictions: SearchJurisdiction[] =
      params.jurisdictions && params.jurisdictions.length > 0 ? params.jurisdictions : ["NG"];
    const searchIntent = params.searchIntent || "REGULATORY_CIRCULAR";
    const includeNews = params.includeNews ?? true;
    const limit = Math.min(Math.max(params.limit ?? 8, 1), 12);
    const budgetMs =
      params.timeoutMs ??
      (Number(process.env.LIVE_WEB_INTERACTIVE_TIMEOUT_MS) ||
        env.LIVE_WEB_INTERACTIVE_TIMEOUT_MS ||
        3500);

    // If neither SerpAPI nor Exa is configured (and not mocked), gracefully degrade to Gemini Google Search
    if (!this.isDualEngineActive()) {
      const legacy = await this.searchWithGeminiGrounding(
        {
          query: params.query,
          prioritize_official_regulators: true,
          jurisdictions,
          search_intent: searchIntent,
          include_news: includeNews,
        },
        tenantId,
      );
      const mapped: LiveSearchEvidenceItem[] = legacy.results.map((r) => {
        const cls = classifyDomainTrustTier(r.retrieved_url, jurisdictions[0] || "NG");
        return {
          live_web_retrieval_id: r.live_web_retrieval_id,
          provider: "GEMINI_GOOGLE_SEARCH",
          jurisdiction_code: cls.jurisdictionHint,
          trust_tier: cls.trustTier,
          trust_badge_label: cls.trustBadgeLabel,
          page_title: r.page_title,
          retrieved_url: r.retrieved_url,
          domain: cls.domain,
          is_pdf: cls.isPdf,
          published_at: null,
          snippet_content: r.snippet_content,
          highlights: [],
          relevance_score: cls.authorityWeight,
          retrieved_at: r.retrieved_at,
          cache_hit: false,
        };
      });
      return {
        results: mapped,
        webSummary: legacy.web_summary || "",
        providersUsed: mapped.length > 0 ? ["GEMINI_GOOGLE_SEARCH"] : [],
        cacheHit: false,
        latencyMs: Date.now() - startedAt,
        estimatedCostUsd: 0,
        serpApiCalls: 0,
        exaCalls: 0,
      };
    }

    const supabase = createAdminSupabaseClient();
    const { cacheKey, normalizedQuery } = this.computeSearchCacheKey({
      query: params.query,
      jurisdictions,
      searchIntent,
      includeNews,
      dateFrom: params.dateFrom,
    });

    // 1. Check Shared Normalized Cache
    try {
      const { data: cached } = await supabase
        .from("live_web_search_cache")
        .select("results_json, web_summary, providers_used, hit_count, expires_at")
        .eq("cache_key", cacheKey)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cached && Array.isArray(cached.results_json) && cached.results_json.length > 0) {
        const cachedItems = (cached.results_json as LiveSearchEvidenceItem[]).slice(0, limit);
        const persistedCacheHits = await this.persistRetrievalsForTenant(
          supabase,
          tenantId,
          params.query,
          cachedItems.map((item) => ({ ...item, cache_hit: true })),
          Date.now() - startedAt,
          0,
        );

        // Best-effort telemetry increments
        void Promise.allSettled([
          supabase
            .from("live_web_search_cache")
            .update({ hit_count: (cached.hit_count || 0) + 1 })
            .eq("cache_key", cacheKey),
          this.recordUsageTelemetry(supabase, tenantId, {
            cacheHits: 1,
            serpApiCalls: 0,
            exaCalls: 0,
            costUsd: 0,
          }),
        ]);

        return {
          results: persistedCacheHits,
          webSummary: cached.web_summary || "",
          providersUsed: (cached.providers_used as LiveSearchProvider[]) || [
            "SERPAPI_GOOGLE",
            "EXA_AI",
          ],
          cacheHit: true,
          latencyMs: Date.now() - startedAt,
          estimatedCostUsd: 0,
          serpApiCalls: 0,
          exaCalls: 0,
        };
      }
    } catch (cacheErr) {
      logger.warn("live_web_search_cache lookup skipped", {
        error: (cacheErr as Error).message,
      });
    }

    // 2. Execute Concurrent Exa Open-Web Superpower + Curated Authority + SerpAPI Assistant (Google + News)
    const serpTimeout = Math.min(budgetMs - 200, 3000);
    const exaTimeout = Math.min(budgetMs - 150, 3200);

    const serpGooglePromise = this.serpClient.searchRegulatorsGoogle(params.query, jurisdictions, {
      timeoutMs: serpTimeout,
      numResults: 8,
      dateFrom: params.dateFrom,
      searchIntent,
    });

    const serpNewsPromise = includeNews
      ? this.serpClient.searchRegulatoryNews(params.query, jurisdictions, {
          timeoutMs: Math.min(serpTimeout, 2600),
          numResults: 5,
        })
      : Promise.resolve({ items: [] as SerpApiNormalizedItem[], costUsd: 0, latencyMs: 0 });

    const exaOpenPromise =
      typeof this.exa.searchOpenWebWithContents === "function"
        ? this.exa.searchOpenWebWithContents(params.query, jurisdictions, {
            timeoutMs: exaTimeout,
            numResults: 8,
            dateFrom: params.dateFrom,
            searchIntent,
          })
        : Promise.resolve({ items: [] as ExaNormalizedItem[], costUsd: 0, latencyMs: 0 });

    const exaCuratedPromise = this.exa.searchNeuralWithContents(params.query, jurisdictions, {
      timeoutMs: exaTimeout,
      numResults: 6,
      dateFrom: params.dateFrom,
      searchIntent,
      scope: "CURATED_AUTHORITY",
    });

    const settled = await Promise.race([
      Promise.allSettled([serpGooglePromise, serpNewsPromise, exaOpenPromise, exaCuratedPromise]),
      new Promise<
        [
          PromiseSettledResult<{ items: SerpApiNormalizedItem[]; costUsd: number; latencyMs: number }>,
          PromiseSettledResult<{ items: SerpApiNormalizedItem[]; costUsd: number; latencyMs: number }>,
          PromiseSettledResult<{ items: ExaNormalizedItem[]; costUsd: number; latencyMs: number }>,
          PromiseSettledResult<{ items: ExaNormalizedItem[]; costUsd: number; latencyMs: number }>,
        ]
      >((resolve) => {
        setTimeout(() => {
          resolve([
            { status: "rejected", reason: new Error("Interactive budget exceeded") },
            { status: "rejected", reason: new Error("Interactive budget exceeded") },
            { status: "rejected", reason: new Error("Interactive budget exceeded") },
            { status: "rejected", reason: new Error("Interactive budget exceeded") },
          ]);
        }, budgetMs);
      }),
    ]);

    const serpGoogleOut =
      settled[0].status === "fulfilled"
        ? settled[0].value
        : { items: [], costUsd: 0, latencyMs: budgetMs };
    const serpNewsOut =
      settled[1].status === "fulfilled"
        ? settled[1].value
        : { items: [], costUsd: 0, latencyMs: budgetMs };
    const exaOpenOut =
      settled[2].status === "fulfilled"
        ? settled[2].value
        : { items: [], costUsd: 0, latencyMs: budgetMs };
    const exaCuratedOut =
      settled[3].status === "fulfilled"
        ? settled[3].value
        : { items: [], costUsd: 0, latencyMs: budgetMs };

    let totalCostUsd =
      serpGoogleOut.costUsd + serpNewsOut.costUsd + exaOpenOut.costUsd + exaCuratedOut.costUsd;
    const serpApiCalls =
      (serpGoogleOut.costUsd > 0 ? 1 : 0) + (serpNewsOut.costUsd > 0 ? 1 : 0);
    let exaCalls =
      (exaOpenOut.costUsd > 0 ? 1 : 0) + (exaCuratedOut.costUsd > 0 ? 1 : 0);

    // 3. Canonical URL Deduplication & Multi-Engine Aggregation
    const aggregated = new Map<string, CandidateAggregation>();
    const fallbackJurisdiction = jurisdictions[0] || "NG";

    const ingestItem = (item: {
      url: string;
      title: string;
      snippet: string;
      fullText?: string;
      highlights?: string[];
      publishedAt: string | null;
      provider: LiveSearchProvider;
      providerScore: number;
    }) => {
      const canon = canonicalizeUrl(item.url);
      if (!canon) return;

      const trust = classifyDomainTrustTier(canon.canonicalUrl, fallbackJurisdiction);
      const cleanTitle = sanitizeExternalEvidenceText(item.title, 240);
      const cleanSnippet = sanitizeExternalEvidenceText(item.snippet, 1200);
      const cleanFull = sanitizeExternalEvidenceText(item.fullText || "", 2500);
      const cleanHighlights = (item.highlights || [])
        .map((h) => sanitizeExternalEvidenceText(h, 500))
        .filter(Boolean);

      const existing = aggregated.get(canon.hash);
      if (existing) {
        existing.providers.add(item.provider);
        existing.providerScore = Math.max(existing.providerScore, item.providerScore);
        if (cleanFull.length > existing.fullText.length) {
          existing.fullText = cleanFull;
        }
        if (cleanHighlights.length > 0) {
          existing.highlights = Array.from(
            new Set([...existing.highlights, ...cleanHighlights]),
          ).slice(0, 4);
        }
        if (!existing.publishedAt && item.publishedAt) {
          existing.publishedAt = item.publishedAt;
        }
        if (cleanSnippet.length > existing.snippet.length) {
          existing.snippet = cleanSnippet;
        }
        return;
      }

      aggregated.set(canon.hash, {
        canonicalUrl: canon.canonicalUrl,
        canonicalHash: canon.hash,
        title: cleanTitle || trust.domain,
        snippet: cleanSnippet || cleanTitle || "Regulatory intelligence citation",
        fullText: cleanFull,
        highlights: cleanHighlights,
        publishedAt: item.publishedAt,
        primaryProvider: item.provider,
        providers: new Set<LiveSearchProvider>([item.provider]),
        providerScore: item.providerScore,
        trustTier: trust.trustTier,
        trustBadgeLabel: trust.trustBadgeLabel,
        authorityWeight: trust.authorityWeight,
        domain: trust.domain,
        jurisdictionCode: trust.jurisdictionHint,
        isPdf: trust.isPdf,
      });
    };

    for (const item of serpGoogleOut.items) {
      ingestItem({
        ...item,
        providerScore: Math.max(0.4, 1 - (item.position - 1) * 0.08),
      });
    }
    for (const item of serpNewsOut.items) {
      ingestItem({
        ...item,
        providerScore: Math.max(0.35, 0.85 - (item.position - 1) * 0.08),
      });
    }
    for (const item of exaOpenOut.items) {
      ingestItem({
        ...item,
        providerScore: item.score,
      });
    }
    for (const item of exaCuratedOut.items) {
      ingestItem({
        ...item,
        providerScore: item.score,
      });
    }

    // 4. Universal Exa /contents Enrichment for top SerpAPI-only URLs (official PDFs, financial press, legal & blogs)
    const elapsedBeforeEnrich = Date.now() - startedAt;
    const remainingForEnrich = budgetMs - elapsedBeforeEnrich;
    if (remainingForEnrich > 950 && this.exa.isConfigured()) {
      const urlsToEnrich = Array.from(aggregated.values())
        .filter((c) => !c.fullText && !c.providers.has("EXA_AI"))
        .sort(
          (a, b) =>
            b.authorityWeight * 0.6 + b.providerScore * 0.4 -
            (a.authorityWeight * 0.6 + a.providerScore * 0.4),
        )
        .slice(0, 3)
        .map((c) => c.canonicalUrl);

      if (urlsToEnrich.length > 0) {
        const enriched = await this.exa.fetchContentsForUrls(
          urlsToEnrich,
          Math.min(remainingForEnrich - 150, 1800),
        );
        if (enriched.size > 0) {
          exaCalls += 1;
          totalCostUsd += 0.003;
          for (const [enrichedUrl, payload] of enriched.entries()) {
            const canon = canonicalizeUrl(enrichedUrl);
            if (!canon) continue;
            const target = aggregated.get(canon.hash);
            if (target) {
              target.fullText = sanitizeExternalEvidenceText(payload.fullText, 2500);
              target.highlights = payload.highlights
                .map((h) => sanitizeExternalEvidenceText(h, 500))
                .filter(Boolean);
              target.providers.add("EXA_AI");
            }
          }
        }
      }
    }

    // 5. Multi-Factor Ranking (Authority 45% + Recency 25% + Provider Relevance 20% + Consensus 10%)
    const nowMs = Date.now();
    const ranked = Array.from(aggregated.values())
      .map((item) => {
        const consensusBonus = item.providers.size > 1 ? 1.0 : 0.0;
        let recencyScore = 0.55;
        if (item.publishedAt) {
          const ageDays = Math.max(0, (nowMs - new Date(item.publishedAt).getTime()) / 86400000);
          recencyScore = ageDays <= 30 ? 1.0 : ageDays <= 180 ? 0.8 : ageDays <= 365 ? 0.65 : 0.45;
        }
        const finalScore = Number(
          (
            item.authorityWeight * 0.45 +
            recencyScore * 0.25 +
            item.providerScore * 0.2 +
            consensusBonus * 0.1
          ).toFixed(4),
        );
        return { item, finalScore };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit);

    const nowIso = new Date().toISOString();
    const totalLatencyMs = Date.now() - startedAt;

    const evidenceItems: LiveSearchEvidenceItem[] = ranked.map(({ item, finalScore }) => ({
      live_web_retrieval_id: crypto.randomUUID(),
      provider: item.primaryProvider,
      jurisdiction_code: item.jurisdictionCode,
      trust_tier: item.trustTier,
      trust_badge_label: item.trustBadgeLabel,
      page_title: item.title,
      retrieved_url: item.canonicalUrl,
      domain: item.domain,
      is_pdf: item.isPdf,
      published_at: item.publishedAt,
      snippet_content: item.snippet,
      ...(item.fullText ? { full_content_excerpt: item.fullText } : {}),
      highlights: item.highlights,
      relevance_score: finalScore,
      retrieved_at: nowIso,
      cache_hit: false,
    }));

    const providersUsed = Array.from(
      new Set(
        ranked.flatMap(({ item }) => Array.from(item.providers)),
      ),
    );

    const webSummary = evidenceItems
      .slice(0, 4)
      .map(
        (e, i) =>
          `[${i + 1}] (${e.trust_badge_label}) ${e.page_title}: ${e.highlights[0] || e.snippet_content}`,
      )
      .join("\n")
      .slice(0, 2500);

    // 6. Persist Provenance + Update Cache + Telemetry
    const persisted = await this.persistRetrievalsForTenant(
      supabase,
      tenantId,
      params.query,
      evidenceItems,
      totalLatencyMs,
      totalCostUsd,
    );

    if (persisted.length > 0) {
      const cacheHours =
        searchIntent === "NEWS_ENFORCEMENT"
          ? 4
          : Number(process.env.LIVE_WEB_CACHE_TTL_HOURS) || env.LIVE_WEB_CACHE_TTL_HOURS || 12;
      const expiresAt = new Date(Date.now() + cacheHours * 3600 * 1000).toISOString();
      void Promise.allSettled([
        supabase.from("live_web_search_cache").upsert(
          {
            cache_key: cacheKey,
            normalized_query: normalizedQuery,
            jurisdiction_code: jurisdictions[0] || "NG",
            search_mode: searchIntent,
            providers_used: providersUsed.length > 0 ? providersUsed : ["SERPAPI_GOOGLE", "EXA_AI"],
            results_json: persisted,
            web_summary: webSummary,
            expires_at: expiresAt,
          },
          { onConflict: "cache_key" },
        ),
        this.recordUsageTelemetry(supabase, tenantId, {
          cacheHits: 0,
          serpApiCalls,
          exaCalls,
          costUsd: totalCostUsd,
        }),
      ]);
    }

    return {
      results: persisted,
      webSummary,
      providersUsed,
      cacheHit: false,
      latencyMs: totalLatencyMs,
      estimatedCostUsd: Number(totalCostUsd.toFixed(6)),
      serpApiCalls,
      exaCalls,
    };
  }

  /**
   * Executes searchLiveWeb (Tool 9 & backward-compatible caller entrypoint).
   * Routes to Dual-Engine SerpAPI+Exa when active, otherwise falls back cleanly to Gemini googleSearch.
   */
  public async searchLiveWeb(
    rawArgs: LiveWebSearchArgs,
    tenantId: string,
  ): Promise<LiveWebSearchResponse> {
    const validatedArgs = liveWebSearchArgsSchema.parse(rawArgs);

    if (this.isDualEngineActive()) {
      const bundle = await this.searchAfricaLiveWeb(
        {
          query: validatedArgs.query,
          jurisdictions: validatedArgs.jurisdictions || ["NG"],
          searchIntent: validatedArgs.search_intent || "REGULATORY_CIRCULAR",
          includeNews: validatedArgs.include_news ?? true,
        },
        tenantId,
      );

      if (bundle.results.length === 0) {
        return {
          source_class: "LIVE_WEB_INTELLIGENCE",
          results: [],
          status: "no_verified_live_results",
          providers_used: bundle.providersUsed,
          cache_hit: bundle.cacheHit,
          latency_ms: bundle.latencyMs,
        };
      }

      return {
        source_class: "LIVE_WEB_INTELLIGENCE",
        results: bundle.results.map((r) => ({
          ...r,
          source_class: "LIVE_WEB_INTELLIGENCE" as const,
        })),
        web_summary: bundle.webSummary || undefined,
        providers_used: bundle.providersUsed,
        cache_hit: bundle.cacheHit,
        latency_ms: bundle.latencyMs,
      };
    }

    return this.searchWithGeminiGrounding(validatedArgs, tenantId);
  }

  private async searchWithGeminiGrounding(
    validatedArgs: LiveWebSearchArgs,
    tenantId: string,
  ): Promise<LiveWebSearchResponse> {
    const { query, prioritize_official_regulators } = validatedArgs;
    const todayIso = new Date().toISOString().split("T")[0];

    const prompt = prioritize_official_regulators
      ? `Today's date is ${todayIso}. Use Google Search to run an open web search across all public websites, blogs, news outlets, industry publications, and official regulatory portals (e.g. CBN, FCCPC, ARCON, NDPC, SEC) on: ${query}. Include non-government sites as well as official ones. Return a concise, factual, grounded summary.`
      : `Today's date is ${todayIso}. Use Google Search to run a general open web search across any public website, blog, news outlet, documentation page, forum, or publication on: ${query}. Do NOT restrict results to .gov.ng or government domains. Return a concise, factual, grounded summary.`;

    logger.info("Executing Dynamic Live Web Search Router", {
      query,
      tenantId,
      prioritizeRegulators: prioritize_official_regulators,
    });

    const retrievedResults: LiveWebSearchResult[] = [];
    const supabase = createAdminSupabaseClient();

    const candidateModels = Array.from(
      new Set([this.searchModel, AI_MODELS.PRO, "gemini-2.5-flash", "gemini-2.0-flash"]),
    );

    try {
      let response: Awaited<ReturnType<typeof this.client.models.generateContent>> | null = null;

      if (!this.hasCustomGeminiClient) {
        const { geminiKeyPool } = await import("@/lib/ai/gemini-key-pool");
        const { result } = await geminiKeyPool.execute({
          primaryModel: this.searchModel,
          enableModelFallback: true,
          operationName: "webSearchRouterFallback",
          run: async (client, model) => {
            const searchPromise = client.models.generateContent({
              model,
              contents: prompt,
              config: {
                tools: [{ googleSearch: {} }],
              },
            });
            return Promise.race([
              searchPromise,
              new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("Live web search timed out after 10000ms")), 10000);
              }),
            ]);
          },
        });
        response = result;
      } else {
        let lastModelError: unknown = null;

        for (let idx = 0; idx < candidateModels.length; idx++) {
          const model = candidateModels[idx]!;
          try {
            const searchPromise = this.client.models.generateContent({
              model,
              contents: prompt,
              config: {
                tools: [{ googleSearch: {} }],
              },
            });

            response = await Promise.race([
              searchPromise,
              new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("Live web search timed out after 12000ms")), 12000);
              }),
            ]);
            break;
          } catch (modelErr) {
            lastModelError = modelErr;
            const hasNextModel = idx < candidateModels.length - 1;
            if (hasNextModel && this.isModelFallbackEligibleError(modelErr)) {
              logger.warn("Live web search model unavailable; falling back to next candidate model", {
                failedModel: model,
                nextModel: candidateModels[idx + 1],
                error: (modelErr as Error).message,
              });
              continue;
            }
            throw modelErr;
          }
        }

        if (!response) {
          throw lastModelError || new Error("Live web search produced no response");
        }
      }

      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata as
        | {
            groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
            webSearchQueries?: string[];
          }
        | undefined;

      const summaryText = (response.text || "").trim();
      const chunks = groundingMetadata?.groundingChunks || [];

      const uniqueChunks: Array<{ uri: string; title: string }> = [];
      const seenUris = new Set<string>();
      for (const chunk of chunks) {
        const uri = chunk.web?.uri?.trim();
        if (!uri || seenUris.has(uri)) continue;
        try {
          new URL(uri);
        } catch {
          continue;
        }
        seenUris.add(uri);
        uniqueChunks.push({
          uri,
          title: chunk.web?.title?.trim() || new URL(uri).hostname,
        });
        if (uniqueChunks.length >= 6) break;
      }

      if (uniqueChunks.length > 0) {
        const snippetPreview = sanitizeExternalEvidenceText(
          summaryText.slice(0, 800) || `Live web search result for: ${query}`,
          800,
        );
        const fallbackResults: LiveWebSearchResult[] = uniqueChunks.map((chunk) => ({
          live_web_retrieval_id: crypto.randomUUID(),
          provider: "GEMINI_GOOGLE_SEARCH",
          jurisdiction_code: "NG",
          trust_tier: classifyDomainTrustTier(chunk.uri).trustTier,
          page_title: chunk.title,
          retrieved_url: chunk.uri,
          snippet_content: snippetPreview,
          retrieved_at: new Date().toISOString(),
          source_class: "LIVE_WEB_INTELLIGENCE" as const,
        }));

        const persistPromise = Promise.all(
          uniqueChunks.map(async (chunk, i) => {
            const cls = classifyDomainTrustTier(chunk.uri);
            try {
              const { data: record, error } = await supabase
                .from("live_web_retrievals")
                .insert({
                  tenant_id: tenantId,
                  search_query: query,
                  retrieved_url: chunk.uri,
                  page_title: chunk.title,
                  snippet_content: snippetPreview,
                  source_class: "LIVE_WEB_INTELLIGENCE",
                  provider: "GEMINI_GOOGLE_SEARCH",
                  jurisdiction_code: cls.jurisdictionHint,
                  trust_tier: cls.trustTier,
                  metadata: {
                    prioritize_official_regulators,
                    is_official_regulator: cls.trustTier === "OFFICIAL_REGULATOR_WEB",
                    webSearchQueries: groundingMetadata?.webSearchQueries || [],
                  },
                })
                .select("id, retrieved_at")
                .single();

              if (!error && record) {
                return {
                  live_web_retrieval_id: record.id,
                  provider: "GEMINI_GOOGLE_SEARCH" as const,
                  jurisdiction_code: cls.jurisdictionHint,
                  trust_tier: cls.trustTier,
                  page_title: chunk.title,
                  retrieved_url: chunk.uri,
                  snippet_content: snippetPreview,
                  retrieved_at: record.retrieved_at,
                  source_class: "LIVE_WEB_INTELLIGENCE" as const,
                };
              }
            } catch (dbErr) {
              logger.warn("Live web retrieval DB log skipped", {
                error: (dbErr as Error).message,
                uri: chunk.uri,
              });
            }

            return fallbackResults[i]!;
          }),
        );

        const persisted = await Promise.race([
          persistPromise,
          new Promise<LiveWebSearchResult[]>((resolve) => {
            setTimeout(() => resolve(fallbackResults), 2500);
          }),
        ]);

        retrievedResults.push(...persisted);
      }

      if (retrievedResults.length === 0) {
        logger.info("Live web search returned 0 grounded citations", {
          query,
          tenantId,
        });
        return {
          source_class: "LIVE_WEB_INTELLIGENCE",
          results: [],
          ...(summaryText ? { web_summary: summaryText.slice(0, 2500) } : {}),
          status: "no_verified_live_results",
        };
      }

      return {
        source_class: "LIVE_WEB_INTELLIGENCE",
        results: retrievedResults,
        ...(summaryText ? { web_summary: summaryText.slice(0, 2500) } : {}),
      };
    } catch (err: unknown) {
      logger.error("Live web search failed", {
        error: (err as Error).message,
        query,
        tenantId,
      });

      return {
        source_class: "LIVE_WEB_INTELLIGENCE",
        results: [],
        status: "no_verified_live_results",
      };
    }
  }

  private async persistRetrievalsForTenant(
    supabase: ReturnType<typeof createAdminSupabaseClient>,
    tenantId: string,
    query: string,
    items: LiveSearchEvidenceItem[],
    latencyMs: number,
    totalCostUsd: number,
  ): Promise<LiveSearchEvidenceItem[]> {
    if (items.length === 0) return [];
    const perRowCost = items.length > 0 ? Number((totalCostUsd / items.length).toFixed(6)) : 0;

    const rows = items.map((item) => {
      const canon = canonicalizeUrl(item.retrieved_url);
      return {
        id: item.live_web_retrieval_id,
        tenant_id: tenantId,
        search_query: query,
        retrieved_url: item.retrieved_url,
        page_title: item.page_title,
        snippet_content: item.snippet_content,
        source_class: "LIVE_WEB_INTELLIGENCE",
        provider: item.provider,
        jurisdiction_code: item.jurisdiction_code,
        trust_tier: item.trust_tier,
        published_at: item.published_at || null,
        full_content_excerpt: item.full_content_excerpt || null,
        highlights: item.highlights || [],
        canonical_url_hash: canon?.hash || null,
        search_latency_ms: latencyMs,
        estimated_cost_usd: perRowCost,
        cache_hit: item.cache_hit,
        metadata: {
          domain: item.domain,
          is_pdf: item.is_pdf,
          relevance_score: item.relevance_score,
          trust_badge_label: item.trust_badge_label,
        },
      };
    });

    try {
      const insertPromise = supabase
        .from("live_web_retrievals")
        .insert(rows)
        .select("id, retrieved_at");

      const { data, error } = await Promise.race([
        insertPromise,
        new Promise<{ data: null; error: { message: string } }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: "DB log timeout" } }), 1200),
        ),
      ]);

      if (!error && Array.isArray(data) && data.length === items.length) {
        return items.map((item, idx) => ({
          ...item,
          live_web_retrieval_id: data[idx]?.id || item.live_web_retrieval_id,
          retrieved_at: data[idx]?.retrieved_at || item.retrieved_at,
        }));
      }
    } catch (err) {
      logger.warn("Dual-engine live_web_retrievals persistence skipped", {
        error: (err as Error).message,
      });
    }

    return items;
  }

  private async recordUsageTelemetry(
    supabase: ReturnType<typeof createAdminSupabaseClient>,
    tenantId: string,
    delta: { cacheHits: number; serpApiCalls: number; exaCalls: number; costUsd: number },
  ): Promise<void> {
    const billingPeriod = new Date().toISOString().slice(0, 7);
    try {
      const { data: existing } = await supabase
        .from("live_web_search_usage")
        .select("id, cache_hit_count, serpapi_calls, exa_calls, estimated_cost_usd")
        .eq("tenant_id", tenantId)
        .eq("billing_period", billingPeriod)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("live_web_search_usage")
          .update({
            cache_hit_count: (existing.cache_hit_count || 0) + delta.cacheHits,
            serpapi_calls: (existing.serpapi_calls || 0) + delta.serpApiCalls,
            exa_calls: (existing.exa_calls || 0) + delta.exaCalls,
            estimated_cost_usd: Number(
              (Number(existing.estimated_cost_usd || 0) + delta.costUsd).toFixed(6),
            ),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("live_web_search_usage").insert({
          tenant_id: tenantId,
          billing_period: billingPeriod,
          search_count: 0,
          cache_hit_count: delta.cacheHits,
          serpapi_calls: delta.serpApiCalls,
          exa_calls: delta.exaCalls,
          estimated_cost_usd: delta.costUsd,
        });
      }
    } catch {
      // Non-blocking telemetry
    }
  }

  /**
   * SSRF-Protected Live Campaign Landing Page Fetcher (Tool 10: fetch_live_url_content)
   */
  public async fetchLiveUrlContent(
    rawArgs: FetchLiveUrlContentArgs,
    tenantId: string,
  ): Promise<FetchLiveUrlContentResponse> {
    const validated = fetchLiveUrlContentArgsSchema.parse(rawArgs);
    const parsedUrl = new URL(validated.url);

    if (parsedUrl.protocol !== "https:") {
      throw new Error("URL_FETCH_BLOCKED: HTTPS scheme required");
    }

    await this.assertPublicAddress(parsedUrl.hostname);

    logger.info("Fetching live promotional URL content", {
      url: validated.url,
      tenantId,
      campaignId: validated.campaign_id,
    });

    const fetchWithTimeout = async (userAgent: string): Promise<Response> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        return await fetch(validated.url, {
          signal: controller.signal,
          headers: {
            "User-Agent": userAgent,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
            "Accept-Language": "en-US,en;q=0.9",
          },
          redirect: "follow",
        });
      } finally {
        clearTimeout(timeout);
      }
    };

    let res: Response;
    try {
      res = await fetchWithTimeout(
        "Cogent-Compliance-Shield/2.0 (+https://stem-cogent.com/compliance)",
      );
      if (res.status === 403 || res.status === 406) {
        res = await fetchWithTimeout(
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        );
      }
    } catch (err) {
      logger.warn("Live URL fetch failed or timed out", {
        url: validated.url,
        error: (err as Error).message,
      });
      throw new Error(`URL_FETCH_BLOCKED: ${(err as Error).message}`);
    }

    if (!res.ok) {
      throw new Error(`URL_FETCH_BLOCKED: Remote server responded with HTTP ${res.status}`);
    }

    const finalUrl = new URL(res.url || validated.url);
    await this.assertPublicAddress(finalUrl.hostname);

    const rawHtml = await res.text();

    const cleanText = rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

    const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(rawHtml);
    const pageTitle = titleMatch && titleMatch[1] ? titleMatch[1].trim() : parsedUrl.hostname;

    const sha256Hash = crypto.createHash("sha256").update(cleanText).digest("hex");

    return {
      success: true,
      url: res.url || validated.url,
      page_title: pageTitle,
      content_text: cleanText.slice(0, 10000),
      text_length: cleanText.length,
      retrieved_at: new Date().toISOString(),
      source_class: "UNTRUSTED_USER_MATERIAL",
      sha256_hash: sha256Hash,
      asset_id: validated.campaign_id,
    };
  }

  private async assertPublicAddress(hostname: string): Promise<void> {
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname === "169.254.169.254"
    ) {
      throw new Error(
        `URL_FETCH_BLOCKED: Access to private or loopback target is prohibited (${hostname})`,
      );
    }

    try {
      const lookup = await dns.lookup(hostname);
      const ip = lookup.address;

      if (
        ip === "127.0.0.1" ||
        ip === "::1" ||
        ip.startsWith("127.") ||
        ip.startsWith("10.") ||
        ip.startsWith("192.168.") ||
        ip.startsWith("169.254.") ||
        (ip.startsWith("172.") && this.isRfc1918Subnet(ip))
      ) {
        throw new Error(`URL_FETCH_BLOCKED: Hostname resolved to private address ${ip}`);
      }
    } catch (err) {
      if ((err as Error).message.includes("URL_FETCH_BLOCKED")) {
        throw err;
      }
      throw new Error(`URL_FETCH_BLOCKED: DNS resolution failure for ${hostname}`);
    }
  }

  private isRfc1918Subnet(ip: string): boolean {
    const parts = ip.split(".").map(Number);
    if (parts.length < 2 || parts[0] === undefined || parts[1] === undefined) return false;
    return parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
  }
}

export const webSearchRouter = new WebSearchRouter();
