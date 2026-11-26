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

describe("WorkProductService GENERAL_COMPLIANCE_DOCUMENT persistence & pre-migration fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists GENERAL_COMPLIANCE_DOCUMENT / compliance_document natively when DB migration is applied", async () => {
    const insertedPayloads: Record<string, unknown>[] = [];
    const revisionPayloads: Record<string, unknown>[] = [];

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "work_product_artifacts") {
        return {
          insert: (payload: Record<string, unknown>) => {
            insertedPayloads.push(payload);
            return {
              select: () => ({
                single: async () => ({
                  data: {
                    id: "wp_general_1",
                    ...payload,
                    last_exported_at: null,
                    created_at: "2026-11-26T00:00:00.000Z",
                    updated_at: "2026-11-26T00:00:00.000Z",
                  },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      if (table === "work_product_revisions") {
        return {
          insert: async (payload: Record<string, unknown>) => {
            revisionPayloads.push(payload);
            return { data: null, error: null };
          },
        };
      }
      return {};
    });

    const service = new WorkProductService();
    const res = await service.upsertWorkProduct("tenant_1", "user_1", {
      workflow_type: "GENERAL_COMPLIANCE_DOCUMENT",
      artifact_type: "compliance_document",
      title: "Ad-Hoc CBN Circular Compliance Brief",
      markdown_content: "# CBN Circular Brief\n\nDetailed compliance obligations and timeline.",
      structured_payload: { source: "chat_followup" },
    });

    expect(res.created).toBe(true);
    expect(insertedPayloads).toHaveLength(1);
    expect(res.workProduct.workflow_type).toBe("GENERAL_COMPLIANCE_DOCUMENT");
    expect(res.workProduct.artifact_type).toBe("compliance_document");
    expect(revisionPayloads).toHaveLength(1);
    expect(revisionPayloads[0]?.structured_payload).toEqual({ source: "chat_followup" });
  });

  it("gracefully falls back on Postgres 23514 check constraint violation when migration is pending", async () => {
    const insertedPayloads: Record<string, unknown>[] = [];
    const revisionPayloads: Record<string, unknown>[] = [];
    let attempt = 0;

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "work_product_artifacts") {
        return {
          insert: (payload: Record<string, unknown>) => {
            attempt += 1;
            insertedPayloads.push(payload);
            return {
              select: () => ({
                single: async () => {
                  if (attempt === 1) {
                    return {
                      data: null,
                      error: {
                        code: "23514",
                        message:
                          'new row for relation "work_product_artifacts" violates check constraint "work_product_artifacts_workflow_type_check"',
                      },
                    };
                  }
                  return {
                    data: {
                      id: "wp_fallback_1",
                      ...payload,
                      last_exported_at: null,
                      created_at: "2026-11-26T00:00:00.000Z",
                      updated_at: "2026-11-26T00:00:00.000Z",
                    },
                    error: null,
                  };
                },
              }),
            };
          },
        };
      }
      if (table === "work_product_revisions") {
        return {
          insert: async (payload: Record<string, unknown>) => {
            revisionPayloads.push(payload);
            return { data: null, error: null };
          },
        };
      }
      return {};
    });

    const service = new WorkProductService();
    const res = await service.upsertWorkProduct("tenant_1", "user_1", {
      workflow_type: "GENERAL_COMPLIANCE_DOCUMENT",
      artifact_type: "compliance_document",
      title: "Ad-Hoc Compliance Checklist",
      markdown_content: "# Ad-Hoc Checklist\n\n- Action item 1\n- Action item 2",
      structured_payload: { generated_from: "chat_action_button" },
    });

    expect(res.created).toBe(true);
    expect(insertedPayloads).toHaveLength(2);
    expect(insertedPayloads[0]?.workflow_type).toBe("GENERAL_COMPLIANCE_DOCUMENT");
    expect(insertedPayloads[1]?.workflow_type).toBe("PRODUCT_STRUCTURING_MEMO");
    expect(insertedPayloads[1]?.artifact_type).toBe("statutory_structuring_memo");
    expect(res.workProduct.structured_payload).toEqual({
      generated_from: "chat_action_button",
      ad_hoc_document: true,
      requested_workflow_type: "GENERAL_COMPLIANCE_DOCUMENT",
      requested_artifact_type: "compliance_document",
    });
    expect(revisionPayloads).toHaveLength(1);
    expect(revisionPayloads[0]?.structured_payload).toEqual(res.workProduct.structured_payload);
  });

  it("still throws on non-constraint database errors instead of silently retrying", async () => {
    const insertedPayloads: Record<string, unknown>[] = [];

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "work_product_artifacts") {
        return {
          insert: (payload: Record<string, unknown>) => {
            insertedPayloads.push(payload);
            return {
              select: () => ({
                single: async () => ({
                  data: null,
                  error: {
                    code: "42501",
                    message: "permission denied for table work_product_artifacts",
                  },
                }),
              }),
            };
          },
        };
      }
      return {};
    });

    const service = new WorkProductService();
    await expect(
      service.upsertWorkProduct("tenant_1", "user_1", {
        workflow_type: "GENERAL_COMPLIANCE_DOCUMENT",
        artifact_type: "compliance_document",
        title: "Permission Error Case",
        markdown_content: "# Permission Error\n\nShould propagate database error cleanly.",
      })
    ).rejects.toThrow(/Failed to persist work product: permission denied/);

    expect(insertedPayloads).toHaveLength(1);
  });
});

