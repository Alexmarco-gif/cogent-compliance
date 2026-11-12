/**
 * Cogent Marketing Shield - Campaigns Collection Route
 * Document Reference: Document 04 (Section 4.1, 4.2), Document 08 (Phase 7)
 */

import { createApiHandler } from "@/lib/api-handler";
import { campaignService } from "@/modules/campaigns/campaign.service";
import {
  createCampaignSchema,
  listCampaignsQuerySchema,
} from "@/contracts/campaign.contracts";

/**
 * GET /api/marketing-shield/v1/campaigns
 * Lists tenant-scoped campaigns with optional filters.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
    querySchema: listCampaignsQuerySchema,
  },
  async (_req, { tenant, query }) => {
    return campaignService.listCampaigns(tenant.tenantId, query);
  }
);

/**
 * POST /api/marketing-shield/v1/campaigns
 * Creates a new marketing campaign and initial revision.
 */
export const POST = createApiHandler(
  {
    requiredPermission: "campaign.create",
    bodySchema: createCampaignSchema,
  },
  async (_req, { tenant, body }) => {
    return campaignService.createCampaign(tenant.tenantId, tenant.userId, body);
  }
);
