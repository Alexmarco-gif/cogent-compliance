/**
 * Cogent Compliance OS — Stage 7, Stage 8 & Governance Operations API
 * PATCH /api/marketing-shield/v1/expansions/[id]/operations
 *   - Country Governance Roles & Fit-and-Proper Vetting
 *   - Regulatory Reporting Calendar
 *   - Compliance Incident & Breach Register
 *   - Multi-Country Regulatory Change Log
 *   - Core 13 Compliance Artefacts Status
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { expansionOperationsSchema } from "@/contracts/expansion.contracts";
import { expansionWorkflowService } from "@/modules/expansions";

export const PATCH = createApiHandler(
  {
    requiredPermission: "expansion.manage",
    bodySchema: expansionOperationsSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Expansion id is required", 400);
    }
    return expansionWorkflowService.handleOperationsAction(tenant, id, body);
  },
);
