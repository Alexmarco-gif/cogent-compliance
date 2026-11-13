/**
 * Cogent Marketing Shield - Individual Knowledge Base Document Endpoint
 * GET /api/marketing-shield/v1/knowledge-base/documents/[id]
 * Document Reference: Document 04 (Section 6.2), Document 08 (Phase 10)
 */

import { createApiHandler } from "@/lib/api-handler";
import { playbookService } from "@/modules/knowledge-base/playbook.service";

/**
 * GET /api/marketing-shield/v1/knowledge-base/documents/[id]
 */
export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (_req, { tenant, params }) => {
    const documentId = params.id as string;
    return playbookService.getDocument(tenant.tenantId, documentId);
  }
);
