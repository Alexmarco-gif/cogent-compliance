/**
 * Cogent Compliance OS — Stage 3: Group → Local Policy Framework Localisation API
 * POST /api/marketing-shield/v1/expansions/[id]/localisations (Update Localisation or Spawn Country Policy in Policy OS)
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { localisationActionSchema } from "@/contracts/expansion.contracts";
import { expansionWorkflowService } from "@/modules/expansions";

export const POST = createApiHandler(
  {
    requiredPermission: "expansion.manage",
    bodySchema: localisationActionSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Expansion id is required", 400);
    }
    return expansionWorkflowService.handleLocalisationAction(tenant, id, body);
  },
);
