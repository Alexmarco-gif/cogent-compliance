/**
 * Cogent Compliance Operations - Multi-Executive DDQ Sign-Off API
 * POST /api/marketing-shield/v1/ddqs/[id]/signoffs
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { hasPermission } from "@/modules/auth-tenancy/rbac.guard";
import { ddqService } from "@/modules/ddq/ddq.service";
import { recordDdqSignoffSchema } from "@/contracts/ddq.contracts";

export const POST = createApiHandler(
  {
    requiredPermission: "campaign.create",
    bodySchema: recordDdqSignoffSchema,
  },
  async (_req, { tenant, params, body }) => {
    const ddqId = String(params.id || "");
    const isDecision =
      body.status === "APPROVED" || body.status === "REJECTED" || body.status === "WAIVED";

    if (isDecision && !hasPermission(tenant, "approval.decide")) {
      throw new AppApiError(
        "APPROVAL_NOT_PERMITTED",
        "Only authorized Legal Counsel or Chief Compliance Officer roles can record executive sign-off decisions.",
        403
      );
    }

    return ddqService.recordSignoff(tenant.tenantId, tenant.userId, tenant.role, ddqId, body);
  }
);
