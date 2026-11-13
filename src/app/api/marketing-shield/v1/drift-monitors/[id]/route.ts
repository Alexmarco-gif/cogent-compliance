/**
 * Cogent Marketing Shield - Single Drift Monitor Endpoint
 * GET    /api/marketing-shield/v1/drift-monitors/[id]
 * DELETE /api/marketing-shield/v1/drift-monitors/[id]
 * Document Reference: Document 04 (Section 5.5), Document 08 (Phase 11)
 */

import { createApiHandler } from "@/lib/api-handler";
import { driftService } from "@/modules/drift-monitor/drift.service";

/**
 * GET /api/marketing-shield/v1/drift-monitors/[id]
 * Retrieves details, live status, and diff history of a single drift monitor.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (_req, { tenant, params }) => {
    const monitorId = params.id as string;
    return driftService.getDriftMonitor(tenant.tenantId, monitorId);
  }
);

/**
 * DELETE /api/marketing-shield/v1/drift-monitors/[id]
 * Removes a drift monitor.
 */
export const DELETE = createApiHandler(
  {
    requiredPermission: "campaign.create",
  },
  async (_req, { tenant, params }) => {
    const monitorId = params.id as string;
    await driftService.deleteDriftMonitor(tenant.tenantId, tenant.userId, monitorId);
    return { success: true, monitor_id: monitorId };
  }
);
