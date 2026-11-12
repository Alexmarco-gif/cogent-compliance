/**
 * Cogent Marketing Shield - Generate & Validate Rewrite Suggestions Route
 * Document Reference: Document 04 (Section 5.1), Document 08 (Phase 8)
 */

import { createApiHandler } from "@/lib/api-handler";
import { remediationService } from "@/modules/campaigns/remediation.service";
import { generateRewriteInputSchema } from "@/contracts/remediation.contracts";

const bodySchema = generateRewriteInputSchema.omit({ finding_id: true });

export const POST = createApiHandler(
  {
    requiredPermission: "revision.propose",
    bodySchema,
  },
  async (_req, { tenant, params, body }) => {
    const findingId = params.id as string;
    return remediationService.generateAndValidateRewrite(
      tenant.tenantId,
      tenant.userId,
      findingId,
      {
        finding_id: findingId,
        tone: body.tone ?? "PROFESSIONAL",
        custom_instructions: body.custom_instructions,
      },
    );
  },
);
