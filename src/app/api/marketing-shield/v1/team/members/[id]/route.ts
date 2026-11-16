import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { UpdateTeamMemberSchema } from "@/contracts/settings.contracts";
import { settingsService } from "@/modules/settings/settings.service";

export const PATCH = createApiHandler(
  {
    requiredPermission: "user.manage",
    bodySchema: UpdateTeamMemberSchema,
  },
  async (_req, { tenant, body, params }) => {
    const memberId = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!memberId) {
      throw new AppApiError("VALIDATION_FAILED", "Member ID is required.", 400);
    }
    return settingsService.updateMemberRoleOrStatus(tenant, memberId, body);
  },
);

export const DELETE = createApiHandler(
  {
    requiredPermission: "user.manage",
  },
  async (_req, { tenant, params }) => {
    const memberId = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!memberId) {
      throw new AppApiError("VALIDATION_FAILED", "Member ID is required.", 400);
    }
    return settingsService.removeTeamMember(tenant, memberId);
  },
);
