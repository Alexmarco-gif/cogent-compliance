import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { paystackBillingService } from "@/modules/billing/paystack.service";
import { entitlementsService } from "@/modules/billing/entitlements.service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const VerifyCheckoutSchema = z.object({
  reference: z.string().min(1, "Transaction reference is required"),
});

export async function POST(req: NextRequest) {
  try {
    const tenantContext = await resolveTenantContext(req);
    const body = await req.json();
    const parseResult = VerifyCheckoutSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid verification request", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const result = await paystackBillingService.verifyTransaction(
      parseResult.data.reference,
      tenantContext.tenantId,
    );

    const subInfo = await entitlementsService.getTenantSubscriptionInfo(tenantContext.tenantId);

    return NextResponse.json(
      {
        ...result,
        subscription: {
          plan: subInfo.plan,
          status: subInfo.status,
          currentPeriodEnd: subInfo.currentPeriodEnd.toISOString(),
          isTrial: subInfo.isTrial,
          isTrialExpired: subInfo.isTrialExpired,
          trialStartedAt: subInfo.trialStartedAt.toISOString(),
          trialEndsAt: subInfo.trialEndsAt.toISOString(),
          trialDaysRemaining: subInfo.trialDaysRemaining,
          trialHoursRemaining: subInfo.trialHoursRemaining,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (err: unknown) {
    if (err instanceof AuthTenancyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Checkout verification failed", { error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
