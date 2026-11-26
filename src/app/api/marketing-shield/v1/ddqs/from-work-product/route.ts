/**
 * Cogent Compliance Operations - Promote Chat DDQ Work Product to DDQ Operations
 * POST /api/marketing-shield/v1/ddqs/from-work-product
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { promoteWorkProductToDdqSchema } from "@/contracts/ddq.contracts";
import { ddqService } from "@/modules/ddq/ddq.service";

export const dynamic = "force-dynamic";

export const POST = createApiHandler(
  {
    bodySchema: promoteWorkProductToDdqSchema,
    requiredPermission: "campaign.create",
  },
  async (_req, { tenant, body }) => {
    try {
      return await ddqService.promoteWorkProductToDdq(tenant.tenantId, tenant.userId, body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to promote DDQ work product";
      if (msg.toLowerCase().includes("not found")) {
        throw new AppApiError("NOT_FOUND", msg, 404);
      }
      throw err;
    }
  }
);
