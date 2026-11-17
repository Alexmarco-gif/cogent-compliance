import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { AppApiError } from "@/lib/api-handler";
import { OnboardingScopeRequestSchema } from "@/contracts/billing.contracts";
import { onboardingService } from "@/modules/onboarding/onboarding.service";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const tenantContext = await resolveTenantContext(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Malformed JSON request body" }, { status: 400 });
    }
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
      {
        role: tenantContext.role,
        isAdmin: tenantContext.permissions.has("tenant.admin"),
      },
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AuthTenancyError || err instanceof AppApiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Failed to save onboarding institution scope", { error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
