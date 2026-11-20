/**
 * Cogent Regulatory Intelligence Platform
 * Security & Entitlement Gate Verification Suite (SEC-GATE-01 through SEC-GATE-06)
 * Tests Next.js API Route Handlers end-to-end with strict server-side billing & tenant boundaries.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { entitlementsService } from "@/modules/billing/entitlements.service";
import { webSearchRouter } from "@/modules/live-web-intelligence/web-search.router";
import { workProductService } from "@/modules/work-products/work-product.service";
import { POST as searchPost } from "@/app/api/marketing-shield/v1/search/route";
import { GET as quotaGet } from "@/app/api/marketing-shield/v1/search/quota/route";
import {
  GET as workProductGet,
  PATCH as workProductPatch,
} from "@/app/api/marketing-shield/v1/work-products/[id]/route";
import { POST as workProductExportPost } from "@/app/api/marketing-shield/v1/work-products/[id]/export/route";
import { POST as promoteLiveWebPost } from "@/app/api/marketing-shield/v1/live-web/promote/route";
import { createAdminSupabaseClient } from "@/lib/supabase";

vi.mock("@/modules/auth-tenancy/tenant.resolver", () => ({
  resolveTenantContext: vi.fn(),
}));

vi.mock("@/modules/billing/entitlements.service", () => ({
  entitlementsService: {
    authorizeAndConsumeLiveSearch: vi.fn(),
    checkTenantEntitlement: vi.fn(),
    getLiveSearchQuotaSnapshot: vi.fn(),
    getTenantSubscriptionInfo: vi.fn(),
  },
}));

vi.mock("@/modules/live-web-intelligence/web-search.router", () => ({
  webSearchRouter: {
    searchAfricaLiveWeb: vi.fn(),
    searchWithStandardWebFallback: vi.fn(),
    isDualEngineActive: vi.fn().mockReturnValue(true),
  },
}));

vi.mock("@/modules/gemini/gemini.service", () => ({}));
vi.mock("@/modules/ai-orchestration/gemini.service", () => ({
  geminiService: {
    generateEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.01)),
  },
}));

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: vi.fn(),
}));

vi.mock("@/modules/work-products/work-product.service", () => ({
  workProductService: {
    listWorkProducts: vi.fn(),
    upsertWorkProduct: vi.fn(),
    getWorkProductWithRevisions: vi.fn(),
    updateWorkProductInline: vi.fn(),
  },
}));

const TENANT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TENANT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const WORK_PRODUCT_B_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function buildTenantCtx(tenantId: string) {
  return {
    tenantId,
    userId: "11111111-1111-4111-8111-111111111111",
    clerkOrgId: `org_${tenantId.slice(0, 6)}`,
    clerkUserId: "user_security_test",
    orgSlug: "sec-test-bank",
    orgName: "Security Test MFB Ltd",
    role: "CHIEF_COMPLIANCE_OFFICER" as const,
    permissions: new Set([
      "conversation.read",
      "conversation.create",
      "dossier.download",
      "knowledge.write",
    ] as const),
    status: "ACTIVE" as const,
  };
}

describe("Live Web Search Entitlement & Cross-Tenant Security Gates (SEC-GATE-01..06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "vitest-gemini-key";
    vi.mocked(resolveTenantContext).mockResolvedValue(buildTenantCtx(TENANT_A) as never);
    vi.mocked(createAdminSupabaseClient).mockReturnValue({
      rpc: vi.fn().mockImplementation(async (fnName: string) => {
        if (fnName === "search_regulatory_clauses_rrf") {
          return {
            data: [
              {
                clause_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                regulator_acronym: "CBN",
                instrument_title: "CBN Consumer Protection Framework 2019",
                clause_reference: "Section 4.2.1",
                clause_text: "Institutions must disclose full terms and APR.",
                rrf_score: 0.92,
              },
            ],
            error: null,
          };
        }
        if (fnName === "search_workspace_command_center") {
          return {
            data: [],
            error: null,
          };
        }
        return { data: [], error: null };
      }),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { name: "Security Test MFB Ltd" } }),
              }),
            }),
          };
        }
        if (table === "live_web_retrievals") {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({ data: null, error: null }),
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }),
    } as never);
  });

  it("SEC-GATE-01 & 02: Evaluation tenant spoofing headers is blocked from live web search and falls back to Statutory Vault", async () => {
    vi.mocked(entitlementsService.authorizeAndConsumeLiveSearch).mockResolvedValue({
      allowed: false,
      planSlug: "evaluation",
      feature: "live_web_search",
      reason: "Upgrade to Growth for live Nigerian & Pan-African regulatory search.",
    });
    vi.mocked(entitlementsService.getLiveSearchQuotaSnapshot).mockResolvedValue({
      plan_slug: "evaluation",
      live_web_allowed: false,
      cross_border_allowed: false,
      allowed_jurisdictions: ["NG"],
      used_this_month: 0,
      monthly_limit: 0,
      remaining: 0,
      trial_locked_reason: "Upgrade required",
    });

    const req = new NextRequest("http://localhost:3000/api/marketing-shield/v1/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-plan-override": "scale",
        "x-tenant-plan": "enterprise",
      },
      body: JSON.stringify({
        query: "CBN stablecoin settlement guidelines",
        mode: "HYBRID_LIVE_WEB",
        enable_live_web: true,
        jurisdictions: ["NG"],
      }),
    });

    const res = await searchPost(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.live_web_status).toBe("ENTITLEMENT_BLOCKED");
    expect(json.data.live_web_results).toEqual([]);
    expect(json.data.vault_clauses.length).toBeGreaterThanOrEqual(1);
    expect(webSearchRouter.searchAfricaLiveWeb).not.toHaveBeenCalled();
  });

  it("SEC-GATE-07: Evaluation trial after exhausting 3 paid searches falls back to standard Gemini web search without calling paid Exa/SerpAPI", async () => {
    vi.mocked(entitlementsService.authorizeAndConsumeLiveSearch).mockResolvedValueOnce({
      allowed: false,
      fallbackToGeminiSearch: true,
      planSlug: "evaluation",
      feature: "live_web_search",
      limit: 3,
      remaining: 0,
      reason: "You've used all 3 deep live web searches included in your trial.",
    });
    vi.mocked(entitlementsService.getLiveSearchQuotaSnapshot).mockResolvedValueOnce({
      plan_slug: "evaluation",
      live_web_allowed: false,
      cross_border_allowed: false,
      allowed_jurisdictions: ["NG"],
      used_this_month: 3,
      monthly_limit: 3,
      remaining: 0,
      trial_locked_reason: "You've used all 3 deep live web searches included in your trial.",
      standard_fallback_available: true,
    });
    vi.mocked(webSearchRouter.searchWithStandardWebFallback).mockResolvedValueOnce({
      results: [
        {
          live_web_retrieval_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          provider: "GEMINI_GOOGLE_SEARCH",
          jurisdiction_code: "NG",
          trust_tier: "OFFICIAL_REGULATOR_WEB",
          trust_badge_label: "Official Regulator Source",
          page_title: "CBN Data Localisation Circular",
          retrieved_url: "https://www.cbn.gov.ng/Out/2026/data-localisation.pdf",
          domain: "cbn.gov.ng",
          is_pdf: true,
          snippet_content: "Standard Gemini grounded summary.",
          highlights: [],
          relevance_score: 0.9,
          retrieved_at: new Date().toISOString(),
          cache_hit: false,
        },
      ],
      webSummary: "Standard grounded summary.",
      providersUsed: ["GEMINI_GOOGLE_SEARCH"],
      cacheHit: false,
      latencyMs: 280,
      estimatedCostUsd: 0,
      serpApiCalls: 0,
      exaCalls: 0,
    });

    const req = new NextRequest("http://localhost:3000/api/marketing-shield/v1/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "CBN data localisation circular 2026",
        mode: "HYBRID_LIVE_WEB",
        enable_live_web: true,
        jurisdictions: ["NG"],
      }),
    });

    const res = await searchPost(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.live_web_status).toBe("EXECUTED");
    expect(json.data.live_web_results).toHaveLength(1);
    expect(json.data.live_web_results[0].provider).toBe("GEMINI_GOOGLE_SEARCH");
    expect(webSearchRouter.searchAfricaLiveWeb).not.toHaveBeenCalled();
    expect(webSearchRouter.searchWithStandardWebFallback).toHaveBeenCalledTimes(1);
  });

  it("SEC-GATE-03: Growth plan allows NG search cleanly but blocks cross-border KE/GH expansion", async () => {
    vi.mocked(entitlementsService.getLiveSearchQuotaSnapshot).mockResolvedValue({
      plan_slug: "growth",
      live_web_allowed: true,
      cross_border_allowed: false,
      allowed_jurisdictions: ["NG"],
      used_this_month: 1,
      monthly_limit: 100,
      remaining: 99,
      trial_locked_reason: null,
    });

    // NG allowed
    vi.mocked(entitlementsService.authorizeAndConsumeLiveSearch).mockResolvedValueOnce({
      allowed: true,
      feature: "live_web_search",
      planSlug: "growth",
      limit: 100,
      remaining: 99,
    });
    vi.mocked(webSearchRouter.searchAfricaLiveWeb).mockResolvedValueOnce({
      results: [
        {
          live_web_retrieval_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          provider: "SERPAPI_GOOGLE",
          jurisdiction_code: "NG",
          trust_tier: "OFFICIAL_REGULATOR_WEB",
          trust_badge_label: "Official Regulator Source",
          page_title: "CBN Circular on Agent Banking",
          retrieved_url: "https://www.cbn.gov.ng/Out/2026/agent-banking.pdf",
          domain: "cbn.gov.ng",
          is_pdf: true,
          snippet_content: "Updated agent banking rules",
          highlights: [],
          relevance_score: 0.95,
          retrieved_at: new Date().toISOString(),
          cache_hit: false,
        },
      ],
      webSummary: "CBN published updated agent banking guidelines.",
      providersUsed: ["SERPAPI_GOOGLE"],
      cacheHit: false,
      latencyMs: 320,
      estimatedCostUsd: 0.01,
      serpApiCalls: 1,
      exaCalls: 0,
    });

    const ngReq = new NextRequest("http://localhost:3000/api/marketing-shield/v1/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "CBN agent banking rules",
        enable_live_web: true,
        jurisdictions: ["NG"],
      }),
    });
    const ngRes = await searchPost(ngReq);
    const ngJson = await ngRes.json();
    expect(ngJson.data.live_web_status).toBe("EXECUTED");
    expect(ngJson.data.live_web_results).toHaveLength(1);

    // Cross-border KE blocked on Growth
    vi.mocked(entitlementsService.authorizeAndConsumeLiveSearch).mockResolvedValueOnce({
      allowed: false,
      feature: "cross_border_research",
      planSlug: "growth",
      reason: "Upgrade to Scale for Pan-African cross-border regulatory search.",
    });

    const keReq = new NextRequest("http://localhost:3000/api/marketing-shield/v1/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "Kenya CBK PSP licensing requirements",
        enable_live_web: true,
        jurisdictions: ["NG", "KE"],
      }),
    });
    const keRes = await searchPost(keReq);
    const keJson = await keRes.json();
    expect(keJson.data.live_web_status).toBe("ENTITLEMENT_BLOCKED");
    expect(keJson.data.upgrade_required_reason).toContain("Scale");
  });

  it("SEC-GATE-04: Scale tier unlocks multi-country NG + KE + GH search and returns quota snapshot", async () => {
    vi.mocked(entitlementsService.authorizeAndConsumeLiveSearch).mockResolvedValueOnce({
      allowed: true,
      feature: "live_web_search",
      planSlug: "scale",
      limit: 500,
      remaining: 488,
    });
    vi.mocked(entitlementsService.getLiveSearchQuotaSnapshot).mockResolvedValue({
      plan_slug: "scale",
      live_web_allowed: true,
      cross_border_allowed: true,
      allowed_jurisdictions: ["NG", "GH", "KE", "ZA", "RW", "EG", "AFRICA_REGIONAL"],
      used_this_month: 12,
      monthly_limit: 500,
      remaining: 488,
      trial_locked_reason: null,
    });
    vi.mocked(webSearchRouter.searchAfricaLiveWeb).mockResolvedValueOnce({
      results: [],
      webSummary: "",
      providersUsed: ["EXA_AI"],
      cacheHit: false,
      latencyMs: 250,
      estimatedCostUsd: 0.01,
      serpApiCalls: 0,
      exaCalls: 1,
    });

    const scaleReq = new NextRequest("http://localhost:3000/api/marketing-shield/v1/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "Payment service provider capital rules",
        enable_live_web: true,
        jurisdictions: ["NG", "KE", "GH"],
      }),
    });
    await searchPost(scaleReq);
    expect(webSearchRouter.searchAfricaLiveWeb).toHaveBeenCalledWith(
      expect.objectContaining({ jurisdictions: ["NG", "KE", "GH"] }),
      TENANT_A
    );

    const quotaRes = await quotaGet(
      new NextRequest("http://localhost:3000/api/marketing-shield/v1/search/quota")
    );
    const quotaJson = await quotaRes.json();
    expect(quotaJson.data.quota.cross_border_allowed).toBe(true);
    expect(quotaJson.data.quota.remaining).toBe(488);
  });

  it("SEC-GATE-05: Quota exhaustion (100/100) denies live search and Evaluation plan returns 403 on DOCX export", async () => {
    vi.mocked(entitlementsService.authorizeAndConsumeLiveSearch).mockResolvedValueOnce({
      allowed: false,
      feature: "live_web_search",
      planSlug: "growth",
      limit: 100,
      remaining: 0,
      reason: "Monthly live regulatory search quota (100) exhausted.",
    });
    vi.mocked(entitlementsService.getLiveSearchQuotaSnapshot).mockResolvedValue({
      plan_slug: "growth",
      live_web_allowed: true,
      cross_border_allowed: false,
      allowed_jurisdictions: ["NG"],
      used_this_month: 100,
      monthly_limit: 100,
      remaining: 0,
      trial_locked_reason: null,
    });

    const req = new NextRequest("http://localhost:3000/api/marketing-shield/v1/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "NDPC cross border adequacy rules",
        enable_live_web: true,
      }),
    });
    const res = await searchPost(req);
    const json = await res.json();
    expect(json.data.live_web_status).toBe("ENTITLEMENT_BLOCKED");
    expect(json.data.quota.remaining).toBe(0);
    expect(webSearchRouter.searchAfricaLiveWeb).not.toHaveBeenCalled();

    // Evaluation DOCX export blocked with HTTP 403
    vi.mocked(workProductService.getWorkProductWithRevisions).mockResolvedValueOnce({
      work_product: {
        id: WORK_PRODUCT_B_ID,
        tenant_id: TENANT_A,
        conversation_id: null,
        message_id: null,
        workflow_type: "PRODUCT_STRUCTURING_MEMO",
        artifact_type: "statutory_structuring_memo",
        title: "Test Memo",
        jurisdiction_scope: ["NG"],
        markdown_content: "# Memo\n\nContent here",
        structured_payload: {},
        citations: [],
        evidence_gaps: [],
        guardrail_report: {},
        version_number: 1,
        status: "DRAFT",
        source_hash_sha256: "a".repeat(64),
        created_by: "user_1",
        updated_by: "user_1",
        last_exported_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      revisions: [],
    });
    vi.mocked(entitlementsService.getTenantSubscriptionInfo).mockResolvedValueOnce({
      plan: { features: { work_product_docx_export: false } },
    } as never);
    vi.mocked(entitlementsService.checkTenantEntitlement).mockResolvedValueOnce({
      allowed: false,
      feature: "export_unwatermarked",
      planSlug: "evaluation",
    });

    const exportReq = new NextRequest(
      `http://localhost:3000/api/marketing-shield/v1/work-products/${WORK_PRODUCT_B_ID}/export`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format: "docx" }),
      }
    );
    const exportRes = await workProductExportPost(exportReq, {
      params: Promise.resolve({ id: WORK_PRODUCT_B_ID }),
    });
    expect(exportRes.status).toBe(403);
  });

  it("SEC-GATE-06: Cross-tenant Work Product GET/PATCH and Live Web Promote return HTTP 404 for another tenant's UUID", async () => {
    // Tenant A requesting Tenant B's Work Product -> service returns null / not found
    vi.mocked(workProductService.getWorkProductWithRevisions).mockResolvedValueOnce(null);
    const getRes = await workProductGet(
      new NextRequest(`http://localhost:3000/api/marketing-shield/v1/work-products/${WORK_PRODUCT_B_ID}`),
      { params: Promise.resolve({ id: WORK_PRODUCT_B_ID }) }
    );
    expect(getRes.status).toBe(404);
    expect(workProductService.getWorkProductWithRevisions).toHaveBeenCalledWith(
      TENANT_A,
      WORK_PRODUCT_B_ID
    );

    vi.mocked(workProductService.updateWorkProductInline).mockRejectedValueOnce(
      new Error(`Work product ${WORK_PRODUCT_B_ID} not found`)
    );
    const patchRes = await workProductPatch(
      new NextRequest(
        `http://localhost:3000/api/marketing-shield/v1/work-products/${WORK_PRODUCT_B_ID}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ markdown_content: "Hijacked content attempt" }),
        }
      ),
      { params: Promise.resolve({ id: WORK_PRODUCT_B_ID }) }
    );
    expect(patchRes.status).toBe(404);

    // Promote belonging to Tenant B -> supabase returns null for TENANT_A -> 404
    vi.mocked(createAdminSupabaseClient).mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: (_col: string, val: string) => ({
            eq: () => ({
              maybeSingle: async () =>
                val === TENANT_B ? { data: { id: "ret_1" } } : { data: null, error: null },
            }),
          }),
        }),
      }),
    } as never);

    const promoteRes = await promoteLiveWebPost(
      new NextRequest("http://localhost:3000/api/marketing-shield/v1/live-web/promote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          live_web_retrieval_id: WORK_PRODUCT_B_ID,
          regulator_acronym: "CBN",
          instrument_title: "Cross-Tenant Retrieval Hijack Attempt",
        }),
      })
    );
    expect(promoteRes.status).toBe(404);
  });
});
