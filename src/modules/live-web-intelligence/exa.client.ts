/**
 * Cogent Regulatory Intelligence Platform
 * Exa AI Client (Neural Semantic Search + Clean Full-Text & PDF Extraction)
 * Document Reference: Document 14 & Document 15 (Section 4.3)
 */

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { SearchJurisdiction } from "@/contracts/search.contracts";
import {
  buildJurisdictionSearchContext,
  getDomainsForJurisdictions,
  LOW_SIGNAL_NOISE_DOMAINS,
} from "./africa-regulators";

export interface ExaNormalizedItem {
  provider: "EXA_AI";
  title: string;
  url: string;
  snippet: string;
  fullText: string;
  highlights: string[];
  publishedAt: string | null;
  score: number;
}

export interface ExaSearchOptions {
  timeoutMs?: number;
  numResults?: number;
  dateFrom?: string;
  searchIntent?: "REGULATORY_CIRCULAR" | "LEGAL_ANALYSIS" | "NEWS_ENFORCEMENT" | "CROSS_BORDER";
  scope?: "OPEN_WEB" | "CURATED_AUTHORITY";
}

interface RawExaResult {
  title?: string | null;
  url?: string;
  publishedDate?: string | null;
  text?: string | null;
  highlights?: string[];
  score?: number;
}

export class ExaClient {
  private readonly searchEndpoint = "https://api.exa.ai/search";
  private readonly contentsEndpoint = "https://api.exa.ai/contents";

  private getApiKey(): string | undefined {
    return env.EXA_API_KEY?.trim() || process.env.EXA_API_KEY?.trim() || undefined;
  }

  public isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && !key.startsWith("exa_..."));
  }

  /**
   * Executes broad Open-Web Neural Search (blogs, financial news, legal portals, newsletters,
   * global standards, and official portals) WITHOUT an `includeDomains` restriction.
   */
  public async searchOpenWebWithContents(
    query: string,
    jurisdictions: SearchJurisdiction[] = ["NG"],
    options: ExaSearchOptions = {},
  ): Promise<{ items: ExaNormalizedItem[]; costUsd: number; latencyMs: number }> {
    return this.searchNeuralWithContents(query, jurisdictions, {
      ...options,
      scope: "OPEN_WEB",
    });
  }

  public async searchNeuralWithContents(
    query: string,
    jurisdictions: SearchJurisdiction[] = ["NG"],
    options: ExaSearchOptions = {},
  ): Promise<{ items: ExaNormalizedItem[]; costUsd: number; latencyMs: number }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { items: [], costUsd: 0, latencyMs: 0 };
    }

    const started = Date.now();
    const timeoutMs = options.timeoutMs ?? 3200;
    const scope = options.scope ?? "CURATED_AUTHORITY";

    let effectiveQuery = query.trim();
    if (scope === "OPEN_WEB") {
      const geoHint = buildJurisdictionSearchContext(jurisdictions);
      const lower = effectiveQuery.toLowerCase();
      if (geoHint && !geoHint.toLowerCase().split(" ").some((token) => lower.includes(token))) {
        effectiveQuery = `${effectiveQuery} (${geoHint} fintech financial regulation)`;
      }
    }

    const body: Record<string, unknown> = {
      query: effectiveQuery,
      type: "auto",
      numResults: options.numResults ?? (scope === "OPEN_WEB" ? 8 : 6),
      contents: {
        text: { maxCharacters: 4000 },
        highlights: { numSentences: 3, highlightsPerUrl: 2 },
      },
    };

    if (scope === "OPEN_WEB") {
      body.excludeDomains = [...LOW_SIGNAL_NOISE_DOMAINS];
      if (options.searchIntent === "NEWS_ENFORCEMENT") {
        body.category = "news";
      }
    } else {
      const includeDomains = getDomainsForJurisdictions(jurisdictions, {
        includeOfficial: true,
        includeLegal: true,
        includeMedia: true,
      });
      if (includeDomains.length > 0) {
        body.includeDomains = includeDomains;
      }
    }

    if (options.dateFrom) {
      body.startPublishedDate = `${options.dateFrom}T00:00:00.000Z`;
    }

    try {
      const response = await fetch(this.searchEndpoint, {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      if (!response.ok) {
        logger.warn("Exa AI /search returned non-200 status", {
          status: response.status,
          jurisdictions,
          scope,
        });
        return { items: [], costUsd: 0, latencyMs: Date.now() - started };
      }

      const payload = (await response.json()) as { results?: RawExaResult[] };
      const results = Array.isArray(payload.results) ? payload.results : [];

      const items: ExaNormalizedItem[] = results
        .filter((r): r is RawExaResult & { url: string } => Boolean(r.url))
        .map((r) => {
          const highlights = Array.isArray(r.highlights) ? r.highlights.filter(Boolean) : [];
          const fullText = (r.text || "").trim();
          const snippet = highlights[0] || fullText.slice(0, 600) || r.title || "Regulatory guidance";
          return {
            provider: "EXA_AI",
            title: (r.title || "Regulatory Intelligence Source").trim(),
            url: r.url.trim(),
            snippet: snippet.trim(),
            fullText,
            highlights,
            publishedAt: r.publishedDate ? this.tryNormalizeDate(r.publishedDate) : null,
            score: typeof r.score === "number" ? r.score : 0.75,
          };
        });

      return {
        items,
        costUsd: 0.007,
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      logger.warn("Exa AI /search failed or timed out", {
        error: (err as Error).message,
        jurisdictions,
        scope,
      });
      return { items: [], costUsd: 0, latencyMs: Date.now() - started };
    }
  }

  /**
   * Enriches high-value URLs discovered by SerpAPI (official PDFs, financial press, legal or fintech blogs) via Exa /contents.
   */
  public async fetchContentsForUrls(
    urls: string[],
    timeoutMs: number = 2200,
  ): Promise<Map<string, { fullText: string; highlights: string[] }>> {
    const map = new Map<string, { fullText: string; highlights: string[] }>();
    const apiKey = this.getApiKey();
    const cleanUrls = urls.filter(Boolean).slice(0, 5);
    if (!apiKey || cleanUrls.length === 0) {
      return map;
    }

    try {
      const response = await fetch(this.contentsEndpoint, {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          urls: cleanUrls,
          livecrawl: "preferred",
          text: { maxCharacters: 4000 },
          highlights: { numSentences: 3, highlightsPerUrl: 2 },
        }),
        cache: "no-store",
      });

      if (!response.ok) return map;

      const payload = (await response.json()) as { results?: RawExaResult[] };
      for (const item of payload.results || []) {
        if (!item.url) continue;
        map.set(item.url.trim(), {
          fullText: (item.text || "").trim(),
          highlights: Array.isArray(item.highlights) ? item.highlights.filter(Boolean) : [],
        });
      }
    } catch (err) {
      logger.warn("Exa AI /contents enrichment skipped", {
        error: (err as Error).message,
      });
    }

    return map;
  }

  private tryNormalizeDate(rawDate: string): string | null {
    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
}

export const exaClient = new ExaClient();
