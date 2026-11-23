/**
 * Cogent Compliance Operations - Single Evidence Item API
 * GET    /api/marketing-shield/v1/evidence/[id]
 * PATCH  /api/marketing-shield/v1/evidence/[id]
 * DELETE /api/marketing-shield/v1/evidence/[id]
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { hasPermission } from "@/modules/auth-tenancy/rbac.guard";
import { evidenceService } from "@/modules/evidence/evidence.service";
import { updateEvidenceItemSchema } from "@/contracts/ddq.contracts";

export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (_req, { tenant, params }) => {
    const id = String(params.id || "");
    const item = await evidenceService.getEvidenceItem(tenant.tenantId, id);
    if (!item) {
      throw new AppApiError("NOT_FOUND", "Evidence item not found", 404);
    }
    return item;
  }
);

export const PATCH = createApiHandler(
  {
    requiredPermission: "knowledge.write",
    bodySchema: updateEvidenceItemSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = String(params.id || "");
    if (body.approve && !hasPermission(tenant, "knowledge.publish")) {
      throw new AppApiError(
        "FORBIDDEN",
        "Only Legal Counsel, CCO, or Workspace Admin can formally approve Evidence Vault artifacts.",
        403
      );
    }
    return evidenceService.updateEvidenceItem(tenant.tenantId, tenant.userId, id, body);
  }
);

export const DELETE = createApiHandler(
  {
    requiredPermission: "knowledge.write",
  },
  async (_req, { tenant, params }) => {
    const id = String(params.id || "");
    await evidenceService.archiveEvidenceItem(tenant.tenantId, tenant.userId, id);
    return { archived: true, id };
  }
);
