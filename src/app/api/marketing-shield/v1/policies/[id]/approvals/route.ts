/**
 * Cogent Compliance OS — Multi-Tier Delegated Approval & Board Pack API (Stage 6)
 * POST /api/marketing-shield/v1/policies/[id]/approvals
 *  - action: "SUBMIT" (Requires QA gate PASSED; generates Board Pack & sequential DoA steps)
 *  - action: "DECIDE" (Enforces Three Lines independence, DoA tier authority & sequence)
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { policyApprovalPostSchema } from "@/contracts/policy.contracts";
import { policyWorkflowService } from "@/modules/policies";

export const POST = createApiHandler(
  {
    requiredPermission: "policy.read",
    bodySchema: policyApprovalPostSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Policy id is required", 400);
    }
    return policyWorkflowService.handleApprovalAction(tenant, id, body);
  },
);
