/**
 * Cogent Compliance Platform — Product Features Registry API
 * GET  /api/marketing-shield/v1/features
 * POST /api/marketing-shield/v1/features
 */

import { z } from "zod";
import { createApiHandler } from "@/lib/api-handler";
import { createFeatureSchema } from "@/contracts/feature-governance.contracts";
import { featureGovernanceService } from "@/modules/feature-governance/feature-governance.service";

export const dynamic = "force-dynamic";

const listFeaturesQuerySchema = z.object({
  lifecycle_stage: z.string().optional(),
  gate_status: z.string().optional(),
  materiality_tier: z.string().optional(),
});

export const GET = createApiHandler(
  {
    requiredPermission: "feature.read",
    querySchema: listFeaturesQuerySchema,
  },
  async (_req, { tenant, query }) => {
    const features = await featureGovernanceService.listFeatures(tenant.tenantId, {
      lifecycle_stage: query.lifecycle_stage,
      gate_status: query.gate_status,
      materiality_tier: query.materiality_tier,
    });
    return { features, total: features.length };
  }
);

export const POST = createApiHandler(
  {
    requiredPermission: "feature.create",
    bodySchema: createFeatureSchema,
  },
  async (_req, { tenant, body }) => {
    const dossier = await featureGovernanceService.createFeature(tenant, body);
    return dossier;
  }
);
