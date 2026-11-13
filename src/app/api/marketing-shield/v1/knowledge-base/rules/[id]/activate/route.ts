/**
 * Cogent Marketing Shield - Knowledge Base Rule Activation Endpoint
 * POST /api/marketing-shield/v1/knowledge-base/rules/[id]/activate
 * Document Reference: Document 04 (Section 6.2), Document 07 (Section 5.2), Document 08 (Phase 10)
 *
 * Strictly restricted by RBAC to roles with knowledge.publish permission
 * (LEGAL_COUNSEL, CHIEF_COMPLIANCE_OFFICER, WORKSPACE_ADMIN).
 * MARKETING_GROWTH and COMPLIANCE_ANALYST receive 403 FORBIDDEN.
 */

import { createApiHandler } from "@/lib/api-handler";
import { playbookService } from "@/modules/knowledge-base/playbook.service";

/**
 * POST /api/marketing-shield/v1/knowledge-base/rules/[id]/activate
 * Activates an internal rule for autonomous compliance enforcement.
 */
export const POST = createApiHandler(
  {
    requiredPermission: "knowledge.publish",
  },
  async (_req, { tenant, params }) => {
    const ruleId = params.id as string;
    return playbookService.activateRule(tenant.tenantId, tenant.userId, ruleId);
  }
);
