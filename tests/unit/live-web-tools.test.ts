/**
 * Cogent Marketing Shield - Live Web & URL Tools Unit Tests
 * Document Reference: Document 04 (Tools 9 & 10), Document 08 (Phase 11)
 */

import { describe, it, expect, vi } from "vitest";
import {
  STATUTORY_TOOL_DECLARATIONS,
  statutoryToolExecutor,
} from "@/modules/ai-orchestration/tools/statutory-tools";
import { webSearchRouter } from "@/modules/live-web-intelligence/web-search.router";

vi.mock("@/modules/live-web-intelligence/web-search.router", () => ({
  webSearchRouter: {
    searchLiveWeb: vi.fn().mockResolvedValue({
      source_class: "LIVE_WEB_INTELLIGENCE",
      results: [
        {
          live_web_retrieval_id: "ret_001",
          page_title: "CBN Circular on Digital Lending Guidelines 2026",
          retrieved_url: "https://www.cbn.gov.ng/circulars/2026/lending.pdf",
          snippet_content: "All digital lenders must disclose full APR prior to loan disbursement...",
          retrieved_at: new Date().toISOString(),
          source_class: "LIVE_WEB_INTELLIGENCE",
        },
      ],
    }),
    fetchLiveUrlContent: vi.fn().mockResolvedValue({
      success: true,
      url: "https://bank.com.ng/promos/quickcash",
      page_title: "QuickCash Salary Advance",
      content_text: "Get quick salary advances at 5% monthly interest. Terms apply.",
      text_length: 62,
      retrieved_at: new Date().toISOString(),
      source_class: "UNTRUSTED_USER_MATERIAL",
      sha256_hash: "mock_sha256_hash",
      asset_id: "camp_123",
    }),
  },
}));

describe("Gemini Copilot Tools 9 & 10: Live Web Intelligence & URL Fetcher", () => {
  const tenantId = "tenant_tool_test_001";

  it("declares Tool 9 (search_live_web) and Tool 10 (fetch_live_url_content) in registry", () => {
    const tool9 = STATUTORY_TOOL_DECLARATIONS.find((t) => t.name === "search_live_web");
    const tool10 = STATUTORY_TOOL_DECLARATIONS.find((t) => t.name === "fetch_live_url_content");

    expect(tool9).toBeDefined();
    expect((tool9?.parameters as { required?: string[] })?.required).toContain("query");

    expect(tool10).toBeDefined();
    expect((tool10?.parameters as { required?: string[] })?.required).toContain("url");
  });

  it("Tool 9: search_live_web executes Two-Step router and returns LIVE_WEB_INTELLIGENCE source class", async () => {
    const result = await statutoryToolExecutor.searchLiveWeb(
      { query: "CBN digital lending fee caps", prioritize_official_regulators: true },
      { tenantId }
    );

    expect(result.source_class).toBe("LIVE_WEB_INTELLIGENCE");
    expect(result.results).toHaveLength(1);
    expect(webSearchRouter.searchLiveWeb).toHaveBeenCalledWith(
      expect.objectContaining({ query: "CBN digital lending fee caps" }),
      tenantId
    );
  });

  it("Tool 10: fetch_live_url_content executes SSRF-safe URL fetcher and returns sanitized snapshot", async () => {
    const result = await statutoryToolExecutor.fetchLiveUrlContent(
      { url: "https://bank.com.ng/promos/quickcash", campaign_id: "camp_123" },
      { tenantId }
    );

    expect(result.success).toBe(true);
    expect(webSearchRouter.fetchLiveUrlContent).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://bank.com.ng/promos/quickcash" }),
      tenantId
    );
  });
});
