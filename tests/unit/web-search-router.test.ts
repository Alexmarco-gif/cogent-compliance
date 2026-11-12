/**
 * Cogent Marketing Shield - Two-Step Live Web Search Router Unit Tests
 * Document Reference: Document 04 (Tool 9), Document 05 (Section 2.1), Document 08 (Phase 5)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebSearchRouter } from "@/modules/live-web-intelligence/web-search.router";
import type { GoogleGenAI } from "@google/genai";

// Mock Supabase admin client
vi.mock("@/lib/supabase", () => {
  const insertMock = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: {
          id: "33333333-3333-3333-3333-333333333333",
          retrieved_at: "2026-11-12T04:00:00.000Z",
        },
        error: null,
      }),
    }),
  });
  return {
    createAdminSupabaseClient: vi.fn(() => ({
      from: vi.fn().mockReturnValue({
        insert: insertMock,
      }),
    })),
  };
});

describe("Two-Step Live Web Search Router (WebSearchRouter)", () => {
  let mockGenAi: any;

  beforeEach(() => {
    mockGenAi = {
      models: {
        generateContent: vi.fn(),
      },
    };
  });

  it("should refine query with official Nigerian regulator domains when prioritize_official_regulators is true", async () => {
    mockGenAi.models.generateContent.mockResolvedValueOnce({
      text: "The FCCPC released new guidelines on digital lending advertisements.",
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [
              {
                web: {
                  uri: "https://fccpc.gov.ng/regulations/digital-lending-notice-2026",
                  title: "FCCPC Digital Lending Regulatory Update",
                },
              },
            ],
            webSearchQueries: ["fccpc digital lending guidelines 2026"],
          },
        },
      ],
    });

    const router = new WebSearchRouter({
      customClient: mockGenAi as unknown as GoogleGenAI,
    });

    const result = await router.searchLiveWeb(
      {
        query: "digital lending fee disclosure guidelines",
        prioritize_official_regulators: true,
      },
      "11111111-1111-1111-1111-111111111111"
    );

    expect(result.source_class).toBe("LIVE_WEB_INTELLIGENCE");
    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.retrieved_url).toBe(
      "https://fccpc.gov.ng/regulations/digital-lending-notice-2026"
    );
    expect(result.results[0]!.page_title).toBe("FCCPC Digital Lending Regulatory Update");
    expect(result.results[0]!.source_class).toBe("LIVE_WEB_INTELLIGENCE");

    // Verify secondary call was made with googleSearch tool
    expect(mockGenAi.models.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3.5-flash",
        config: {
          tools: [{ googleSearch: {} }],
        },
      })
    );
  });

  it("should gracefully fall back to official portal citation when API encounters an error", async () => {
    mockGenAi.models.generateContent.mockRejectedValueOnce(
      new Error("Search API timeout")
    );

    const router = new WebSearchRouter({
      customClient: mockGenAi as unknown as GoogleGenAI,
    });

    const result = await router.searchLiveWeb(
      {
        query: "CBN cyber security framework 2026",
        prioritize_official_regulators: true,
      },
      "11111111-1111-1111-1111-111111111111"
    );

    expect(result.source_class).toBe("LIVE_WEB_INTELLIGENCE");
    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.retrieved_url).toBe("https://cbn.gov.ng/documents/circulars.html");
    expect(result.results[0]!.page_title).toContain("Central Bank of Nigeria");
  });
});
