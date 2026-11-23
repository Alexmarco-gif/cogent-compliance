/**
 * Cogent Compliance OS — Policy Register & Dashboard API
 * GET  /api/marketing-shield/v1/policies  (KPI Dashboard + Filterable Policy Register)
 * POST /api/marketing-shield/v1/policies  (Stage 2: Initiate Policy or Import from Work Product)
 */

import { createApiHandler } from "@/lib/api-handler";
import { createPolicySchema, listPoliciesQuerySchema } from "@/contracts/policy.contracts";
import { policyWorkflowService } from "@/modules/policies";

export const GET = createApiHandler(
  {
    requiredPermission: "policy.read",
    querySchema: listPoliciesQuerySchema,
  },
  async (_req, { tenant, query }) => {
    return policyWorkflowService.getDashboardAndRegister(tenant, query);
  },
);

export const POST = createApiHandler(
  {
    requiredPermission: "policy.create",
    bodySchema: createPolicySchema,
  },
  async (_req, { tenant, body }) => {
    return policyWorkflowService.createPolicy(tenant, body);
  },
);
