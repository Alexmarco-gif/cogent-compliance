/**
 * Cogent Compliance OS — Stage 6: Pre-Launch Compliance Validation Tests API
 * POST  /api/marketing-shield/v1/expansions/[id]/validation
 * PATCH /api/marketing-shield/v1/expansions/[id]/validation
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import {
  createValidationTestSchema,
  updateValidationTestSchema,
} from "@/contracts/expansion.contracts";
import { expansionWorkflowService } from "@/modules/expansions";

export const POST = createApiHandler(
  {
    requiredPermission: "expansion.validate",
    bodySchema: createValidationTestSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Expansion id is required", 400);
    }
    return expansionWorkflowService.addValidationTest(tenant, id, body);
  },
);

export const PATCH = createApiHandler(
  {
    requiredPermission: "expansion.validate",
    bodySchema: updateValidationTestSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Expansion id is required", 400);
    }
    return expansionWorkflowService.updateValidationTest(tenant, id, body);
  },
);
