/**
 * Cogent Marketing Shield - Gemini Institutional Tools Unit Tests (Tools 7 & 8)
 * Document Reference: Document 04 (Section 7.1, 7.2), Document 08 (Phase 10)
 */

import { describe, it, expect, vi } from "vitest";
import {
  STATUTORY_TOOL_DECLARATIONS,
  statutoryToolExecutor,
} from "@/modules/ai-orchestration/tools/statutory-tools";
import { productService } from "@/modules/knowledge-base/product.service";
import { playbookService } from "@/modules/knowledge-base/playbook.service";

describe("Gemini Institutional Copilot Tools Registry", () => {
  it("declares search_institutional_knowledge and get_product_approved_terms in tool registry", () => {
    const toolNames = STATUTORY_TOOL_DECLARATIONS.map((t) => t.name);
    expect(toolNames).toContain("search_institutional_knowledge");
    expect(toolNames).toContain("get_product_approved_terms");

    const tool7 = STATUTORY_TOOL_DECLARATIONS.find((t) => t.name === "search_institutional_knowledge");
    expect(tool7?.parameters?.required).toContain("query");

    const tool8 = STATUTORY_TOOL_DECLARATIONS.find((t) => t.name === "get_product_approved_terms");
    expect(tool8?.description).toContain("campaign_products");
  });

  it("Tool 7: search_institutional_knowledge returns INSTITUTIONAL_KNOWLEDGE source class", async () => {
    vi.spyOn(playbookService, "searchInstitutionalKnowledge").mockResolvedValueOnce({
      chunks: [
        {
          chunk_id: "chunk_001",
          document_id: "doc_001",
          chunk_text: "Processing fees must remain capped at 2.0% for retail salary loans.",
          document_title: "Fair Lending Playbook 2026",
          rrf_score: 0.85,
        },
      ],
      activeRules: [
        {
          id: "rule_001",
          tenant_id: "tenant_alpha",
          knowledge_document_id: "doc_001",
          rule_title: "Rate/Fee Limit: Capped at 2%",
          rule_text: "Processing fees shall not exceed 2.0%",
          rule_type: "RATE_FEE_LIMIT",
          severity: "CRITICAL",
          status: "ACTIVE",
          effective_date: "2026-01-01",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    });

    const res = await statutoryToolExecutor.searchInstitutionalKnowledge(
      { query: "processing fee cap" },
      { tenantId: "tenant_alpha" }
    );

    expect(res.success).toBe(true);
    expect(res.source_class).toBe("INSTITUTIONAL_KNOWLEDGE");
    expect((res.chunks as Array<unknown>).length).toBe(1);
    expect((res.rules as Array<unknown>).length).toBe(1);
  });

  it("Tool 8: get_product_approved_terms returns structured approved terms", async () => {
    vi.spyOn(productService, "getProductTruth").mockResolvedValueOnce({
      id: "prod_123",
      tenant_id: "tenant_alpha",
      product_name: "QuickCash Salary Advance",
      product_type: "DIGITAL_LENDING",
      description: "Short term credit",
      approved_terms: {
        interest_rate_min: 4.0,
        interest_rate_max: 6.0,
        interest_rate_type: "MONTHLY",
        processing_fee_percent: 1.5,
        tenor_min_days: 30,
        tenor_max_days: 90,
      },
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const res = await statutoryToolExecutor.getProductApprovedTerms(
      { product_name_query: "QuickCash" },
      { tenantId: "tenant_alpha" }
    );

    expect(res.success).toBe(true);
    expect(res.product_truth).not.toBeNull();
    const pt = res.product_truth as Record<string, unknown>;
    expect(pt.product_name).toBe("QuickCash Salary Advance");
    expect((pt.approved_terms as Record<string, unknown>).processing_fee_percent).toBe(1.5);
  });
});
