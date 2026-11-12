/**
 * Cogent Marketing Shield - Campaign Revisions CRUD Route
 * Document Reference: Document 04 (Section 5.2), Document 08 (Phase 8)
 */

import { createApiHandler } from "@/lib/api-handler";
import { remediationService } from "@/modules/campaigns/remediation.service";
import { createCampaignRevisionSchema } from "@/contracts/remediation.contracts";

/**
 * GET /api/marketing-shield/v1/campaigns/{id}/revisions
 * Lists all revisions for a campaign.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (_req, { tenant, params }) => {
    const campaignId = params.id as string;
    return remediationService.listRevisions(tenant.tenantId, campaignId);
  },
);

/**
 * POST /api/marketing-shield/v1/campaigns/{id}/revisions
 * Creates an immutable revision (Revision #N+1), invalidates prior approval, and triggers reassessment.
 */
export const POST = createApiHandler(
  {
    requiredPermission: "revision.create",
    bodySchema: createCampaignRevisionSchema,
  },
  async (_req, { tenant, params, body }) => {
    const campaignId = params.id as string;
    return remediationService.createCampaignRevision(
      tenant.tenantId,
      tenant.userId,
      campaignId,
      body,
    );
  },
);
