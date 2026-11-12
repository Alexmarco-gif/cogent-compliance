/**
 * Cogent Marketing Shield - Asset Upload Session Route
 * Document Reference: Document 04 (Section 4.3), Document 08 (Phase 7)
 */

import { createApiHandler } from "@/lib/api-handler";
import { campaignService } from "@/modules/campaigns/campaign.service";
import { assetUploadSessionRequestSchema } from "@/contracts/campaign.contracts";

/**
 * POST /api/marketing-shield/v1/assets/upload-session
 * Generates presigned R2 upload URL and registers pending asset.
 */
export const POST = createApiHandler(
  {
    requiredPermission: "asset.upload",
    bodySchema: assetUploadSessionRequestSchema,
  },
  async (_req, { tenant, body }) => {
    return campaignService.createAssetUploadSession(
      tenant.tenantId,
      tenant.userId,
      body,
    );
  }
);
