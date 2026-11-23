/**
 * Cogent Compliance Operations - Bulk Departmental Assignment API
 * POST /api/marketing-shield/v1/ddqs/[id]/questions/bulk-assign
 */

import { createApiHandler } from "@/lib/api-handler";
import { ddqService } from "@/modules/ddq/ddq.service";
import { bulkAssignQuestionsSchema } from "@/contracts/ddq.contracts";

export const POST = createApiHandler(
  {
    requiredPermission: "campaign.create",
    bodySchema: bulkAssignQuestionsSchema,
  },
  async (_req, { tenant, params, body }) => {
    const ddqId = String(params.id || "");
    return ddqService.bulkAssignQuestions(tenant.tenantId, tenant.userId, ddqId, body);
  }
);
