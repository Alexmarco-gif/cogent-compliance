import { describe, it, expect, vi, beforeEach } from "vitest";
import { CopilotOrchestrator } from "@/modules/conversations/copilot.orchestrator";
import type { GoogleGenAI } from "@google/genai";

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => ({ from: vi.fn(), rpc: vi.fn() }),
}));

vi.mock("@/modules/conversations/conversation.service", () => ({
  conversationService: {
    createMessage: vi.fn().mockImplementation((params) =>
      Promise.resolve({
        id: params.role === "USER" ? "user_msg_dual_1" : "asst_msg_dual_2",
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
    updateMessage: vi.fn().mockResolvedValue({ id: "asst_msg_dual_2", status: "COMPLETED" }),
    updateConversation: vi.fn().mockResolvedValue({ id: "conv_dual_1", title: "Updated" }),
  },
}));

const mockSearchVault = vi.fn().mockResolvedValue({
  success: true,
  count: 1,
  results: [
    {
      regulatory_clause_id: "vault_clause_1",
      clause_reference: "Section 4.2.1",
      instrument_title: "CBN Consumer Protection Framework",
      regulator: "CBN",
      verbatim_excerpt: "Promotional material must clearly disclose all applicable fees.",
    },
  ],
});

const mockSearchWeb = vi.fn().mockResolvedValue({
  source_class: "LIVE_WEB_INTELLIGENCE",
  web_summary: "CBN issued an updated consumer disclosure advisory this quarter.",
  results: [
    {
      live_web_retrieval_id: "web_ret_1",
      page_title: "CBN 2026 Digital Credit Disclosure Circular",
      retrieved_url: "https://www.cbn.gov.ng/Out/2026/disclosure-circular.pdf",
      snippet_content: "Updated consumer disclosure advisory.",
      retrieved_at: new Date().toISOString(),
      source_class: "LIVE_WEB_INTELLIGENCE",
    },
  ],
});

vi.mock("@/modules/ai-orchestration/tools/statutory-tools", () => ({
  STATUTORY_TOOL_DECLARATIONS: [],
  statutoryToolExecutor: {
    searchRegulatoryEvidence: (...args: unknown[]) => mockSearchVault(...args),
    searchLiveWeb: (...args: unknown[]) => mockSearchWeb(...args),
  },
}));

describe("CopilotOrchestrator Dual Grounding & Live Token Streaming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs Vault + Live Web Search in parallel and streams tokens via generateContentStream", async () => {
    const generateContentStream = vi.fn().mockImplementation(async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: "### Regulatory Analysis\n\n" }] } }],
      };
      yield {
        candidates: [
          {
            content: {
              parts: [{ text: "Under CBN CPF §4.2.1 and recent CBN circular updates, disclose all fees." }],
            },
          },
        ],
      };
    });

    const mockGenAi = {
      models: {
        generateContentStream,
        generateContent: vi.fn(),
      },
    };

    const orchestrator = new CopilotOrchestrator(mockGenAi as unknown as GoogleGenAI);
    const events = [];
    for await (const event of orchestrator.streamChat({
      tenantId: "00000000-0000-0000-0000-000000000001",
      userId: "user_1",
      conversationId: "conv_dual_1",
      userPrompt: "What are the latest CBN rules on loan fee ads?",
    })) {
      events.push(event);
    }

    expect(mockSearchVault).toHaveBeenCalledTimes(1);
    expect(mockSearchWeb).toHaveBeenCalledTimes(1);
    expect(generateContentStream).toHaveBeenCalledTimes(1);
    expect(mockGenAi.models.generateContent).not.toHaveBeenCalled();

    // Context injected into first Gemini stream call should include both Vault and Live Web evidence
    const callArgs = generateContentStream.mock.calls[0]?.[0];
    const serialized = JSON.stringify(callArgs.contents);
    expect(serialized).toContain("dual_grounding_context");
    expect(serialized).toContain("CBN Consumer Protection Framework");
    expect(serialized).toContain("CBN 2026 Digital Credit Disclosure Circular");

    // Streamed deltas arrived sequentially
    const deltas = events
      .filter((e) => e.type === "assistant.delta")
      .map((e) => e.data.text_delta);
    expect(deltas).toHaveLength(2);
    expect(deltas.join("")).toContain("recent CBN circular updates");

    // Completed citations include BOTH Verified Statutory Vault PDF AND Live Web source
    const completed = events.find((e) => e.type === "message.completed") as {
      data: { citations: Array<{ source_class: string; retrieved_url?: string }> };
    };
    const sourceClasses = completed.data.citations.map((c) => c.source_class);
    expect(sourceClasses).toContain("VERIFIED_OFFICIAL_SOURCE");
    expect(sourceClasses).toContain("LIVE_WEB_INTELLIGENCE");
  });

  it("strips attachment filenames/boilerplate from webQuery and deduplicates repeated Vault clauses", async () => {
    mockSearchVault.mockResolvedValueOnce({
      success: true,
      count: 3,
      results: [
        {
          regulatory_clause_id: "vault_dup_1",
          clause_reference: "35.35",
          instrument_title: "FCCPC Digital Lending Guidelines",
          regulator: "FCCPC",
          verbatim_excerpt: "Clause chunk A",
        },
        {
          regulatory_clause_id: "vault_dup_2",
          clause_reference: "35.35",
          instrument_title: "FCCPC Digital Lending Guidelines",
          regulator: "FCCPC",
          verbatim_excerpt: "Clause chunk B",
        },
        {
          regulatory_clause_id: "vault_unique_3",
          clause_reference: "Section 4.2",
          instrument_title: "CBN CPF",
          regulator: "CBN",
          verbatim_excerpt: "Clause chunk C",
        },
      ],
    });

    const generateContentStream = vi.fn().mockImplementation(async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: "### Compliance Review\n\nComplete." }] } }],
      };
    });

    const orchestrator = new CopilotOrchestrator({
      models: { generateContentStream, generateContent: vi.fn() },
    } as unknown as GoogleGenAI);

    const { webQuery } = orchestrator.buildDualSearchQueries(
      "Review the attached campaign asset (1794800274760.jpg) against CBN, FCCPC, and ARCON requirements.",
      "Quick Cash Loan Test 1",
      "0% INTEREST! INSTANT CASH IN 5 MINUTES! NO COLLATERAL!"
    );
    expect(webQuery).not.toContain("1794800274760.jpg");
    expect(webQuery).not.toContain("Review the attached campaign asset");
    expect(webQuery.toLowerCase()).toContain("nigeria");
    expect(webQuery.toLowerCase()).toContain("digital lending");

    const events = [];
    for await (const event of orchestrator.streamChat({
      tenantId: "00000000-0000-0000-0000-000000000001",
      userId: "user_1",
      conversationId: "conv_dual_dedup",
      userPrompt: "Check 1794800274760.jpg for APR compliance",
    })) {
      events.push(event);
    }

    const completed = events.find((e) => e.type === "message.completed") as {
      data: { citations: Array<{ source_class: string; clause_reference?: string }> };
    };
    const vaultCitations = completed.data.citations.filter(
      (c) => c.source_class === "VERIFIED_OFFICIAL_SOURCE"
    );
    expect(vaultCitations).toHaveLength(2);
  });
});
