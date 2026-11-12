/**
 * Cogent Marketing Shield - Copilot Streaming Orchestrator Unit Tests
 * Document Reference: Document 04 (Section 3.5), DOC-10-ACPC, Document 08 (Phase 6)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CopilotOrchestrator } from "@/modules/conversations/copilot.orchestrator";
import { GoogleGenAI } from "@google/genai";

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => mockSupabase,
}));

// Mock ConversationService
vi.mock("@/modules/conversations/conversation.service", () => ({
  conversationService: {
    createMessage: vi.fn().mockImplementation((params) =>
      Promise.resolve({
        id: params.role === "USER" ? "user_msg_101" : "asst_msg_102",
        tenant_id: params.tenantId,
        conversation_id: params.conversationId,
        role: params.role,
        content: params.content,
        sequence_number: params.role === "USER" ? 1 : 2,
        status: params.status || "COMPLETED",
        created_at: new Date().toISOString(),
      })
    ),
    listMessages: vi.fn().mockResolvedValue({ messages: [] }),
    updateMessage: vi.fn().mockResolvedValue({ id: "asst_msg_102", status: "COMPLETED" }),
  },
}));

// Mock Statutory Tools
vi.mock("@/modules/ai-orchestration/tools/statutory-tools", () => ({
  STATUTORY_TOOL_DECLARATIONS: [],
  statutoryToolExecutor: {
    searchRegulatoryEvidence: vi.fn().mockResolvedValue({
      success: true,
      count: 1,
      results: [
        {
          regulatory_clause_id: "c_999",
          clause_reference: "Section 18",
          instrument_title: "FCCPA 2018",
          regulator: "FCCPC",
        },
      ],
    }),
  },
}));

describe("CopilotOrchestrator (Unit)", () => {
  let mockGenAi: {
    models: {
      generateContent: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenAi = {
      models: {
        generateContent: vi.fn(),
      },
    };
  });

  it("should stream assistant response and emit SSE events in strict sequence", async () => {
    // 1st round: Gemini calls search_regulatory_evidence
    mockGenAi.models.generateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: "search_regulatory_evidence",
                  args: { query: "APR fee disclosure" },
                },
              },
            ],
          },
        },
      ],
    });

    // 2nd round: Gemini outputs text delta with statutory explanation
    mockGenAi.models.generateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [
              {
                text: "Under Section 18 of the FCCPA 2018, all credit providers must disclose APR.",
              },
            ],
          },
        },
      ],
    });

    const orchestrator = new CopilotOrchestrator(mockGenAi as unknown as GoogleGenAI);

    const events = [];
    for await (const event of orchestrator.streamChat({
      tenantId: "00000000-0000-0000-0000-000000000001",
      userId: "user_officer",
      conversationId: "conv_test_1",
      userPrompt: "What are the rules for APR disclosure in Nigeria?",
    })) {
      events.push(event);
    }

    // Verify SSE sequence: message.started -> tool.started -> tool.completed -> assistant.delta -> message.completed
    const eventTypes = events.map((e) => e.type);
    expect(eventTypes).toContain("message.started");
    expect(eventTypes).toContain("tool.started");
    expect(eventTypes).toContain("tool.completed");
    expect(eventTypes).toContain("assistant.delta");
    expect(eventTypes).toContain("message.completed");

    // Check message.started IDs
    const started = events.find((e) => e.type === "message.started");
    expect(started?.data).toHaveProperty("user_message_id", "user_msg_101");
    expect(started?.data).toHaveProperty("assistant_message_id", "asst_msg_102");

    // Check tool activity
    const toolStarted = events.find((e) => e.type === "tool.started");
    expect(toolStarted?.data).toHaveProperty("tool_name", "search_regulatory_evidence");

    // Check text delta
    const delta = events.find((e) => e.type === "assistant.delta");
    expect(delta?.data.text_delta).toContain("Section 18 of the FCCPA 2018");

    // Check citations
    const completed = events.find((e) => e.type === "message.completed") as any;
    expect(completed?.data.citations).toHaveLength(1);
    expect(completed?.data.citations[0]?.regulatory_clause_id).toBe("c_999");
    expect(completed?.data.citations[0]?.source_class).toBe("VERIFIED_OFFICIAL_SOURCE");
    expect(completed?.data.citations[0]?.badge_label).toBe("Verified Statutory Vault");
  });
});
