/**
 * Cogent Compliance OS — Post-Draft Statutory Floor QA Gate API (Stage 5)
 * POST /api/marketing-shield/v1/policies/[id]/qa
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { runPolicyQaSchema } from "@/contracts/policy.contracts";
import { policyWorkflowService } from "@/modules/policies";

export const POST = createApiHandler(
  {
    requiredPermission: "policy.validate_qa",
    bodySchema: runPolicyQaSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Policy id is required", 400);
    }
    return policyWorkflowService.runStatutoryQaGate(tenant, id, body);
  },
);
