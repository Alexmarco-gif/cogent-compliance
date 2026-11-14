import { NextRequest, NextResponse } from "next/server";
import { paystackBillingService } from "@/modules/billing/paystack.service";
import { PaystackWebhookEventSchema } from "@/contracts/billing.contracts";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // 1. Verify HMAC SHA-512 signature
    const isValid = paystackBillingService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      logger.warn("Invalid Paystack webhook signature attempt", { signature });
      return NextResponse.json({ error: "Invalid Paystack signature" }, { status: 401 });
    }

    // 2. Parse & validate webhook event payload
    let eventPayload: unknown;
    try {
      eventPayload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const parseResult = PaystackWebhookEventSchema.safeParse(eventPayload);
    if (!parseResult.success) {
      logger.warn("Unrecognized or non-standard Paystack webhook payload structure", {
        errors: parseResult.error.flatten(),
      });
      return NextResponse.json({ received: true, note: "Ignored non-matching schema event" });
    }

    const event = parseResult.data;

    // 3. Process charge.success
    if (event.event === "charge.success") {
      const result = await paystackBillingService.processChargeSuccess(event);
      if (!result.processed && result.reason === "Transaction already processed") {
        return NextResponse.json({ message: "Transaction already processed", received: true });
      }
      return NextResponse.json({ received: true, ...result });
    }

    return NextResponse.json({ received: true, status: "event_ignored" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Paystack webhook processing exception", { error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
