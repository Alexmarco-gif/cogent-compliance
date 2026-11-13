/**
 * Cogent Marketing Shield - Knowledge Base Rules Endpoint
 * GET /api/marketing-shield/v1/knowledge-base/rules
 * Document Reference: Document 04 (Section 6.2), Document 08 (Phase 10)
 */

import { createApiHandler } from "@/lib/api-handler";
import {
  KnowledgeRuleType,
  QueryKnowledgeRulesInput,
} from "@/contracts/knowledge-product.contracts";
import { playbookService } from "@/modules/knowledge-base/playbook.service";

/**
 * GET /api/marketing-shield/v1/knowledge-base/rules
 * Lists extracted or manually configured internal rules.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (req, { tenant }) => {
    const url = new URL(req.url);
    const status = (url.searchParams.get("status") as "DRAFT" | "ACTIVE" | "SUPERSEDED" | "ARCHIVED") || undefined;
    const rule_type = (url.searchParams.get("rule_type") as KnowledgeRuleType) || undefined;
    const document_id = url.searchParams.get("document_id") || undefined;
    const severity = (url.searchParams.get("severity") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") || undefined;
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const query: QueryKnowledgeRulesInput = {
      status,
      rule_type,
      document_id,
      severity,
      limit,
    };

    return playbookService.listRules(tenant.tenantId, query);
  }
);
