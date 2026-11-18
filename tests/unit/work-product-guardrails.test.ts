/**
 * Cogent Regulatory Intelligence Platform
 * Work Product Guardrails & Binary Export (PDF / DOCX) Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GuardrailValidator } from "@/modules/compliance-assessment/guardrails.validator";
import { WorkProductExportService } from "@/modules/work-products/work-product-export.service";
import { workProductService } from "@/modules/work-products/work-product.service";
import { entitlementsService } from "@/modules/billing/entitlements.service";
import { r2StorageService } from "@/modules/asset-processing/r2.storage";
import { auditService } from "@/modules/audit/audit.service";
import type { WorkProductRecord } from "@/contracts/work-product.contracts";

const mockSupabaseFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => ({
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  }),
}));

vi.mock("@/modules/work-products/work-product.service", () => ({
  workProductService: {
    getWorkProductWithRevisions: vi.fn(),
  },
}));

vi.mock("@/modules/billing/entitlements.service", () => ({
  entitlementsService: {
    checkTenantEntitlement: vi.fn(),
    getTenantSubscriptionInfo: vi.fn(),
  },
}));

vi.mock("@/modules/asset-processing/r2.storage", () => ({
  r2StorageService: {
    putObjectBuffer: vi.fn().mockResolvedValue(undefined),
    generatePresignedDownloadUrl: vi.fn().mockResolvedValue("https://r2.example.com/signed-file"),
  },
}));

vi.mock("@/modules/audit/audit.service", () => ({
  auditService: {
    appendEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("Work Product Anti-Hallucination Guardrails & PDF/DOCX Export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "regulatory_clauses") {
        return {
          select: () => ({
            in: async () => ({ data: [{ id: "clause_real_1" }] }),
          }),
        };
      }
      if (table === "live_web_retrievals") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({
                  data: [{ retrieved_url: "https://www.cbn.gov.ng/Out/2026/valid-circular.pdf" }],
                }),
              }),
            }),
          }),
        };
      }
      if (table === "tenants") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { name: "Kuda Microfinance Bank Ltd" } }),
            }),
          }),
        };
      }
      if (table === "work_product_artifacts") {
        return {
          update: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      };
    });
  });

  it("strips unverified Vault IDs & fabricated external URLs while keeping valid retrievals", async () => {
    const validator = new GuardrailValidator();
    const res = await validator.validateWorkProduct(
      {
        workflow_type: "PRODUCT_STRUCTURING_MEMO",
        markdown_content:
          "Verified circular: https://www.cbn.gov.ng/Out/2026/valid-circular.pdf and hallucinated link: https://fake-regulator.example.com/2026/fake.pdf",
        citations: [
          {
            source_class: "VERIFIED_OFFICIAL_SOURCE",
            badge_label: "Verified Statutory Vault",
            instrument_title: "CBN CPF §4.2",
            regulatory_clause_id: "clause_real_1",
          },
          {
            source_class: "VERIFIED_OFFICIAL_SOURCE",
            badge_label: "Verified Statutory Vault",
            instrument_title: "Hallucinated Clause",
            regulatory_clause_id: "clause_hallucinated_999",
          },
          {
            source_class: "LIVE_WEB_INTELLIGENCE",
            badge_label: "Live Web Intelligence",
            instrument_title: "Valid CBN Circular",
            retrieved_url: "https://www.cbn.gov.ng/Out/2026/valid-circular.pdf",
          },
          {
            source_class: "LIVE_WEB_INTELLIGENCE",
            badge_label: "Live Web Intelligence",
            instrument_title: "Fake Link",
            retrieved_url: "https://fake-regulator.example.com/2026/fake.pdf",
          },
        ],
      },
      { tenantId: "tenant_1" }
    );

    expect(res.passed).toBe(false);
    expect(res.guardrail_report.verified_vault_ids).toEqual(["clause_real_1"]);
    expect(res.guardrail_report.stripped_vault_ids).toEqual(["clause_hallucinated_999"]);
    expect(res.guardrail_report.stripped_ungrounded_urls).toContain(
      "https://fake-regulator.example.com/2026/fake.pdf"
    );
    expect(res.sanitized_markdown).toContain("https://www.cbn.gov.ng/Out/2026/valid-circular.pdf");
    expect(res.sanitized_markdown).toContain("[UNVERIFIED_EXTERNAL_URL_REMOVED]");
    expect(res.sanitized_citations).toHaveLength(2);
  });

  it("injects [NEEDS_INTERNAL_EVIDENCE] when DDQ asserts internal controls without workspace KB grounding", async () => {
    const validator = new GuardrailValidator();
    const res = await validator.validateWorkProduct(
      {
        workflow_type: "SUPERVISORY_DDQ_RESPONSE",
        markdown_content: "1. We enforce automated sanctions screening and retain KYC logs for 7 years.",
        citations: [],
      },
      { tenantId: "tenant_1", hasInternalKnowledgeRefs: false }
    );

    expect(res.sanitized_markdown).toContain("[NEEDS_INTERNAL_EVIDENCE]");
    expect(res.evidence_gaps.some((g) => g.gap_code === "DDQ_UNVERIFIED_INTERNAL_CONTROL")).toBe(true);
  });

  it("flags statutory legal floor violations in POLICY_GAP_REDLINE (<5yr NFIU retention & >72h NDPC notice)", async () => {
    const validator = new GuardrailValidator();
    const res = await validator.validateWorkProduct(
      {
        workflow_type: "POLICY_GAP_REDLINE",
        markdown_content:
          "Updated Clause 4.1: We retain transaction monitoring logs for 2 years. In case of data breach we notify NDPC within 120 hours.",
        citations: [],
      },
      { tenantId: "tenant_1" }
    );

    expect(res.passed).toBe(false);
    expect(res.guardrail_report.legal_floor_warnings).toHaveLength(2);
    expect(res.sanitized_markdown).toContain("STATUTORY LEGAL FLOOR WARNING");
  });

  it("compiles valid PDF buffer (WinAnsi-safe with Naira symbol) and watermark for evaluation plan", async () => {
    const sampleWp: WorkProductRecord = {
      id: "wp_123",
      tenant_id: "tenant_1",
      conversation_id: "conv_1",
      message_id: "msg_1",
      workflow_type: "PRODUCT_STRUCTURING_MEMO",
      artifact_type: "statutory_structuring_memo",
      title: "USD Virtual Card & ₦50,000 Micro-Credit Memo",
      jurisdiction_scope: ["NG", "KE"],
      markdown_content:
        "## Executive Structuring Summary\n\n- Maximum daily limit: ₦500,000 → subject to BVN Tier-3.\n\n| Agency | Obligation | Threshold |\n| --- | --- | --- |\n| CBN | Tier-3 KYC | ≥ ₦500,000 |\n",
      structured_payload: {},
      citations: [
        {
          source_class: "VERIFIED_OFFICIAL_SOURCE",
          badge_label: "Verified Statutory Vault",
          instrument_title: "CBN CDD Regulations 2023",
          clause_reference: "Reg 12",
        },
      ],
      evidence_gaps: [],
      guardrail_report: { passed: true },
      version_number: 2,
      status: "FINALIZED",
      source_hash_sha256: "a".repeat(64),
      created_by: "user_1",
      updated_by: "user_1",
      last_exported_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.mocked(workProductService.getWorkProductWithRevisions).mockResolvedValue({
      work_product: sampleWp,
      revisions: [],
    });
    vi.mocked(entitlementsService.checkTenantEntitlement).mockResolvedValue({
      allowed: false,
      planSlug: "evaluation",
      feature: "export_unwatermarked",
    });
    vi.mocked(entitlementsService.getTenantSubscriptionInfo).mockResolvedValue({
      plan: { features: { work_product_docx_export: false } },
    } as never);

    const exporter = new WorkProductExportService();
    const pdfRes = await exporter.exportWorkProduct("tenant_1", "user_1", "wp_123", "pdf");

    expect(pdfRes.format).toBe("pdf");
    expect(pdfRes.watermarked).toBe(true);
    expect(pdfRes.buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(r2StorageService.putObjectBuffer).toHaveBeenCalledTimes(1);
    expect(auditService.appendEvent).toHaveBeenCalledTimes(1);
  });

  it("compiles valid DOCX binary for Growth+ and blocks Evaluation tier from DOCX export", async () => {
    const sampleWp: WorkProductRecord = {
      id: "wp_456",
      tenant_id: "tenant_1",
      conversation_id: null,
      message_id: null,
      workflow_type: "CROSS_BORDER_COMPARISON",
      artifact_type: "cross_border_matrix",
      title: "Nigeria vs Kenya Payment Licensing Matrix",
      jurisdiction_scope: ["NG", "KE"],
      markdown_content:
        "# Licensing Matrix\n\n- CBN PSSP Capital: ₦100,000,000\n\n| Country | Regulator | Capital |\n| --- | --- | --- |\n| Nigeria | CBN | ₦100M |\n| Kenya | CBK | KES 5M |\n",
      structured_payload: {},
      citations: [],
      evidence_gaps: [],
      guardrail_report: { passed: true },
      version_number: 1,
      status: "DRAFT",
      source_hash_sha256: "b".repeat(64),
      created_by: "user_1",
      updated_by: "user_1",
      last_exported_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.mocked(workProductService.getWorkProductWithRevisions).mockResolvedValue({
      work_product: sampleWp,
      revisions: [],
    });

    const exporter = new WorkProductExportService();

    // 1. Evaluation tier should reject DOCX
    vi.mocked(entitlementsService.checkTenantEntitlement).mockResolvedValue({
      allowed: false,
      planSlug: "evaluation",
      feature: "export_unwatermarked",
    });
    vi.mocked(entitlementsService.getTenantSubscriptionInfo).mockResolvedValueOnce({
      plan: { features: { work_product_docx_export: false } },
    } as never);

    await expect(exporter.exportWorkProduct("tenant_1", "user_1", "wp_456", "docx")).rejects.toThrow(
      /DOCX_EXPORT_UPGRADE_REQUIRED/i
    );

    // 2. Growth tier should succeed and produce valid ZIP/DOCX ('PK' magic bytes)
    vi.mocked(entitlementsService.checkTenantEntitlement).mockResolvedValue({
      allowed: true,
      planSlug: "growth",
      feature: "export_unwatermarked",
    });
    vi.mocked(entitlementsService.getTenantSubscriptionInfo).mockResolvedValueOnce({
      plan: { features: { work_product_docx_export: true } },
    } as never);

    const docxRes = await exporter.exportWorkProduct("tenant_1", "user_1", "wp_456", "docx");
    expect(docxRes.format).toBe("docx");
    expect(docxRes.watermarked).toBe(false);
    expect(docxRes.buffer.subarray(0, 2).toString("utf8")).toBe("PK");
  });

  it("compiles Markdown (.md) export on all tiers including Evaluation Pilot with metadata & citations", async () => {
    const sampleWp: WorkProductRecord = {
      id: "wp_789",
      tenant_id: "tenant_1",
      conversation_id: null,
      message_id: null,
      workflow_type: "POLICY_GAP_REDLINE",
      artifact_type: "policy_gap_redline",
      title: "AML Policy Redline Memo",
      jurisdiction_scope: ["NG"],
      markdown_content: "## Clause 4.2 Update\n\nUpdated CBN Tier-1 KYC onboarding threshold.\n",
      structured_payload: {},
      citations: [
        {
          source_class: "VERIFIED_OFFICIAL_SOURCE",
          badge_label: "CBN AML/CFT Regs",
          regulator: "CBN",
          instrument_title: "CBN AML/CFT/CPF Regulations 2022",
          clause_reference: "Reg. 15",
        },
      ],
      evidence_gaps: [],
      guardrail_report: { passed: true },
      version_number: 2,
      status: "DRAFT",
      source_hash_sha256: "c".repeat(64),
      created_by: "user_1",
      updated_by: "user_1",
      last_exported_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.mocked(workProductService.getWorkProductWithRevisions).mockResolvedValue({
      work_product: sampleWp,
      revisions: [],
    });
    vi.mocked(entitlementsService.checkTenantEntitlement).mockResolvedValue({
      allowed: false,
      planSlug: "evaluation",
      feature: "export_unwatermarked",
    });
    vi.mocked(entitlementsService.getTenantSubscriptionInfo).mockResolvedValue({
      plan: { features: { work_product_docx_export: false } },
    } as never);

    const exporter = new WorkProductExportService();
    const mdRes = await exporter.exportWorkProduct("tenant_1", "user_1", "wp_789", "md");

    expect(mdRes.format).toBe("md");
    expect(mdRes.content_type).toContain("text/markdown");
    expect(mdRes.filename.endsWith(".md")).toBe(true);
    expect(mdRes.watermarked).toBe(true);

    const mdText = mdRes.buffer.toString("utf8");
    expect(mdText).toContain("# AML Policy Redline Memo");
    expect(mdText).toContain("EVALUATION PILOT WATERMARK");
    expect(mdText).toContain("## Clause 4.2 Update");
    expect(mdText).toContain("## Statutory & Regulatory Citations Appendix");
    expect(mdText).toContain("CBN AML/CFT Regs");
  });

  it("scrubs leaked internal XML tags and §§ section glyphs from work product markdown", async () => {
    const validator = new GuardrailValidator();
    const res = await validator.validateWorkProduct(
      {
        workflow_type: "POLICY_GAP_REDLINE",
        markdown_content:
          "Per the canonical computation engine (`<canonical_computed_financials>`), NDPA 2023 §§ 26, 35 applies alongside <internal_institutional_truth>.",
        citations: [],
      },
      { tenantId: "tenant_1" }
    );

    expect(res.sanitized_markdown).not.toContain("canonical_computed_financials");
    expect(res.sanitized_markdown).not.toContain("internal_institutional_truth");
    expect(res.sanitized_markdown).toContain("NDPA 2023 Sections 26, 35");
  });

  it("renders Markdown tables as bordered PDF cells instead of raw pipe-delimited text", async () => {
    const sampleWp: WorkProductRecord = {
      id: "wp_pdf_table",
      tenant_id: "tenant_1",
      conversation_id: null,
      message_id: null,
      workflow_type: "CROSS_BORDER_COMPARISON",
      artifact_type: "cross_border_matrix",
      title: "Pan-African Regulatory Matrix: NexaPay Borderless",
      jurisdiction_scope: ["NG", "KE", "GH", "ZA"],
      markdown_content: [
        "### Executive Summary",
        "",
        "NexaPay Borderless scales across four key African markets.",
        "",
        "---",
        "",
        "### Pillar 1: Primary Financial & Payment Regulators",
        "",
        "| Jurisdiction | Central Bank & Payment Regulator | Data Protection Authority | Financial Conduct Authority |",
        "| :--- | :--- | :--- | :--- |",
        "| Nigeria (NG) | Central Bank of Nigeria (CBN) via Payments System Supervision | Nigeria Data Protection Commission (NDPC) under NDPA 2023 | Federal Competition and Consumer Protection Commission (FCCPC) |",
        "| Kenya (KE) | Central Bank of Kenya (CBK) | Office of the Data Protection Commissioner (ODPC) | Capital Markets Authority (CMA) |",
        "| Ghana (GH) | Bank of Ghana (BoG) | Data Protection Commission (DPC) | Securities and Exchange Commission (SEC Ghana) |",
        "| South Africa (ZA) | South African Reserve Bank (SARB) | Information Regulator under POPIA | Financial Sector Conduct Authority (FSCA) |",
        "",
        "> Regulatory passporting across jurisdictions is strictly prohibited.",
      ].join("\n"),
      structured_payload: {},
      citations: [],
      evidence_gaps: [],
      guardrail_report: { passed: true },
      version_number: 1,
      status: "DRAFT",
      source_hash_sha256: "d".repeat(64),
      created_by: "user_1",
      updated_by: "user_1",
      last_exported_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.mocked(workProductService.getWorkProductWithRevisions).mockResolvedValue({
      work_product: sampleWp,
      revisions: [],
    });
    vi.mocked(entitlementsService.checkTenantEntitlement).mockResolvedValue({
      allowed: true,
      planSlug: "growth",
      feature: "export_unwatermarked",
    });
    vi.mocked(entitlementsService.getTenantSubscriptionInfo).mockResolvedValue({
      plan: { features: { work_product_docx_export: true } },
    } as never);

    const exporter = new WorkProductExportService();
    const pdfRes = await exporter.exportWorkProduct("tenant_1", "user_1", "wp_pdf_table", "pdf");

    expect(pdfRes.buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");

    // Inspect PDF content streams to confirm raw markdown pipes/separators were not drawn literally
    const { PDFDocument } = await import("pdf-lib");
    const zlib = await import("zlib");
    const doc = await PDFDocument.load(pdfRes.buffer);
    const streamTexts: string[] = [];
    for (const obj of doc.context.enumerateIndirectObjects()) {
      const val = obj[1] as { contents?: Uint8Array };
      if (val && val.contents instanceof Uint8Array) {
        try {
          streamTexts.push(zlib.inflateSync(Buffer.from(val.contents)).toString("latin1"));
        } catch {
          streamTexts.push(Buffer.from(val.contents).toString("latin1"));
        }
      }
    }
    const decodedStreams = streamTexts
      .join("\n")
      .replace(/<([0-9A-Fa-f]+)>/g, (_, hex: string) =>
        Buffer.from(hex, "hex").toString("latin1")
      );
    expect(decodedStreams).not.toContain(":---");
    expect(decodedStreams).not.toContain("| Jurisdiction |");
    expect(decodedStreams).toContain("Central Bank of Nigeria");
    expect(decodedStreams).toContain("Financial Conduct Authority");
  });
});
