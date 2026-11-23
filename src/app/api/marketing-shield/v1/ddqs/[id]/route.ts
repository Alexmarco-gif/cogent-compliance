/**
 * Cogent Compliance Operations - Single DDQ Engagement API
 * GET    /api/marketing-shield/v1/ddqs/[id]
 * PATCH  /api/marketing-shield/v1/ddqs/[id]
 * DELETE /api/marketing-shield/v1/ddqs/[id]
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { ddqService } from "@/modules/ddq/ddq.service";
import { updateDdqEngagementSchema } from "@/contracts/ddq.contracts";

export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (_req, { tenant, params }) => {
    const id = String(params.id || "");
    const detail = await ddqService.getEngagementDetail(tenant.tenantId, id);
    if (!detail) {
      throw new AppApiError("NOT_FOUND", "DDQ engagement not found", 404);
    }
    return detail;
  }
);

export const PATCH = createApiHandler(
  {
    requiredPermission: "campaign.create",
    bodySchema: updateDdqEngagementSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = String(params.id || "");
    return ddqService.updateEngagement(tenant.tenantId, tenant.userId, id, body);
  }
);

export const DELETE = createApiHandler(
  {
    requiredPermission: "campaign.create",
  },
  async (_req, { tenant, params }) => {
    const id = String(params.id || "");
    await ddqService.updateEngagement(tenant.tenantId, tenant.userId, id, { status: "ARCHIVED" });
    return { archived: true, id };
  }
);
