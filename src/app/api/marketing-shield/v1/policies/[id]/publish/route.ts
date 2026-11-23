/**
 * Cogent Compliance OS — Policy Publication, Delta Brief, Attestations & Operationalization API (Stages 7 & 8)
 * POST /api/marketing-shield/v1/policies/[id]/publish
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { publishPolicySchema } from "@/contracts/policy.contracts";
import { policyWorkflowService } from "@/modules/policies";

export const POST = createApiHandler(
  {
    requiredPermission: "policy.publish",
    bodySchema: publishPolicySchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Policy id is required", 400);
    }
    return policyWorkflowService.publishAndOperationalize(tenant, id, body);
  },
);
