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
    const todayIso = new Date().toISOString().split("T")[0];

    const prompt = prioritize_official_regulators
      ? `Today's date is ${todayIso}. Use Google Search to find current live web information, official Nigerian regulatory circulars (CBN, FCCPC, ARCON, NDPC, SEC), enforcement updates, financial news, and authoritative public sources on: ${query}. Return a concise, factual, grounded summary.`
      : `Today's date is ${todayIso}. Use Google Search to find current live web information, news, updates, and authoritative sources on: ${query}. Return a concise, factual, grounded summary.`;

    logger.info("Executing Dynamic Live Web Search Router", {
      query,
      tenantId,
      prioritizeRegulators: prioritize_official_regulators,
    });

    const retrievedResults: LiveWebSearchResult[] = [];
    const supabase = createAdminSupabaseClient();

    const candidateModels = Array.from(
      new Set([this.searchModel, AI_MODELS.PRO, "gemini-2.5-flash", "gemini-2.0-flash"])
    );

    try {
      let response: Awaited<ReturnType<typeof this.client.models.generateContent>> | null = null;
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

      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata as
        | {
            groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
            webSearchQueries?: string[];
          }
        | undefined;

      const summaryText = (response.text || "").trim();
      const chunks = groundingMetadata?.groundingChunks || [];

      // Deduplicate and cap to top 6 unique verified URLs
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
        const snippetPreview = summaryText.slice(0, 800) || `Live web search result for: ${query}`;
        const fallbackResults: LiveWebSearchResult[] = uniqueChunks.map((chunk) => ({
          live_web_retrieval_id: crypto.randomUUID(),
          page_title: chunk.title,
          retrieved_url: chunk.uri,
          snippet_content: snippetPreview,
          retrieved_at: new Date().toISOString(),
          source_class: "LIVE_WEB_INTELLIGENCE" as const,
        }));

        const persistPromise = Promise.all(
          uniqueChunks.map(async (chunk, i) => {
            const isOfficialRegulator = NIGERIAN_REGULATORY_DOMAINS.some((domain) =>
              chunk.uri.toLowerCase().includes(domain.toLowerCase())
            );

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
                  metadata: {
                    prioritize_official_regulators,
                    is_official_regulator: isOfficialRegulator,
                    webSearchQueries: groundingMetadata?.webSearchQueries || [],
                  },
                })
                .select("id, retrieved_at")
                .single();

              if (!error && record) {
                return {
                  live_web_retrieval_id: record.id,
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
          })
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

      // Never invent fallback citations. Return empty results honestly.
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

    const fetchWithTimeout = async (userAgent: string): Promise<Response> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
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
        "Cogent-Compliance-Shield/2.0 (+https://stem-cogent.com/compliance)"
      );
      if (res.status === 403 || res.status === 406) {
        res = await fetchWithTimeout(
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
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
