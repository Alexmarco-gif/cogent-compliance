/**
 * Cogent Compliance Platform — 1-Click Work Product to Feature Governance Promotion API
 * POST /api/marketing-shield/v1/features/from-work-product
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { promoteWorkProductToFeatureSchema } from "@/contracts/feature-governance.contracts";
import { featureGovernanceService } from "@/modules/feature-governance/feature-governance.service";

export const dynamic = "force-dynamic";

export const POST = createApiHandler(
  {
    requiredPermission: "feature.create",
    bodySchema: promoteWorkProductToFeatureSchema,
  },
  async (_req, { tenant, body }) => {
    try {
      const dossier = await featureGovernanceService.promoteWorkProductToFeature(tenant, body);
      return dossier;
    } catch (err) {
      const msg = (err as Error).message || "Unable to promote work product";
      if (msg.toLowerCase().includes("not found")) {
        throw new AppApiError("NOT_FOUND", msg, 404);
      }
      throw err;
    }
  }
);
