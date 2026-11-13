/**
 * Cogent Marketing Shield - Approval Service Unit Tests
 * Document Reference: Document 04 (Section 5.4), Document 07 (Section 5.2 Separation of Duties), Document 08 (Phase 9)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApprovalService } from "@/modules/campaigns/approval.service";
import { auditService } from "@/modules/audit/audit.service";
import { notificationService } from "@/lib/notifications";

// Helper for chainable Supabase query mocks
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
    appendEvent: vi.fn().mockResolvedValue({ id: "audit-123" }),
  },
}));

// Mock Notification Service
vi.mock("@/lib/notifications", () => ({
  notificationService: {
    sendReviewRequest: vi.fn().mockResolvedValue({ success: true, messageId: "msg-123" }),
    sendApprovalDecision: vi.fn().mockResolvedValue({ success: true, messageId: "msg-456" }),
  },
}));

describe("ApprovalService (Document 08 Phase 9)", () => {
  let service: ApprovalService;
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const campaignId = "camp-2222-2222-2222-222222222222";
  const revisionId = "rev-3333-3333-3333-333333333333";
  const officerUserId = "user_cco_001";
  const marketingUserId = "user_growth_001";

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ApprovalService();
  });

  describe("submitForReview", () => {
    it("should verify revision, transition status to UNDER_REVIEW, dispatch notification, and record audit event", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "marketing_campaigns") {
          return createMockQuery({
            data: {
              id: campaignId,
              campaign_name: "Easter Credit Promo 2026",
              channel: "PAID_SOCIAL_FEED",
              status: "FINDINGS_AVAILABLE",
              current_revision_id: revisionId,
            },
            error: null,
          });
        }
        if (table === "campaign_revisions") {
          return createMockQuery({
            data: {
              id: revisionId,
              revision_number: 2,
              content_text: "Compliant ad copy",
            },
            error: null,
          });
        }
        if (table === "campaign_reviews") {
          return createMockQuery({
            data: {
              id: "review-101",
              tenant_id: tenantId,
              campaign_id: campaignId,
              revision_id: revisionId,
              reviewer_id: marketingUserId,
              review_status: "PENDING",
              started_at: new Date().toISOString(),
            },
            error: null,
          });
        }
        if (table === "tenants") {
          return createMockQuery({
            data: { name: "First Continental Bank PLC" },
            error: null,
          });
        }
        return createMockQuery({ data: null, error: null });
      });

      const result = await service.submitForReview(tenantId, marketingUserId, campaignId, {
        revision_id: revisionId,
        comment: "High risk findings addressed. Ready for CCO review.",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("UNDER_REVIEW");
      expect(result.review_id).toBe("review-101");

      // Verify email notification dispatched
      expect(notificationService.sendReviewRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign_id: campaignId,
          campaign_title: "Easter Credit Promo 2026",
          submitter_name: marketingUserId,
        }),
      );

      // Verify audit event recorded
      expect(auditService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          actorId: marketingUserId,
          action: "CAMPAIGN_SUBMITTED_FOR_REVIEW",
          entityId: campaignId,
        }),
      );
    });

    it("should throw an error if campaign is not found", async () => {
      mockFrom.mockReturnValue(createMockQuery({ data: null, error: { message: "Not found" } }));

      await expect(
        service.submitForReview(tenantId, marketingUserId, "unknown-id", {
          revision_id: revisionId,
        }),
      ).rejects.toThrow("Campaign unknown-id not found");
    });
  });

  describe("recordApprovalDecision & Separation of Duties", () => {
    it("should block MARKETING_GROWTH users from approving campaigns (Separation of Duties)", async () => {
      await expect(
        service.recordApprovalDecision(
          tenantId,
          marketingUserId,
          campaignId,
          {
            revision_id: revisionId,
            decision: "APPROVED",
            decision_reason: "Marketing self-approval attempt",
          },
          "MARKETING_GROWTH",
        ),
      ).rejects.toThrow("403 APPROVAL_NOT_PERMITTED");
    });

    it("should block COMPLIANCE_ANALYST users from formal approval (Separation of Duties)", async () => {
      await expect(
        service.recordApprovalDecision(
          tenantId,
          "analyst_user",
          campaignId,
          {
            revision_id: revisionId,
            decision: "APPROVED",
            decision_reason: "Analyst approval attempt",
          },
          "COMPLIANCE_ANALYST",
        ),
      ).rejects.toThrow("403 APPROVAL_NOT_PERMITTED");
    });

    it("should record APPROVED decision for CCO, update status, and log audit trail", async () => {
      const approvalId = "appr-999";

      mockFrom.mockImplementation((table: string) => {
        if (table === "marketing_campaigns") {
          return createMockQuery({
            data: {
              id: campaignId,
              campaign_name: "QuickCredit Launch",
              status: "UNDER_REVIEW",
              current_revision_id: revisionId,
              created_by: "another_user",
            },
            error: null,
          });
        }
        if (table === "campaign_revisions") {
          return createMockQuery({
            data: {
              id: revisionId,
              created_by: "another_user",
              revision_number: 2,
            },
            error: null,
          });
        }
        if (table === "campaign_approvals") {
          return createMockQuery({
            data: {
              id: approvalId,
              tenant_id: tenantId,
              campaign_id: campaignId,
              revision_id: revisionId,
              approved_by: officerUserId,
              decision: "APPROVED",
              decision_reason: "Verified against FCCPA 2018 §115 and rate card truth.",
              conditions: { arcon_pre_vetting_required: true },
              decided_at: new Date().toISOString(),
            },
            error: null,
          });
        }
        if (table === "campaign_reviews") {
          return createMockQuery({ data: null, error: null });
        }
        return createMockQuery({ data: null, error: null });
      });

      const result = await service.recordApprovalDecision(
        tenantId,
        officerUserId,
        campaignId,
        {
          revision_id: revisionId,
          decision: "APPROVED",
          decision_reason: "Verified against FCCPA 2018 §115 and rate card truth.",
          conditions: { arcon_pre_vetting_required: true },
        },
        "CHIEF_COMPLIANCE_OFFICER",
      );

      expect(result.campaignStatus).toBe("APPROVED");
      expect(result.approvedRevisionId).toBe(revisionId);
      expect(result.approval.id).toBe(approvalId);

      // Verify email notification
      expect(notificationService.sendApprovalDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign_id: campaignId,
          decision: "APPROVED",
          officer_name: officerUserId,
        }),
      );

      // Verify audit event
      expect(auditService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          actorId: officerUserId,
          action: "CAMPAIGN_APPROVED",
          entityId: approvalId,
        }),
      );
    });

    it("should record REJECTED decision, reset approved_revision_id to null, and update status to REJECTED", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "marketing_campaigns") {
          return createMockQuery({
            data: {
              id: campaignId,
              campaign_name: "Risky Ad Copy",
              status: "UNDER_REVIEW",
              current_revision_id: revisionId,
              created_by: "user_growth",
            },
            error: null,
          });
        }
        if (table === "campaign_revisions") {
          return createMockQuery({
            data: { id: revisionId, created_by: "user_growth", revision_number: 1 },
            error: null,
          });
        }
        if (table === "campaign_approvals") {
          return createMockQuery({
            data: {
              id: "appr-rejected",
              tenant_id: tenantId,
              campaign_id: campaignId,
              revision_id: revisionId,
              approved_by: officerUserId,
              decision: "REJECTED",
              decision_reason: "Violates CBN CPF §4.2 on guaranteed returns.",
              decided_at: new Date().toISOString(),
            },
            error: null,
          });
        }
        return createMockQuery({ data: null, error: null });
      });

      const result = await service.recordApprovalDecision(
        tenantId,
        officerUserId,
        campaignId,
        {
          revision_id: revisionId,
          decision: "REJECTED",
          decision_reason: "Violates CBN CPF §4.2 on guaranteed returns.",
        },
        "LEGAL_COUNSEL",
      );

      expect(result.campaignStatus).toBe("REJECTED");
      expect(result.approvedRevisionId).toBeNull();
      expect(auditService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CAMPAIGN_REJECTED",
        }),
      );
    });

    it("should reject approval if revision_id does not match current active campaign revision", async () => {
      mockFrom.mockReturnValue(
        createMockQuery({
          data: {
            id: campaignId,
            current_revision_id: "rev-active-999",
          },
          error: null,
        }),
      );

      await expect(
        service.recordApprovalDecision(
          tenantId,
          officerUserId,
          campaignId,
          {
            revision_id: "rev-stale-000",
            decision: "APPROVED",
            decision_reason: "Approval on stale revision",
          },
          "LEGAL_COUNSEL",
        ),
      ).rejects.toThrow("is not the current active revision");
    });
  });
});
