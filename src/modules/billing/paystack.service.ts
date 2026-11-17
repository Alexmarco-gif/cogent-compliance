/**
 * Cogent Compliance Platform - Marketing Shield
 * Paystack Billing & Dual-Currency Engine Service
 * Document Reference: Document 11 (Section 4) & Document 08 (Phase 6 / Phase 12)
 */

import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import {
  BillingInterval,
  CheckoutResponse,
  PaymentPreference,
  PaystackChannel,
  PaystackWebhookEvent,
  PlanSlug,
  SubscriptionPlan,
} from "@/contracts/billing.contracts";

/**
 * Paystack Nigeria caps single online NGN transactions at ₦10,000,000 (1,000,000,000 kobo).
 */
export const PAYSTACK_MAX_NGN_TX_KOBO = 1_000_000_000;

export class PaystackCheckoutValidationError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = "CHECKOUT_VALIDATION_ERROR") {
    super(message);
    this.name = "PaystackCheckoutValidationError";
    this.code = code;
  }
}

export const DEFAULT_PLANS: Record<PlanSlug, SubscriptionPlan> = {
  evaluation: {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "evaluation",
    name: "Evaluation Pilot",
    price_usd_cents: 0,
    price_usd_annual_cents: 0,
    monthly_audit_limit: 3,
    seat_limit: 2,
    url_drift_monitor_limit: 0,
    monthly_live_search_limit: 0,
    allowed_search_jurisdictions: [],
    retention_days: 7,
    features: {
      export_unwatermarked: false,
      cco_approval_lock: false,
      url_drift_monitoring: false,
      custom_rate_cards: 1,
      compliant_rewrites: 10,
      support_sla: "Community",
      custom_corpora: false,
      live_web_search: false,
      cross_border_research: false,
      work_product_docx_export: false,
      regulatory_ripple_live_web: false,
      monthly_live_search_limit: 0,
    },
    is_active: true,
  },
  growth: {
    id: "00000000-0000-0000-0000-000000000002",
    slug: "growth",
    name: "Growth (Starter)",
    price_usd_cents: 14900,
    price_usd_annual_cents: 142800, // $1,428/yr ($119/mo)
    monthly_audit_limit: 25,
    seat_limit: 3,
    url_drift_monitor_limit: 0,
    monthly_live_search_limit: 100,
    allowed_search_jurisdictions: ["NG"],
    retention_days: 90,
    features: {
      export_unwatermarked: true,
      cco_approval_lock: false,
      url_drift_monitoring: false,
      custom_rate_cards: 5,
      compliant_rewrites: -1,
      support_sla: "Standard Email (24h)",
      custom_corpora: false,
      live_web_search: true,
      cross_border_research: false,
      work_product_docx_export: true,
      regulatory_ripple_live_web: false,
      monthly_live_search_limit: 100,
    },
    is_active: true,
  },
  scale: {
    id: "00000000-0000-0000-0000-000000000003",
    slug: "scale",
    name: "Scale (Pro — Most Popular)",
    price_usd_cents: 44900,
    price_usd_annual_cents: 430800, // $4,308/yr ($359/mo)
    monthly_audit_limit: -1,
    seat_limit: 10,
    url_drift_monitor_limit: 15,
    monthly_live_search_limit: 500,
    allowed_search_jurisdictions: ["NG", "GH", "KE", "ZA", "RW", "EG", "AFRICA_REGIONAL"],
    retention_days: 730,
    features: {
      export_unwatermarked: true,
      cco_approval_lock: true,
      url_drift_monitoring: true,
      custom_rate_cards: -1,
      compliant_rewrites: -1,
      support_sla: "Priority Email + Chat (4h)",
      custom_corpora: false,
      live_web_search: true,
      cross_border_research: true,
      work_product_docx_export: true,
      regulatory_ripple_live_web: true,
      monthly_live_search_limit: 500,
    },
    is_active: true,
  },
  enterprise: {
    id: "00000000-0000-0000-0000-000000000004",
    slug: "enterprise",
    name: "Enterprise",
    price_usd_cents: 149900,
    price_usd_annual_cents: 1438800, // $14,388/yr ($1,199/mo)
    monthly_audit_limit: -1,
    seat_limit: -1,
    url_drift_monitor_limit: -1,
    monthly_live_search_limit: -1,
    allowed_search_jurisdictions: ["NG", "GH", "KE", "ZA", "RW", "EG", "AFRICA_REGIONAL", "GLOBAL"],
    retention_days: 2555,
    features: {
      export_unwatermarked: true,
      cco_approval_lock: true,
      url_drift_monitoring: true,
      custom_rate_cards: -1,
      compliant_rewrites: -1,
      support_sla: "Dedicated Compliance Manager (1h)",
      custom_corpora: true,
      live_web_search: true,
      cross_border_research: true,
      work_product_docx_export: true,
      regulatory_ripple_live_web: true,
      monthly_live_search_limit: -1,
    },
    is_active: true,
  },
};

export class PaystackBillingService {
  /**
   * Fetches current benchmark FX rate (USD_NGN).
   * Falls back gracefully to 1,550.00 if table is unseeded or unreachable.
   */
  public async getFxRate(): Promise<number> {
    try {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("system_fx_rates")
        .select("rate")
        .eq("currency_pair", "USD_NGN")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.rate) {
        return Number(data.rate);
      }
    } catch (err) {
      logger.warn("Unable to fetch FX rate from system_fx_rates, using benchmark default", { err });
    }
    return 1550.0;
  }

  /**
   * Calculates exact price in NGN Kobo using Document 11 formula:
   * amount_kobo = Math.round((price_usd_cents / 100) * fx_rate * 100)
   */
  public calculateKoboAmount(usdCents: number, fxRate: number): number {
    const priceUsd = usdCents / 100;
    const priceNgn = priceUsd * fxRate;
    return Math.round(priceNgn * 100);
  }

  /**
   * Resolves plan from database or deterministic default seed.
   */
  public async getPlan(slug: PlanSlug): Promise<SubscriptionPlan> {
    try {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!error && data) {
        const fallback = DEFAULT_PLANS[slug];
        return {
          id: data.id,
          slug: data.slug as PlanSlug,
          name: data.name,
          price_usd_cents: data.price_usd_cents,
          price_usd_annual_cents: data.price_usd_annual_cents,
          paystack_plan_code_monthly: data.paystack_plan_code_monthly,
          paystack_plan_code_annual: data.paystack_plan_code_annual,
          monthly_audit_limit: data.monthly_audit_limit,
          seat_limit: data.seat_limit,
          url_drift_monitor_limit: data.url_drift_monitor_limit,
          monthly_live_search_limit:
            typeof data.monthly_live_search_limit === "number"
              ? data.monthly_live_search_limit
              : fallback.monthly_live_search_limit,
          allowed_search_jurisdictions: Array.isArray(data.allowed_search_jurisdictions)
            ? data.allowed_search_jurisdictions
            : fallback.allowed_search_jurisdictions,
          retention_days: data.retention_days,
          features: {
            ...fallback.features,
            ...(data.features || {}),
          },
          is_active: data.is_active,
        };
      }
    } catch (err) {
      logger.warn("Using fallback plan definition for slug", { slug, err });
    }

    const defaultPlan = DEFAULT_PLANS[slug];
    if (!defaultPlan) {
      throw new Error(`Plan slug '${slug}' is not recognized`);
    }
    return defaultPlan;
  }

  public resolveCheckoutChannels(
    paymentPreference: PaymentPreference = "card_bank",
    explicitChannels?: PaystackChannel[],
  ): PaystackChannel[] {
    if (explicitChannels && explicitChannels.length > 0) {
      return Array.from(new Set(explicitChannels));
    }
    if (paymentPreference === "all_channels") {
      return ["card", "bank", "ussd", "qr", "bank_transfer"];
    }
    if (paymentPreference === "bank_transfer") {
      return ["bank_transfer", "bank", "card"];
    }
    // Default ("card_bank"): prioritizes instant Card & Pay with Bank and avoids Paystack Transfer rejections on higher tiers
    return ["card", "bank"];
  }

  private parseMetadata(raw: unknown): Record<string, unknown> | undefined {
    if (!raw) return undefined;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return undefined;
      }
      return undefined;
    }
    if (typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }
    return undefined;
  }

  /**
   * Initializes a Paystack checkout transaction.
   * Dual-currency engine: USD pricing -> NGN Kobo settlement.
   */
  public async initializeCheckout(params: {
    tenantId: string;
    planSlug: PlanSlug;
    billingInterval: BillingInterval;
    userEmail: string;
    callbackUrl?: string;
    paymentPreference?: PaymentPreference;
    channels?: PaystackChannel[];
  }): Promise<CheckoutResponse> {
    const {
      tenantId,
      planSlug,
      billingInterval,
      userEmail,
      callbackUrl,
      paymentPreference = "card_bank",
      channels: explicitChannels,
    } = params;
    const plan = await this.getPlan(planSlug);
    const fxRate = await this.getFxRate();

    const priceUsdCents =
      billingInterval === "annual" ? plan.price_usd_annual_cents : plan.price_usd_cents;

    const amountKobo = this.calculateKoboAmount(priceUsdCents, fxRate);
    if (amountKobo <= 0) {
      throw new PaystackCheckoutValidationError(
        "The Evaluation Pilot plan is free ($0) and does not require Paystack checkout.",
        "FREE_PLAN_NO_CHECKOUT",
      );
    }

    if (amountKobo > PAYSTACK_MAX_NGN_TX_KOBO) {
      const nairaFormatted = new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }).format(amountKobo / 100);
      throw new PaystackCheckoutValidationError(
        `${plan.name} (${billingInterval}) totals ${nairaFormatted}, which exceeds Paystack's ₦10,000,000 single online transaction cap. Please switch to Monthly billing or contact enterprise@cogentshield.com for corporate bank wire invoicing.`,
        "PAYSTACK_TX_LIMIT_EXCEEDED",
      );
    }

    const resolvedChannels = this.resolveCheckoutChannels(paymentPreference, explicitChannels);
    const reference = `COG_${tenantId.slice(0, 8)}_${Date.now()}`;
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "";
    const isMock =
      !paystackSecret ||
      paystackSecret.startsWith("sk_test_mock") ||
      process.env.NODE_ENV === "test";

    const resolvedCallbackUrl =
      callbackUrl ||
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings?tab=billing&checkout=success`;

    // If live or Paystack test key is available, call the actual Paystack API
    if (!isMock) {
      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          amount: amountKobo,
          currency: "NGN",
          reference,
          callback_url: resolvedCallbackUrl,
          channels: resolvedChannels,
          metadata: {
            tenant_id: tenantId,
            plan_id: plan.id,
            plan_slug: plan.slug,
            billing_interval: billingInterval,
            usd_cents: priceUsdCents,
            fx_rate: fxRate,
            payment_preference: paymentPreference,
          },
        }),
      });

      const paystackData = await response.json();
      if (!response.ok || !paystackData.status || !paystackData.data) {
        logger.error("Paystack live transaction initialization failed", {
          status: response.status,
          paystackData,
          tenantId,
          planSlug,
          channels: resolvedChannels,
        });
        throw new Error(paystackData.message || "Paystack checkout initialization failed");
      }

      // Best-effort pending audit record so webhook/verify can recover tenant context even if Paystack strips metadata
      try {
        const supabase = createAdminSupabaseClient();
        await supabase.from("billing_transactions").insert({
          tenant_id: tenantId,
          paystack_reference: reference,
          amount_kobo: amountKobo,
          amount_usd_cents: priceUsdCents,
          fx_rate_applied: fxRate,
          currency: "NGN",
          status: "pending",
          channel: resolvedChannels[0] || "card",
          raw_payload: {
            plan_slug: plan.slug,
            billing_interval: billingInterval,
            channels: resolvedChannels,
            access_code: paystackData.data.access_code,
          },
        });
      } catch (pendingErr) {
        logger.warn("Unable to record pending billing transaction (non-blocking)", {
          reference,
          pendingErr,
        });
      }

      return {
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference,
        amount_kobo: amountKobo,
        amount_usd_cents: priceUsdCents,
        fx_rate: fxRate,
        currency: "NGN",
      };
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error("PAYSTACK_SECRET_KEY is not configured for production checkout");
    }

    // Deterministic sandbox checkout session strictly for NODE_ENV=test or dev mock keys
    const accessCode = `acc_${crypto.randomBytes(8).toString("hex")}`;
    const authorizationUrl = `https://checkout.paystack.com/${accessCode}?reference=${reference}&channels=${encodeURIComponent(resolvedChannels.join(","))}&callback=${encodeURIComponent(resolvedCallbackUrl)}`;

    return {
      authorization_url: authorizationUrl,
      access_code: accessCode,
      reference,
      amount_kobo: amountKobo,
      amount_usd_cents: priceUsdCents,
      fx_rate: fxRate,
      currency: "NGN",
    };
  }

  /**
   * Verifies a Paystack transaction by reference on checkout return
   * and idempotently activates the tenant's paid subscription.
   */
  public async verifyTransaction(
    reference: string,
    expectedTenantId: string,
  ): Promise<{
    verified: boolean;
    status: string;
    reference: string;
    planSlug?: PlanSlug;
    message?: string;
  }> {
    if (!reference || reference.trim().length === 0) {
      throw new Error("Transaction reference is required for verification");
    }

    const cleanRef = reference.trim();
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "";
    const isMock =
      !paystackSecret ||
      paystackSecret.startsWith("sk_test_mock") ||
      process.env.NODE_ENV === "test";

    if (isMock) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("PAYSTACK_SECRET_KEY is not configured for production verification");
      }
      return {
        verified: false,
        status: "mock_mode",
        reference: cleanRef,
        message: "Mock Paystack mode active; real transaction verification skipped.",
      };
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
        },
        cache: "no-store",
      },
    );

    const paystackData = await response.json();
    if (!response.ok || !paystackData.status || !paystackData.data) {
      logger.warn("Paystack verify API returned non-success", {
        reference: cleanRef,
        status: response.status,
        paystackData,
      });
      return {
        verified: false,
        status: "error",
        reference: cleanRef,
        message: paystackData.message || "Unable to verify Paystack transaction.",
      };
    }

    const txData = paystackData.data;
    const parsedMeta = this.parseMetadata(txData.metadata);
    const txStatus = String(txData.status || "unknown");
    const txTenantId = parsedMeta?.tenant_id as string | undefined;

    if (txTenantId && txTenantId !== expectedTenantId) {
      logger.warn("Cross-tenant Paystack verification attempt blocked", {
        reference: cleanRef,
        expectedTenantId,
        txTenantId,
      });
      throw new Error("Transaction reference does not belong to the active workspace.");
    }

    if (txStatus !== "success") {
      try {
        const supabase = createAdminSupabaseClient();
        await supabase
          .from("billing_transactions")
          .update({
            status: txStatus === "failed" ? "failed" : "pending",
            raw_payload: txData,
          })
          .eq("paystack_reference", cleanRef)
          .eq("tenant_id", expectedTenantId);
      } catch {
        // Non-blocking audit update
      }
      return {
        verified: false,
        status: txStatus,
        reference: cleanRef,
        message: txData.gateway_response || `Transaction status is '${txStatus}'.`,
      };
    }

    const mergedMeta = {
      ...(parsedMeta || {}),
      tenant_id: txTenantId || expectedTenantId,
    };

    await this.processChargeSuccess({
      event: "charge.success",
      data: {
        id: txData.id,
        domain: txData.domain,
        status: "success",
        reference: txData.reference || cleanRef,
        amount: Number(txData.amount),
        currency: txData.currency || "NGN",
        channel: txData.channel,
        paid_at: txData.paid_at,
        customer: txData.customer,
        subscription_code: txData.plan_object?.plan_code || null,
        metadata: mergedMeta as PaystackWebhookEvent["data"]["metadata"],
      },
    });

    return {
      verified: true,
      status: "success",
      reference: cleanRef,
      planSlug: (parsedMeta?.plan_slug as PlanSlug) || "scale",
    };
  }

  /**
   * Verifies HMAC-SHA512 signature on Paystack webhooks (timing-safe & length-safe)
   */
  public verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!signature) return false;
    const secret =
      process.env.PAYSTACK_SECRET_KEY ||
      (process.env.NODE_ENV === "test" ? "sk_test_mock_paystack_secret_key" : "");
    if (!secret) {
      logger.error("PAYSTACK_SECRET_KEY is not configured for webhook verification");
      return false;
    }
    const computed = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    const computedBuf = Buffer.from(computed, "utf8");
    const sigBuf = Buffer.from(signature, "utf8");
    if (computedBuf.length !== sigBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(computedBuf, sigBuf);
  }

  /**
   * Processes Paystack charge.success event with strict idempotency
   */
  public async processChargeSuccess(event: PaystackWebhookEvent): Promise<{
    processed: boolean;
    reason?: string;
    tenantId?: string;
  }> {
    const data = event.data;
    const reference = data.reference;
    const metadata = this.parseMetadata(data.metadata) as
      | PaystackWebhookEvent["data"]["metadata"]
      | undefined;

    const supabase = createAdminSupabaseClient();
    let tenantId = metadata?.tenant_id;
    let fallbackPlanSlug: PlanSlug | undefined;
    let fallbackInterval: BillingInterval | undefined;

    // Recover tenant_id from pending billing_transactions record if Paystack webhook omitted metadata
    if (!tenantId && reference) {
      try {
        const { data: pendingRow } = await supabase
          .from("billing_transactions")
          .select("tenant_id, raw_payload")
          .eq("paystack_reference", reference)
          .maybeSingle();
        if (pendingRow?.tenant_id) {
          tenantId = pendingRow.tenant_id as string;
          const rawPayload = pendingRow.raw_payload as Record<string, unknown> | undefined;
          if (typeof rawPayload?.plan_slug === "string") {
            fallbackPlanSlug = rawPayload.plan_slug as PlanSlug;
          }
          if (rawPayload?.billing_interval === "annual" || rawPayload?.billing_interval === "monthly") {
            fallbackInterval = rawPayload.billing_interval;
          }
        }
      } catch {
        // Ignore lookup error and handle missing tenant_id below
      }
    }

    if (!tenantId) {
      logger.warn("Paystack charge.success missing tenant_id in metadata", { reference });
      return { processed: false, reason: "Missing tenant_id in metadata" };
    }

    const planSlug = ((metadata?.plan_slug as PlanSlug) || fallbackPlanSlug || "scale") as PlanSlug;
    const billingInterval =
      ((metadata?.billing_interval as BillingInterval) || fallbackInterval || "monthly") as BillingInterval;
    const plan = await this.getPlan(planSlug);

    // 1. Idempotency Check (only skip if already recorded as 'success' or legacy row without status)
    let hasPendingRow = false;
    try {
      const { data: existingTx, error: idempErr } = await supabase
        .from("billing_transactions")
        .select("id, status")
        .eq("paystack_reference", reference)
        .maybeSingle();

      if (idempErr) throw idempErr;

      if (existingTx) {
        const txRow = existingTx as { id?: string; status?: string };
        if (!("status" in txRow) || txRow.status === "success") {
          logger.info("Transaction already processed (idempotent skip)", { reference });
          return { processed: false, reason: "Transaction already processed", tenantId };
        }
        hasPendingRow = true;
      }
    } catch {
      // Table unreachable fallback; check tenant settings ledger
      const { data: tenant } = await supabase
        .from("tenants")
        .select("settings")
        .eq("id", tenantId)
        .maybeSingle();

      const txHistory = (tenant?.settings as Record<string, unknown>)?.billing_transactions as
        | string[]
        | undefined;
      if (txHistory?.includes(reference)) {
        return { processed: false, reason: "Transaction already processed", tenantId };
      }
    }

    // 2. Record Billing Transaction (update pending row or insert new row)
    try {
      if (hasPendingRow) {
        const { error: txUpdateErr } = await supabase
          .from("billing_transactions")
          .update({
            amount_kobo: data.amount,
            amount_usd_cents: metadata?.usd_cents || plan.price_usd_cents,
            fx_rate_applied: metadata?.fx_rate || 1550.0,
            currency: data.currency || "NGN",
            status: "success",
            channel: data.channel || "card",
            raw_payload: data,
          })
          .eq("paystack_reference", reference)
          .eq("tenant_id", tenantId);
        if (txUpdateErr) throw txUpdateErr;
      } else {
        const { error: txInsertErr } = await supabase.from("billing_transactions").insert({
          tenant_id: tenantId,
          paystack_reference: reference,
          amount_kobo: data.amount,
          amount_usd_cents: metadata?.usd_cents || plan.price_usd_cents,
          fx_rate_applied: metadata?.fx_rate || 1550.0,
          currency: data.currency || "NGN",
          status: "success",
          channel: data.channel || "card",
          raw_payload: data,
        });
        if (txInsertErr) throw txInsertErr;
      }
    } catch (insertErr) {
      logger.warn("Could not insert into billing_transactions table, recording in tenant settings", {
        insertErr,
      });
      // Fallback in tenant settings
      const { data: currentTenant } = await supabase
        .from("tenants")
        .select("settings")
        .eq("id", tenantId)
        .single();

      const existingSettings = (currentTenant?.settings || {}) as Record<string, unknown>;
      const existingTx = (existingSettings.billing_transactions as string[]) || [];
      if (!existingTx.includes(reference)) {
        await supabase
          .from("tenants")
          .update({
            settings: {
              ...existingSettings,
              billing_transactions: [...existingTx, reference],
            },
          })
          .eq("id", tenantId);
      }
    }

    // 3. Compute Subscription Period (+30 days or +365 days)
    const daysToAdd = billingInterval === "annual" ? 365 : 30;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    // 4. Upsert Tenant Subscription
    try {
      const { error: subUpsertErr } = await supabase.from("tenant_subscriptions").upsert(
        {
          tenant_id: tenantId,
          plan_id: plan.id,
          status: "active",
          billing_interval: billingInterval,
          paystack_customer_code: data.customer?.customer_code || null,
          paystack_subscription_code: data.subscription_code || null,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: "tenant_id" },
      );
      if (subUpsertErr) throw subUpsertErr;
    } catch (subErr) {
      logger.warn("Could not upsert into tenant_subscriptions table, updating tenant settings", {
        subErr,
      });
    }

    // Always mirror subscription in tenant settings for immediate, high-availability entitlement resolution
    const { data: tenantRecord } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", tenantId)
      .maybeSingle();

    const currentSettings = (tenantRecord?.settings || {}) as Record<string, unknown>;
    await supabase
      .from("tenants")
      .update({
        settings: {
          ...currentSettings,
          subscription: {
            plan_slug: plan.slug,
            plan_name: plan.name,
            status: "active",
            billing_interval: billingInterval,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            last_payment_reference: reference,
            last_payment_amount_kobo: data.amount,
            updated_at: now.toISOString(),
          },
        },
      })
      .eq("id", tenantId);

    logger.info("Successfully activated subscription for tenant", {
      tenantId,
      planSlug: plan.slug,
      billingInterval,
      reference,
      periodEnd: periodEnd.toISOString(),
    });

    return { processed: true, tenantId };
  }
}

export const paystackBillingService = new PaystackBillingService();
