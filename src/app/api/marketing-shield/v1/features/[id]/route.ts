/**
 * Cogent Compliance Platform — Feature Dossier Detail & Update API
 * GET   /api/marketing-shield/v1/features/[id]
 * PATCH /api/marketing-shield/v1/features/[id]
 */

import { z } from "zod";
import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { updateFeatureSchema } from "@/contracts/feature-governance.contracts";
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

    try {
      return await featureGovernanceService.getFeatureDossier(tenant.tenantId, parsedId.data);
    } catch (err) {
      const msg = (err as Error).message || "Feature not found";
      if (msg.toLowerCase().includes("not found")) {
        throw new AppApiError("NOT_FOUND", msg, 404);
      }
      throw err;
    }
  }
);

export const PATCH = createApiHandler(
  {
    requiredPermission: "feature.update",
    bodySchema: updateFeatureSchema,
  },
  async (_req, { tenant, params, body }) => {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) {
      throw new AppApiError("VALIDATION_FAILED", "Invalid feature UUID", 400);
    }

    try {
      return await featureGovernanceService.updateFeature(tenant, parsedId.data, body);
    } catch (err) {
      const msg = (err as Error).message || "Failed to update feature";
      if (msg.toLowerCase().includes("not found")) {
        throw new AppApiError("NOT_FOUND", msg, 404);
      }
      throw err;
    }
  }
);
