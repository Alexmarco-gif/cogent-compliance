/**
 * Cogent Compliance Platform
 * Production Edge-Case Tests:
 * - Ad-Hoc Daily Compliance Work & Real-Time Web Grounding (No Workflow Selected)
 * - Non-Marketing PDF / DOCX / URL Uploads (Neutral Document Framing + Scanned PDF OCR)
 * - Universal On-Demand Studio Document Creation ("Can you create a document for this?")
 * - Prior-Turn Attachment Context Re-Hydration Across Multi-Turn Conversations
 * - One-Click "Create Document" API Persistence & PDF/DOCX/MD Export
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";
import {
  classifyComplianceTurnIntent,
  hasExplicitDocumentCreationRequest,
  hasMarketingPromotionalCue,
  hasRealTimeOrExternalDataCue,
  isPureGreetingOrAck,
  REGULATORY_COMPLIANCE_OFFICER_ROLE,
} from "@/modules/agent-runtime";
import { createWorkProductSchema } from "@/contracts/work-product.contracts";
import { sanitizeAssistantOutput } from "@/lib/ai/output-sanitizer";

const mockSupabaseFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => ({
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
}));

const mockGenerateText = vi.fn();
vi.mock("@/modules/ai-orchestration/gemini.service", () => ({
  geminiService: {
    generateText: (...args: unknown[]) => mockGenerateText(...args),
  },
}));

vi.mock("@/modules/asset-processing/r2.storage", async () => {
  const actual = await vi.importActual<typeof import("@/modules/asset-processing/r2.storage")>(
    "@/modules/asset-processing/r2.storage"
  );
  return {
    R2StorageService: actual.R2StorageService,
    r2StorageService: {
      putObjectBuffer: vi.fn().mockResolvedValue(undefined),
      getObjectBuffer: vi.fn(),
      generatePresignedDownloadUrl: vi.fn().mockResolvedValue("https://r2.example.com/export"),
    },
  };
});

const mockListMessages = vi.fn().mockResolvedValue({ messages: [] });
const mockUpdateMessage = vi.fn().mockResolvedValue({ id: "asst_adhoc_2", status: "COMPLETED" });

vi.mock("@/modules/conversations/conversation.service", () => ({
  conversationService: {
    createMessage: vi.fn().mockImplementation((params) =>
      Promise.resolve({
        id: params.role === "USER" ? "user_adhoc_1" : "asst_adhoc_2",
        tenant_id: params.tenantId,
        conversation_id: params.conversationId,
        role: params.role,
        content: params.content,
        sequence_number: params.role === "USER" ? 1 : 2,
        status: params.status || "COMPLETED",
        created_at: new Date().toISOString(),
      })
    ),
    listMessages: (...args: unknown[]) => mockListMessages(...args),
    updateMessage: (...args: unknown[]) => mockUpdateMessage(...args),
    updateConversation: vi.fn().mockResolvedValue({ id: "conv_adhoc_1", title: "Updated" }),
  },
}));

const mockAuthorizeLiveSearch = vi.fn().mockResolvedValue({
  allowed: true,
  feature: "live_web_search",
  planSlug: "growth",
  limit: 100,
  remaining: 99,
});

vi.mock("@/modules/billing/entitlements.service", () => ({
  entitlementsService: {
    authorizeAndConsumeLiveSearch: (...args: unknown[]) => mockAuthorizeLiveSearch(...args),
    checkTenantEntitlement: vi.fn().mockResolvedValue({ allowed: true, planSlug: "growth" }),
    getTenantSubscriptionInfo: vi.fn().mockResolvedValue({
      planSlug: "growth",
      isTrial: false,
      isTrialExpired: false,
      plan: {
        slug: "growth",
        features: {
          work_product_docx_export: true,
        },
      },
    }),
  },
}));

vi.mock("@/modules/audit/audit.service", () => ({
  auditService: {
    appendEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockUpsertWorkProduct = vi.fn().mockResolvedValue({
  created: true,
  workProduct: {
    id: "22222222-2222-4222-8222-222222222222",
    workflow_type: "GENERAL_COMPLIANCE_DOCUMENT",
    artifact_type: "compliance_document",
    title: "CBN PoS Agent Circular Compliance Brief",
    version_number: 1,
  },
});

vi.mock("@/modules/work-products/work-product.service", () => ({
  workProductService: {
    upsertWorkProduct: (...args: unknown[]) => mockUpsertWorkProduct(...args),
    listWorkProducts: vi.fn().mockResolvedValue([]),
    getWorkProductWithRevisions: vi.fn(),
  },
}));

const mockSearchVault = vi.fn().mockResolvedValue({
  success: true,
  count: 1,
  results: [
    {
      regulatory_clause_id: "ng-stat-ndpa-s40-breach",
      clause_reference: "Section 40(1)",
      instrument_title: "Nigeria Data Protection Act 2023",
      regulator: "NDPC",
      verbatim_excerpt: "A data controller shall notify the Commission within 72 hours of becoming aware of a breach.",
    },
  ],
});

const mockSearchWeb = vi.fn().mockResolvedValue({
  source_class: "LIVE_WEB_INTELLIGENCE",
  web_summary: "CBN maintained the Monetary Policy Rate and published new agent banking compliance guidelines.",
  results: [
    {
      live_web_retrieval_id: "live_ret_1",
      page_title: "CBN 2026 Agent Banking & PoS Compliance Guidelines",
      retrieved_url: "https://www.cbn.gov.ng/Out/2026/pos-agent-guidelines.pdf",
      snippet_content: "Updated geo-fencing and daily transaction reporting obligations for PoS agents.",
      retrieved_at: new Date().toISOString(),
    },
  ],
});

const mockSearchKb = vi.fn().mockResolvedValue({
  chunks: [
    {
      chunk_id: "kb_chunk_1",
      document_title: "Internal Incident Response SOP",
      content: "Escalate suspected data incidents to the DPO within 4 hours.",
    },
  ],
  rules: [],
});

const mockFetchLiveUrl = vi.fn().mockResolvedValue({
  success: true,
  data: {
    url: "https://www.cbn.gov.ng/Out/2026/agent-circular",
    page_title: "CBN Circular on Agent Banking Operations",
    extracted_text: "All payment service providers must verify agent locations quarterly and submit monthly returns.",
  },
});

vi.mock("@/modules/ai-orchestration/tools/statutory-tools", () => ({
  STATUTORY_TOOL_DECLARATIONS: [],
  statutoryToolExecutor: {
    searchRegulatoryEvidence: (...args: unknown[]) => mockSearchVault(...args),
    searchLiveWeb: (...args: unknown[]) => mockSearchWeb(...args),
    searchInstitutionalKnowledge: (...args: unknown[]) => mockSearchKb(...args),
    fetchLiveUrlContent: (...args: unknown[]) => mockFetchLiveUrl(...args),
  },
}));

vi.mock("@/modules/auth-tenancy/tenant.resolver", () => ({
  resolveTenantContext: vi.fn().mockResolvedValue({
    tenantId: "11111111-1111-4111-8111-111111111111",
    userId: "user_cco_1",
    orgSlug: "demo-fintech",
    role: "CHIEF_COMPLIANCE_OFFICER",
  }),
}));

vi.mock("@/modules/auth-tenancy/rbac.guard", () => ({
  requirePermission: vi.fn(),
}));

describe("Ad-Hoc Daily Compliance Work, Non-Marketing PDFs & On-Demand Documents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListMessages.mockResolvedValue({ messages: [] });
    mockAuthorizeLiveSearch.mockResolvedValue({
      allowed: true,
      feature: "live_web_search",
      planSlug: "growth",
      limit: 100,
      remaining: 99,
    });
  });

  describe("1. Smart Intent Router & Edge Cases", () => {
    it("routes non-marketing PDF uploads without a workflow to REGULATORY_LOOKUP instead of FULL_COMPLIANCE_AUDIT", () => {
      const intent = classifyComplianceTurnIntent(
        {
          userPrompt: "Summarize the obligations and reporting deadlines in this circular for our ops team.",
          attachmentAssetIds: ["asset_pdf_1"],
          attachmentFilenames: ["CBN_Agent_Banking_Circular_2026.pdf"],
          attachmentMimeTypes: ["application/pdf"],
        },
        ["Central Bank of Nigeria Circular PSM/DIR/2026: All super-agents shall file monthly returns by the 10th business day."]
      );
      expect(intent).toBe("REGULATORY_LOOKUP");
    });

    it("routes non-marketing PDF/DOCX + document request (or default upload prompt) to GENERAL_COMPLIANCE_DOCUMENT", () => {
      expect(
        classifyComplianceTurnIntent(
          {
            userPrompt: "Create a board brief document summarizing the key risks in this attached vendor agreement.",
            attachmentAssetIds: ["asset_docx_1"],
            attachmentFilenames: ["Vendor_DPA_2026.docx"],
            attachmentMimeTypes: [
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ],
          },
          ["Data Processing Agreement between Fintech Ltd and Cloud Vendor Inc. Section 4: Sub-processors."]
        )
      ).toBe("GENERAL_COMPLIANCE_DOCUMENT");

      expect(
        classifyComplianceTurnIntent(
          {
            userPrompt:
              "Analyze the attached document (Audit_Letter.pdf), summarize all key compliance obligations, risks, and action items, and prepare a structured compliance deliverable.",
            attachmentAssetIds: ["asset_pdf_2"],
            attachmentFilenames: ["Audit_Letter.pdf"],
            attachmentMimeTypes: ["application/pdf"],
          },
          ["Annual External Audit Management Letter — Internal Control Observations."]
        )
      ).toBe("GENERAL_COMPLIANCE_DOCUMENT");
    });

    it("still routes marketing flyer images and promotional loan PDFs to FULL_COMPLIANCE_AUDIT", () => {
      expect(
        classifyComplianceTurnIntent(
          {
            userPrompt: "Review the attached creative asset (summer_loan_flyer.png) for CBN, FCCPC, and ARCON compliance.",
            attachmentAssetIds: ["asset_img_1"],
            attachmentFilenames: ["summer_loan_flyer.png"],
            attachmentMimeTypes: ["image/png"],
          },
          ["Get ₦500,000 instant loan in 5 minutes! No collateral! 0% interest!"]
        )
      ).toBe("FULL_COMPLIANCE_AUDIT");

      expect(
        classifyComplianceTurnIntent(
          {
            userPrompt: "Check this PDF before we send it out.",
            attachmentAssetIds: ["asset_promo_pdf"],
            attachmentFilenames: ["Q4_Loan_Offer.pdf"],
            attachmentMimeTypes: ["application/pdf"],
          },
          ["Apply now! Borrow ₦200,000 with 0% interest and guaranteed approval in 3 minutes!"]
        )
      ).toBe("FULL_COMPLIANCE_AUDIT");
    });

    it("does NOT force screenshots of regulator circulars or contracts into marketing audits", () => {
      expect(
        hasMarketingPromotionalCue({
          prompt: "Read this screenshot of the CBN circular letter and explain the deadline.",
          attachmentFilenames: ["cbn_circular_letter.png"],
          attachmentMimeTypes: ["image/png"],
        })
      ).toBe(false);
    });

    it("routes non-marketing regulatory URLs to REGULATORY_LOOKUP instead of marketing audit", () => {
      expect(
        classifyComplianceTurnIntent({
          userPrompt:
            "Read https://www.cbn.gov.ng/Out/2026/agent-circular and tell me what changed for PSPs.",
          campaignUrls: ["https://www.cbn.gov.ng/Out/2026/agent-circular"],
        })
      ).toBe("REGULATORY_LOOKUP");
    });

    it("detects natural-language document creation requests without any workflow selected", () => {
      const docPrompts = [
        "Can you create a document for this?",
        "Turn the above into a board memo",
        "Draft an executive compliance brief on our NDPA obligations",
        "Generate a compliance checklist for corporate merchant onboarding",
        "Write a formal response letter to the customer about their dispute",
        "Put this into a downloadable Word doc",
        "Save this as a document in the studio",
      ];
      for (const p of docPrompts) {
        expect(hasExplicitDocumentCreationRequest(p), `Expected document detection for: ${p}`).toBe(
          true
        );
        expect(classifyComplianceTurnIntent({ userPrompt: p })).toBe("GENERAL_COMPLIANCE_DOCUMENT");
      }
    });

    it("routes substantive 'can you explain...' regulatory/real-time queries to REGULATORY_LOOKUP while keeping greetings & thread follow-ups in CONVERSATIONAL_ADVISORY", () => {
      expect(
        classifyComplianceTurnIntent({
          userPrompt:
            "Can you explain the latest CBN circular on PoS agents and what our team must report?",
        })
      ).toBe("REGULATORY_LOOKUP");

      expect(
        hasRealTimeOrExternalDataCue(
          "What is the current CBN monetary policy rate and any new directives today?"
        )
      ).toBe(true);

      expect(isPureGreetingOrAck("Hi, what can you help our compliance team do?")).toBe(true);
      expect(
        classifyComplianceTurnIntent({
          userPrompt: "Hi, what can you help our compliance team do?",
        })
      ).toBe("CONVERSATIONAL_ADVISORY");
      expect(
        classifyComplianceTurnIntent({
          userPrompt: "This is good so what next do you recommend i do now",
        })
      ).toBe("CONVERSATIONAL_ADVISORY");
    });

    it("exposes upsert_work_product_artifact across GENERAL_COMPLIANCE_DOCUMENT, REGULATORY_LOOKUP, and CONVERSATIONAL_ADVISORY packs", () => {
      expect(
        REGULATORY_COMPLIANCE_OFFICER_ROLE.workflowPacks.GENERAL_COMPLIANCE_DOCUMENT?.allowedTools
      ).toContain("upsert_work_product_artifact");
      expect(
        REGULATORY_COMPLIANCE_OFFICER_ROLE.workflowPacks.REGULATORY_LOOKUP?.allowedTools
      ).toContain("upsert_work_product_artifact");
      expect(
        REGULATORY_COMPLIANCE_OFFICER_ROLE.workflowPacks.CONVERSATIONAL_ADVISORY?.allowedTools
      ).toContain("upsert_work_product_artifact");
    });
  });

  describe("2. Scanned PDF OCR Fallback in AssetExtractorService", () => {
    it("falls back to Gemini PDF OCR when unpdf yields sparse text on a scanned PDF", async () => {
      const scannedPdfStub = Buffer.from("%PDF-1.4\n%scanned-image-stream-only\n%%EOF", "utf-8");

      mockGenerateText.mockResolvedValueOnce({
        text: "CENTRAL BANK OF NIGERIA\nCircular Ref: PSM/DIR/PUB/CIR/001/099\n\nAll Payment Service Providers shall implement continuous transaction monitoring and file monthly compliance returns.",
      });

      const insertExtSingle = vi.fn().mockResolvedValue({ data: { id: "ext_pdf_ocr_1" }, error: null });
      const insertSeg = vi.fn().mockResolvedValue({ data: null, error: null });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "campaign_assets") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: "asset_scanned_pdf",
                      tenant_id: "11111111-1111-4111-8111-111111111111",
                      storage_key: "tenants/t1/assets/asset_scanned_pdf/circular.pdf",
                      mime_type: "application/pdf",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: () => ({ eq: async () => ({ data: null, error: null }) }),
          };
        }
        if (table === "asset_extractions") {
          return {
            insert: () => ({ select: () => ({ single: insertExtSingle }) }),
          };
        }
        if (table === "asset_extraction_segments") {
          return { insert: insertSeg };
        }
        return {};
      });

      const { AssetExtractorService } = await import(
        "@/modules/asset-processing/asset-extractor.service"
      );
      const extractor = new AssetExtractorService();
      const result = await extractor.extractAsset({
        tenantId: "11111111-1111-4111-8111-111111111111",
        assetId: "asset_scanned_pdf",
        buffer: scannedPdfStub,
      });

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          imageInlineData: expect.objectContaining({
            mimeType: "application/pdf",
          }),
        })
      );
      expect(result.extractionMethod).toBe("OCR");
      expect(result.extractedText).toContain("PSM/DIR/PUB/CIR/001/099");
      expect(result.segments.length).toBeGreaterThanOrEqual(2);
    });

    it("does NOT dump raw %PDF binary garbage when both unpdf and OCR fail on a corrupt/unreadable PDF", async () => {
      const binaryPdf = Buffer.from("%PDF-1.7\n\x00\x01\x02binary-stream%%EOF", "binary");
      mockGenerateText.mockRejectedValueOnce(new Error("OCR offline"));

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "campaign_assets") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: "asset_corrupt_pdf",
                      tenant_id: "11111111-1111-4111-8111-111111111111",
                      storage_key: "tenants/t1/assets/asset_corrupt_pdf/corrupt.pdf",
                      mime_type: "application/pdf",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: () => ({ eq: async () => ({ data: null, error: null }) }),
          };
        }
        if (table === "asset_extractions") {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: "ext_empty" }, error: null }),
              }),
            }),
          };
        }
        return { insert: async () => ({ data: null, error: null }) };
      });

      const { AssetExtractorService } = await import(
        "@/modules/asset-processing/asset-extractor.service"
      );
      const extractor = new AssetExtractorService();
      const result = await extractor.extractAsset({
        tenantId: "11111111-1111-4111-8111-111111111111",
        assetId: "asset_corrupt_pdf",
        buffer: binaryPdf,
      });

      expect(result.extractedText).toBe("");
      expect(result.extractedText).not.toContain("%PDF-");
    });
  });

  describe("3. CopilotOrchestrator End-to-End Ad-Hoc PDF, Live Web & On-Demand Document Flows", () => {
    it("analyzes a non-marketing PDF neutrally with Vault + KB + Live Web without triggering a marketing flyer audit", async () => {
      const pdfAssetId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "campaign_assets") {
          return {
            select: () => ({
              eq: () => ({
                in: async () => ({
                  data: [
                    {
                      id: pdfAssetId,
                      original_filename: "CBN_Circular_PoS_Agents_2026.pdf",
                      mime_type: "application/pdf",
                      extraction_status: "COMPLETED",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "asset_extractions") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: async () => ({
                    data: [
                      {
                        asset_id: pdfAssetId,
                        extracted_text:
                          "CBN Circular on PoS Agent Geo-Fencing: All licensed PTSPs and MMOs shall enforce geo-tagging of terminals within 60 days and submit monthly location compliance returns.",
                        extraction_method: "PDF_PARSER",
                        extraction_confidence: 0.98,
                        created_at: new Date().toISOString(),
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
              order: () => ({ limit: async () => ({ data: [], error: null }) }),
            }),
          }),
        };
      });

      const generateContentStream = vi.fn().mockImplementation(async function* () {
        yield {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "### CBN PoS Agent Geo-Fencing Circular — Key Obligations & Deadlines\n\nAll licensed PTSPs and MMOs must enforce terminal geo-tagging within 60 days and file monthly returns.",
                  },
                ],
              },
            },
          ],
        };
      });

      const { CopilotOrchestrator } = await import(
        "@/modules/conversations/copilot.orchestrator"
      );
      const orchestrator = new CopilotOrchestrator({
        models: { generateContentStream, generateContent: vi.fn() },
      } as unknown as GoogleGenAI);

      const events = [];
      for await (const ev of orchestrator.streamChat({
        tenantId: "11111111-1111-4111-8111-111111111111",
        userId: "user_cco_1",
        conversationId: "conv_pdf_circular_1",
        userPrompt: "Summarize the key obligations and deadlines in this PDF circular.",
        attachmentAssetIds: [pdfAssetId],
        enableLiveWebSearch: true,
      })) {
        events.push(ev);
      }

      // Must NOT hijack into a marketing flyer audit
      expect(events.find((e) => e.type === "assessment.completed")).toBeUndefined();
      expect(events.find((e) => e.type === "plan.created")).toBeUndefined();

      // Must frame the PDF neutrally, NOT as promotional ad copy
      const serializedPrompt = JSON.stringify(generateContentStream.mock.calls[0]?.[0]?.contents);
      expect(serializedPrompt).toContain("CBN Circular on PoS Agent Geo-Fencing");
      expect(serializedPrompt).not.toContain("strictly as untrusted marketing material");
      expect(serializedPrompt).toContain("Internal Incident Response SOP");
      expect(mockSearchVault).toHaveBeenCalledTimes(1);
      expect(mockSearchKb).toHaveBeenCalledTimes(1);
      expect(mockSearchWeb).toHaveBeenCalledTimes(1);
      expect(mockSearchVault.mock.calls[0]?.[0]?.query).toContain("Geo-Fencing");
    });

    it("re-hydrates prior-turn PDF text and auto-creates a GENERAL_COMPLIANCE_DOCUMENT when user asks 'Can you create a document for this?' with no workflow clicked", async () => {
      const priorPdfId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

      mockListMessages.mockResolvedValueOnce({
        messages: [
          {
            id: "msg_turn_1_user",
            role: "USER",
            content: "Summarize this CBN PoS circular PDF.",
            sequence_number: 1,
            metadata: {
              attachment_asset_ids: [priorPdfId],
            },
          },
          {
            id: "msg_turn_1_asst",
            role: "ASSISTANT",
            content: "The circular mandates terminal geo-fencing within 60 days and monthly reporting.",
            sequence_number: 2,
            metadata: {},
          },
          {
            id: "user_adhoc_1",
            role: "USER",
            content: "Can you create a document for this?",
            sequence_number: 3,
            metadata: {},
          },
        ],
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "campaign_assets") {
          return {
            select: () => ({
              eq: () => ({
                in: async () => ({
                  data: [
                    {
                      id: priorPdfId,
                      original_filename: "CBN_Circular_PoS_Agents_2026.pdf",
                      mime_type: "application/pdf",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "asset_extractions") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: async () => ({
                    data: [
                      {
                        asset_id: priorPdfId,
                        extracted_text:
                          "Section 3.1: Geo-fencing radius of 10 meters must be enforced for all merchant PoS terminals.",
                        created_at: new Date().toISOString(),
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
              order: () => ({ limit: async () => ({ data: [], error: null }) }),
            }),
          }),
        };
      });

      const generateContentStream = vi.fn().mockImplementation(async function* () {
        yield {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: [
                      "### CBN PoS Agent Circular — Executive Compliance Brief",
                      "",
                      "#### 1. Executive Summary",
                      "All terminals must enforce a 10-meter geo-fencing radius within 60 days under Section 3.1 of the CBN Circular, alongside monthly compliance returns.",
                      "",
                      "#### 2. Action Plan & Owners",
                      "| Action | Owner | Deadline |",
                      "| :--- | :--- | :--- |",
                      "| Deploy terminal geo-fencing | Engineering & Ops | Day 45 |",
                    ].join("\n"),
                  },
                ],
              },
            },
          ],
        };
      });

      const { CopilotOrchestrator } = await import(
        "@/modules/conversations/copilot.orchestrator"
      );
      const orchestrator = new CopilotOrchestrator({
        models: { generateContentStream, generateContent: vi.fn() },
      } as unknown as GoogleGenAI);

      const events = [];
      for await (const ev of orchestrator.streamChat({
        tenantId: "11111111-1111-4111-8111-111111111111",
        userId: "user_cco_1",
        conversationId: "conv_doc_followup_1",
        userPrompt: "Can you create a document for this?",
      })) {
        events.push(ev);
      }

      // Prior PDF content must be re-hydrated into Turn 1 of the LLM context
      const serialized = JSON.stringify(generateContentStream.mock.calls[0]?.[0]?.contents);
      expect(serialized).toContain("prior_uploaded_document_context");
      expect(serialized).toContain("Geo-fencing radius of 10 meters");

      // Work Product must be auto-persisted as GENERAL_COMPLIANCE_DOCUMENT / compliance_document
      expect(mockUpsertWorkProduct).toHaveBeenCalledWith(
        "11111111-1111-4111-8111-111111111111",
        "user_cco_1",
        expect.objectContaining({
          workflow_type: "GENERAL_COMPLIANCE_DOCUMENT",
          artifact_type: "compliance_document",
          title: "CBN PoS Agent Circular — Executive Compliance Brief",
        }),
        expect.anything()
      );

      const wpCreated = events.find((e) => e.type === "work_product.created");
      expect(wpCreated).toBeDefined();
    });

    it("honors Live Web Search and live URL fetching on ad-hoc CONVERSATIONAL_ADVISORY & REGULATORY_LOOKUP turns", async () => {
      const generateContentStream = vi.fn().mockImplementation(async function* () {
        yield {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "### Live Update & Operational Guidance\n\nBased on the fetched circular and live search results, quarterly agent location checks and monthly returns apply.",
                  },
                ],
              },
            },
          ],
        };
      });

      const { CopilotOrchestrator } = await import(
        "@/modules/conversations/copilot.orchestrator"
      );
      const orchestrator = new CopilotOrchestrator({
        models: { generateContentStream, generateContent: vi.fn() },
      } as unknown as GoogleGenAI);

      const events = [];
      for await (const ev of orchestrator.streamChat({
        tenantId: "11111111-1111-4111-8111-111111111111",
        userId: "user_cco_1",
        conversationId: "conv_live_advisory",
        userPrompt: "What should we tell our operations team about https://www.cbn.gov.ng/Out/2026/agent-circular ?",
        campaignUrls: ["https://www.cbn.gov.ng/Out/2026/agent-circular"],
        enableLiveWebSearch: true,
      })) {
        events.push(ev);
      }

      expect(mockSearchWeb).toHaveBeenCalledTimes(1);
      expect(mockFetchLiveUrl).toHaveBeenCalledWith(
        { url: "https://www.cbn.gov.ng/Out/2026/agent-circular" },
        expect.anything()
      );

      const serialized = JSON.stringify(generateContentStream.mock.calls[0]?.[0]?.contents);
      expect(serialized).toContain("fetched_live_url_content");
      expect(serialized).toContain("verify agent locations quarterly");
      expect(events.find((e) => e.type === "assessment.completed")).toBeUndefined();
    });
  });

  describe("4. Output Sanitizer, Work Product Contracts, API Message Linking & Export", () => {
    it("strips new internal XML context tags if echoed by the model", () => {
      const raw =
        "Per (<prior_uploaded_document_context>) and <fetched_live_url_content> findings, file within 72 hours.";
      const cleaned = sanitizeAssistantOutput(raw);
      expect(cleaned).not.toContain("prior_uploaded_document_context");
      expect(cleaned).not.toContain("fetched_live_url_content");
      expect(cleaned).toContain("file within 72 hours.");
    });

    it("validates GENERAL_COMPLIANCE_DOCUMENT with non-UUID statutory matrix IDs and blank URLs safely", () => {
      const parsed = createWorkProductSchema.parse({
        workflow_type: "GENERAL_COMPLIANCE_DOCUMENT",
        artifact_type: "compliance_document",
        title: "Merchant Onboarding Compliance Checklist",
        markdown_content: "### Merchant Onboarding Compliance Checklist\n\n1. Verify CAC registration and BVN.",
        citations: [
          {
            source_class: "VERIFIED_OFFICIAL_SOURCE",
            badge_label: "Verified Statutory Vault",
            regulatory_clause_id: "ng-stat-ndpa-s40-breach",
            retrieved_url: "",
          },
        ],
      });
      expect(parsed.workflow_type).toBe("GENERAL_COMPLIANCE_DOCUMENT");
      expect(parsed.artifact_type).toBe("compliance_document");
      expect(parsed.citations[0]?.regulatory_clause_id).toBe("ng-stat-ndpa-s40-breach");
      expect(parsed.citations[0]?.retrieved_url).toBeUndefined();
    });

    it("POST /api/marketing-shield/v1/work-products persists GENERAL_COMPLIANCE_DOCUMENT and links it to source message metadata", async () => {
      const updateEqId = vi.fn().mockResolvedValue({ data: null, error: null });
      const updateEqTenant = vi.fn().mockReturnValue({ eq: updateEqId });
      const updateMock = vi.fn().mockReturnValue({ eq: updateEqTenant });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "marketing_messages") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: "33333333-3333-4333-8333-333333333333",
                      metadata: { citations: [] },
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: updateMock,
          };
        }
        return {};
      });

      const { POST } = await import("@/app/api/marketing-shield/v1/work-products/route");
      const req = new NextRequest("http://localhost:3000/api/marketing-shield/v1/work-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: "44444444-4444-4444-8444-444444444444",
          message_id: "33333333-3333-4333-8333-333333333333",
          workflow_type: "GENERAL_COMPLIANCE_DOCUMENT",
          artifact_type: "compliance_document",
          title: "CBN PoS Agent Circular Compliance Brief",
          markdown_content:
            "### CBN PoS Agent Circular Compliance Brief\n\nAll PoS terminals must enforce geo-fencing within 60 days.",
        }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.work_product.workflow_type).toBe("GENERAL_COMPLIANCE_DOCUMENT");
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            work_product_id: "22222222-2222-4222-8222-222222222222",
            work_product: expect.objectContaining({
              artifact_type: "compliance_document",
              workflow_type: "GENERAL_COMPLIANCE_DOCUMENT",
            }),
          }),
        })
      );
    });

    it("honors enableLiveWebSearch in Mode C (CONVERSATIONAL_ADVISORY) for daily general work without regulatory acronyms", async () => {
      const generateContentStream = vi.fn().mockImplementation(async function* () {
        yield {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "### Practical Daily Vendor Monitoring Checklist\n\nBased on current operational standards and live intelligence, track quarterly attestations and SLA breach notices.",
                  },
                ],
              },
            },
          ],
        };
      });

      const { CopilotOrchestrator } = await import(
        "@/modules/conversations/copilot.orchestrator"
      );
      const orchestrator = new CopilotOrchestrator({
        models: { generateContentStream, generateContent: vi.fn() },
      } as unknown as GoogleGenAI);

      const prompt = "How should our team organize our weekly vendor check-ins and track third-party issues?";
      expect(classifyComplianceTurnIntent({ userPrompt: prompt })).toBe("CONVERSATIONAL_ADVISORY");

      const events = [];
      for await (const ev of orchestrator.streamChat({
        tenantId: "11111111-1111-4111-8111-111111111111",
        userId: "user_cco_1",
        conversationId: "conv_mode_c_live",
        userPrompt: prompt,
        enableLiveWebSearch: true,
      })) {
        events.push(ev);
      }

      expect(mockSearchWeb).toHaveBeenCalledTimes(1);
      expect(events.find((e) => e.type === "plan.created")).toBeUndefined();
      expect(events.find((e) => e.type === "search.track_started")).toBeDefined();
      expect(events.find((e) => e.type === "search.track_completed")).toBeDefined();
      const serialized = JSON.stringify(generateContentStream.mock.calls[0]?.[0]?.contents);
      expect(serialized).toContain("untrusted_live_web_evidence");
    });

    it("compiles valid PDF, DOCX, and Markdown exports for GENERAL_COMPLIANCE_DOCUMENT", async () => {
      const { WorkProductExportService } = await import(
        "@/modules/work-products/work-product-export.service"
      );
      const { workProductService } = await import(
        "@/modules/work-products/work-product.service"
      );

      vi.mocked(workProductService.getWorkProductWithRevisions).mockResolvedValue({
        work_product: {
          id: "22222222-2222-4222-8222-222222222222",
          tenant_id: "11111111-1111-4111-8111-111111111111",
          conversation_id: "44444444-4444-4444-8444-444444444444",
          message_id: null,
          workflow_type: "GENERAL_COMPLIANCE_DOCUMENT",
          artifact_type: "compliance_document",
          title: "CBN PoS Agent Circular Compliance Brief",
          jurisdiction_scope: ["NG"],
          markdown_content:
            "### Executive Summary\n\nAll licensed PTSPs and MMOs must enforce terminal geo-tagging within 60 days.\n\n| Obligation | Deadline |\n| :--- | :--- |\n| Geo-tagging | 60 days |",
          structured_payload: {},
          citations: [],
          evidence_gaps: [],
          guardrail_report: { passed: true },
          version_number: 1,
          status: "DRAFT",
          source_hash_sha256: "a".repeat(64),
          created_by: "user_cco_1",
          updated_by: "user_cco_1",
          last_exported_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        revisions: [],
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "tenants") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { name: "Acme Fintech Nigeria Ltd" }, error: null }),
              }),
            }),
          };
        }
        if (table === "work_product_artifacts") {
          return {
            update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
          };
        }
        return {
          insert: async () => ({ error: null }),
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
        };
      });

      const exporter = new WorkProductExportService();
      const [pdfOut, docxOut, mdOut] = await Promise.all([
        exporter.exportWorkProduct(
          "11111111-1111-4111-8111-111111111111",
          "user_cco_1",
          "22222222-2222-4222-8222-222222222222",
          "pdf"
        ),
        exporter.exportWorkProduct(
          "11111111-1111-4111-8111-111111111111",
          "user_cco_1",
          "22222222-2222-4222-8222-222222222222",
          "docx"
        ),
        exporter.exportWorkProduct(
          "11111111-1111-4111-8111-111111111111",
          "user_cco_1",
          "22222222-2222-4222-8222-222222222222",
          "md"
        ),
      ]);

      expect(pdfOut.buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
      expect(docxOut.buffer.subarray(0, 2).toString("utf8")).toBe("PK");
      expect(mdOut.buffer.toString("utf8")).toContain("CBN PoS Agent Circular Compliance Brief");
      expect(mdOut.buffer.toString("utf8")).toContain("GENERAL_COMPLIANCE_DOCUMENT");
    });
  });
});
