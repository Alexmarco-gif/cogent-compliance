import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { OnboardingScopeRequestSchema } from "@/contracts/billing.contracts";
import { onboardingService } from "@/modules/onboarding/onboarding.service";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const tenantContext = await resolveTenantContext(req);
    const body = await req.json();
    const parseResult = OnboardingScopeRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid scope configuration", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const result = await onboardingService.saveInstitutionScope(
      tenantContext.tenantId,
      parseResult.data,
      tenantContext.clerkUserId,
      tenantContext.clerkOrgId,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AuthTenancyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Failed to save onboarding institution scope", { error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
