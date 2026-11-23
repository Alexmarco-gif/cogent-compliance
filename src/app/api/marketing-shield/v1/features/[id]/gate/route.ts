/**
 * Cogent Compliance Platform — Interactive Launch Readiness Gate API
 * POST /api/marketing-shield/v1/features/[id]/gate
 * Supports SUBMIT_FOR_GATE (1st/2nd Line) and RECORD_DECISION (2nd Line only, non-overridable blockers).
 */

import { z } from "zod";
import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { submitGateActionSchema } from "@/contracts/feature-governance.contracts";
import { featureGovernanceService } from "@/modules/feature-governance/feature-governance.service";

export const dynamic = "force-dynamic";

const uuidSchema = z.string().uuid();

export const POST = createApiHandler(
  {
    requiredPermission: "feature.read",
    bodySchema: submitGateActionSchema,
  },
  async (_req, { tenant, params, body }) => {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) {
      throw new AppApiError("VALIDATION_FAILED", "Invalid feature UUID", 400);
    }

    return await featureGovernanceService.handleLaunchGate(tenant, parsedId.data, body);
  }
);
