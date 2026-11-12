/**
 * Cogent Marketing Shield - Compare Campaign Revisions Route
 * Document Reference: Document 04 (Section 5.3), Document 08 (Phase 8)
 */

import { createApiHandler } from "@/lib/api-handler";
import { remediationService } from "@/modules/campaigns/remediation.service";
import { compareRevisionsQuerySchema } from "@/contracts/remediation.contracts";

/**
 * GET /api/marketing-shield/v1/campaigns/{id}/revisions/compare?from_revision_id=...&to_revision_id=...
 * Returns structured word diffs, resolved findings, and deterministic lock comparisons.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
    querySchema: compareRevisionsQuerySchema,
  },
  async (_req, { tenant, params, query }) => {
    const campaignId = params.id as string;
    return remediationService.compareRevisions(
      tenant.tenantId,
      campaignId,
      query.from_revision_id,
      query.to_revision_id,
    );
  },
);
