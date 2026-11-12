/**
 * Cogent Marketing Shield - Gemini Service Unit Tests
 * Document Reference: Document 02 (Section 4), Document 05, Document 08 (Phase 5)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiService } from "@/modules/ai-orchestration/gemini.service";
import type { GoogleGenAI } from "@google/genai";

// Mock Supabase admin client
vi.mock("@/lib/supabase", () => {
  const insertMock = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: "00000000-0000-0000-0000-000000000001" },
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

describe("Central Gemini Service (GeminiService)", () => {
  let mockGenAi: any;

  beforeEach(() => {
    mockGenAi = {
      models: {
        generateContent: vi.fn(),
        embedContent: vi.fn(),
      },
    };
  });

  it("should initialize with default models and settings", () => {
    const service = new GeminiService(mockGenAi as unknown as GoogleGenAI);
    expect(service).toBeDefined();
  });

  it("should generate text and record telemetry in ai_model_runs", async () => {
    mockGenAi.models.generateContent.mockResolvedValueOnce({
      text: "The advertisement violates FCCPA Section 123.",
      usageMetadata: {
        promptTokenCount: 120,
        candidatesTokenCount: 45,
      },
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [],
          },
        },
      ],
    });

    const service = new GeminiService(mockGenAi as unknown as GoogleGenAI);
    const result = await service.generateText({
      prompt: "Assess compliance for loan advertisement",
      systemInstruction: "You are a Nigerian financial regulatory compliance analyst.",
      context: {
        tenantId: "11111111-1111-1111-1111-111111111111",
        taskType: "ASSESSMENT_REASONING",
      },
    });

    expect(result.text).toBe("The advertisement violates FCCPA Section 123.");
    expect(result.inputTokens).toBe(120);
    expect(result.outputTokens).toBe(45);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.modelRunId).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("should generate 768-dimensional embeddings and validate vector dimensions", async () => {
    const dummyVector = new Array(768).fill(0.0123);
    mockGenAi.models.embedContent.mockResolvedValueOnce({
      embeddings: [
        {
          values: dummyVector,
        },
      ],
    });

    const service = new GeminiService(mockGenAi as unknown as GoogleGenAI);
    const vector = await service.generateEmbedding(
      "Consumer Protection Framework Part 4 Section 4.2.1"
    );

    expect(vector).toHaveLength(768);
    expect(vector[0]).toBe(0.0123);
    expect(mockGenAi.models.embedContent).toHaveBeenCalledWith({
      model: "gemini-embedding-001",
      contents: "Consumer Protection Framework Part 4 Section 4.2.1",
      config: {
        outputDimensionality: 768,
      },
    });
  });

  it("should reject embeddings with mismatched dimensionality", async () => {
    const invalidVector = new Array(512).fill(0.1);
    mockGenAi.models.embedContent.mockResolvedValueOnce({
      embeddings: [{ values: invalidVector }],
    });

    const service = new GeminiService(mockGenAi as unknown as GoogleGenAI);
    await expect(
      service.generateEmbedding("Mismatched vector test")
    ).rejects.toThrow("Invalid embedding dimensionality: expected 768, received 512");
  });

  it("should retry on transient 429 rate limits and succeed", async () => {
    mockGenAi.models.generateContent
      .mockRejectedValueOnce(new Error("429 RESOURCE_EXHAUSTED: Rate limit reached"))
      .mockResolvedValueOnce({
        text: "Recovered successfully after backoff.",
        usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 20 },
      });

    const service = new GeminiService(mockGenAi as unknown as GoogleGenAI);
    const result = await service.generateText({
      prompt: "Retry test prompt",
    });

    expect(result.text).toBe("Recovered successfully after backoff.");
    expect(mockGenAi.models.generateContent).toHaveBeenCalledTimes(2);
  });
});
