/**
 * Cogent Regulatory Intelligence Platform
 * Live Search Quota & Jurisdiction Snapshot Endpoint
 * GET /api/marketing-shield/v1/search/quota
 */

import { createApiHandler } from "@/lib/api-handler";
import { entitlementsService } from "@/modules/billing/entitlements.service";

export const dynamic = "force-dynamic";

export const GET = createApiHandler(
  {
    requiredPermission: "conversation.read",
  },
  async (_req, context) => {
    const quota = await entitlementsService.getLiveSearchQuotaSnapshot(
      context.tenant.tenantId
    );
    return { quota };
  }
);
