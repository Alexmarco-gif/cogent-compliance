import { createApiHandler } from "@/lib/api-handler";
import {
  InviteTeamMembersSchema,
  RevokeInvitationSchema,
} from "@/contracts/settings.contracts";
import { settingsService } from "@/modules/settings/settings.service";

export const POST = createApiHandler(
  {
    requiredPermission: "user.manage",
    bodySchema: InviteTeamMembersSchema,
  },
  async (_req, { tenant, body }) => {
    return settingsService.inviteTeamMembers(tenant, body);
  },
);

export const DELETE = createApiHandler(
  {
    requiredPermission: "user.manage",
    querySchema: RevokeInvitationSchema,
  },
  async (_req, { tenant, query }) => {
    return settingsService.revokeInvitation(tenant, query.invitationId, query.email);
  },
);
