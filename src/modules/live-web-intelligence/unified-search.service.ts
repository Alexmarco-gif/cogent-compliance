/**
 * Cogent Regulatory Intelligence Platform
 * Unified Multi-Track Search Service (Track A: Vault + Workspace Command Center; Track B/C: Gated Exa + SerpAPI)
 * Document Reference: Document 14 & Document 15 (Section 1.1 & 6.1)
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { entitlementsService } from "@/modules/billing/entitlements.service";
import { geminiService } from "@/modules/ai-orchestration/gemini.service";
import {
  unifiedSearchRequestSchema,
  type UnifiedSearchRequest,
  type CommandCenterHit,
  type VaultSearchClauseHit,
  type LiveSearchEvidenceItem,
  type SearchQuotaSnapshot,
} from "@/contracts/search.contracts";
import { webSearchRouter, type WebSearchRouter } from "./web-search.router";

export interface UnifiedSearchResponse {
  query: string;
  mode: UnifiedSearchRequest["mode"];
  vault_clauses: VaultSearchClauseHit[];
  workspace_hits: CommandCenterHit[];
  live_web_status: "SKIPPED" | "EXECUTED" | "ENTITLEMENT_BLOCKED" | "NO_RESULTS";
  live_web_results: LiveSearchEvidenceItem[];
  live_web_summary?: string;
  upgrade_required_reason?: string | null;
  quota: SearchQuotaSnapshot;
  latency_ms: number;
}

export class UnifiedSearchService {
  private router: WebSearchRouter;

  constructor(customRouter?: WebSearchRouter) {
    this.router = customRouter || webSearchRouter;
  }

  /**
   * Executes Track A (Vault + Tenant Workspace) always, and Track B+C (Exa + SerpAPI) strictly when requested & entitled.
   */
  public async executeUnifiedSearch(
    tenantId: string,
    rawRequest: Partial<UnifiedSearchRequest> & { query: string },
    options: { skipQuotaCharge?: boolean } = {},
  ): Promise<UnifiedSearchResponse> {
    const startedAt = Date.now();
    const request = unifiedSearchRequestSchema.parse(rawRequest);
    const supabase = createAdminSupabaseClient();

    // 1. Track A: Workspace Command Center + Hybrid Vault Search
    const trackAPromise = Promise.all([
      this.queryCommandCenter(supabase, tenantId, request.query, request.limit),
      request.mode === "COMMAND_CENTER"
        ? Promise.resolve([] as VaultSearchClauseHit[])
        : this.queryStatutoryVaultHybrid(supabase, request.query, request.regulators, Math.min(request.limit, 8)),
    ]);

    // 2. Track B/C: Entitlement-Gated Dual-Engine Live Web Search
    let liveWebPromise: Promise<{
      status: UnifiedSearchResponse["live_web_status"];
      results: LiveSearchEvidenceItem[];
      summary?: string;
      blockedReason?: string | null;
    }>;

    if (request.mode !== "HYBRID_LIVE_WEB" || !request.enable_live_web) {
      liveWebPromise = Promise.resolve({
        status: "SKIPPED",
        results: [],
      });
    } else {
      liveWebPromise = (async () => {
        const auth = options.skipQuotaCharge
          ? await entitlementsService.checkTenantEntitlement(tenantId, "live_web_search")
          : await entitlementsService.authorizeAndConsumeLiveSearch(
              tenantId,
              request.jurisdictions,
              1,
            );

        if (!auth.allowed) {
          return {
            status: "ENTITLEMENT_BLOCKED",
            results: [],
            blockedReason: auth.reason || "Upgrade to Growth or Scale to enable Live Web Search.",
          };
        }

        const bundle = await this.router.searchAfricaLiveWeb(
          {
            query: request.query,
            jurisdictions: request.jurisdictions,
            searchIntent: request.search_intent,
            includeNews: request.include_news,
            dateFrom: request.date_from,
            limit: Math.min(request.limit, 10),
          },
          tenantId,
        );

        return {
          status: bundle.results.length > 0 ? "EXECUTED" : "NO_RESULTS",
          results: bundle.results,
          summary: bundle.webSummary || undefined,
        };
      })();
    }

    const [[workspaceHits, vaultClauses], liveOut, quota] = await Promise.all([
      trackAPromise,
      liveWebPromise,
      entitlementsService.getLiveSearchQuotaSnapshot(tenantId),
    ]);

    // Merge Vault clauses surfaced from Command Center if RRF returned fewer hits
    const mergedVaultClauses = [...vaultClauses];
    const seenVaultIds = new Set(mergedVaultClauses.map((v) => v.clause_id));
    for (const hit of workspaceHits) {
      if (hit.entity_type === "STATUTORY_CLAUSE" && !seenVaultIds.has(hit.entity_id)) {
        seenVaultIds.add(hit.entity_id);
        const [regulatorPart, ...restTitle] = hit.title.split(" — ");
        mergedVaultClauses.push({
          clause_id: hit.entity_id,
          regulator: regulatorPart || "REGULATOR",
          instrument_title: restTitle.join(" — ") || hit.title,
          clause_reference: hit.subtitle,
          verbatim_excerpt: hit.snippet,
          similarity_score: hit.score,
        });
      }
    }

    return {
      query: request.query,
      mode: request.mode,
      vault_clauses: mergedVaultClauses.slice(0, request.limit),
      workspace_hits: workspaceHits,
      live_web_status: liveOut.status,
      live_web_results: liveOut.results,
      ...(liveOut.summary ? { live_web_summary: liveOut.summary } : {}),
      ...(liveOut.blockedReason ? { upgrade_required_reason: liveOut.blockedReason } : {}),
      quota,
      latency_ms: Date.now() - startedAt,
    };
  }

  private async queryCommandCenter(
    supabase: ReturnType<typeof createAdminSupabaseClient>,
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<CommandCenterHit[]> {
    try {
      const { data, error } = await supabase.rpc("search_workspace_command_center", {
        p_tenant_id: tenantId,
        p_query: query,
        p_limit: limit,
      });

      if (!error && Array.isArray(data)) {
        return data.map((row) => ({
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          title: row.title,
          subtitle: row.subtitle || "",
          snippet: row.snippet || "",
          route_href: row.route_href || "/chat",
          score: Number(row.score || 0),
          updated_at: row.updated_at || new Date().toISOString(),
        }));
      }
    } catch (err) {
      logger.warn("search_workspace_command_center RPC failed gracefully", {
        error: (err as Error).message,
      });
    }
    return [];
  }

  private async queryStatutoryVaultHybrid(
    supabase: ReturnType<typeof createAdminSupabaseClient>,
    query: string,
    regulators: string[] | undefined,
    limit: number,
  ): Promise<VaultSearchClauseHit[]> {
    try {
      let queryEmbedding: number[] | null = null;
      const { geminiKeyPool } = await import("@/lib/ai/gemini-key-pool");
      if (geminiKeyPool.hasActiveRealKey()) {
        try {
          const embPromise = geminiService.generateEmbedding(query, { fastInteractive: true });
          queryEmbedding = await Promise.race([
            embPromise,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
          ]);
        } catch {
          queryEmbedding = null;
        }
      }

      if (queryEmbedding) {
        const { data, error } = await supabase.rpc("search_regulatory_clauses_rrf", {
          query_text: query,
          query_embedding: `[${queryEmbedding.join(",")}]`,
          match_count: limit,
          regulator_filter: regulators && regulators.length > 0 ? regulators : null,
          as_of_date: new Date().toISOString().slice(0, 10),
          include_superseded: false,
        });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map((row: Record<string, unknown>) => ({
            clause_id: String(row.clause_id || row.id),
            regulator: String(row.regulator_acronym || "CBN"),
            instrument_title: String(row.instrument_title || "Regulatory Instrument"),
            clause_reference: String(row.clause_reference || "Provision"),
            verbatim_excerpt: String(row.clause_text || "").slice(0, 420),
            similarity_score: Number(row.rrf_score || row.similarity || 0.75),
          }));
        }
      }

      // Production resilience fallback: lexical websearch FTS on verified statutory clauses
      const cleanToken = query
        .replace(/[^\w\s-]/g, " ")
        .trim()
        .split(/\s+/)
        .filter((w) => w.length >= 3)
        .slice(0, 6)
        .join(" | ");
      if (cleanToken) {
        const { data: ftsRows } = await supabase
          .from("regulatory_clauses")
          .select(
            "id, clause_reference, clause_text, regulatory_document_versions!inner(regulatory_instruments!inner(title, regulatory_bodies!inner(acronym)))",
          )
          .textSearch("clause_text", cleanToken, { config: "english" })
          .limit(limit);

        if (Array.isArray(ftsRows) && ftsRows.length > 0) {
          return ftsRows.map((row: Record<string, unknown>) => {
            const docVer = row.regulatory_document_versions as Record<string, unknown> | undefined;
            const inst = docVer?.regulatory_instruments as Record<string, unknown> | undefined;
            const body = inst?.regulatory_bodies as Record<string, unknown> | undefined;
            return {
              clause_id: String(row.id),
              regulator: String(body?.acronym || "CBN"),
              instrument_title: String(inst?.title || "Regulatory Instrument"),
              clause_reference: String(row.clause_reference || "Provision"),
              verbatim_excerpt: String(row.clause_text || "").slice(0, 420),
              similarity_score: 0.68,
            };
          });
        }
      }
    } catch (err) {
      logger.warn("Hybrid RRF Vault query fell back to Command Center FTS", {
        error: (err as Error).message,
      });
    }
    return [];
  }
}

export const unifiedSearchService = new UnifiedSearchService();
