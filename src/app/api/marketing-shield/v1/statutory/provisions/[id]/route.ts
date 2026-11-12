/**
 * Cogent Marketing Shield - Statutory Provision Inspection Route
 * Document Reference: Document 04 (Section 6.1), Document 05, Document 08 (Phase 6)
 */

import { createApiHandler } from "@/lib/api-handler";
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
      throw new Error("Regulatory clause ID is required");
    }

    const result = await statutoryToolExecutor.getRegulatoryProvision(
      { regulatory_clause_id: clauseId },
      { tenantId: tenant.tenantId, userId: tenant.userId }
    );

    if (!result.success) {
      throw new Error((result.error as string) || "Clause not found");
    }

    return result;
  }
);
