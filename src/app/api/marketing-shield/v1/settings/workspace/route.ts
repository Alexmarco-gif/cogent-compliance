import { createApiHandler } from "@/lib/api-handler";
import { UpdateWorkspaceSettingsSchema } from "@/contracts/settings.contracts";
import { settingsService } from "@/modules/settings/settings.service";

export const GET = createApiHandler(
  {},
  async (_req, { tenant }) => {
    return settingsService.getWorkspaceSettings(tenant);
  },
);

export const PATCH = createApiHandler(
  {
    requiredPermission: "tenant.admin",
    bodySchema: UpdateWorkspaceSettingsSchema,
  },
  async (_req, { tenant, body }) => {
    return settingsService.updateWorkspaceSettings(tenant, body);
  },
);
