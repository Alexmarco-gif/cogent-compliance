/**
 * Cogent Marketing Shield - Campaign Detail Route
 * Document Reference: Document 04 (Section 4.2), Document 08 (Phase 7)
 */

import { createApiHandler } from "@/lib/api-handler";
import { campaignService } from "@/modules/campaigns/campaign.service";

/**
 * GET /api/marketing-shield/v1/campaigns/{id}
 * Retrieves campaign details, current revision, linked product, assets, and assessment.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (_req, { tenant, params }) => {
    const campaignId = params.id as string;
    return campaignService.getCampaignById(tenant.tenantId, campaignId);
  }
);
