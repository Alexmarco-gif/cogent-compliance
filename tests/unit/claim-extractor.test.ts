/**
 * Cogent Marketing Shield - 11-Category Claim Extractor Unit Tests
 * Document Reference: Document 05 (Section 8), Document 08 (Phase 7)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClaimExtractorEngine } from "@/modules/compliance-assessment/claim-extractor";
import { geminiService } from "@/modules/ai-orchestration/gemini.service";

// Mock Supabase to prevent actual DB writes during unit tests
vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => ({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

// Mock Gemini Service
vi.mock("@/modules/ai-orchestration/gemini.service", () => ({
  geminiService: {
    generateText: vi.fn(),
  },
}));

describe("ClaimExtractorEngine (Phase 7)", () => {
  let engine: ClaimExtractorEngine;
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const campaignId = "22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new ClaimExtractorEngine();
  });

  describe("AI-Driven Structured Claim Extraction", () => {
    it("should extract structured claims across categories when Gemini returns valid JSON", async () => {
      const mockGeminiClaims = [
        {
          claim_text: "Borrow at 12% APR with no credit checks",
          normalized_claim: "12% APR interest rate",
          claim_category: "INTEREST_RATE_OR_APR",
          confidence: 0.98,
        },
        {
          claim_text: "Instant loan disbursement in 5 minutes",
          normalized_claim: "5-minute disbursement",
          claim_category: "SPEED_OR_INSTANT_DISBURSEMENT",
          confidence: 0.94,
        },
        {
          claim_text: "Fully licensed by the Central Bank of Nigeria",
          normalized_claim: "CBN licensed entity",
          claim_category: "REGULATORY_ENDORSEMENT_OR_LICENSE_CLAIM",
          confidence: 0.99,
        },
      ];

      vi.mocked(geminiService.generateText).mockResolvedValueOnce({
        text: JSON.stringify(mockGeminiClaims),
        model: "gemini-2.5-pro",
        inputTokens: 250,
        outputTokens: 120,
        latencyMs: 150,
      });

      const claims = await engine.extractClaims({
        tenantId,
        campaignId,
        contentText: "Borrow at 12% APR with no credit checks! Instant loan disbursement in 5 minutes. Fully licensed by the Central Bank of Nigeria.",
      });

      expect(claims).toHaveLength(3);
      expect(claims[0]?.claim_category).toBe("INTEREST_RATE_OR_APR");
      expect(claims[0]?.claim_text).toBe("Borrow at 12% APR with no credit checks");
      expect(claims[1]?.claim_category).toBe("SPEED_OR_INSTANT_DISBURSEMENT");
      expect(claims[2]?.claim_category).toBe("REGULATORY_ENDORSEMENT_OR_LICENSE_CLAIM");
    });

    it("should filter out invalid or fabricated claim categories not in the 11 statutory categories", async () => {
      const invalidClaims = [
        {
          claim_text: "Great vibe",
          claim_category: "INVALID_RANDOM_CATEGORY",
          confidence: 0.5,
        },
        {
          claim_text: "Guaranteed profits on all investments",
          normalized_claim: "Guaranteed profit claim",
          claim_category: "GUARANTEED_APPROVAL_OR_RETURN",
          confidence: 0.96,
        },
      ];

      vi.mocked(geminiService.generateText).mockResolvedValueOnce({
        text: JSON.stringify(invalidClaims),
        model: "gemini-2.5-pro",
        inputTokens: 100,
        outputTokens: 50,
        latencyMs: 80,
      });

      const claims = await engine.extractClaims({
        tenantId,
        campaignId,
        contentText: "Guaranteed profits on all investments",
      });

      expect(claims).toHaveLength(1);
      expect(claims[0]?.claim_category).toBe("GUARANTEED_APPROVAL_OR_RETURN");
    });
  });

  describe("Deterministic Regex Fallback", () => {
    it("should fallback cleanly to deterministic regex rules when Gemini service fails", async () => {
      vi.mocked(geminiService.generateText).mockRejectedValueOnce(
        new Error("Gemini API rate limit exceeded")
      );

      const copy = "Get your loan at 18% APR with zero fees today! Instant approval in 5 minutes. Licensed by CBN. Terms and conditions apply.";

      const claims = await engine.extractClaims({
        tenantId,
        campaignId,
        contentText: copy,
        sourceType: "DIRECT_TEXT",
      });

      expect(claims.length).toBeGreaterThanOrEqual(4);

      const categories = claims.map((c) => c.claim_category);
      expect(categories).toContain("INTEREST_RATE_OR_APR");
      expect(categories).toContain("FEE_OR_CHARGE_REPRESENTATION");
      expect(categories).toContain("SPEED_OR_INSTANT_DISBURSEMENT");
      expect(categories).toContain("REGULATORY_ENDORSEMENT_OR_LICENSE_CLAIM");
      expect(categories).toContain("MANDATORY_DISCLOSURE_OR_DISCLAIMER");
    });

    it("should detect 100% approval and guaranteed claims in deterministic fallback", async () => {
      vi.mocked(geminiService.generateText).mockRejectedValueOnce(new Error("Network timeout"));

      const claims = await engine.extractClaims({
        tenantId,
        campaignId,
        contentText: "We offer 100% approval and guaranteed returns for everyone!",
      });

      expect(claims.length).toBeGreaterThanOrEqual(1);
      expect(claims.some((c) => c.claim_category === "GUARANTEED_APPROVAL_OR_RETURN")).toBe(true);
    });
  });
});
