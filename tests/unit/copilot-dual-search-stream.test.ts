import { describe, it, expect, vi, beforeEach } from "vitest";
import { CopilotOrchestrator } from "@/modules/conversations/copilot.orchestrator";
import { entitlementsService } from "@/modules/billing/entitlements.service";
import type { GoogleGenAI } from "@google/genai";

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => ({ from: vi.fn(), rpc: vi.fn() }),
}));

vi.mock("@/modules/billing/entitlements.service", () => ({
  entitlementsService: {
    authorizeAndConsumeLiveSearch: vi.fn().mockResolvedValue({
      allowed: true,
      feature: "live_web_search",
      planSlug: "growth",
      limit: 100,
      remaining: 99,
    }),
    checkTenantEntitlement: vi.fn().mockResolvedValue({
      allowed: true,
      feature: "live_web_search",
      planSlug: "growth",
    }),
  },
}));

vi.mock("@/modules/work-products/work-product.service", () => ({
  workProductService: {
    upsertWorkProduct: vi.fn().mockResolvedValue({
      created: true,
      workProduct: {
        id: "wp_mock_1",
        workflow_type: "PRODUCT_STRUCTURING_MEMO",
        artifact_type: "statutory_structuring_memo",
        title: "BNPL Product Structuring Memo",
        version_number: 1,
      },
    }),
  },
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

const mockComparePolicy = vi.fn().mockResolvedValue({
  success: true,
  policy_topic: "Collections, Data Privacy & Complaints SOP",
  statutory_benchmarks: [
    {
      regulatory_clause_id: "ng-stat-ndpa-s25-26-consent",
      instrument_title: "Nigeria Data Protection Act 2023 (NDPA 2023)",
      regulator: "NDPC",
      clause_reference: "Sections 25(1)(a) & 26(2)–(7)",
      verbatim_excerpt: "Consent must be freely given, specific, informed, and unambiguous; conditional/bundled consent is invalid.",
      official_url: "https://ndpc.gov.ng/wp-content/uploads/2025/05/NIGERIA-DATA-PROTECTION-ACT-2023.pdf",
    },
  ],
  official_regulator_references: [
    {
      title: "NDPA 2023 — Official Act",
      url: "https://ndpc.gov.ng/wp-content/uploads/2025/05/NIGERIA-DATA-PROTECTION-ACT-2023.pdf",
      regulator: "NDPC",
    },
  ],
  subclause_gap_matrix: [
    {
      subclause_ref: "1.1",
      section_title: "Section 1 — Consent & Permissions",
      statutory_floor: "NDPA 2023 Sections 25(1)(a) & 26(2)",
      required_redline_anchor: "Unbundled granular consent",
    },
  ],
  mandatory_operational_clocks: [
    {
      trigger: "Personal data breach awareness",
      clock: "72 hours",
      authority: "NDPA 2023 Section 40(1)",
    },
  ],
  legal_floors: {
    breach_notification_hours: 72,
    aml_record_retention_years: 5,
  },
});

vi.mock("@/modules/ai-orchestration/tools/statutory-tools", () => ({
  STATUTORY_TOOL_DECLARATIONS: [],
  statutoryToolExecutor: {
    searchRegulatoryEvidence: (...args: unknown[]) => mockSearchVault(...args),
    searchLiveWeb: (...args: unknown[]) => mockSearchWeb(...args),
    searchInstitutionalKnowledge: vi.fn().mockResolvedValue({ chunks: [], rules: [] }),
    comparePolicyAgainstRegulation: (...args: unknown[]) => mockComparePolicy(...args),
  },
}));

describe("CopilotOrchestrator Dual Grounding, Entitlements & Workflow Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(entitlementsService.authorizeAndConsumeLiveSearch).mockResolvedValue({
      allowed: true,
      feature: "live_web_search",
      planSlug: "growth",
      limit: 100,
      remaining: 99,
    });
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
      enableLiveWebSearch: true,
    })) {
      events.push(event);
    }

    expect(mockSearchVault).toHaveBeenCalledTimes(1);
    expect(mockSearchWeb).toHaveBeenCalledTimes(1);
    expect(generateContentStream).toHaveBeenCalledTimes(1);
    expect(mockGenAi.models.generateContent).not.toHaveBeenCalled();

    const callArgs = generateContentStream.mock.calls[0]?.[0];
    const serialized = JSON.stringify(callArgs.contents);
    expect(serialized).toContain("dual_grounding_context");
    expect(serialized).toContain("CBN Consumer Protection Framework");
    expect(serialized).toContain("CBN 2026 Digital Credit Disclosure Circular");

    const deltas = events
      .filter((e) => e.type === "assistant.delta")
      .map((e) => e.data.text_delta);
    expect(deltas).toHaveLength(2);
    expect(deltas.join("")).toContain("recent CBN circular updates");

    const completed = events.find((e) => e.type === "message.completed") as {
      data: { citations: Array<{ source_class: string; retrieved_url?: string }> };
    };
    const sourceClasses = completed.data.citations.map((c) => c.source_class);
    expect(sourceClasses).toContain("VERIFIED_OFFICIAL_SOURCE");
    expect(sourceClasses).toContain("LIVE_WEB_INTELLIGENCE");
  });

  it("emits entitlement.blocked and falls back to Vault-only when Evaluation tenant toggles Live Web Search", async () => {
    vi.mocked(entitlementsService.authorizeAndConsumeLiveSearch).mockResolvedValueOnce({
      allowed: false,
      planSlug: "evaluation",
      feature: "live_web_search",
      reason: "Upgrade to Growth for Live Search.",
    });

    const generateContentStream = vi.fn().mockImplementation(async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: "Vault-only CBN Consumer Protection analysis." }] } }],
      };
    });

    const orchestrator = new CopilotOrchestrator({
      models: { generateContentStream, generateContent: vi.fn() },
    } as unknown as GoogleGenAI);

    const events = [];
    for await (const event of orchestrator.streamChat({
      tenantId: "00000000-0000-0000-0000-000000000001",
      userId: "user_1",
      conversationId: "conv_eval_blocked",
      userPrompt: "What are the latest CBN rules on stablecoins?",
      enableLiveWebSearch: true,
    })) {
      events.push(event);
    }

    expect(mockSearchWeb).not.toHaveBeenCalled();
    expect(mockSearchVault).toHaveBeenCalledTimes(1);
    const blockedEvt = events.find((e) => e.type === "entitlement.blocked") as
      | { type: "entitlement.blocked"; data: { vault_fallback_active: boolean } }
      | undefined;
    expect(blockedEvt).toBeDefined();
    expect(blockedEvt?.data.vault_fallback_active).toBe(true);
  });

  it("executes Workflow Engine and auto-persists Work Product for PRODUCT_STRUCTURING_MEMO", async () => {
    const generateContentStream = vi.fn().mockImplementation(async function* () {
      yield {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "### BNPL Product Structuring Memo\n\nUnder CBN CPF §4.2.1 and FCCPA §115, all BNPL fees, APR, and cooling-off rights must be prominently disclosed prior to checkout.",
                },
              ],
            },
          },
        ],
      };
    });

    const orchestrator = new CopilotOrchestrator({
      models: { generateContentStream, generateContent: vi.fn() },
    } as unknown as GoogleGenAI);

    const events = [];
    for await (const event of orchestrator.streamChat({
      tenantId: "00000000-0000-0000-0000-000000000001",
      userId: "user_1",
      conversationId: "conv_wf_1",
      userPrompt: "We want to launch a BNPL product in Nigeria — structure all CBN and FCCPC requirements.",
      workflowHint: "PRODUCT_STRUCTURING_MEMO",
    })) {
      events.push(event);
    }

    const wpEvent = events.find((e) => e.type === "work_product.created") as
      | { type: "work_product.created"; data: { work_product_id: string; workflow_type: string } }
      | undefined;
    expect(wpEvent).toBeDefined();
    expect(wpEvent?.data.work_product_id).toBe("wp_mock_1");
    expect(wpEvent?.data.workflow_type).toBe("PRODUCT_STRUCTURING_MEMO");
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

  it("auto-expands UI default ['NG'] to all 4 target countries (NG, KE, GH, ZA) on Cross-Border Matrix prompts without truncating the prompt at 180 chars", async () => {
    const generateContentStream = vi.fn().mockImplementation(async function* () {
      yield {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "### Pan-African Cross-Border Regulatory Matrix\n\nCovered Nigeria, Kenya, Ghana, and South Africa.",
                },
              ],
            },
          },
        ],
      };
    });

    const orchestrator = new CopilotOrchestrator({
      models: { generateContentStream, generateContent: vi.fn() },
    } as unknown as GoogleGenAI);

    const nexaPayPrompt = `We are preparing a Board Expansion Strategy Memo to launch our fintech product—"NexaPay Borderless" (offering instant cross-border P2P remittances, multi-currency local wallets, and virtual USD debit cards)—across four target African jurisdictions:
1. Nigeria (Home Market)
2. Kenya
3. Ghana
4. South Africa
Please build a comprehensive Pan-African Cross-Border Regulatory Matrix comparing all four jurisdictions across these 6 mandatory pillars:
1. Primary Financial & Payment Regulators
2. Required Local Operating Licenses & PSSP/IMTO passporting
3. Minimum Paid-Up Capital & Local Equity / Director Residency Requirements
4. Virtual USD Card & Cross-Border FX Settlement Rules
5. Data Localization & Cross-Border Data Transfer Mandates
6. Recommended Go-To-Market Entry Structure`;

    const events = [];
    for await (const event of orchestrator.streamChat({
      tenantId: "00000000-0000-0000-0000-000000000001",
      userId: "user_1",
      conversationId: "conv_cross_border_nexapay",
      userPrompt: nexaPayPrompt,
      searchJurisdictions: ["NG"], // UI default chip
    })) {
      events.push(event);
    }

    expect(entitlementsService.authorizeAndConsumeLiveSearch).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      ["NG", "KE", "GH", "ZA"]
    );
    expect(mockSearchWeb).toHaveBeenCalledWith(
      expect.objectContaining({
        jurisdictions: ["NG", "KE", "GH", "ZA"],
        prioritize_official_regulators: true,
      }),
      expect.anything()
    );
    const passedWebQuery = mockSearchWeb.mock.calls[0]?.[0]?.query as string;
    expect(passedWebQuery.length).toBeGreaterThan(180);
    expect(passedWebQuery).toContain("Kenya");
    expect(passedWebQuery).toContain("Ghana");
    expect(passedWebQuery).toContain("South Africa");
  });

  it("executes POLICY_GAP_REDLINE with live web search default, statutory matrix injection, and clean redline output", async () => {
    const generateContentStream = vi.fn().mockImplementation(async function* () {
      yield {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: [
                    "### Executive Decision: REJECT v1.0",
                    "",
                    "| Clause Reference | Current Non-Compliant Text | Specific Statutory Breach | Exact Compliant Replacement Text | Statutory Floor / Governing Authority |",
                    "| :--- | :--- | :--- | :--- | :--- |",
                    "| **Sub-clause 3.2 (Breach Protocol)** | \"Notify NDPC within 30 days if media coverage occurs.\" | Violates NDPA 2023 Section 40(1) 72-hour mandatory breach notification clock. | \"The Company shall notify the NDPC within 72 hours of becoming aware of a personal data breach and maintain AML records for at least five (5) years post-account closure.\" | NDPA 2023 Section 40(1); MLPPA 2022 Section 8 |",
                  ].join("\n"),
                },
              ],
            },
          },
        ],
      };
    });

    const orchestrator = new CopilotOrchestrator({
      models: { generateContentStream, generateContent: vi.fn() },
    } as unknown as GoogleGenAI);

    const events = [];
    for await (const event of orchestrator.streamChat({
      tenantId: "00000000-0000-0000-0000-000000000001",
      userId: "user_1",
      conversationId: "conv_policy_redline_1",
      userPrompt:
        "Perform a full Statutory Policy Gap Analysis & Section-by-Section Redline on Internal_Collections_Privacy_SOP_v1.pdf against NDPA 2023, GAID 2025, FCCPC DEON 2025, CBN CPR 2019, and NFIU/MLPPA 2022.",
      workflowHint: "POLICY_GAP_REDLINE",
    })) {
      events.push(event);
    }

    expect(mockComparePolicy).toHaveBeenCalledTimes(1);
    expect(mockSearchWeb).toHaveBeenCalledTimes(1);

    const serializedPrompt = JSON.stringify(generateContentStream.mock.calls[0]?.[0]?.contents);
    expect(serializedPrompt).toContain("policy_gap_redline_execution_blueprint");
    expect(serializedPrompt).toContain("ng-stat-ndpa-s25-26-consent");

    const wpEvent = events.find((e) => e.type === "work_product.created") as
      | { type: "work_product.created"; data: { work_product_id: string } }
      | undefined;
    expect(wpEvent).toBeDefined();

    const streamedText = events
      .filter((e) => e.type === "assistant.delta")
      .map((e) => e.data.text_delta)
      .join("");
    expect(streamedText).toContain("REJECT v1.0");
    expect(streamedText).not.toContain("STATUTORY LEGAL FLOOR WARNING");

    const completed = events.find((e) => e.type === "message.completed") as {
      data: {
        citations: Array<{ regulatory_clause_id?: string; retrieved_url?: string }>;
      };
    };
    const citationIds = completed.data.citations.map((c) => c.regulatory_clause_id).filter(Boolean);
    expect(citationIds).toContain("ng-stat-ndpa-s25-26-consent");
  });
});
