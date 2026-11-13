/**
 * Cogent Marketing Shield - Tenant Drift Monitors Endpoint
 * GET /api/marketing-shield/v1/drift-monitors
 * Document Reference: Document 04 (Section 5.5), Document 08 (Phase 11)
 */

import { createApiHandler } from "@/lib/api-handler";
import { queryDriftMonitorsSchema } from "@/contracts/drift.contracts";
import { driftService } from "@/modules/drift-monitor/drift.service";

/**
 * GET /api/marketing-shield/v1/drift-monitors
 * Lists post-publication URL drift monitors for the tenant.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
    querySchema: queryDriftMonitorsSchema,
  },
  async (_req, { tenant, query }) => {
    return driftService.listDriftMonitors(tenant.tenantId, query);
  }
);
