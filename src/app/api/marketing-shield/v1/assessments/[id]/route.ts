/**
 * Cogent Marketing Shield - Assessment Detail Route
 * Document Reference: Document 04 (Section 4.4), Document 08 (Phase 7)
 */

import { createApiHandler } from "@/lib/api-handler";
import { campaignService } from "@/modules/campaigns/campaign.service";

/**
 * GET /api/marketing-shield/v1/assessments/{id}
 * Retrieves assessment summary, lock findings, and risk levels.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "assessment.read",
  },
  async (_req, { tenant, params }) => {
    const assessmentId = params.id as string;
    return campaignService.getAssessment(tenant.tenantId, assessmentId);
  }
);
