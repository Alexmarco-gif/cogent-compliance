/**
 * Cogent Compliance OS — Cross-Border Expansion Program Detail & Stage Update API
 * GET   /api/marketing-shield/v1/expansions/[id]  (Full 8-Stage Bundle + 6-Question CCO Readiness Report)
 * PATCH /api/marketing-shield/v1/expansions/[id]  (Update Operating Model, Stage, Risk Appetite, Status)
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { updateExpansionSchema } from "@/contracts/expansion.contracts";
import { expansionWorkflowService } from "@/modules/expansions";

export const GET = createApiHandler(
  {
    requiredPermission: "expansion.read",
  },
  async (_req, { tenant, params }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Expansion id is required", 400);
    }
    return expansionWorkflowService.getExpansionDetail(tenant, id);
  },
);

export const PATCH = createApiHandler(
  {
    requiredPermission: "expansion.manage",
    bodySchema: updateExpansionSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Expansion id is required", 400);
    }
    return expansionWorkflowService.updateExpansionProgram(tenant, id, body);
  },
);
