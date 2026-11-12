/**
 * Cogent Marketing Shield - Campaign Findings Route
 * Document Reference: Document 04 (Section 4.4), Document 08 (Phase 7)
 */

import { createApiHandler } from "@/lib/api-handler";
import { campaignService } from "@/modules/campaigns/campaign.service";

/**
 * GET /api/marketing-shield/v1/campaigns/{id}/findings
 * Lists compliance findings for a campaign.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (_req, { tenant, params }) => {
    const campaignId = params.id as string;
    return campaignService.listFindings(tenant.tenantId, campaignId);
  }
);
