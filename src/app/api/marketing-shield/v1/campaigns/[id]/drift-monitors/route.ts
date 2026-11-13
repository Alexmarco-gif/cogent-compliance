/**
 * Cogent Marketing Shield - Campaign Drift Monitors Endpoint
 * POST /api/marketing-shield/v1/campaigns/[id]/drift-monitors
 * GET  /api/marketing-shield/v1/campaigns/[id]/drift-monitors
 * Document Reference: Document 04 (Section 5.5), Document 08 (Phase 11)
 */

import { z } from "zod";
import { createApiHandler } from "@/lib/api-handler";
import { driftService } from "@/modules/drift-monitor/drift.service";

const createCampaignDriftMonitorSchema = z.object({
  approved_revision_id: z.string().uuid().optional(),
  published_url: z
    .string()
    .url("Must be a valid URL")
    .refine((u) => u.startsWith("https://"), {
      message: "Only HTTPS promotional URLs are permitted for drift monitoring",
    }),
});

/**
 * GET /api/marketing-shield/v1/campaigns/[id]/drift-monitors
 * Lists drift monitors for a specific campaign.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (_req, { tenant, params }) => {
    const campaignId = params.id as string;
    return driftService.listDriftMonitors(tenant.tenantId, { campaign_id: campaignId });
  }
);

/**
 * POST /api/marketing-shield/v1/campaigns/[id]/drift-monitors
 * Links a live published URL to an approved campaign revision for drift monitoring.
 */
export const POST = createApiHandler(
  {
    requiredPermission: "campaign.create",
    bodySchema: createCampaignDriftMonitorSchema,
  },
  async (_req, { tenant, params, body }) => {
    const campaignId = params.id as string;
    return driftService.createDriftMonitor(tenant.tenantId, tenant.userId, {
      campaign_id: campaignId,
      approved_revision_id: body.approved_revision_id,
      published_url: body.published_url,
    });
  }
);
