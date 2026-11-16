/**
 * Cogent Marketing Shield - Campaign Approvals & Sign-Off Endpoint
 * GET /api/marketing-shield/v1/campaigns/{id}/approvals
 * POST /api/marketing-shield/v1/campaigns/{id}/approvals
 * Document Reference: Document 04 (Section 5.4), Document 07 (Section 5.2), Document 08 (Phase 9)
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { campaignApprovalDecisionSchema } from "@/contracts/approval-dossier.contracts";
import { approvalService } from "@/modules/campaigns/approval.service";
import { entitlementsService } from "@/modules/billing/entitlements.service";

/**
 * GET /api/marketing-shield/v1/campaigns/{id}/approvals
 * Lists historical approval decisions and reviews.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (_req, { tenant, params }) => {
    const campaignId = params.id as string;
    return approvalService.listApprovalsAndReviews(tenant.tenantId, campaignId);
  },
);

/**
 * POST /api/marketing-shield/v1/campaigns/{id}/approvals
 * Records formal approval or rejection decision.
 * Strictly gated by approval.decide permission.
 */
export const POST = createApiHandler(
  {
    requiredPermission: "approval.decide",
    bodySchema: campaignApprovalDecisionSchema,
  },
  async (_req, { tenant, params, body }) => {
    const subInfo = await entitlementsService.getTenantSubscriptionInfo(tenant.tenantId);
    if (subInfo.isTrial && subInfo.isTrialExpired) {
      throw new AppApiError(
        "FORBIDDEN",
        "Your 7-day Evaluation Pilot has expired. Upgrade to Growth or Scale to continue.",
        402,
      );
    }

    const campaignId = params.id as string;
    return approvalService.recordApprovalDecision(
      tenant.tenantId,
      tenant.userId,
      campaignId,
      body,
      tenant.role,
    );
  },
);
