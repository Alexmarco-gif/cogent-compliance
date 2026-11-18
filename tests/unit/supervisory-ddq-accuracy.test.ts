/**
 * Cogent Regulatory Intelligence Platform
 * Supervisory Inquiry, Sponsor Bank DDQ & Statutory Precision Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GoogleGenAI } from "@google/genai";

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => mockSupabase,
}));

vi.mock("@/modules/conversations/conversation.service", () => ({
  conversationService: {
    createMessage: vi.fn().mockImplementation((params) =>
      Promise.resolve({
        id: params.role === "USER" ? "user_msg_ddq_1" : "asst_msg_ddq_2",
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
    updateMessage: vi.fn().mockResolvedValue({ id: "asst_msg_ddq_2", status: "COMPLETED" }),
  },
}));

vi.mock("@/modules/work-products/work-product.service", () => ({
  workProductService: {
    upsertWorkProduct: vi.fn().mockImplementation((_t, _u, input) =>
      Promise.resolve({
        created: true,
        workProduct: {
          id: "wp_ddq_101",
          workflow_type: input.workflow_type,
          artifact_type: input.artifact_type,
          title: input.title,
          version_number: 1,
          evidence_gaps: input.evidence_gaps || [],
        },
      })
    ),
  },
}));

vi.mock("@/modules/ai-orchestration/tools/statutory-tools", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/ai-orchestration/tools/statutory-tools")>();
  return {
    ...actual,
    STATUTORY_TOOL_DECLARATIONS: [],
  };
});

import { statutoryReferenceMatrix } from "@/modules/compliance-assessment/statutory-reference-matrix";
import { GuardrailValidator } from "@/modules/compliance-assessment/guardrails.validator";
import { CopilotOrchestrator } from "@/modules/conversations/copilot.orchestrator";
import { statutoryToolExecutor } from "@/modules/ai-orchestration/tools/statutory-tools";
import { workProductService } from "@/modules/work-products/work-product.service";
import {
  createStreamingOutputSanitizer,
  sanitizeAssistantOutput,
} from "@/lib/ai/output-sanitizer";

const STAGE4_PROMPT = `PART A: SPONSOR BANK ANNUAL DUE DILIGENCE QUESTIONNAIRE (DDQ)
Q1 (Licensing & Virtual Accounts): Confirm NexaPay's exact CBN license scope and explain how customer funds in virtual NUBANs are segregated from NexaPay's corporate operational funds with Kopa Microfinance Bank.
Q2 (KYC & Onboarding Controls): Detail your Tier-1, Tier-2, and Tier-3 onboarding verification controls, daily transaction limits, and cumulative balance limits per CBN directives.
Q3 (NDPA 2023 & NDPC Compliance): Provide evidence of your Data Protection Officer (DPO) appointment, annual Data Protection Compliance Audit (CAR) filing deadline with NDPC, and cross-border transfer safeguards.
Q4 (NFIU & AML/CFT Reporting): State your exact statutory thresholds and filing timelines for Currency Transaction Reports (CTRs) and Suspicious Transaction Reports (STRs) under MLPPA 2022.
Q5 (Cybersecurity & Penetration Testing): Confirm your compliance with the CBN Risk-Based Cybersecurity Framework for OFIs/PSPs, including Vulnerability Assessment and Penetration Testing (VAPT) frequency and incident reporting timelines to CBN.
Q6 (Third-Party Sub-Merchants & Agent Onboarding): How do you prevent unregistered digital lenders or unauthorized crypto/FX merchants from using your payment gateway APIs?

PART B: URGENT CBN SUPERVISORY INQUIRY (48-HOUR RESPONSE DEADLINE)
Subject: Spike in Unresolved Failed NIP Transfers and Unauthorized Wallet Debits (NGN 42,500,000 across 318 customers in October 2026)
Please review the attached document ("NexaPay_Bank_DDQ_and_CBN_Query_Stage4.pdf") and draft formal responses.`;

function setupDefaultSupabaseMock() {
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === "tenants") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { name: "NexaPay Technologies Ltd", license_tier: "PSSP" },
            }),
          }),
        }),
      };
    }
    if (table === "regulatory_clauses") {
      return {
        select: () => ({
          in: async () => ({ data: [] }),
        }),
      };
    }
    if (table === "live_web_retrievals") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: [] }),
            }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: [] }),
          }),
          limit: async () => ({ data: [] }),
          maybeSingle: async () => ({ data: null }),
        }),
        ilike: () => ({
          limit: async () => ({ data: [] }),
        }),
      }),
    };
  });
  mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
}

describe("Stage 4 Supervisory Inquiry & Sponsor Bank DDQ Precision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultSupabaseMock();
  });

  it("extracts all 7 Stage-4 Nigerian statutory reference domains plus Guide to Charges Part 2(A)", () => {
    const provisions = statutoryReferenceMatrix.extractApplicableProvisions(STAGE4_PROMPT);
    const ids = provisions.map((p) => p.id);

    expect(ids).toContain("ref_cybercrimes_2015_s37_3");
    expect(ids).toContain("ref_cbn_instant_eft_2018");
    expect(ids).toContain("ref_cbn_cpr_2019_complaints");
    expect(ids).toContain("ref_cbn_licence_categorisation_2020_2021");
    expect(ids).toContain("ref_cbn_mmo_guidelines_2021_s7_s9");
    expect(ids).toContain("ref_cbn_mfb_guidelines_2020_unit_scope");
    expect(ids).toContain("ref_cbn_bvn_nin_2023_circular");
    expect(ids).toContain("ref_cbn_tkyc_2016_vs_mmo_2021_limits");
    expect(ids).toContain("ref_ndpa_2023_and_gaid_2025");
    expect(ids).toContain("ref_cbn_2026_data_localisation");
    expect(ids).toContain("ref_nfiu_mlppa_2022_s3_s7_s8_s11");
    expect(ids).toContain("ref_cbn_psp_cyber_framework_2018");
    expect(ids).toContain("ref_submerchant_aml_deon_vasp");

    const creditProvisions = statutoryReferenceMatrix.extractApplicableProvisions(
      "Review our late payment default interest fee and Key Facts Statement effective APR."
    );
    expect(creditProvisions.map((p) => p.id)).toContain("ref_cbn_guide_to_charges_part_2a");
  });

  it("routes Stage 4 DDQ + .pdf reference + CBN Supervisory Inquiry to SUPERVISORY_DDQ_RESPONSE instead of FULL_COMPLIANCE_AUDIT", () => {
    const mockGenAi = { models: { generateContent: vi.fn() } } as unknown as GoogleGenAI;
    const orchestrator = new CopilotOrchestrator(mockGenAi);

    expect(
      orchestrator.classifyTurnIntent({
        tenantId: "t1",
        userId: "u1",
        conversationId: "c1",
        userPrompt: STAGE4_PROMPT,
      })
    ).toBe("SUPERVISORY_DDQ_RESPONSE");

    expect(
      orchestrator.classifyTurnIntent({
        tenantId: "t1",
        userId: "u1",
        conversationId: "c1",
        userPrompt:
          "Draft a 48-hour CBN response on our spike in failed NIP transfers and unauthorized wallet debits for customer restitution.",
      })
    ).toBe("SUPERVISORY_DDQ_RESPONSE");
  });

  it("parses Stage 4 DDQ questions, flags missing named PDF, and detects Kopa Unit MFB + incident signals", async () => {
    const res = await statutoryToolExecutor.parseAndAnswerDdqQuestions(
      { ddq_text: STAGE4_PROMPT },
      { tenantId: "tenant_1" }
    );

    expect(res.success).toBe(true);
    expect(res.has_internal_evidence).toBe(false);
    expect(res.missing_named_document).toBe("NexaPay_Bank_DDQ_and_CBN_Query_Stage4.pdf");
    expect(res.has_unit_mfb_partner_signal).toBe(true);
    expect(res.has_supervisory_incident_signal).toBe(true);
    expect(Number(res.parsed_questions_count)).toBeGreaterThanOrEqual(6);
    expect(Number(res.evidence_gaps_count)).toBeGreaterThanOrEqual(6);
    expect((res.statutory_reference_provisions as unknown[]).length).toBeGreaterThanOrEqual(10);
  });

  it("handles completely different real-world MFB partner names, offshore AWS cloud hosting, and distinct exposure figures", async () => {
    const genericPrompt = `Please complete our Partner DDQ for Zenith Horizon MFB Ltd and CBN 48-hour query on ₦18,500,000 failed NIP payouts. Our core ledger currently runs on AWS offshore hosting in Ireland.`;
    const provisions = statutoryReferenceMatrix.extractApplicableProvisions(genericPrompt);
    const ids = provisions.map((p) => p.id);

    expect(ids).toContain("ref_cbn_mfb_guidelines_2020_unit_scope");
    expect(ids).toContain("ref_cbn_2026_data_localisation");
    expect(ids).toContain("ref_cbn_instant_eft_2018");

    const res = await statutoryToolExecutor.parseAndAnswerDdqQuestions(
      { ddq_text: genericPrompt },
      { tenantId: "tenant_real_world" }
    );
    expect(res.has_unit_mfb_partner_signal).toBe(true);
    expect(res.has_supervisory_incident_signal).toBe(true);
    expect(res.missing_named_document).toBeNull();
  });

  it("strips leaked bracketed database UUIDs in one-shot and chunked streaming sanitization while preserving legal citations", () => {
    const raw =
      "Under CBN CDD Regulations 2023 [d156429b-ccea-4032-bbee-36dc67599a96] and [Cybercrimes Act 2015 Section 37(3)], banks must reverse unauthorised debits within 72 hours.";
    const cleaned = sanitizeAssistantOutput(raw);

    expect(cleaned).not.toContain("d156429b-ccea-4032-bbee-36dc67599a96");
    expect(cleaned).toContain("[Cybercrimes Act 2015 Section 37(3)]");

    const sanitizer = createStreamingOutputSanitizer();
    const chunks = [
      "Under CBN CDD Regulations 2023 [d156429b-",
      "ccea-4032-bbee-36dc67599a96]",
      " and [Cybercrimes Act 2015 Section 37(3)], comply within 72 hours.",
    ];
    let streamed = "";
    for (const chunk of chunks) {
      streamed += sanitizer.push(chunk);
    }
    streamed += sanitizer.flush();

    expect(streamed).not.toContain("d156429b");
    expect(streamed).toContain("[Cybercrimes Act 2015 Section 37(3)]");
  });

  it("flags fabricated operational incidents, stale 15 March CAR deadline, and missing Cybercrimes s.37(3) in SUPERVISORY_DDQ_RESPONSE", async () => {
    const validator = new GuardrailValidator();
    const badDraft = `
### Part A
Q3: NexaPay submits its annual CAR to NDPC on or before March 15 of every year, and VAPT is conducted biannually.
### Part B
The spike in unauthorized wallet debits was traced to an anomalous deadlock during our database migration on October 12, and all funds have been credited directly.
`;

    const res = await validator.validateWorkProduct(
      {
        workflow_type: "SUPERVISORY_DDQ_RESPONSE",
        markdown_content: badDraft,
        citations: [],
      },
      { tenantId: "tenant_1", hasInternalKnowledgeRefs: false }
    );

    expect(res.passed).toBe(false);
    expect(res.sanitized_markdown).toContain("[NEEDS_INTERNAL_EVIDENCE]");
    expect(res.sanitized_markdown).toContain("REGULATORY INTEGRITY & ACCURACY WARNING");
    expect(
      res.guardrail_report.legal_floor_warnings.some((w) =>
        w.includes("BOFIA_2020_FACTUAL_INTEGRITY_RISK")
      )
    ).toBe(true);
    expect(
      res.guardrail_report.legal_floor_warnings.some((w) =>
        w.includes("STATUTORY_ACCURACY_NDPC_CAR_DEADLINE")
      )
    ).toBe(true);
    expect(
      res.guardrail_report.legal_floor_warnings.some((w) =>
        w.includes("STATUTORY_OMISSION_CYBERCRIMES_S37_3")
      )
    ).toBe(true);
  });

  it("passes SUPERVISORY_DDQ_RESPONSE when factual honesty, 31 March CAR, and Cybercrimes s.37(3) are satisfied", async () => {
    const validator = new GuardrailValidator();
    const cleanDraft = `
### Pre-Submission Notice
Supporting records were not supplied; unverified operational details remain in [insert ...] placeholders.
Q3: Under NDPC GAID 2025 Article 10, the statutory annual CAR deadline is 31 March (not the repealed 15 March NDPR date).
### Part B
For unauthorized wallet debits, Cybercrimes Act 2015 Section 37(3) mandates reversal or clear legal authorisation within 72 hours of written customer notice. Customer-level logs are to be reconciled prior to submission [insert verified count].
`;

    const res = await validator.validateWorkProduct(
      {
        workflow_type: "SUPERVISORY_DDQ_RESPONSE",
        markdown_content: cleanDraft,
        citations: [],
      },
      { tenantId: "tenant_1", hasInternalKnowledgeRefs: false }
    );

    expect(res.passed).toBe(true);
    expect(res.guardrail_report.legal_floor_warnings).toHaveLength(0);
  });

  it("injects <statutory_reference_matrix> & missing attachment notice into SUPERVISORY_DDQ_RESPONSE orchestrator turn and persists evidence_gaps", async () => {
    const mockGenAi = {
      models: {
        generateContent: vi.fn().mockResolvedValueOnce({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "## Pre-Submission Notice\nNexaPay_Bank_DDQ_and_CBN_Query_Stage4.pdf was not supplied in extracted form [d156429b-ccea-4032-bbee-36dc67599a96]. Under Cybercrimes Act 2015 Section 37(3) and NDPC GAID 2025 Article 10 (31 March deadline), complete internal verification prior to submission.",
                  },
                ],
              },
            },
          ],
        }),
      },
    };

    const orchestrator = new CopilotOrchestrator(mockGenAi as unknown as GoogleGenAI);
    const events = [];
    for await (const ev of orchestrator.streamChat({
      tenantId: "00000000-0000-0000-0000-000000000001",
      userId: "user_cco",
      conversationId: "conv_stage4",
      userPrompt: STAGE4_PROMPT,
    })) {
      events.push(ev);
    }

    const genArgs = mockGenAi.models.generateContent.mock.calls[0]?.[0];
    const injectedPartsText = genArgs.contents[genArgs.contents.length - 1].parts
      .map((p: { text?: string }) => p.text || "")
      .join("\n");

    expect(injectedPartsText).toContain("<statutory_reference_matrix>");
    expect(injectedPartsText).toContain("<supervisory_ddq_synthesis_directives>");
    expect(injectedPartsText).toContain("NexaPay_Bank_DDQ_and_CBN_Query_Stage4.pdf");
    expect(injectedPartsText).toContain("Section 37(3)");
    expect(injectedPartsText).toContain("31 March");

    // Raw UUID must be stripped from emitted assistant deltas
    const emittedText = events
      .filter((e) => e.type === "assistant.delta")
      .map((e) => String((e.data as { text_delta?: string }).text_delta || ""))
      .join("");
    expect(emittedText).not.toContain("d156429b-ccea-4032-bbee-36dc67599a96");

    // Work product fallback must persist question-level evidence gaps instead of []
    expect(workProductService.upsertWorkProduct).toHaveBeenCalledTimes(1);
    const wpInput = vi.mocked(workProductService.upsertWorkProduct).mock.calls[0]?.[2];
    expect(wpInput?.workflow_type).toBe("SUPERVISORY_DDQ_RESPONSE");
    expect((wpInput?.evidence_gaps || []).length).toBeGreaterThanOrEqual(6);
  });
});
