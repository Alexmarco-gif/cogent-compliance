/**
 * Cogent Marketing Shield - Trigger Immediate Drift Check Endpoint
 * POST /api/marketing-shield/v1/drift-monitors/[id]/check
 * Document Reference: Document 04 (Section 5.5), Document 08 (Phase 11)
 */

import { createApiHandler } from "@/lib/api-handler";
import { driftService } from "@/modules/drift-monitor/drift.service";

/**
 * POST /api/marketing-shield/v1/drift-monitors/[id]/check
 * Triggers an immediate post-publication drift inspection on the monitor's published URL.
 */
export const POST = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (_req, { tenant, params }) => {
    const monitorId = params.id as string;
    return driftService.checkDrift(tenant.tenantId, tenant.userId, monitorId);
  }
);
