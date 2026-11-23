/**
 * Cogent Compliance OS — Policy Detail & Metadata API
 * GET   /api/marketing-shield/v1/policies/[id]
 * PATCH /api/marketing-shield/v1/policies/[id]
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { updatePolicySchema } from "@/contracts/policy.contracts";
import { policyWorkflowService } from "@/modules/policies";

export const GET = createApiHandler(
  {
    requiredPermission: "policy.read",
  },
  async (_req, { tenant, params }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Policy id is required", 400);
    }
    return policyWorkflowService.getPolicyDetail(tenant, id);
  },
);

export const PATCH = createApiHandler(
  {
    requiredPermission: "policy.draft",
    bodySchema: updatePolicySchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Policy id is required", 400);
    }
    return policyWorkflowService.updatePolicyMetadata(tenant, id, body);
  },
);
