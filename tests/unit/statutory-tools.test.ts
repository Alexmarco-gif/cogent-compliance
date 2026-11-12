/**
 * Cogent Marketing Shield - Statutory Gemini Tools Unit Tests
 * Document Reference: Document 04 (Section 7), Document 08 (Phase 6)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatutoryToolExecutor } from "@/modules/ai-orchestration/tools/statutory-tools";

// Mock Supabase
const mockSupabase = {
  rpc: vi.fn(),
  from: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => mockSupabase,
}));

// Mock Gemini Service embedding
vi.mock("@/modules/ai-orchestration/gemini.service", () => ({
  geminiService: {
    generateEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.01)),
  },
}));

describe("StatutoryToolExecutor (Unit)", () => {
  let executor: StatutoryToolExecutor;
  const ctx = {
    tenantId: "00000000-0000-0000-0000-000000000001",
    userId: "user_test",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    executor = new StatutoryToolExecutor();
  });

  it("should execute searchRegulatoryEvidence and format results with sovereign statutory badges", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [
        {
          clause_id: "c_1",
          clause_reference: "Section 18(1)",
          clause_text: "Verbatim statutory rule on disclosures",
          instrument_title: "FCCPA 2018",
          regulator_acronym: "FCCPC",
          rrf_score: 0.016,
        },
      ],
      error: null,
    });

    const result = await executor.searchRegulatoryEvidence(
      { query: "mandatory fee disclosure" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);

    const first = (result.results as Array<Record<string, unknown>>)[0]!;
    expect(first.regulatory_clause_id).toBe("c_1");
    expect(first.source_class).toBe("VERIFIED_OFFICIAL_SOURCE");
    expect(first.badge_label).toBe("Verified Statutory Vault");
    expect(first.regulator).toBe("FCCPC");
  });

  it("should execute getRegulatoryProvision and return verbatim text with SHA-256 hash", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: "clause_abc",
              clause_reference: "Regulation 61",
              clause_text: "Full verbatim penalty text",
              page_number: 14,
              verification_status: "VERIFIED",
              regulatory_document_versions: {
                document_hash: "a".repeat(64),
                source_url: "https://fccpc.gov.ng/regulations/sales-promo-2026",
                effective_date: "2026-01-15",
                lifecycle_status: "CURRENT",
                regulatory_instruments: {
                  title: "FCCPC Sales Promotion Regulations, 2026",
                  regulatory_bodies: {
                    acronym: "FCCPC",
                    name: "Federal Competition and Consumer Protection Commission",
                  },
                },
              },
            },
            error: null,
          }),
        }),
      }),
    });

    const result = await executor.getRegulatoryProvision(
      { regulatory_clause_id: "clause_abc" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.verbatim_text).toBe("Full verbatim penalty text");
    expect(result.file_sha256).toBe("a".repeat(64));
    expect(result.source_class).toBe("VERIFIED_OFFICIAL_SOURCE");
  });

  it("should execute verifyRegulatoryEvidence and return binding status", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: "c_1",
              clause_reference: "Sec 1",
              regulatory_document_versions: {
                lifecycle_status: "CURRENT",
                effective_date: "2020-01-01",
              },
            },
          ],
          error: null,
        }),
      }),
    });

    const result = await executor.verifyRegulatoryEvidence(
      { regulatory_clause_ids: ["c_1"] },
      ctx
    );

    expect(result.success).toBe(true);
    const verifications = result.verifications as Array<Record<string, unknown>>;
    expect(verifications).toHaveLength(1);
    expect(verifications[0]!.status).toBe("CURRENT");
    expect(verifications[0]!.is_binding).toBe(true);
  });
});
