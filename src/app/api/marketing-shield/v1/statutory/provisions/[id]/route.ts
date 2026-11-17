/**
 * Cogent Marketing Shield - Statutory Provision Inspection Route
 * Document Reference: Document 04 (Section 6.1), Document 05, Document 08 (Phase 6)
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { statutoryToolExecutor } from "@/modules/ai-orchestration/tools/statutory-tools";

/**
 * GET /api/marketing-shield/v1/statutory/provisions/[id]
 * Used by EvidenceDrawer to inspect exact verbatim clause and SHA-256 binary hash.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "conversation.read",
  },
  async (_req, { tenant, params }) => {
    const clauseId = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!clauseId) {
      throw new AppApiError("VALIDATION_FAILED", "Regulatory clause ID is required", 400);
    }

    const result = await statutoryToolExecutor.getRegulatoryProvision(
      { regulatory_clause_id: clauseId },
      { tenantId: tenant.tenantId, userId: tenant.userId }
    );

    if (!result.success) {
      throw new AppApiError("NOT_FOUND", (result.error as string) || "Clause not found", 404);
    }

    return result;
  }
);
