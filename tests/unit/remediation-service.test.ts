/**
 * Cogent Marketing Shield - Remediation Service & Layer 6 Rewrite Validator Unit Tests
 * Document Reference: Document 04 (Section 5.1–5.3), Document 05 (Section 7.1 Layer 6), Document 08 (Phase 8)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { RemediationService } from "@/modules/campaigns/remediation.service";
import { Layer6RewriteValidator } from "@/modules/compliance-assessment/rewrite-validator.service";
import { mechanicalLocksEngine } from "@/modules/compliance-assessment/mechanical-locks";
import { auditService } from "@/modules/audit/audit.service";
import { geminiService } from "@/modules/ai-orchestration/gemini.service";
import { campaignService } from "@/modules/campaigns/campaign.service";

// Helper to create chainable Supabase query mocks
function createMockQuery(resolvedValue: { data: any; error: any }) {
  const query: any = {};
  query.select = vi.fn().mockReturnValue(query);
  query.insert = vi.fn().mockReturnValue(query);
  query.update = vi.fn().mockReturnValue(query);
  query.delete = vi.fn().mockReturnValue(query);
  query.eq = vi.fn().mockReturnValue(query);
  query.in = vi.fn().mockReturnValue(query);
  query.order = vi.fn().mockReturnValue(query);
  query.limit = vi.fn().mockReturnValue(query);
  query.single = vi.fn().mockResolvedValue(resolvedValue);
  query.maybeSingle = vi.fn().mockResolvedValue(resolvedValue);
  query.then = (onfulfilled: any) => Promise.resolve(resolvedValue).then(onfulfilled);
  return query;
}

// Mock Supabase
const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => ({
    from: mockFrom,
  }),
}));

// Mock Audit Service
vi.mock("@/modules/audit/audit.service", () => ({
  auditService: {
    appendEvent: vi.fn().mockResolvedValue({ id: "audit-event-123" }),
  },
}));

// Mock Gemini Service
vi.mock("@/modules/ai-orchestration/gemini.service", () => ({
  geminiService: {
    generateText: vi.fn().mockResolvedValue({
      text: JSON.stringify({
        proposed_text: "Borrow at an interest rate of 18.5% p.a. Terms and conditions apply.",
        explanation: "Removed prohibited zero interest claim and aligned with product truth interest rate.",
      }),
      tokensUsed: { prompt: 120, completion: 45, total: 165 },
    }),
  },
}));

// Mock Campaign Service
vi.mock("@/modules/campaigns/campaign.service", () => ({
  campaignService: {
    triggerAssessment: vi.fn().mockResolvedValue({
      assessment_id: "ass-new-456",
      overall_risk_level: "LOW",
    }),
  },
}));

// Mock Mechanical Locks Engine
vi.mock("@/modules/compliance-assessment/mechanical-locks", () => ({
  mechanicalLocksEngine: {
    executeLocks: vi.fn().mockResolvedValue({
      passed: true,
      totalBreachCount: 0,
      lock1_prohibited_terms: { passed: true, breaches: [] },
      lock2_product_rate_match: { passed: true, breaches: [] },
      lock3_mandatory_disclosures: { passed: true, breaches: [], missingDisclosures: [] },
    }),
  },
}));

describe("Layer 6 Rewrite Validator (Document 05 Section 7.1)", () => {
  let validator: Layer6RewriteValidator;
  const tenantId = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    validator = new Layer6RewriteValidator();
  });

  it("should return PASSED when rewrite resolves non-compliant claim and passes all locks", async () => {
    const report = await validator.validateRewrite({
      tenantId,
      originalText: "Guaranteed 100% free loan with no interest forever",
      proposedText: "Apply for a personal loan at 18.5% APR. Terms and conditions apply.",
      findingClaimText: "Guaranteed 100% free loan with no interest forever",
      productTruth: {
        productName: "QuickCredit",
        productType: "PERSONAL_LOAN",
        interestRateMin: 0.185,
        interestRateMax: 0.185,
        interestRateType: "APR",
        requiredDisclosures: ["Terms and conditions apply"],
      },
      channel: "PAID_SOCIAL_FEED",
    });

    expect(report.validation_status).toBe("PASSED");
    expect(report.original_issue_addressed).toBe(true);
    expect(report.new_prohibited_terms_detected).toBe(false);
    expect(report.product_rate_fee_match).toBe("PASSED");
    expect(report.mandatory_disclosures_present).toBe(true);
    expect(report.failure_reasons).toHaveLength(0);
  });

  it("should return FAILED when proposed text still contains the original non-compliant claim", async () => {
    const report = await validator.validateRewrite({
      tenantId,
      originalText: "Guaranteed 100% free loan",
      proposedText: "Get our Guaranteed 100% free loan today! Terms apply.",
      findingClaimText: "Guaranteed 100% free loan",
      channel: "EMAIL_MARKETING",
    });

    expect(report.validation_status).toBe("FAILED");
    expect(report.original_issue_addressed).toBe(false);
    expect(report.failure_reasons.some((v) => v.includes("Original non-compliant phrase"))).toBe(true);
  });

  it("should return FAILED when proposed text introduces a prohibited term (Lock 1 breach)", async () => {
    vi.mocked(mechanicalLocksEngine.executeLocks).mockResolvedValueOnce({
      passed: false,
      totalBreachCount: 1,
      lock1_prohibited_terms: {
        passed: false,
        breaches: [
          {
            lockNumber: 1,
            lockName: "PROHIBITED_TERMS",
            breachType: "PROHIBITED_TERM",
            severity: "CRITICAL",
            matchedText: "zero risk",
            explanation: "Absolute guarantee is prohibited",
          },
        ],
      },
      lock2_product_rate_match: { passed: true, breaches: [] },
      lock3_mandatory_disclosures: { passed: true, breaches: [], missingDisclosures: [] },
    });

    const report = await validator.validateRewrite({
      tenantId,
      originalText: "Instant approval no check",
      proposedText: "Get our loan with 100% zero risk for your family.",
      findingClaimText: "Instant approval no check",
      channel: "SEARCH_TEXT_AD",
    });

    expect(report.validation_status).toBe("FAILED");
    expect(report.new_prohibited_terms_detected).toBe(true);
    expect(report.failure_reasons.some((v) => v.includes("Lock 1 Breach"))).toBe(true);
  });

  it("should return FAILED when proposed text quotes a contradicted rate (Lock 2 breach)", async () => {
    vi.mocked(mechanicalLocksEngine.executeLocks).mockResolvedValueOnce({
      passed: false,
      totalBreachCount: 1,
      lock1_prohibited_terms: { passed: true, breaches: [] },
      lock2_product_rate_match: {
        passed: false,
        breaches: [
          {
            lockNumber: 2,
            lockName: "PRODUCT_RATE_MISMATCH",
            breachType: "RATE_DISCREPANCY",
            severity: "HIGH",
            matchedText: "5%",
            explanation: "Claimed 5% interest contradicts product rate of 18.5%",
          },
        ],
      },
      lock3_mandatory_disclosures: { passed: true, breaches: [], missingDisclosures: [] },
    });

    const report = await validator.validateRewrite({
      tenantId,
      originalText: "Zero interest forever",
      proposedText: "Enjoy 5% interest rate on your loan today.",
      findingClaimText: "Zero interest forever",
      productTruth: {
        productName: "QuickCredit Loan",
        productType: "PERSONAL_LOAN",
        interestRateMin: 0.185,
        interestRateMax: 0.185,
      },
      channel: "SMS_PROMOTIONAL",
    });

    expect(report.validation_status).toBe("FAILED");
    expect(report.product_rate_fee_match).toBe("FAILED");
    expect(report.failure_reasons.some((v) => v.includes("Lock 2 Breach"))).toBe(true);
  });
});

describe("RemediationService (Document 08 Phase 8)", () => {
  let service: RemediationService;
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const userId = "user_compliance_officer";
  const findingId = "find-1111-1111-1111-111111111111";
  const campaignId = "camp-2222-2222-2222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RemediationService();
  });

  describe("generateAndValidateRewrite", () => {
    it("should generate rewrite using Gemini Pro, validate with Layer 6, and record audit event", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "compliance_findings") {
          return createMockQuery({
            data: {
              id: findingId,
              tenant_id: tenantId,
              campaign_id: campaignId,
              revision_id: "rev-1",
              claim_text: "Borrow money with 0% interest guaranteed!",
              violation_explanation: "Deceptive zero-interest claim violating FCCPA s.115.",
              severity: "CRITICAL",
              source_clause_id: "clause-123",
              regulatory_clauses: {
                clause_reference: "Section 115(1)",
                clause_text: "No marketing shall mislead consumers on actual interest or fees.",
                instrument_title: "FCCPA 2018",
                regulator_acronym: "FCCPC",
              },
            },
            error: null,
          });
        }
        if (table === "marketing_campaigns") {
          return createMockQuery({
            data: {
              id: campaignId,
              campaign_name: "QuickCredit Launch",
              channel: "PAID_SOCIAL_FEED",
              product_id: "prod-999",
            },
            error: null,
          });
        }
        if (table === "campaign_revisions") {
          return createMockQuery({
            data: {
              id: "rev-1",
              content_text: "Borrow money with 0% interest guaranteed! Sign up today.",
            },
            error: null,
          });
        }
        if (table === "campaign_products") {
          return createMockQuery({
            data: {
              product_name: "QuickCredit Loan",
              product_type: "PERSONAL_LOAN",
              nominal_interest_rate_annual: 0.185,
              apr: 0.192,
            },
            error: null,
          });
        }
        return createMockQuery({ data: null, error: null });
      });

      const result = await service.generateAndValidateRewrite(
        tenantId,
        userId,
        findingId,
        {
          finding_id: findingId,
          tone: "PROFESSIONAL",
          custom_instructions: "Ensure APR disclosure is explicit.",
        },
      );

      expect(result.finding_id).toBe(findingId);
      expect(result.original_text).toBe("Borrow money with 0% interest guaranteed!");
      expect(result.proposed_text).toContain("18.5%");
      expect(result.layer_6_validation.validation_status).toBe("PASSED");
      expect(geminiService.generateText).toHaveBeenCalled();
      expect(auditService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          actorId: userId,
          action: "REWRITE_SUGGESTION_GENERATED",
          entityId: findingId,
        }),
      );
    });

    it("should throw an error if finding is not found or not in tenant", async () => {
      mockFrom.mockReturnValue(createMockQuery({ data: null, error: { message: "Not found" } }));

      await expect(
        service.generateAndValidateRewrite(tenantId, userId, "non-existent-id", {
          finding_id: "non-existent-id",
          tone: "PROFESSIONAL",
        }),
      ).rejects.toThrow("Compliance finding non-existent-id not found");
    });
  });

  describe("createCampaignRevision", () => {
    it("should create revision #N+1, invalidate prior approval, and trigger automated reassessment", async () => {
      const parentRevisionId = "rev-0000-0000-0000-000000000001";
      const newRevisionId = "rev-0000-0000-0000-000000000002";

      mockFrom.mockImplementation((table: string) => {
        if (table === "marketing_campaigns") {
          return createMockQuery({
            data: {
              id: campaignId,
              status: "APPROVED", // Previously APPROVED
              current_revision_id: parentRevisionId,
              channel: "PAID_SOCIAL_FEED",
              product_id: "prod-999",
            },
            error: null,
          });
        }
        if (table === "campaign_revisions") {
          return createMockQuery({
            data: {
              id: newRevisionId,
              tenant_id: tenantId,
              campaign_id: campaignId,
              revision_number: 2,
              parent_revision_id: parentRevisionId,
              content_text: "Updated compliant ad copy with accurate 18.5% APR.",
              revision_source: "AI_REWRITE_ACCEPTED",
              change_summary: "Accepted Layer 6 compliant rewrite.",
              created_by: userId,
              created_at: new Date().toISOString(),
            },
            error: null,
          });
        }
        return createMockQuery({ data: null, error: null });
      });

      const result = await service.createCampaignRevision(
        tenantId,
        userId,
        campaignId,
        {
          parent_revision_id: parentRevisionId,
          content_text: "Updated compliant ad copy with accurate 18.5% APR.",
          revision_source: "AI_REWRITE_ACCEPTED",
          change_summary: "Accepted Layer 6 compliant rewrite.",
          auto_reassess: true,
        },
      );

      // Verify revision properties
      expect(result.revision.revision_number).toBe(2);
      // Invalidation of prior approval: status transitioned to RESUBMITTED
      expect(result.campaignStatus).toBe("RESUBMITTED");

      // Verify automated reassessment was triggered
      expect(campaignService.triggerAssessment).toHaveBeenCalledWith(
        tenantId,
        userId,
        campaignId,
        {
          revision_id: newRevisionId,
          include_live_web_check: false,
        },
      );

      // Verify audit event was logged
      expect(auditService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          actorId: userId,
          action: "CAMPAIGN_REVISION_CREATED",
          entityId: newRevisionId,
        }),
      );
    });
  });

  describe("compareRevisions", () => {
    it("should compute word-level diff segments and resolution deltas between two revisions", async () => {
      const fromRevId = "rev-1";
      const toRevId = "rev-2";

      mockFrom.mockImplementation((table: string) => {
        if (table === "campaign_revisions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockImplementation((_col: string, val: string) => {
                    const content =
                      val === fromRevId
                        ? "Get a free loan guaranteed today."
                        : "Get a loan at 18.5% APR today.";
                    const num = val === fromRevId ? 1 : 2;
                    return {
                      single: vi.fn().mockResolvedValue({
                        data: {
                          id: val,
                          revision_number: num,
                          content_text: content,
                          created_at: new Date().toISOString(),
                        },
                        error: null,
                      }),
                    };
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "compliance_assessments") {
          return createMockQuery({
            data: {
              id: "ass-1",
              overall_risk_level: "HIGH",
              numerical_rate_status: "FAILED",
              prohibited_lexicon_status: "FAILED",
              mandatory_disclosure_status: "PASSED",
            },
            error: null,
          });
        }
        if (table === "compliance_findings") {
          return createMockQuery({
            data: [
              {
                id: "f-1",
                claim_text: "free loan",
                severity: "CRITICAL",
                violation_explanation: "Prohibited zero fee claim.",
              },
            ],
            error: null,
          });
        }
        return createMockQuery({ data: null, error: null });
      });

      const diff = await service.compareRevisions(
        tenantId,
        campaignId,
        fromRevId,
        toRevId,
      );

      expect(diff.from_revision.id).toBe(fromRevId);
      expect(diff.to_revision.id).toBe(toRevId);
      expect(diff.from_revision.revision_number).toBe(1);
      expect(diff.to_revision.revision_number).toBe(2);
      expect(diff.text_diff.length).toBeGreaterThan(0);

      // Verify diff segments contain removed and added parts
      const removedSegments = diff.text_diff.filter((s) => s.type === "removed");
      const addedSegments = diff.text_diff.filter((s) => s.type === "added");

      expect(removedSegments.length).toBeGreaterThan(0);
      expect(addedSegments.length).toBeGreaterThan(0);
      expect(removedSegments.some((s) => s.value.includes("free"))).toBe(true);
      expect(addedSegments.some((s) => s.value.includes("18.5%"))).toBe(true);
    });
  });
});
