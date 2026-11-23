/**
 * Cogent Marketing Shield - Zero-Prompt Regulatory Ripple Alerts API
 * GET /api/marketing-shield/v1/ripple-alerts
 * POST /api/marketing-shield/v1/ripple-alerts
 * Document Reference: Document 13 (Section 5.3, Phase D)
 */

import { z } from "zod";
import { createApiHandler } from "@/lib/api-handler";
import { assertThirdLineIndependence, hasPermission } from "@/modules/auth-tenancy/rbac.guard";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { regulatoryRippleService } from "@/modules/regulatory-vault/regulatory-ripple.service";

const queryRippleAlertsSchema = z.object({
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(),
});

const triggerRippleScanSchema = z.object({
  instrument_id: z.string().uuid().optional(),
  regulator: z.enum(["CBN", "NFIU", "FCCPC", "ARCON", "NDPC", "SEC"]).default("CBN"),
  title: z.string().min(5, "Circular title is required"),
  summary_text: z.string().min(5, "Circular summary text is required"),
  clause_reference: z.string().optional(),
  source_url: z.string().url().optional(),
});

/**
 * GET /api/marketing-shield/v1/ripple-alerts
 * Lists Zero-Prompt Regulatory Ripple Alerts for the tenant.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "feature.read",
    querySchema: queryRippleAlertsSchema,
  },
  async (_req, { tenant, query }) => {
    const alerts = await regulatoryRippleService.listRippleAlerts(
      tenant.tenantId,
      query.status,
    );
    return { alerts, total: alerts.length };
  },
);

/**
 * POST /api/marketing-shield/v1/ripple-alerts
 * Scans tenant Product Rate Cards, active campaigns, and live Governed Features/Controls
 * against a regulatory circular and creates Zero-Prompt Ripple Alerts + Incident Conversations.
 */
export const POST = createApiHandler(
  {
    requiredPermission: "feature.read",
    bodySchema: triggerRippleScanSchema,
  },
  async (_req, { tenant, body }) => {
    assertThirdLineIndependence(tenant, "ripple.scan");
    if (
      !hasPermission(tenant, "campaign.create") &&
      !hasPermission(tenant, "feature.change.assess")
    ) {
      throw new AuthTenancyError(
        "FORBIDDEN",
        `Role ${tenant.role} lacks permission to trigger a Regulatory Ripple Scan.`,
        403,
      );
    }

    const alerts = await regulatoryRippleService.scanTenantForCircularRipple(
      tenant.tenantId,
      {
        instrumentId: body.instrument_id,
        regulator: body.regulator || "CBN",
        title: body.title,
        summaryText: body.summary_text,
        clauseReference: body.clause_reference,
        sourceUrl: body.source_url,
      },
    );
    return { alerts, created_count: alerts.length };
  },
);
