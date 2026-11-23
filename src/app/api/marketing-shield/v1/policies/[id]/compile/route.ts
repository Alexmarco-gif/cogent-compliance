/**
 * Cogent Compliance OS — Clean vNext Policy Compiler API (Stage 3)
 * POST /api/marketing-shield/v1/policies/[id]/compile
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { compilePolicyRedlineSchema } from "@/contracts/policy.contracts";
import { policyWorkflowService } from "@/modules/policies";

export const POST = createApiHandler(
  {
    requiredPermission: "policy.draft",
    bodySchema: compilePolicyRedlineSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Policy id is required", 400);
    }
    return policyWorkflowService.compileCleanVersion(tenant, id, body);
  },
);
