import { createApiHandler } from "@/lib/api-handler";
import { getRoleMetadata } from "@/modules/auth-tenancy/roles";

export const GET = createApiHandler(
  {},
  async (_req, { tenant }) => {
    return {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      clerkUserId: tenant.clerkUserId,
      clerkOrgId: tenant.clerkOrgId,
      orgName: tenant.orgName,
      orgSlug: tenant.orgSlug,
      role: tenant.role,
      roleMetadata: getRoleMetadata(tenant.role),
      permissions: Array.from(tenant.permissions),
      status: tenant.status,
    };
  },
);
