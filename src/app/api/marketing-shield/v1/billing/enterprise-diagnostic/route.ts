import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { diagnoseEnterpriseAllowlistForSession } from "@/modules/billing/enterprise-allowlist.service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function isClerkDevelopmentRuntime(): boolean {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  if (pk.startsWith("pk_live_")) {
    return false;
  }
  return pk.startsWith("pk_test_") || process.env.NODE_ENV !== "production";
}

export async function GET(req: NextRequest) {
  if (!isClerkDevelopmentRuntime()) {
    return NextResponse.json({ error: "Not available in live production" }, { status: 404 });
  }

  try {
    const tenantContext = await resolveTenantContext(req);
    const diagnostic = await diagnoseEnterpriseAllowlistForSession({
      tenantId: tenantContext.tenantId,
      clerkUserId: tenantContext.clerkUserId,
      clerkOrgId: tenantContext.clerkOrgId,
    });

    return NextResponse.json({ success: true, data: diagnostic }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AuthTenancyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    logger.error("Failed to run enterprise diagnostic", { error: err });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Diagnostic failed" },
      { status: 500 },
    );
  }
}
