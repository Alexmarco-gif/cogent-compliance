import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { CheckoutRequestSchema } from "@/contracts/billing.contracts";
import { paystackBillingService } from "@/modules/billing/paystack.service";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const tenantContext = await resolveTenantContext(req);
    const body = await req.json();
    const parseResult = CheckoutRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid checkout request", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { planSlug, billingInterval, emailOverride } = parseResult.data;
    const userEmail = emailOverride || "billing@institution.com";

    const checkout = await paystackBillingService.initializeCheckout({
      tenantId: tenantContext.tenantId,
      planSlug,
      billingInterval,
      userEmail,
    });

    return NextResponse.json(checkout, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Checkout initialization failed", { error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
