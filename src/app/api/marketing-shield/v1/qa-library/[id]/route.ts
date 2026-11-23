/**
 * Cogent Compliance Operations - Single Q&A Library Entry API
 * PATCH  /api/marketing-shield/v1/qa-library/[id]
 * DELETE /api/marketing-shield/v1/qa-library/[id]
 */

import { createApiHandler } from "@/lib/api-handler";
import { qaLibraryService } from "@/modules/ddq/qa-library.service";
import { updateQaLibraryEntrySchema } from "@/contracts/ddq.contracts";

export const PATCH = createApiHandler(
  {
    requiredPermission: "knowledge.publish",
    bodySchema: updateQaLibraryEntrySchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = String(params.id || "");
    return qaLibraryService.updateEntry(tenant.tenantId, tenant.userId, tenant.role, id, body);
  }
);

export const DELETE = createApiHandler(
  {
    requiredPermission: "knowledge.publish",
  },
  async (_req, { tenant, params }) => {
    const id = String(params.id || "");
    await qaLibraryService.archiveEntry(tenant.tenantId, tenant.userId, id);
    return { archived: true, id };
  }
);
