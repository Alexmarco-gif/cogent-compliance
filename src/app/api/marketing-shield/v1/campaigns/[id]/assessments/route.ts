/**
 * Cogent Marketing Shield - Trigger Campaign Assessment Route
 * Document Reference: Document 04 (Section 4.4), Document 08 (Phase 7)
 */

import { createApiHandler } from "@/lib/api-handler";
import { campaignService } from "@/modules/campaigns/campaign.service";
import { triggerAssessmentSchema } from "@/contracts/campaign.contracts";

/**
 * POST /api/marketing-shield/v1/campaigns/{id}/assessments
 * Triggers autonomous compliance assessment with 3 Locks and 7 Guardrails.
 */
export const POST = createApiHandler(
  {
    requiredPermission: "campaign.create",
    bodySchema: triggerAssessmentSchema,
  },
  async (_req, { tenant, params, body }) => {
    const campaignId = params.id as string;
    return campaignService.triggerAssessment(
      tenant.tenantId,
      tenant.userId,
      campaignId,
      body,
    );
  }
);
