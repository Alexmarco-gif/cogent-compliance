/**
 * Cogent Marketing Shield - Asset Upload Proxy, OCR Extraction & Copilot Attachment Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";
import { resolveUploadMimeType } from "@/lib/upload-mime";

const mockTenant = {
  tenantId: "11111111-1111-1111-1111-111111111111",
  userId: "user_tester",
  orgSlug: "demo-fintech",
  role: "COMPLIANCE_OFFICER",
};

const mockResolveTenantContext = vi.fn().mockResolvedValue(mockTenant);
const mockRequirePermission = vi.fn();

vi.mock("@/modules/auth-tenancy/tenant.resolver", () => ({
  resolveTenantContext: (...args: unknown[]) => mockResolveTenantContext(...args),
}));

vi.mock("@/modules/auth-tenancy/rbac.guard", () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
}));

const mockSupabaseFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => ({
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
}));

const mockPutObjectBuffer = vi.fn().mockResolvedValue(undefined);
const mockGetObjectBuffer = vi.fn();

vi.mock("@/modules/asset-processing/r2.storage", async () => {
  const actual = await vi.importActual<typeof import("@/modules/asset-processing/r2.storage")>(
    "@/modules/asset-processing/r2.storage",
  );
  return {
    R2StorageService: actual.R2StorageService,
    r2StorageService: {
      putObjectBuffer: (...args: unknown[]) => mockPutObjectBuffer(...args),
      getObjectBuffer: (...args: unknown[]) => mockGetObjectBuffer(...args),
    },
  };
});

const mockGenerateText = vi.fn();
vi.mock("@/modules/ai-orchestration/gemini.service", () => ({
  geminiService: {
    generateText: (...args: unknown[]) => mockGenerateText(...args),
  },
}));

vi.mock("@/modules/conversations/conversation.service", () => ({
  conversationService: {
    createMessage: vi.fn().mockImplementation((params) =>
      Promise.resolve({
        id: params.role === "USER" ? "user_msg_attach_1" : "asst_msg_attach_2",
        tenant_id: params.tenantId,
        conversation_id: params.conversationId,
        role: params.role,
        content: params.content,
        sequence_number: params.role === "USER" ? 1 : 2,
        status: params.status || "COMPLETED",
        created_at: new Date().toISOString(),
      }),
    ),
    listMessages: vi.fn().mockResolvedValue({ messages: [] }),
    updateMessage: vi.fn().mockResolvedValue({ id: "asst_msg_attach_2", status: "COMPLETED" }),
    updateConversation: vi.fn().mockResolvedValue({ id: "conv_attach_1", title: "Updated" }),
  },
}));

const mockSearchVault = vi.fn().mockResolvedValue({
  success: true,
  count: 1,
  results: [
    {
      regulatory_clause_id: "vault_clause_attach_1",
      clause_reference: "Section 4.2.1",
      instrument_title: "CBN Consumer Protection Framework",
      regulator: "CBN",
      verbatim_excerpt: "Promotional material must disclose all fees and APR.",
    },
  ],
});

const mockSearchWeb = vi.fn().mockResolvedValue({
  source_class: "LIVE_WEB_INTELLIGENCE",
  web_summary: "FCCPC prohibits 0% interest bait claims with hidden fees.",
  results: [],
});

vi.mock("@/modules/ai-orchestration/tools/statutory-tools", () => ({
  STATUTORY_TOOL_DECLARATIONS: [],
  statutoryToolExecutor: {
    searchRegulatoryEvidence: (...args: unknown[]) => mockSearchVault(...args),
    searchLiveWeb: (...args: unknown[]) => mockSearchWeb(...args),
  },
}));

describe("Asset Upload Proxy, MIME Normalization & Copilot Attachment Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveUploadMimeType", () => {
    it("normalizes uppercase .JPG, image/jpg, and empty browser MIME types accurately", () => {
      expect(resolveUploadMimeType({ name: "wq.JPG", type: "" })).toBe("image/jpeg");
      expect(resolveUploadMimeType({ name: "wq.JPG", type: "image/jpg" })).toBe("image/jpeg");
      expect(resolveUploadMimeType({ name: "flyer.JPEG", type: "image/pjpeg" })).toBe("image/jpeg");
      expect(resolveUploadMimeType({ name: "banner.PNG", type: "" })).toBe("image/png");
      expect(resolveUploadMimeType({ name: "promo.webp", type: "" })).toBe("image/webp");
      expect(resolveUploadMimeType({ name: "terms.docx", type: "" })).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      expect(resolveUploadMimeType({ name: "circular.pdf", type: "" })).toBe("application/pdf");
    });
  });

  describe("PUT /api/marketing-shield/v1/assets/[id]/upload", () => {
    it("uploads verified JPEG bytes to R2 when SHA-256 and magic bytes match", async () => {
      const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      const sha256 = crypto.createHash("sha256").update(jpegBytes).digest("hex");

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "campaign_assets") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "asset_jpeg_1",
                      tenant_id: mockTenant.tenantId,
                      storage_key: "tenants/t1/assets/asset_jpeg_1/wq.JPG",
                      mime_type: "image/jpeg",
                      sha256_hash: sha256,
                      file_size_bytes: jpegBytes.length,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const { PUT } = await import(
        "@/app/api/marketing-shield/v1/assets/[id]/upload/route"
      );

      const req = new NextRequest(
        "https://stem-cogent.com/api/marketing-shield/v1/assets/asset_jpeg_1/upload",
        {
          method: "PUT",
          body: jpegBytes,
          headers: { "Content-Type": "image/jpeg" },
        },
      );

      const res = await PUT(req, { params: Promise.resolve({ id: "asset_jpeg_1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.asset_id).toBe("asset_jpeg_1");
      expect(mockPutObjectBuffer).toHaveBeenCalledWith(
        "tenants/t1/assets/asset_jpeg_1/wq.JPG",
        expect.any(Buffer),
        "image/jpeg",
      );
    });

    it("rejects mismatched SHA-256 checksums before writing to R2", async () => {
      const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

      mockSupabaseFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "asset_bad_hash",
                  tenant_id: mockTenant.tenantId,
                  storage_key: "tenants/t1/assets/asset_bad_hash/wq.JPG",
                  mime_type: "image/jpeg",
                  sha256_hash: "0".repeat(64),
                  file_size_bytes: jpegBytes.length,
                },
                error: null,
              }),
            }),
          }),
        }),
      }));

      const { PUT } = await import(
        "@/app/api/marketing-shield/v1/assets/[id]/upload/route"
      );

      const req = new NextRequest(
        "https://stem-cogent.com/api/marketing-shield/v1/assets/asset_bad_hash/upload",
        { method: "PUT", body: jpegBytes },
      );

      const res = await PUT(req, { params: Promise.resolve({ id: "asset_bad_hash" }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("CHECKSUM_MISMATCH");
      expect(mockPutObjectBuffer).not.toHaveBeenCalled();
    });

    it("rejects disguised SVG payloads via magic-byte check", async () => {
      const svgBytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      const sha256 = crypto.createHash("sha256").update(svgBytes).digest("hex");

      mockSupabaseFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "asset_svg_spoof",
                  tenant_id: mockTenant.tenantId,
                  storage_key: "tenants/t1/assets/asset_svg_spoof/wq.JPG",
                  mime_type: "image/jpeg",
                  sha256_hash: sha256,
                  file_size_bytes: svgBytes.length,
                },
                error: null,
              }),
            }),
          }),
        }),
      }));

      const { PUT } = await import(
        "@/app/api/marketing-shield/v1/assets/[id]/upload/route"
      );

      const req = new NextRequest(
        "https://stem-cogent.com/api/marketing-shield/v1/assets/asset_svg_spoof/upload",
        { method: "PUT", body: svgBytes },
      );

      const res = await PUT(req, { params: Promise.resolve({ id: "asset_svg_spoof" }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe("HOSTILE_FILE_REJECTED");
      expect(mockPutObjectBuffer).not.toHaveBeenCalled();
    });
  });

  describe("AssetExtractorService markdown-fenced OCR JSON parsing", () => {
    it("strips ```json fences from Gemini Vision output and records real extracted segments", async () => {
      const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

      mockGenerateText.mockResolvedValueOnce({
        text: `\`\`\`json
{
  "fullText": "Get instant payday loans at 0% interest!",
  "overallConfidence": 0.96,
  "segments": [
    {
      "segmentIndex": 0,
      "textContent": "Get instant payday loans at 0% interest!",
      "box_2d": [100, 100, 300, 900],
      "label": "HEADLINE",
      "confidence": 0.96
    }
  ]
}
\`\`\``,
      });

      const insertExtSingle = vi.fn().mockResolvedValue({ data: { id: "ext_1" }, error: null });
      const insertSeg = vi.fn().mockResolvedValue({ data: null, error: null });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "campaign_assets") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "asset_ocr_1",
                      tenant_id: mockTenant.tenantId,
                      storage_key: "tenants/t1/assets/asset_ocr_1/wq.JPG",
                      mime_type: "image/jpeg",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === "asset_extractions") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: insertExtSingle,
              }),
            }),
          };
        }
        if (table === "asset_extraction_segments") {
          return {
            insert: insertSeg,
          };
        }
        return {};
      });

      const { AssetExtractorService } = await import(
        "@/modules/asset-processing/asset-extractor.service"
      );
      const extractor = new AssetExtractorService();
      const result = await extractor.extractAsset({
        tenantId: mockTenant.tenantId,
        assetId: "asset_ocr_1",
        buffer: jpegBytes,
      });

      expect(result.extractionMethod).toBe("OCR");
      expect(result.extractedText).toBe("Get instant payday loans at 0% interest!");
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0]?.boundingBox?.label).toBe("HEADLINE");
      expect(insertSeg).toHaveBeenCalledTimes(1);
    });
  });

  describe("CopilotOrchestrator attachment_asset_ids integration", () => {
    it("injects uploaded asset extracted text into prompt, Lock 1/3 scan, and Dual Search queries", async () => {
      const assetId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "campaign_assets") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: assetId,
                      original_filename: "wq.JPG",
                      mime_type: "image/jpeg",
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
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        asset_id: assetId,
                        extracted_text: "Get guaranteed returns & 100% risk-free instant loan today!",
                        extraction_method: "OCR",
                        extraction_confidence: 0.96,
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
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({ data: [], error: null }),
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
                    text: "### Asset Compliance Findings\n\nThe uploaded flyer violates CBN CPF and FCCPC DEON disclosure rules.",
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
      } as never);

      const events = [];
      for await (const event of orchestrator.streamChat({
        tenantId: mockTenant.tenantId,
        userId: mockTenant.userId,
        conversationId: "conv_attach_1",
        userPrompt: 'Uploaded campaign asset "wq.JPG". Please review the extracted copy.',
        attachmentAssetIds: [assetId],
      })) {
        events.push(event);
      }

      const streamArgs = generateContentStream.mock.calls[0]?.[0];
      const serializedContents = JSON.stringify(streamArgs.contents);
      expect(serializedContents).toContain("uploaded_asset_extracted_content");
      expect(serializedContents).toContain("100% risk-free instant loan");
      expect(serializedContents).toContain("deterministic_lock_scan");

      // Both Vault and Live Web queries should incorporate the extracted flyer text
      expect(mockSearchVault.mock.calls[0]?.[0]?.query).toContain("guaranteed returns");
      expect(mockSearchWeb.mock.calls[0]?.[0]?.query).toContain("guaranteed returns");

      const toolCompleted = events.find(
        (e) => e.type === "tool.completed" && e.data.tool_name === "deterministic_mechanical_locks",
      );
      expect(toolCompleted).toBeDefined();
    });
  });
});
