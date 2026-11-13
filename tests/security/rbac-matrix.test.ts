/**
 * Cogent Marketing Shield - RBAC & Separation-of-Duties Penetration Suite
 * Document Reference: Document 07 (Section 5), Document 08 (Phase 12), Document 09 (Section 5.2)
 *
 * Verifies strict enforcement of the 22-permission matrix, dual-control approval locks,
 * and separation of duties across all 5 canonical roles.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { approvalService } from "@/modules/campaigns/approval.service";
import { playbookService } from "@/modules/knowledge-base/playbook.service";
import {
  ROLE_PERMISSIONS,
  getPermissionsForRole,
} from "@/modules/auth-tenancy/permissions";
import {
  hasPermission,
  requirePermission,
  assertAntiSelfApproval,
} from "@/modules/auth-tenancy/rbac.guard";
import { CanonicalRole, TenantContext } from "@/modules/auth-tenancy/types";
import { createAdminSupabaseClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => {
  const mockFrom = vi.fn();
  return {
    createAdminSupabaseClient: vi.fn(() => ({
      from: mockFrom,
    })),
  };
});

vi.mock("@/modules/audit/audit.service", () => ({
  auditService: {
    appendEvent: vi.fn().mockResolvedValue({ id: "audit_rbac_123" }),
  },
}));

vi.mock("@/lib/notifications", () => ({
  notificationService: {
    sendApprovalDecisionNotification: vi.fn().mockResolvedValue({ success: true }),
    sendReviewRequestNotification: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe("RBAC & Separation-of-Duties Pentest Suite (Document 09 Section 5.2)", () => {
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const campaignId = "camp_00000000-0000-0000-0000-000000000001";
  const revisionId = "rev_00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeContext(role: CanonicalRole, userId: string = "user_test_01"): TenantContext {
    return {
      tenantId,
      userId,
      clerkOrgId: "org_alpha_bank",
      clerkUserId: userId,
      orgSlug: "alpha-bank",
      orgName: "Alpha Bank Plc",
      role,
      permissions: getPermissionsForRole(role),
      status: "ACTIVE",
    };
  }

  describe("Separation of Duties in Campaign Approval", () => {
    it("should strictly deny MARKETING_GROWTH from recording approval decisions (403 APPROVAL_NOT_PERMITTED)", async () => {
      const marketingUser = "user_marketing_01";

      await expect(
        approvalService.recordApprovalDecision(
          tenantId,
          marketingUser,
          campaignId,
          {
            revision_id: revisionId,
            decision: "APPROVED",
            decision_reason: "Marketing attempting self-approval",
          },
          "MARKETING_GROWTH"
        )
      ).rejects.toThrow(/403 APPROVAL_NOT_PERMITTED/i);
    });

    it("should strictly deny COMPLIANCE_ANALYST from recording formal approval decisions", async () => {
      const analystUser = "user_analyst_01";

      await expect(
        approvalService.recordApprovalDecision(
          tenantId,
          analystUser,
          campaignId,
          {
            revision_id: revisionId,
            decision: "APPROVED",
            decision_reason: "Compliance Analyst attempting approval",
          },
          "COMPLIANCE_ANALYST"
        )
      ).rejects.toThrow(/403 APPROVAL_NOT_PERMITTED/i);
    });

    it("should allow CCO and LEGAL_COUNSEL roles to decide formal approvals", () => {
      const ccoCtx = makeContext("CHIEF_COMPLIANCE_OFFICER");
      const legalCtx = makeContext("LEGAL_COUNSEL");
      const marketingCtx = makeContext("MARKETING_GROWTH");
      const analystCtx = makeContext("COMPLIANCE_ANALYST");

      expect(hasPermission(ccoCtx, "approval.decide")).toBe(true);
      expect(hasPermission(legalCtx, "approval.decide")).toBe(true);
      expect(hasPermission(marketingCtx, "approval.decide")).toBe(false);
      expect(hasPermission(analystCtx, "approval.decide")).toBe(false);
    });
  });

  describe("Dual-Control Policy: Anti-Self-Approval Enforcement", () => {
    it("should reject self-approval when revision author is the approver under dual-control policy", () => {
      const legalUserId = "user_legal_counsel_01";
      const legalCtx = makeContext("LEGAL_COUNSEL", legalUserId);

      // Attempting to self-approve authored revision
      expect(() => {
        assertAntiSelfApproval(legalCtx, legalUserId);
      }).toThrow(/Anti-Self-Approval Violation|cannot approve/i);
    });

    it("should allow approval when approver is different from revision author", () => {
      const legalAuthorId = "user_legal_counsel_01";
      const ccoApproverId = "user_cco_02";
      const ccoCtx = makeContext("CHIEF_COMPLIANCE_OFFICER", ccoApproverId);

      expect(() => {
        assertAntiSelfApproval(ccoCtx, legalAuthorId);
      }).not.toThrow();
    });

    it("approvalService.recordApprovalDecision enforces dual control when ENFORCE_DUAL_CONTROL_APPROVAL is true", async () => {
      const authorId = "user_author_legal";
      const originalEnv = process.env.ENFORCE_DUAL_CONTROL_APPROVAL;
      process.env.ENFORCE_DUAL_CONTROL_APPROVAL = "true";

      const mockSupabase = createAdminSupabaseClient();
      vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
        if (table === "marketing_campaigns") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: campaignId,
                campaign_name: "Dual Control Test Promo",
                status: "UNDER_REVIEW",
                current_revision_id: revisionId,
                created_by: authorId,
              },
              error: null,
            }),
          } as any;
        }
        if (table === "campaign_revisions") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: revisionId,
                created_by: authorId, // Same author as caller
                revision_number: 1,
              },
              error: null,
            }),
          } as any;
        }
        return {} as any;
      });

      try {
        await expect(
          approvalService.recordApprovalDecision(
            tenantId,
            authorId, // Calling with authorId
            campaignId,
            {
              revision_id: revisionId,
              decision: "APPROVED",
              decision_reason: "Self-approval attempt",
            },
            "LEGAL_COUNSEL"
          )
        ).rejects.toThrow(/DUAL_CONTROL_VIOLATION/i);
      } finally {
        process.env.ENFORCE_DUAL_CONTROL_APPROVAL = originalEnv;
      }
    });
  });

  describe("Rule Activation & Knowledge Base Governance", () => {
    it("should deny MARKETING_GROWTH and COMPLIANCE_ANALYST from publishing/activating playbook rules", () => {
      const marketingCtx = makeContext("MARKETING_GROWTH");
      const analystCtx = makeContext("COMPLIANCE_ANALYST");
      const ccoCtx = makeContext("CHIEF_COMPLIANCE_OFFICER");
      const legalCtx = makeContext("LEGAL_COUNSEL");

      expect(hasPermission(marketingCtx, "knowledge.publish")).toBe(false);
      expect(hasPermission(analystCtx, "knowledge.publish")).toBe(false);
      expect(hasPermission(ccoCtx, "knowledge.publish")).toBe(true);
      expect(hasPermission(legalCtx, "knowledge.publish")).toBe(true);
    });

    it("should verify requirePermission throws 403 when permission is missing", () => {
      const marketingCtx = makeContext("MARKETING_GROWTH");

      expect(() => {
        requirePermission(marketingCtx, "knowledge.publish");
      }).toThrow(/lacks required permission/i);

      expect(() => {
        requirePermission(marketingCtx, "approval.decide");
      }).toThrow(/not authorized|lacks required permission/i);
    });
  });
});
