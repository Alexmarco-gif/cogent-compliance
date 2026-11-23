/**
 * Cogent Compliance Operations - DDQ Post-Submission Follow-Up Register API
 * POST  /api/marketing-shield/v1/ddqs/[id]/followups
 * PATCH /api/marketing-shield/v1/ddqs/[id]/followups
 */

import { createApiHandler } from "@/lib/api-handler";
import { ddqService } from "@/modules/ddq/ddq.service";
import { createDdqFollowupSchema, updateDdqFollowupSchema } from "@/contracts/ddq.contracts";

export const POST = createApiHandler(
  {
    requiredPermission: "campaign.create",
    bodySchema: createDdqFollowupSchema,
  },
  async (_req, { tenant, params, body }) => {
    const ddqId = String(params.id || "");
    return ddqService.createFollowup(tenant.tenantId, tenant.userId, ddqId, body);
  }
);

export const PATCH = createApiHandler(
  {
    requiredPermission: "campaign.create",
    bodySchema: updateDdqFollowupSchema,
  },
  async (_req, { tenant, params, body }) => {
    const ddqId = String(params.id || "");
    return ddqService.updateFollowup(tenant.tenantId, ddqId, body);
  }
);
