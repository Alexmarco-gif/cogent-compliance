import { createApiHandler } from "@/lib/api-handler";
import { settingsService } from "@/modules/settings/settings.service";

export const GET = createApiHandler(
  {},
  async (_req, { tenant }) => {
    return settingsService.listTeamMembers(tenant);
  },
);
