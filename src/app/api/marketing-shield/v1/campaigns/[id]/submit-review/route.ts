/**
 * Cogent Marketing Shield - Submit Campaign for Formal Review Endpoint
 * POST /api/marketing-shield/v1/campaigns/{id}/submit-review
 * Document Reference: Document 04 (Section 5.4), Document 08 (Phase 9)
 */

import { createApiHandler } from "@/lib/api-handler";
import { submitCampaignReviewSchema } from "@/contracts/approval-dossier.contracts";
import { approvalService } from "@/modules/campaigns/approval.service";

export const POST = createApiHandler(
  {
    requiredPermission: "campaign.submit_review",
    bodySchema: submitCampaignReviewSchema,
  },
  async (_req, { tenant, params, body }) => {
    const campaignId = params.id as string;
    return approvalService.submitForReview(
      tenant.tenantId,
      tenant.userId,
      campaignId,
      body,
    );
  },
);
