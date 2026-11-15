import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { onboardingService } from "@/modules/onboarding/onboarding.service";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const tenantContext = await resolveTenantContext(req);
    const status = await onboardingService.getOnboardingStatus(tenantContext.tenantId);

    return NextResponse.json(status, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AuthTenancyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Failed to fetch onboarding status", { error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
