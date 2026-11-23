/**
 * Cogent Compliance OS — Stage 4: Country-Specific & Enterprise Risk Register API
 * POST  /api/marketing-shield/v1/expansions/[id]/risks
 * PATCH /api/marketing-shield/v1/expansions/[id]/risks
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import {
  createRiskSchema,
  updateRiskSchema,
} from "@/contracts/expansion.contracts";
import { expansionWorkflowService } from "@/modules/expansions";

export const POST = createApiHandler(
  {
    requiredPermission: "expansion.manage",
    bodySchema: createRiskSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Expansion id is required", 400);
    }
    return expansionWorkflowService.addRisk(tenant, id, body);
  },
);

export const PATCH = createApiHandler(
  {
    requiredPermission: "expansion.manage",
    bodySchema: updateRiskSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Expansion id is required", 400);
    }
    return expansionWorkflowService.updateRisk(tenant, id, body);
  },
);
