/**
 * Cogent Compliance Operations - Approved Q&A Knowledge Library API
 * GET  /api/marketing-shield/v1/qa-library
 * POST /api/marketing-shield/v1/qa-library
 */

import { createApiHandler } from "@/lib/api-handler";
import { qaLibraryService } from "@/modules/ddq/qa-library.service";
import {
  createQaLibraryEntrySchema,
  type ComplianceDepartment,
  type DdqDomain,
  type QaLibraryStatus,
} from "@/contracts/ddq.contracts";

export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (req, { tenant }) => {
    const sp = req.nextUrl.searchParams;
    const domain = (sp.get("domain") as DdqDomain) || undefined;
    const owner_department = (sp.get("owner_department") as ComplianceDepartment) || undefined;
    const status = (sp.get("status") as QaLibraryStatus) || undefined;
    const stale_only = sp.get("stale_only") === "true";
    const search = sp.get("search") || undefined;

    return qaLibraryService.listEntries(tenant.tenantId, {
      domain,
      owner_department,
      status,
      stale_only,
      search,
    });
  }
);

export const POST = createApiHandler(
  {
    requiredPermission: "knowledge.publish",
    bodySchema: createQaLibraryEntrySchema,
  },
  async (_req, { tenant, body }) => {
    return qaLibraryService.createEntry(tenant.tenantId, tenant.userId, tenant.role, body);
  }
);
