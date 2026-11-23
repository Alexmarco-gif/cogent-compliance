/**
 * Cogent Compliance Operations - Single DDQ Question Update, Validation & Q&A Promotion API
 * PATCH /api/marketing-shield/v1/ddqs/[id]/questions/[questionId]
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { hasPermission } from "@/modules/auth-tenancy/rbac.guard";
import { ddqService } from "@/modules/ddq/ddq.service";
import { updateDdqQuestionSchema } from "@/contracts/ddq.contracts";

export const PATCH = createApiHandler(
  {
    requiredPermission: "campaign.create",
    bodySchema: updateDdqQuestionSchema,
  },
  async (_req, { tenant, params, body }) => {
    const ddqId = String(params.id || "");
    const questionId = String(params.questionId || "");
    const canValidateAsCco = hasPermission(tenant, "approval.decide");

    try {
      return await ddqService.updateQuestion(
        tenant.tenantId,
        tenant.userId,
        tenant.role,
        ddqId,
        questionId,
        body,
        canValidateAsCco
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update question";
      if (msg.includes("Only Legal Counsel or Chief Compliance Officer")) {
        throw new AppApiError("APPROVAL_NOT_PERMITTED", msg, 403);
      }
      if (msg.includes("not found")) {
        throw new AppApiError("NOT_FOUND", msg, 404);
      }
      throw new AppApiError("VALIDATION_FAILED", msg, 400);
    }
  }
);
