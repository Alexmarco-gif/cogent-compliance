/**
 * Cogent Regulatory Intelligence Platform
 * Work Product Inline Revision Versioning Deduplication Tests
 */

import crypto from "crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabaseFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => ({
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  }),
}));

vi.mock("@/modules/audit/audit.service", () => ({
  auditService: {
    appendEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/modules/compliance-assessment/guardrails.validator", () => ({
  guardrailValidator: {
    validateWorkProduct: vi.fn(async (candidate: { markdown_content: string }) => ({
      passed: true,
      sanitized_markdown: candidate.markdown_content,
      sanitized_citations: [],
      evidence_gaps: [],
      guardrail_report: {
        passed: true,
        verified_vault_ids: [],
        stripped_vault_ids: [],
        verified_urls: [],
        stripped_ungrounded_urls: [],
        legal_floor_warnings: [],
        evidence_gaps_count: 0,
      },
    })),
  },
}));

import { WorkProductService } from "@/modules/work-products/work-product.service";

describe("WorkProductService inline version deduplication", () => {
  const markdown = "# Compliance Memo\n\nAll mandatory CBN disclosures are verified.";
  const sha = crypto.createHash("sha256").update(markdown, "utf8").digest("hex");

  const existingRecord = {
    id: "wp_1",
    tenant_id: "tenant_1",
    conversation_id: null,
    message_id: null,
    workflow_type: "SUPERVISORY_DDQ_RESPONSE",
    artifact_type: "supervisory_ddq_response",
    title: "Supervisory DDQ Response",
    jurisdiction_scope: ["NG"],
    markdown_content: markdown,
    structured_payload: {},
    citations: [],
    evidence_gaps: [],
    guardrail_report: { passed: true },
    version_number: 1,
    status: "DRAFT",
    source_hash_sha256: sha,
    created_by: "user_1",
    updated_by: "user_1",
    last_exported_at: null,
    created_at: "2026-11-18T00:00:00.000Z",
    updated_at: "2026-11-18T00:00:00.000Z",
  };

  const existingRevision = {
    id: "rev_1",
    tenant_id: "tenant_1",
    work_product_id: "wp_1",
    version_number: 1,
    markdown_content: markdown,
    structured_payload: {},
    change_summary: "Initial draft synthesized",
    edited_by: "user_1",
    source_hash_sha256: sha,
    created_at: "2026-11-18T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not bump version_number when auto-save submits identical content, title, and status", async () => {
    const updateSpy = vi.fn();
    const insertSpy = vi.fn();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "work_product_artifacts") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: existingRecord, error: null }),
              }),
            }),
          }),
          update: updateSpy,
        };
      }
      if (table === "work_product_revisions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: existingRevision, error: null }),
                }),
              }),
            }),
          }),
          insert: insertSpy,
        };
      }
      return {};
    });

    const service = new WorkProductService();
    const res = await service.updateWorkProductInline("tenant_1", "user_1", "wp_1", {
      title: "Supervisory DDQ Response",
      markdown_content: markdown,
      change_summary: "Studio Canvas Word edit",
    });

    expect(res.workProduct.version_number).toBe(1);
    expect(res.revision.version_number).toBe(1);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("increments version_number when auto-save submits modified content", async () => {
    const updatedMarkdown = "# Compliance Memo\n\nUpdated with verified DPO registration number.";
    const updatedSha = crypto.createHash("sha256").update(updatedMarkdown, "utf8").digest("hex");
    const updatedRecord = {
      ...existingRecord,
      markdown_content: updatedMarkdown,
      version_number: 2,
      source_hash_sha256: updatedSha,
    };
    const updatedRevision = {
      ...existingRevision,
      id: "rev_2",
      version_number: 2,
      markdown_content: updatedMarkdown,
      change_summary: "Studio Canvas Word edit",
      source_hash_sha256: updatedSha,
    };

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "work_product_artifacts") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: existingRecord, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({ data: updatedRecord, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "work_product_revisions") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: updatedRevision, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const service = new WorkProductService();
    const res = await service.updateWorkProductInline("tenant_1", "user_1", "wp_1", {
      title: "Supervisory DDQ Response",
      markdown_content: updatedMarkdown,
      change_summary: "Studio Canvas Word edit",
    });

    expect(res.workProduct.version_number).toBe(2);
    expect(res.revision.version_number).toBe(2);
  });
});
