import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { entitlementsService } from "@/modules/billing/entitlements.service";
import { FEATURE_GATE_TYPES, FeatureGateType } from "@/contracts/billing.contracts";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const tenantContext = await resolveTenantContext(req);
    const searchParams = req.nextUrl.searchParams;
    const featureParam = searchParams.get("feature") as FeatureGateType | null;

    if (featureParam && FEATURE_GATE_TYPES.includes(featureParam)) {
      const result = await entitlementsService.checkTenantEntitlement(
        tenantContext.tenantId,
        featureParam,
      );
      return NextResponse.json(result, { status: 200 });
    }

    // Full snapshot of tenant entitlements
    const subInfo = await entitlementsService.getTenantSubscriptionInfo(tenantContext.tenantId);
    const checks = await Promise.all(
      FEATURE_GATE_TYPES.map(async (feat) => {
        return entitlementsService.checkTenantEntitlement(tenantContext.tenantId, feat);
      }),
    );

    return NextResponse.json(
      {
        tenantId: tenantContext.tenantId,
        subscription: {
          plan: subInfo.plan,
          status: subInfo.status,
          currentPeriodEnd: subInfo.currentPeriodEnd.toISOString(),
          isTrial: subInfo.isTrial,
          trialDaysRemaining: subInfo.trialDaysRemaining,
        },
        entitlements: checks,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    if (err instanceof AuthTenancyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Failed to query tenant entitlements", { error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
