/**
 * Cogent Marketing Shield - Copilot Streaming Orchestrator Unit Tests
 * Document Reference: Document 04 (Section 3.5), DOC-10-ACPC, Document 08 (Phase 6)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CopilotOrchestrator } from "@/modules/conversations/copilot.orchestrator";
import { FunctionCallingConfigMode, GoogleGenAI } from "@google/genai";

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

  it("should preserve thoughtSignature on functionCall parts and exclude thought summaries from assistant deltas", async () => {
    mockGenAi.models.generateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [
              { thought: true, text: "Internal reasoning: check vault first." },
              {
                functionCall: {
                  id: "call_1",
                  name: "search_regulatory_evidence",
                  args: { query: "guaranteed returns" },
                },
                thoughtSignature: "sig_abc_123",
              },
            ],
          },
        },
      ],
    });

    mockGenAi.models.generateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [
              { thought: true, text: "Internal reasoning: synthesize answer." },
              { text: "Promising guaranteed returns without qualification breaches FCCPA rules." },
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
      conversationId: "conv_test_sig",
      userPrompt: "Can we say guaranteed returns?",
    })) {
      events.push(event);
    }

    // Second call must preserve original model turn parts including thoughtSignature
    const secondCallArgs = mockGenAi.models.generateContent.mock.calls[1]?.[0];
    const modelTurn = secondCallArgs.contents.find((c: { role: string }) => c.role === "model");
    expect(modelTurn?.parts[1]?.thoughtSignature).toBe("sig_abc_123");

    const userFunctionResponseTurn = secondCallArgs.contents[secondCallArgs.contents.length - 1];
    expect(userFunctionResponseTurn.role).toBe("user");
    expect(userFunctionResponseTurn.parts[0]?.functionResponse?.name).toBe("search_regulatory_evidence");

    // Assistant delta must NOT leak internal thought summary text
    const deltas = events
      .filter((e) => e.type === "assistant.delta")
      .map((e) => e.data.text_delta)
      .join("");
    expect(deltas).not.toContain("Internal reasoning");
    expect(deltas).toContain("Promising guaranteed returns");
  });

  it("should execute a final tool-free synthesis pass when maxToolRounds is reached without text", async () => {
    const toolCallResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: "search_regulatory_evidence",
                  args: { query: "savings promo" },
                },
                thoughtSignature: "sig_round",
              },
            ],
          },
        },
      ],
    };

    mockGenAi.models.generateContent
      .mockResolvedValueOnce(toolCallResponse)
      .mockResolvedValueOnce(toolCallResponse)
      .mockResolvedValueOnce(toolCallResponse)
      .mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "Unqualified claims of guaranteed returns risk misleading-advertising enforcement.",
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
      conversationId: "conv_test_synth",
      userPrompt: "Can we advertise guaranteed returns?",
    })) {
      events.push(event);
    }

    expect(mockGenAi.models.generateContent).toHaveBeenCalledTimes(4);
    const fourthCallConfig = mockGenAi.models.generateContent.mock.calls[3]?.[0]?.config;
    expect(fourthCallConfig?.toolConfig?.functionCallingConfig?.mode).toBe(
      FunctionCallingConfigMode.NONE
    );

    const deltas = events
      .filter((e) => e.type === "assistant.delta")
      .map((e) => e.data.text_delta)
      .join("");
    expect(deltas).toContain("Unqualified claims of guaranteed returns");
  });

  it("should emit grounded citation summary if synthesis returns no text parts", async () => {
    const toolCallResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: "search_regulatory_evidence",
                  args: { query: "savings promo" },
                },
                thoughtSignature: "sig_round",
              },
            ],
          },
        },
      ],
    };

    mockGenAi.models.generateContent
      .mockResolvedValueOnce(toolCallResponse)
      .mockResolvedValueOnce(toolCallResponse)
      .mockResolvedValueOnce(toolCallResponse)
      .mockResolvedValueOnce({
        candidates: [{ content: { parts: [] } }],
      });

    const orchestrator = new CopilotOrchestrator(mockGenAi as unknown as GoogleGenAI);
    const events = [];
    for await (const event of orchestrator.streamChat({
      tenantId: "00000000-0000-0000-0000-000000000001",
      userId: "user_officer",
      conversationId: "conv_test_empty_fallback",
      userPrompt: "Can we advertise guaranteed returns?",
    })) {
      events.push(event);
    }

    const deltas = events
      .filter((e) => e.type === "assistant.delta")
      .map((e) => e.data.text_delta)
      .join("");
    expect(deltas).toContain("FCCPA 2018");
    expect(events.some((e) => e.type === "message.completed")).toBe(true);
  });

  it("should emit plan.created, assessment.completed, and a Lock-verified StructuredComplianceReport with KFS and APR audit on promotional loan prompts", async () => {
    mockGenAi.models.generateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [
              {
                text: "### 1. What You Missed\nYour flyer implies 60% APR, but the true APR is higher.",
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
      conversationId: "conv_test_promo_report",
      userPrompt:
        "Review this flyer: Get ₦50,000 in 5 minutes at 5% monthly with ₦2,500 processing fee for 15 days!",
    })) {
      events.push(event);
    }

    const planCreated = events.find((e) => e.type === "plan.created");
    expect(planCreated).toBeDefined();
    expect(planCreated?.data.steps).toHaveLength(5);

    const assessmentCompleted = events.find((e) => e.type === "assessment.completed");
    expect(assessmentCompleted).toBeDefined();
    const report = assessmentCompleted?.data.structured_report;
    expect(report).toBeDefined();
    expect(report?.pre_flight_gate.verdict).toBe("BLOCK");
    expect(report?.pre_flight_gate.apr_audit?.advertised_implied_apr).toBe(60);
    expect(report?.pre_flight_gate.apr_audit?.effective_nominal_apr).toBeCloseTo(182.5, 1);
    expect(report?.blind_spot_findings.length).toBeGreaterThan(0);
    expect(report?.artifacts.compliant_rewrite?.verified_by_locks).toBe(true);
    expect(report?.artifacts.kfs_table?.rows.length).toBeGreaterThanOrEqual(10);
    expect(report?.artifacts.arcon_asp_memo).toContain("ARCON Act 2022");
  });
});

