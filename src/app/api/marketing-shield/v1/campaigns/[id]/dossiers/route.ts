/**
 * Cogent Marketing Shield - Generate Statutory Compliance PDF Dossier Endpoint
 * POST /api/marketing-shield/v1/campaigns/{id}/dossiers
 * Document Reference: Document 04 (Section 5.5), Document 08 (Phase 9)
 */

import { createApiHandler } from "@/lib/api-handler";
import { generateDossierSchema } from "@/contracts/approval-dossier.contracts";
import { statutoryDossierService } from "@/modules/dossier/statutory-dossier.service";

export const POST = createApiHandler(
  {
    requiredPermission: "dossier.generate",
    bodySchema: generateDossierSchema,
  },
  async (_req, { tenant, params, body }) => {
    const campaignId = params.id as string;
    return statutoryDossierService.generateDossier(
      tenant.tenantId,
      tenant.userId,
      campaignId,
      body.revision_id,
    );
  },
);
