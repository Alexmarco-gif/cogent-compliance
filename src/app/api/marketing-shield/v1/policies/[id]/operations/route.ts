/**
 * Cogent Compliance OS — Live Policy Operations API (Controls, Implementation Tasks, Employee Attestations)
 * PATCH /api/marketing-shield/v1/policies/[id]/operations
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { policyOperationsPatchSchema } from "@/contracts/policy.contracts";
import { policyWorkflowService } from "@/modules/policies";

export const PATCH = createApiHandler(
  {
    requiredPermission: "policy.read",
    bodySchema: policyOperationsPatchSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Policy id is required", 400);
    }
    return policyWorkflowService.handleOperationalUpdate(tenant, id, body);
  },
);
