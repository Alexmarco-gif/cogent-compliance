/**
 * Cogent Regulatory Intelligence Platform
 * Unified Search Endpoint (Track A: Workspace + Vault; Track B/C: Entitlement-Gated Exa + SerpAPI)
 * POST /api/marketing-shield/v1/search
 */

import { createApiHandler } from "@/lib/api-handler";
import { unifiedSearchRequestSchema } from "@/contracts/search.contracts";
import { unifiedSearchService } from "@/modules/live-web-intelligence/unified-search.service";

export const dynamic = "force-dynamic";

export const POST = createApiHandler(
  {
    bodySchema: unifiedSearchRequestSchema,
    requiredPermission: "conversation.read",
  },
  async (_req, context) => {
    const result = await unifiedSearchService.executeUnifiedSearch(
      context.tenant.tenantId,
      context.body
    );

    return result;
  }
);
