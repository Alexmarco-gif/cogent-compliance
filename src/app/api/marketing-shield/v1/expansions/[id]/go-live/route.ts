/**
 * Cogent Compliance OS — Stage 6: Formal CCO / Board Go-Live Readiness Gate API
 * POST /api/marketing-shield/v1/expansions/[id]/go-live
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { goLiveGateActionSchema } from "@/contracts/expansion.contracts";
import { expansionWorkflowService } from "@/modules/expansions";

export const POST = createApiHandler(
  {
    requiredPermission: "expansion.read",
    bodySchema: goLiveGateActionSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Expansion id is required", 400);
    }
    return expansionWorkflowService.handleGoLiveGateAction(tenant, id, body);
  },
);
