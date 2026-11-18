/**
 * Cogent Regulatory Intelligence Platform
 * SerpAPI Client (Google Search & Google News Localized for Nigeria & Africa)
 * Document Reference: Document 14 & Document 15 (Section 4.2)
 */

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { SearchJurisdiction } from "@/contracts/search.contracts";
import {
  buildJurisdictionSearchContext,
  getDomainsForJurisdictions,
  getPrimarySerpLocale,
  isCircularLookupQuery,
} from "./africa-regulators";

export interface SerpApiNormalizedItem {
  provider: "SERPAPI_GOOGLE" | "SERPAPI_NEWS";
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
  position: number;
}

export interface SerpApiSearchOptions {
  timeoutMs?: number;
  numResults?: number;
  dateFrom?: string;
  searchIntent?: "REGULATORY_CIRCULAR" | "LEGAL_ANALYSIS" | "NEWS_ENFORCEMENT" | "CROSS_BORDER";
}

interface RawSerpApiOrganicItem {
  position?: number;
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
}

interface RawSerpApiNewsItem {
  position?: number;
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
  source?: { name?: string };
}

export class SerpApiClient {
  private readonly baseUrl = "https://serpapi.com/search.json";

  private getApiKey(): string | undefined {
    return env.SERPAPI_API_KEY?.trim() || process.env.SERPAPI_API_KEY?.trim() || undefined;
  }

  public isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && !key.startsWith("serpapi_..."));
  }

  /**
   * Builds a targeted Google site-scoped regulatory dork for explicit circular codes & official PDFs.
   */
  public buildRegulatorGoogleQuery(
    query: string,
    jurisdictions: SearchJurisdiction[],
    searchIntent: SerpApiSearchOptions["searchIntent"] = "REGULATORY_CIRCULAR",
  ): string {
    const cleanQuery = query.trim().replace(/\s+/g, " ");
    const officialDomains = getDomainsForJurisdictions(jurisdictions, {
      includeOfficial: true,
      includeLegal: searchIntent === "LEGAL_ANALYSIS",
      includeMedia: false,
    }).slice(0, 8);

    if (officialDomains.length === 0) {
      return cleanQuery;
    }

    const siteFilter = officialDomains.map((d) => `site:${d}`).join(" OR ");
    const wantPdf = searchIntent === "REGULATORY_CIRCULAR" && isCircularLookupQuery(cleanQuery);
    return wantPdf
      ? `(${cleanQuery}) (${siteFilter}) filetype:pdf`
      : `(${cleanQuery}) (${siteFilter})`;
  }

  /**
   * Builds an open localized Google web query (without site: walls) to discover fintech blogs,
   * law firm briefings, financial news, industry research, and regulator announcements together.
   */
  public buildOpenWebGoogleQuery(
    query: string,
    jurisdictions: SearchJurisdiction[],
  ): string {
    const cleanQuery = query.trim().replace(/\s+/g, " ");
    const geoHint = buildJurisdictionSearchContext(jurisdictions);
    const lower = cleanQuery.toLowerCase();
    if (geoHint && !geoHint.toLowerCase().split(" ").some((token) => lower.includes(token))) {
      return `${cleanQuery} ${geoHint}`;
    }
    return cleanQuery;
  }

  public async searchRegulatorsGoogle(
    query: string,
    jurisdictions: SearchJurisdiction[] = ["NG"],
    options: SerpApiSearchOptions = {},
  ): Promise<{ items: SerpApiNormalizedItem[]; costUsd: number; latencyMs: number }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { items: [], costUsd: 0, latencyMs: 0 };
    }

    const started = Date.now();
    const locale = getPrimarySerpLocale(jurisdictions);
    const timeoutMs = options.timeoutMs ?? 3000;
    const useCircularDork = jurisdictions.length <= 1 && isCircularLookupQuery(query);
    const scopedQuery = useCircularDork
      ? this.buildRegulatorGoogleQuery(query, jurisdictions, options.searchIntent)
      : this.buildOpenWebGoogleQuery(query, jurisdictions);

    const params = new URLSearchParams({
      engine: "google",
      q: scopedQuery,
      gl: locale.gl,
      hl: locale.hl,
      ...(jurisdictions.length <= 1 ? { location: locale.location } : {}),
      num: String(options.numResults ?? 8),
      api_key: apiKey,
    });

    if (options.dateFrom) {
      params.set("tbs", `cdr:1,cd_min:${options.dateFrom}`);
    }

    try {
      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        method: "GET",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        logger.warn("SerpAPI google search returned non-200 status", {
          status: response.status,
          jurisdictions,
        });
        return { items: [], costUsd: 0, latencyMs: Date.now() - started };
      }

      const payload = (await response.json()) as { organic_results?: RawSerpApiOrganicItem[] };
      const organic = Array.isArray(payload.organic_results) ? payload.organic_results : [];

      const items: SerpApiNormalizedItem[] = organic
        .filter((r): r is RawSerpApiOrganicItem & { link: string } => Boolean(r.link))
        .map((r, idx) => ({
          provider: "SERPAPI_GOOGLE",
          title: (r.title || "Official Regulatory Document").trim(),
          url: r.link.trim(),
          snippet: (r.snippet || r.title || "Official regulatory search match").trim(),
          publishedAt: r.date ? this.tryNormalizeDate(r.date) : null,
          position: r.position ?? idx + 1,
        }));

      return {
        items,
        costUsd: 0.005,
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      logger.warn("SerpAPI google search failed or timed out", {
        error: (err as Error).message,
        jurisdictions,
      });
      return { items: [], costUsd: 0, latencyMs: Date.now() - started };
    }
  }

  public async searchRegulatoryNews(
    query: string,
    jurisdictions: SearchJurisdiction[] = ["NG"],
    options: SerpApiSearchOptions = {},
  ): Promise<{ items: SerpApiNormalizedItem[]; costUsd: number; latencyMs: number }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { items: [], costUsd: 0, latencyMs: 0 };
    }

    const started = Date.now();
    const locale = getPrimarySerpLocale(jurisdictions);
    const timeoutMs = options.timeoutMs ?? 2800;
    const newsQuery = this.buildOpenWebGoogleQuery(query, jurisdictions);

    const params = new URLSearchParams({
      engine: "google_news",
      q: newsQuery,
      gl: locale.gl,
      hl: locale.hl,
      api_key: apiKey,
    });

    try {
      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        method: "GET",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        logger.warn("SerpAPI google_news returned non-200 status", {
          status: response.status,
          jurisdictions,
        });
        return { items: [], costUsd: 0, latencyMs: Date.now() - started };
      }

      const payload = (await response.json()) as { news_results?: RawSerpApiNewsItem[] };
      const news = Array.isArray(payload.news_results) ? payload.news_results : [];

      const items: SerpApiNormalizedItem[] = news
        .filter((r): r is RawSerpApiNewsItem & { link: string } => Boolean(r.link))
        .slice(0, options.numResults ?? 6)
        .map((r, idx) => ({
          provider: "SERPAPI_NEWS",
          title: (r.title || "Financial Regulation News").trim(),
          url: r.link.trim(),
          snippet: (
            r.snippet ||
            (r.source?.name ? `${r.source.name}: ${r.title}` : r.title) ||
            "Financial regulatory press update"
          ).trim(),
          publishedAt: r.date ? this.tryNormalizeDate(r.date) : null,
          position: r.position ?? idx + 1,
        }));

      return {
        items,
        costUsd: 0.005,
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      logger.warn("SerpAPI google_news failed or timed out", {
        error: (err as Error).message,
        jurisdictions,
      });
      return { items: [], costUsd: 0, latencyMs: Date.now() - started };
    }
  }

  private tryNormalizeDate(rawDate: string): string | null {
    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
}

export const serpApiClient = new SerpApiClient();
