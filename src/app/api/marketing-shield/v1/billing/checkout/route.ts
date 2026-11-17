import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { CheckoutRequestSchema } from "@/contracts/billing.contracts";
import {
  paystackBillingService,
  PaystackCheckoutValidationError,
} from "@/modules/billing/paystack.service";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

async function resolveBillingEmail(
  tenantId: string,
  emailOverride?: string,
): Promise<string | null> {
  if (emailOverride) {
    return emailOverride;
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data: tenant } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", tenantId)
      .maybeSingle();

    const settings = (tenant?.settings || {}) as Record<string, unknown>;
    if (typeof settings.billing_email === "string" && settings.billing_email.includes("@")) {
      return settings.billing_email;
    }
    const orgProfile = settings.organization_profile as Record<string, unknown> | undefined;
    if (typeof orgProfile?.email === "string" && orgProfile.email.includes("@")) {
      return orgProfile.email;
    }
  } catch (err) {
    logger.warn("Unable to read billing_email from tenant settings", { tenantId, err });
  }

  try {
    const user = await currentUser();
    const primaryEmail =
      user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
      user?.emailAddresses[0]?.emailAddress;
    if (primaryEmail) {
      return primaryEmail;
    }
  } catch (err) {
    logger.warn("Unable to read currentUser email from Clerk", { tenantId, err });
  }

  return process.env.NODE_ENV === "production" ? null : "billing@institution.com";
}

function resolveRequestOrigin(req: NextRequest): string {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (forwardedHost) {
    const proto = forwardedProto || (forwardedHost.includes("localhost") ? "http" : "https");
    return `${proto}://${forwardedHost}`;
  }
  const nextOrigin = req.nextUrl?.origin;
  if (nextOrigin && nextOrigin !== "null") {
    return nextOrigin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  try {
    const tenantContext = await resolveTenantContext(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Malformed JSON request body" }, { status: 400 });
    }
    const parseResult = CheckoutRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid checkout request", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { planSlug, billingInterval, emailOverride, paymentPreference, channels } =
      parseResult.data;
    const userEmail = await resolveBillingEmail(tenantContext.tenantId, emailOverride);

    if (!userEmail) {
      return NextResponse.json(
        { error: "A valid billing email address is required to initialize checkout" },
        { status: 400 },
      );
    }

    const appOrigin = resolveRequestOrigin(req);
    const callbackUrl = `${appOrigin}/settings?tab=billing&checkout=success`;

    const checkout = await paystackBillingService.initializeCheckout({
      tenantId: tenantContext.tenantId,
      planSlug,
      billingInterval,
      userEmail,
      callbackUrl,
      paymentPreference,
      channels,
    });

    return NextResponse.json(checkout, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AuthTenancyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    if (err instanceof PaystackCheckoutValidationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Checkout initialization failed", { error: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
