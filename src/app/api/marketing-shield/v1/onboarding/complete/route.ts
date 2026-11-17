import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { onboardingService } from "@/modules/onboarding/onboarding.service";
import { entitlementsService } from "@/modules/billing/entitlements.service";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const tenantContext = await resolveTenantContext(req);
    const [result, subInfo] = await Promise.all([
      onboardingService.completeOnboarding(tenantContext.tenantId),
      entitlementsService.getTenantSubscriptionInfo(tenantContext.tenantId),
    ]);

    return NextResponse.json(
      {
        ...result,
        subscriptionPlan: {
          slug: subInfo.plan.slug,
          name: subInfo.plan.name,
          isTrial: subInfo.isTrial,
          status: subInfo.status,
        },
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    if (err instanceof AuthTenancyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Failed to complete onboarding", { error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
