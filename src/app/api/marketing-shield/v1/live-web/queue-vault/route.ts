/**
 * Cogent Marketing Shield - Queue Discovered Circular Endpoint
 * POST /api/marketing-shield/v1/live-web/queue-vault
 * Document Reference: Document 04 (Section 6.1), Document 08 (Phase 11)
 */

import { createApiHandler } from "@/lib/api-handler";
import { queueDiscoveredCircularSchema } from "@/contracts/drift.contracts";
import { driftService } from "@/modules/drift-monitor/drift.service";

/**
 * POST /api/marketing-shield/v1/live-web/queue-vault
 * Admin workflow: Queues a verified official regulatory circular discovered in live_web_retrievals
 * into the Statutory Vault ingestion pipeline.
 */
export const POST = createApiHandler(
  {
    requiredPermission: "knowledge.write",
    bodySchema: queueDiscoveredCircularSchema,
  },
  async (_req, { tenant, body }) => {
    return driftService.queueDiscoveredCircular(tenant.tenantId, tenant.userId, body);
  }
);
