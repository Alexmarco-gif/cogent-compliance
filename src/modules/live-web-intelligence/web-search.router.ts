/**
 * Cogent Marketing Shield - Two-Step Live Web Search Router & SSRF-Protected Live URL Fetcher
 * Document Reference: Document 02 (Section 6.2), Document 04 (Tools 9 & 10), Document 05, Document 07 (Section 7.2), Document 08
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
}

export class WebSearchRouter {
  private client: GoogleGenAI;
  private searchModel: string;

  constructor(options?: WebSearchRouterOptions) {
    this.client = options?.customClient || new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    this.searchModel = AI_MODELS.FLASH;
  }

  /**
   * Executes the isolated secondary Google Search grounding call.
   * NEVER injects synthetic fallback citations. If 0 results or an error occurs,
   * returns status: "no_verified_live_results" and logs the event to Better Stack.
   */
  public async searchLiveWeb(
    rawArgs: LiveWebSearchArgs,
    tenantId: string
  ): Promise<LiveWebSearchResponse> {
    const validatedArgs = liveWebSearchArgsSchema.parse(rawArgs);
    const { query, prioritize_official_regulators } = validatedArgs;

    const prompt = prioritize_official_regulators
      ? `You are an autonomous intelligence researcher specializing in Nigerian financial, fintech, legal, and regulatory compliance.
Conduct an open, real-time web search across the Nigerian and global internet — including major Nigerian financial news platforms (such as Nairametrics, BusinessDay, Premium Times, TechCabal), law firm advisories, corporate press releases, and official regulatory bodies (CBN, FCCPC, ARCON, NDPC, SEC) — for: "${query}".
Synthesize the latest factual developments, market impacts, industry discussions, and regulatory compliance implications, citing live, verified URLs.`
      : `You are an autonomous real-time intelligence researcher specializing in Nigerian commerce, banking, marketing, and fintech.
Conduct an open live web search across the internet (including news publications, blogs, industry commentaries, and corporate announcements) for: "${query}".
Synthesize the latest factual information, current events, and practical implications, citing live, verified URLs.`;

    logger.info("Executing Two-Step Live Web Search Router", {
      query,
      tenantId,
      prioritizeRegulators: prioritize_official_regulators,
    });

    const retrievedResults: LiveWebSearchResult[] = [];
    const supabase = createAdminSupabaseClient();

    try {
      const response = await this.client.models.generateContent({
        model: this.searchModel,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata as
        | {
            groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
            webSearchQueries?: string[];
          }
        | undefined;

      const summaryText = response.text || "";
      const chunks = groundingMetadata?.groundingChunks || [];

      if (chunks.length > 0) {
        for (const chunk of chunks) {
          const uri = chunk.web?.uri;
          const title = chunk.web?.title || "Live Web Intelligence Citation";
          if (!uri) continue;

          // Deduplicate within the same call
          if (retrievedResults.some((r) => r.retrieved_url === uri)) continue;

          const isOfficialRegulator = NIGERIAN_REGULATORY_DOMAINS.some((domain) =>
            uri.toLowerCase().includes(domain.toLowerCase())
          );

          // Persist each verified web citation to live_web_retrievals
          const { data: record, error } = await supabase
            .from("live_web_retrievals")
            .insert({
              tenant_id: tenantId,
              search_query: query,
              retrieved_url: uri,
              page_title: title,
              snippet_content:
                summaryText.slice(0, 500) || `Live web search result for: ${query}`,
              source_class: "LIVE_WEB_INTELLIGENCE",
              metadata: {
                prioritize_official_regulators,
                is_official_regulator: isOfficialRegulator,
                webSearchQueries: groundingMetadata?.webSearchQueries || [],
              },
            })
            .select("id, retrieved_at")
            .single();

          if (!error && record) {
            retrievedResults.push({
              live_web_retrieval_id: record.id,
              page_title: title,
              retrieved_url: uri,
              snippet_content: summaryText.slice(0, 500),
              retrieved_at: record.retrieved_at,
              source_class: "LIVE_WEB_INTELLIGENCE",
            });
          }
        }
      }

      if (retrievedResults.length === 0) {
        logger.info("Live web search returned 0 grounded citations", {
          query,
          tenantId,
        });
        return {
          source_class: "LIVE_WEB_INTELLIGENCE",
          results: [],
          status: "no_verified_live_results",
        };
      }

      return {
        source_class: "LIVE_WEB_INTELLIGENCE",
        results: retrievedResults,
      };
    } catch (err: unknown) {
      logger.error("Live web search failed", {
        error: (err as Error).message,
        query,
        tenantId,
      });

      // Task 3: Never invent fallback citations. Return empty results honestly.
      return {
        source_class: "LIVE_WEB_INTELLIGENCE",
        results: [],
        status: "no_verified_live_results",
      };
    }
  }

  /**
   * SSRF-Protected Live Campaign Landing Page Fetcher (Tool 10: fetch_live_url_content)
   * Enforces:
   * 1. HTTPS scheme only
   * 2. DNS resolution check blocking loopback (127.0.0.0/8, ::1), link-local (169.254.0.0/16),
   *    and private RFC1918 subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
   * 3. Strict TLS certificate verification (never disabled)
   * 4. Text sanitization & SHA-256 fingerprinting
   */
  public async fetchLiveUrlContent(
    rawArgs: FetchLiveUrlContentArgs,
    tenantId: string
  ): Promise<FetchLiveUrlContentResponse> {
    const validated = fetchLiveUrlContentArgsSchema.parse(rawArgs);
    const parsedUrl = new URL(validated.url);

    if (parsedUrl.protocol !== "https:") {
      throw new Error("URL_FETCH_BLOCKED: HTTPS scheme required");
    }

    // SSRF Check: Resolve hostname to verify destination IP is not private/cloud metadata
    await this.assertPublicAddress(parsedUrl.hostname);

    logger.info("Fetching live promotional URL content", {
      url: validated.url,
      tenantId,
      campaignId: validated.campaign_id,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    let res: Response;
    try {
      res = await fetch(validated.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Cogent-Compliance-Shield/2.0 (+https://stem-cogent.com/compliance)",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
        },
        redirect: "follow",
      });
    } catch (err) {
      clearTimeout(timeout);
      logger.warn("Live URL fetch failed or timed out", {
        url: validated.url,
        error: (err as Error).message,
      });
      throw new Error(`URL_FETCH_BLOCKED: ${(err as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(`URL_FETCH_BLOCKED: Remote server responded with HTTP ${res.status}`);
    }

    // Final URL redirect check
    const finalUrl = new URL(res.url || validated.url);
    await this.assertPublicAddress(finalUrl.hostname);

    const rawHtml = await res.text();

    // Strip HTML scripts, styles, and tags to extract readable text
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

    // Extract page title
    const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(rawHtml);
    const pageTitle = titleMatch && titleMatch[1] ? titleMatch[1].trim() : parsedUrl.hostname;

    const sha256Hash = crypto.createHash("sha256").update(cleanText).digest("hex");

    return {
      success: true,
      url: res.url || validated.url,
      page_title: pageTitle,
      content_text: cleanText.slice(0, 10000), // Bound max payload
      text_length: cleanText.length,
      retrieved_at: new Date().toISOString(),
      source_class: "UNTRUSTED_USER_MATERIAL",
      sha256_hash: sha256Hash,
      asset_id: validated.campaign_id,
    };
  }

  /**
   * Validates that the resolved hostname does not map to private, loopback, or metadata addresses.
   */
  private async assertPublicAddress(hostname: string): Promise<void> {
    // Quick reject for known IP strings
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname === "169.254.169.254"
    ) {
      throw new Error(`URL_FETCH_BLOCKED: Access to private or loopback target is prohibited (${hostname})`);
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
