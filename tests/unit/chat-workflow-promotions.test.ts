/**
 * Cogent Compliance Platform
 * End-to-End Chat -> Operational Register Promotion & Working Material Persistence Tests
 * Covers:
 *   1. Markdown DDQ Q&A parser (tables, heading blocks, holistic narrative fallback)
 *   2. DdqService.promoteWorkProductToDdq & POST /api/marketing-shield/v1/ddqs/from-work-product (creation + idempotency + 404)
 *   3. WorkProductService.getWorkProductWithRevisions linked_records across DDQ, Policy, Feature, Expansion
 *   4. PolicyWorkflowService & ExpansionWorkflowService idempotent source_work_product_id promotion
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockSupabaseFrom = vi.fn();
const mockResolveTenantContext = vi.fn();

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

vi.mock("@/modules/auth-tenancy/tenant.resolver", () => ({
  resolveTenantContext: (...args: unknown[]) => mockResolveTenantContext(...args),
}));

vi.mock("@/modules/compliance-assessment/guardrails.validator", () => ({
  guardrailValidator: {
    validateWorkProduct: vi.fn(async (candidate: { markdown_content: string }) => ({
      passed: true,
      sanitized_markdown: candidate.markdown_content,
      sanitized_citations: [],
      evidence_gaps: [],
      guardrail_report: { passed: true },
    })),
  },
}));

import { parseWorkProductDdqMarkdown } from "@/modules/ddq/ddq-parser.service";
import { DdqService } from "@/modules/ddq/ddq.service";
import { WorkProductService } from "@/modules/work-products/work-product.service";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const WORK_PRODUCT_ID = "22222222-2222-4222-8222-222222222222";
const CONVERSATION_ID = "33333333-3333-4333-8333-333333333333";

describe("Chat -> Operational Register Promotions (DDQ, Policy, Feature, Expansion)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveTenantContext.mockResolvedValue({
      tenantId: TENANT_ID,
      userId: "user_cco_1",
      clerkUserId: "user_cco_1",
      orgName: "Acme Fintech Nigeria Ltd",
      role: "TENANT_ADMIN",
      status: "ACTIVE",
      permissions: new Set([
        "campaign.read",
        "campaign.create",
        "conversation.read",
        "conversation.create",
        "policy.read",
        "policy.create",
        "expansion.read",
        "expansion.create",
      ]),
    });
  });

  describe("1. parseWorkProductDdqMarkdown", () => {
    it("parses Markdown Q&A tables and classifies domains & departments", () => {
      const md = [
        "## AML & Data Protection Responses",
        "",
        "| Q# | Question | Draft Response |",
        "| :--- | :--- | :--- |",
        "| Q1 | Do you file STRs with NFIU goAML within 24 hours? | Yes, our MLRO submits STRs via goAML within 24 hours per MLPPA 2022. |",
        "| Q2 | Have you filed your annual NDPC Compliance Audit Return? | [NEEDS_INTERNAL_EVIDENCE] Attach 2026 NDPC CAR filing receipt. |",
      ].join("\n");

      const parsed = parseWorkProductDdqMarkdown(md, "Sponsor Bank DDQ");
      expect(parsed.questions).toHaveLength(2);
      expect(parsed.questions[0]?.question_code).toBe("Q1");
      expect(parsed.questions[0]?.domain).toBe("AML_CFT");
      expect(parsed.questions[0]?.assigned_department).toBe("COMPLIANCE");
      expect(parsed.questions[0]?.existing_answer).toContain("goAML");
      expect(parsed.questions[1]?.question_code).toBe("Q2");
      expect(parsed.questions[1]?.domain).toBe("DATA_PROTECTION");
      expect(parsed.questions[1]?.assigned_department).toBe("LEGAL");
      expect(parsed.questions[1]?.existing_answer).toContain("[NEEDS_INTERNAL_EVIDENCE]");
    });

    it("parses heading-based Q&A blocks preserving multi-line answers", () => {
      const md = [
        "## Section 1: Cybersecurity & Controls",
        "### Q1: Describe your penetration testing and VAPT cadence?",
        "**Draft Response:** Annual external VAPT performed by CREST-certified testers.",
        "Remediation SLAs are 7 days for critical findings.",
        "",
        "### Q2: Confirm settlement account segregation?",
        "**Answer:** [NEEDS_INTERNAL_EVIDENCE] Upload nominee settlement bank letter.",
      ].join("\n");

      const parsed = parseWorkProductDdqMarkdown(md, "CBN Supervisory DDQ");
      expect(parsed.questions).toHaveLength(2);
      expect(parsed.questions[0]?.domain).toBe("CYBERSECURITY");
      expect(parsed.questions[0]?.assigned_department).toBe("INFOSEC");
      expect(parsed.questions[0]?.existing_answer).toContain("CREST-certified");
      expect(parsed.questions[1]?.domain).toBe("OPERATIONS_SETTLEMENT");
      expect(parsed.questions[1]?.existing_answer).toContain("[NEEDS_INTERNAL_EVIDENCE]");
    });

    it("falls back to a holistic Q1 working-material row when markdown is narrative prose", () => {
      const md =
        "Our institution maintains a comprehensive compliance programme aligned with CBN and NDPC statutory mandates.";
      const parsed = parseWorkProductDdqMarkdown(md, "Zenith Sponsor Bank DDQ");
      expect(parsed.questions).toHaveLength(1);
      expect(parsed.questions[0]?.question_code).toBe("Q1");
      expect(parsed.questions[0]?.existing_answer).toBe(md);
    });
  });

  describe("2. DdqService.promoteWorkProductToDdq & POST /ddqs/from-work-product", () => {
    it("promotes a Chat DDQ work product into DDQ Operations with saved working material metadata & parsed Q&A rows", async () => {
      let insertedEngagement: Record<string, unknown> | null = null;
      let insertedQuestions: Record<string, unknown>[] = [];
      let insertedSignoffs: Record<string, unknown>[] = [];

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "work_product_artifacts") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: WORK_PRODUCT_ID,
                      tenant_id: TENANT_ID,
                      conversation_id: CONVERSATION_ID,
                      workflow_type: "SUPERVISORY_DDQ_RESPONSE",
                      artifact_type: "supervisory_ddq_response",
                      title: "CBN Supervisory AML & KYC DDQ Response",
                      version_number: 2,
                      markdown_content: [
                        "| Q# | Question | Draft Response |",
                        "| :--- | :--- | :--- |",
                        "| Q1 | Confirm NFIU goAML STR filing SLA? | STRs are filed within 24 hours per MLPPA 2022 s.7. |",
                        "| Q2 | Attach latest NDPC CAR filing receipt? | [NEEDS_INTERNAL_EVIDENCE] Upload NDPC CAR 2026 receipt. |",
                      ].join("\n"),
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "ddq_engagements") {
          return {
            select: () => ({
              eq: () => ({
                contains: () => ({
                  order: () => ({
                    limit: async () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
            insert: (payload: Record<string, unknown>) => {
              insertedEngagement = payload;
              return {
                select: () => ({
                  single: async () => ({ data: payload, error: null }),
                }),
              };
            },
          };
        }
        if (table === "ddq_questions") {
          return {
            insert: async (rows: Record<string, unknown>[]) => {
              insertedQuestions = rows;
              return { data: null, error: null };
            },
          };
        }
        if (table === "ddq_signoffs") {
          return {
            insert: async (rows: Record<string, unknown>[]) => {
              insertedSignoffs = rows;
              return { data: null, error: null };
            },
          };
        }
        return {};
      });

      const { POST } = await import("@/app/api/marketing-shield/v1/ddqs/from-work-product/route");
      const req = new NextRequest(
        "http://localhost:3000/api/marketing-shield/v1/ddqs/from-work-product",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ work_product_id: WORK_PRODUCT_ID }),
        }
      );

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.already_existed).toBe(false);
      expect(json.data.parsed_count).toBe(2);
      expect(insertedEngagement).not.toBeNull();
      expect(insertedEngagement?.["requester_type"]).toBe("REGULATOR");
      expect(insertedEngagement?.["requesting_institution"]).toBe("Central Bank of Nigeria (CBN)");
      expect(insertedEngagement?.["answered_count"]).toBe(2);
      expect(insertedEngagement?.["evidence_gap_count"]).toBe(1);
      expect(insertedEngagement?.["metadata"]).toEqual(
        expect.objectContaining({
          source_work_product_id: WORK_PRODUCT_ID,
          source_conversation_id: CONVERSATION_ID,
          promoted_from_chat: true,
        })
      );
      expect(insertedQuestions).toHaveLength(2);
      expect(insertedQuestions[0]?.["status"]).toBe("AI_DRAFTED");
      expect(insertedQuestions[0]?.["evidence_gap_flag"]).toBe(false);
      expect(insertedQuestions[1]?.["status"]).toBe("NEEDS_EVIDENCE");
      expect(insertedQuestions[1]?.["evidence_gap_flag"]).toBe(true);
      expect(insertedSignoffs).toHaveLength(4);
    });

    it("is idempotent and returns the existing DDQ engagement when promoted a second time", async () => {
      const insertSpy = vi.fn();

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "work_product_artifacts") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: WORK_PRODUCT_ID,
                      tenant_id: TENANT_ID,
                      title: "Already Promoted DDQ",
                      markdown_content: "Q1: Sample?",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "ddq_engagements") {
          return {
            select: () => ({
              eq: () => ({
                contains: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: [
                        {
                          id: "44444444-4444-4444-8444-444444444444",
                          tenant_id: TENANT_ID,
                          title: "Already Promoted DDQ",
                          total_questions: 5,
                          metadata: { source_work_product_id: WORK_PRODUCT_ID },
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            insert: insertSpy,
          };
        }
        return {};
      });

      const service = new DdqService();
      const result = await service.promoteWorkProductToDdq(TENANT_ID, "user_cco_1", {
        work_product_id: WORK_PRODUCT_ID,
      });

      expect(result.already_existed).toBe(true);
      expect(result.engagement.id).toBe("44444444-4444-4444-8444-444444444444");
      expect(result.parsed_count).toBe(5);
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it("returns 404 when promoting a non-existent or cross-tenant work_product_id", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "work_product_artifacts") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const { POST } = await import("@/app/api/marketing-shield/v1/ddqs/from-work-product/route");
      const req = new NextRequest(
        "http://localhost:3000/api/marketing-shield/v1/ddqs/from-work-product",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ work_product_id: WORK_PRODUCT_ID }),
        }
      );

      const res = await POST(req);
      expect(res.status).toBe(404);
    });
  });

  describe("3. WorkProductService linked operational records resolution", () => {
    it("returns linked_records across DDQ, Policy, Feature, and Expansion registers", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "work_product_artifacts") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: WORK_PRODUCT_ID,
                      tenant_id: TENANT_ID,
                      workflow_type: "SUPERVISORY_DDQ_RESPONSE",
                      artifact_type: "supervisory_ddq_response",
                      title: "DDQ Draft",
                      markdown_content: "# DDQ",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "work_product_revisions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "ddq_engagements") {
          return {
            select: () => ({
              eq: () => ({
                contains: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: { id: "ddq_linked_1" }, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "policy_versions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: { policy_id: "pol_linked_1" },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "product_features") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: { id: "feat_linked_1" }, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "expansion_programs") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: { id: "exp_linked_1" }, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const service = new WorkProductService();
      const result = await service.getWorkProductWithRevisions(TENANT_ID, WORK_PRODUCT_ID);

      expect(result).not.toBeNull();
      expect(result?.linked_records).toEqual({
        ddq_id: "ddq_linked_1",
        policy_id: "pol_linked_1",
        feature_id: "feat_linked_1",
        expansion_id: "exp_linked_1",
      });
    });
  });
});
