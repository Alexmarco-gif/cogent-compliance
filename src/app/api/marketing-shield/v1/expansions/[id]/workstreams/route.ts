/**
 * Cogent Compliance OS — Stage 5: Cross-Functional Operational Workstreams & Controls API
 * POST  /api/marketing-shield/v1/expansions/[id]/workstreams
 * PATCH /api/marketing-shield/v1/expansions/[id]/workstreams
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import {
  createWorkstreamSchema,
  updateWorkstreamSchema,
} from "@/contracts/expansion.contracts";
import { expansionWorkflowService } from "@/modules/expansions";

export const POST = createApiHandler(
  {
    requiredPermission: "expansion.manage",
    bodySchema: createWorkstreamSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Expansion id is required", 400);
    }
    return expansionWorkflowService.addWorkstream(tenant, id, body);
  },
);

export const PATCH = createApiHandler(
  {
    requiredPermission: "expansion.manage",
    bodySchema: updateWorkstreamSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Expansion id is required", 400);
    }
    return expansionWorkflowService.updateWorkstream(tenant, id, body);
  },
);
