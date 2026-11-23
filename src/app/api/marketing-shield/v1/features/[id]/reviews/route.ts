/**
 * Cogent Compliance Platform — Post-Implementation Reviews (PIR),
 * Material Change Reassessments & 3rd-Line Internal Audit Assurance API
 * GET  /api/marketing-shield/v1/features/[id]/reviews
 * POST /api/marketing-shield/v1/features/[id]/reviews
 */

import { z } from "zod";
import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { createPostLaunchReviewSchema } from "@/contracts/feature-governance.contracts";
import { featureGovernanceService } from "@/modules/feature-governance/feature-governance.service";

export const dynamic = "force-dynamic";

const uuidSchema = z.string().uuid();

export const GET = createApiHandler(
  {
    requiredPermission: "feature.read",
  },
  async (_req, { tenant, params }) => {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) {
      throw new AppApiError("VALIDATION_FAILED", "Invalid feature UUID", 400);
    }

    const dossier = await featureGovernanceService.getFeatureDossier(tenant.tenantId, parsedId.data);
    return { reviews: dossier.reviews, total: dossier.reviews.length };
  }
);

export const POST = createApiHandler(
  {
    requiredPermission: "feature.read",
    bodySchema: createPostLaunchReviewSchema,
  },
  async (_req, { tenant, params, body }) => {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) {
      throw new AppApiError("VALIDATION_FAILED", "Invalid feature UUID", 400);
    }

    return await featureGovernanceService.createPostLaunchReview(tenant, parsedId.data, body);
  }
);
