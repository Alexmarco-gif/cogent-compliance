/**
 * Cogent Compliance OS — Cross-Border Expansion Programs & Dashboard API
 * GET  /api/marketing-shield/v1/expansions  (KPI Dashboard + Filterable Expansion Programs)
 * POST /api/marketing-shield/v1/expansions  (Initiate 8-Stage Cross-Border Expansion Program)
 */

import { createApiHandler } from "@/lib/api-handler";
import {
  createExpansionSchema,
  listExpansionsQuerySchema,
} from "@/contracts/expansion.contracts";
import { expansionWorkflowService } from "@/modules/expansions";

export const GET = createApiHandler(
  {
    requiredPermission: "expansion.read",
    querySchema: listExpansionsQuerySchema,
  },
  async (_req, { tenant, query }) => {
    return expansionWorkflowService.getDashboardAndPrograms(tenant, query);
  },
);

export const POST = createApiHandler(
  {
    requiredPermission: "expansion.create",
    bodySchema: createExpansionSchema,
  },
  async (_req, { tenant, body }) => {
    return expansionWorkflowService.createExpansionProgram(tenant, body);
  },
);
