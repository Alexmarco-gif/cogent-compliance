/**
 * Cogent Marketing Shield - Complete Asset Upload Route
 * Document Reference: Document 04 (Section 4.3), Document 08 (Phase 7)
 */

import { createApiHandler } from "@/lib/api-handler";
import { campaignService } from "@/modules/campaigns/campaign.service";
import { completeAssetUploadSchema } from "@/contracts/campaign.contracts";

/**
 * POST /api/marketing-shield/v1/assets/{id}/complete
 * Verifies uploaded asset in R2, extracts OCR/text, and optionally triggers assessment.
 */
export const POST = createApiHandler(
  {
    requiredPermission: "asset.upload",
    bodySchema: completeAssetUploadSchema,
  },
  async (_req, { tenant, params, body }) => {
    const assetId = params.id as string;
    return campaignService.completeAssetUpload(
      tenant.tenantId,
      tenant.userId,
      assetId,
      body,
    );
  }
);
