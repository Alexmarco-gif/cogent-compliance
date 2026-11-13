/**
 * Cogent Marketing Shield - Retrieve Statutory Dossier Download URL Endpoint
 * GET /api/marketing-shield/v1/dossiers/{id}
 * Document Reference: Document 04 (Section 5.5), Document 08 (Phase 9)
 */

import { createApiHandler } from "@/lib/api-handler";
import { statutoryDossierService } from "@/modules/dossier/statutory-dossier.service";

export const GET = createApiHandler(
  {
    requiredPermission: "dossier.download",
  },
  async (req, { tenant, params }) => {
    const dossierId = params.id as string;
    const searchParams = req.nextUrl.searchParams;
    const providedKey = searchParams.get("key");

    const storageKey =
      providedKey ||
      `tenants/${tenant.tenantId}/dossiers/${dossierId}.pdf`;

    const downloadUrl = await statutoryDossierService.getDossierDownloadUrl(storageKey);

    return {
      dossier_id: dossierId,
      storage_key: storageKey,
      download_url: downloadUrl,
      expires_in_seconds: 3600,
    };
  },
);
