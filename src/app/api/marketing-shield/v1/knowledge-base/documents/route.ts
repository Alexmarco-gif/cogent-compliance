/**
 * Cogent Marketing Shield - Knowledge Base Documents Endpoint
 * POST /api/marketing-shield/v1/knowledge-base/documents
 * GET  /api/marketing-shield/v1/knowledge-base/documents
 * Document Reference: Document 04 (Section 6.2), Document 08 (Phase 10)
 */

import { createApiHandler } from "@/lib/api-handler";
import {
  registerKnowledgeDocumentSchema,
  KnowledgeDocumentType,
} from "@/contracts/knowledge-product.contracts";
import { playbookService } from "@/modules/knowledge-base/playbook.service";

/**
 * GET /api/marketing-shield/v1/knowledge-base/documents
 * Lists registered internal playbook documents.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (req, { tenant }) => {
    const url = new URL(req.url);
    const documentType = (url.searchParams.get("document_type") as KnowledgeDocumentType) || undefined;
    const status = url.searchParams.get("status") || undefined;

    return playbookService.listDocuments(tenant.tenantId, { documentType, status });
  }
);

/**
 * POST /api/marketing-shield/v1/knowledge-base/documents
 * Registers an internal playbook PDF/DOCX or text document and queues ingestion.
 */
export const POST = createApiHandler(
  {
    requiredPermission: "knowledge.write",
    bodySchema: registerKnowledgeDocumentSchema,
  },
  async (_req, { tenant, body }) => {
    return playbookService.registerDocument(tenant.tenantId, tenant.userId, body);
  }
);
