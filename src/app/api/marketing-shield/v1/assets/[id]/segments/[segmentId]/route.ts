/**
 * Cogent Marketing Shield - Update Extraction Segment Route
 * Document Reference: Document 04 (Section 4.3), Document 08 (Phase 7)
 */

import { createApiHandler } from "@/lib/api-handler";
import { campaignService } from "@/modules/campaigns/campaign.service";
import { updateExtractionSegmentSchema } from "@/contracts/campaign.contracts";

/**
 * PATCH /api/marketing-shield/v1/assets/{id}/segments/{segmentId}
 * Corrects low-confidence OCR segment text and logs audit event.
 */
export const PATCH = createApiHandler(
  {
    requiredPermission: "campaign.create",
    bodySchema: updateExtractionSegmentSchema,
  },
  async (_req, { tenant, params, body }) => {
    const assetId = params.id as string;
    const segmentId = params.segmentId as string;
    return campaignService.updateExtractionSegment(
      tenant.tenantId,
      tenant.userId,
      assetId,
      segmentId,
      body,
    );
  }
);
