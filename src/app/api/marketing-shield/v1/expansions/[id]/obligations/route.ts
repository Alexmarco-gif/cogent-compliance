/**
 * Cogent Compliance OS — Stage 1 & 2: Regulatory Obligations & Licensing Register API
 * POST  /api/marketing-shield/v1/expansions/[id]/obligations
 * PATCH /api/marketing-shield/v1/expansions/[id]/obligations
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import {
  createObligationSchema,
  updateObligationSchema,
} from "@/contracts/expansion.contracts";
import { expansionWorkflowService } from "@/modules/expansions";

export const POST = createApiHandler(
  {
    requiredPermission: "expansion.manage",
    bodySchema: createObligationSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Expansion id is required", 400);
    }
    return expansionWorkflowService.addObligation(tenant, id, body);
  },
);

export const PATCH = createApiHandler(
  {
    requiredPermission: "expansion.manage",
    bodySchema: updateObligationSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Expansion id is required", 400);
    }
    return expansionWorkflowService.updateObligation(tenant, id, body);
  },
);
