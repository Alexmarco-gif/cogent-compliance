import { NextResponse } from "next/server";
import { entitlementsService } from "@/modules/billing/entitlements.service";
import { paystackBillingService } from "@/modules/billing/paystack.service";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const plans = await entitlementsService.getAvailablePlans();
    const fxRate = await paystackBillingService.getFxRate();

    return NextResponse.json(
      {
        plans,
        fx_rate: fxRate,
        currency_pair: "USD_NGN",
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Failed to retrieve subscription plans", { error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
