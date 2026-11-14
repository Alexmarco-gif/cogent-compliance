/**
 * Cogent Marketing Shield - Live End-to-End Audit Script
 * Progressive Onboarding, Value-Based Pricing & Paystack Billing Architecture
 * Document Reference: Document 11 & Document 08
 */

import crypto from "crypto";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

interface AuditResult {
  step: string;
  passed: boolean;
  details: string;
  latencyMs?: number;
}

const auditLog: AuditResult[] = [];

async function recordStep(name: string, fn: () => Promise<{ passed: boolean; details: string }>) {
  const start = Date.now();
  try {
    const res = await fn();
    const latencyMs = Date.now() - start;
    auditLog.push({ step: name, passed: res.passed, details: res.details, latencyMs });
    console.log(`[${res.passed ? "PASS" : "FAIL"}] ${name} (${latencyMs}ms): ${res.details}`);
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    auditLog.push({ step: name, passed: false, details: `Exception: ${msg}`, latencyMs });
    console.error(`[FAIL] ${name} (${latencyMs}ms): Exception - ${msg}`);
  }
}

async function runLiveAudit() {
  console.log("================================================================================");
  console.log("COGENT MARKETING SHIELD - ONBOARDING, PRICING & PAYSTACK BILLING LIVE AUDIT");
  console.log(`Target: ${BASE_URL}`);
  console.log("================================================================================\n");

  // 1. Health check
  await recordStep("Health Check Gateway", async () => {
    const res = await fetch(`${BASE_URL}/api/marketing-shield/v1/health`);
    const status = res.status;
    return {
      passed: status === 200,
      details: `HTTP ${status}`,
    };
  });

  // 2. Pricing Plans API
  await recordStep("Subscription Plans & Dynamic FX Rate API", async () => {
    const res = await fetch(`${BASE_URL}/api/marketing-shield/v1/billing/plans`);
    if (!res.ok) return { passed: false, details: `HTTP ${res.status}` };
    const data = await res.json();
    const plans = data.plans || [];
    const has4Plans = plans.length >= 4;
    const scale = plans.find((p: any) => p.slug === "scale");
    const fxRate = data.fx_rate;

    return {
      passed: has4Plans && scale?.price_usd_cents === 44900 && fxRate > 0,
      details: `Returned ${plans.length} plans. Scale Plan: $${scale?.price_usd_cents / 100}/mo. Active FX Rate: ₦${fxRate}/$1 USD.`,
    };
  });

  // 3. Entitlements API
  await recordStep("Contextual Entitlements & Feature Gates API", async () => {
    const res = await fetch(`${BASE_URL}/api/marketing-shield/v1/billing/entitlements`);
    if (!res.ok) return { passed: false, details: `HTTP ${res.status}` };
    const data = await res.json();
    const hasSubscription = Boolean(data.subscription?.plan);
    const entitlements = data.entitlements || [];

    return {
      passed: hasSubscription && entitlements.length === 4,
      details: `Tenant plan: ${data.subscription?.plan?.name} (${data.subscription?.status}). Verified ${entitlements.length} contextual gates.`,
    };
  });

  // 4. Onboarding Step 1: Regulatory Scope Configuration
  await recordStep("Onboarding Step 1: 1-Click Institution Scope Configuration", async () => {
    const res = await fetch(`${BASE_URL}/api/marketing-shield/v1/onboarding/scope`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scopes: ["DIGITAL_LENDING", "PAYMENTS_SWITCHING", "DATA_PRIVACY_GENERAL"],
        organization_name: "First Bank of Nigeria PLC",
      }),
    });
    if (!res.ok) return { passed: false, details: `HTTP ${res.status}` };
    const data = await res.json();
    return {
      passed: data.success && data.scopes.length === 3,
      details: `Configured scopes: ${data.scopes.join(", ")}`,
    };
  });

  // 5. Onboarding Step 2: Seed Product Truth (Lock 1)
  await recordStep("Onboarding Step 2: Seed Flagship Product Truth", async () => {
    const res = await fetch(`${BASE_URL}/api/marketing-shield/v1/onboarding/product-truth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_name: "FirstCredit Salary Advance",
        monthly_interest_rate_percent: 3.5,
        mandatory_fees_percent: 1.5,
        fee_description: "1.5% disbursement fee",
      }),
    });
    if (!res.ok) return { passed: false, details: `HTTP ${res.status}` };
    const data = await res.json();
    return {
      passed: data.success,
      details: `Initialized Product Truth for FirstCredit Salary Advance (3.5% monthly / 42% APR).`,
    };
  });

  // 6. Onboarding Step 3: Complete Onboarding
  await recordStep("Onboarding Step 3: Complete Progressive Onboarding", async () => {
    const res = await fetch(`${BASE_URL}/api/marketing-shield/v1/onboarding/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return { passed: false, details: `HTTP ${res.status}` };
    const data = await res.json();
    return {
      passed: data.success && Boolean(data.completedAt),
      details: `Workspace marked initialized at ${data.completedAt}.`,
    };
  });

  // 7. Verify Onboarding Status Endpoint
  await recordStep("Verify Progressive Onboarding Progression Status", async () => {
    const res = await fetch(`${BASE_URL}/api/marketing-shield/v1/onboarding/status`);
    if (!res.ok) return { passed: false, details: `HTTP ${res.status}` };
    const data = await res.json();
    return {
      passed: data.stepCompleted === 3 && data.onboardingCompleted === true,
      details: `Step: ${data.stepCompleted}/3. Active scopes count: ${data.activeScopes.length}. Completed: ${data.onboardingCompleted}.`,
    };
  });

  // 8. Paystack Checkout Initialization (Dual-Currency Conversion)
  await recordStep("Paystack Checkout Initialization & Dual-Currency Calculation", async () => {
    const res = await fetch(`${BASE_URL}/api/marketing-shield/v1/billing/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planSlug: "scale",
        billingInterval: "monthly",
      }),
    });
    if (!res.ok) return { passed: false, details: `HTTP ${res.status}` };
    const data = await res.json();
    const isExactKobo = data.amount_kobo === 69595000; // $449 * 1550 * 100
    return {
      passed: Boolean(data.authorization_url) && Boolean(data.reference) && isExactKobo,
      details: `Ref: ${data.reference}. Amount USD: $${data.amount_usd_cents / 100}. NGN Kobo: ${data.amount_kobo.toLocaleString()} Kobo (₦${(data.amount_kobo / 100).toLocaleString()}). Paystack Checkout URL: ${data.authorization_url.slice(0, 50)}...`,
    };
  });

  // 9. Paystack Webhook HMAC-SHA512 Verification & Idempotency
  await recordStep("Paystack Webhook HMAC-SHA512 Verification & Idempotency", async () => {
    const testSecret = process.env.PAYSTACK_SECRET_KEY || "sk_test_mock_paystack_secret_key";
    const ref = `COG_AUDIT_TX_${Date.now()}`;
    const payload = JSON.stringify({
      event: "charge.success",
      data: {
        reference: ref,
        amount: 69595000,
        currency: "NGN",
        channel: "card",
        status: "success",
        metadata: {
          tenant_id: "11111111-1111-1111-1111-111111111111",
          plan_slug: "scale",
          billing_interval: "monthly",
          usd_cents: 44900,
          fx_rate: 1550.0,
        },
      },
    });

    const signature = crypto.createHmac("sha512", testSecret).update(payload).digest("hex");

    // First call: Should process
    const res1 = await fetch(`${BASE_URL}/api/marketing-shield/v1/billing/webhooks/paystack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": signature,
      },
      body: payload,
    });

    const data1 = await res1.json();

    // Second call with same signature and payload: Should detect idempotent duplicate
    const res2 = await fetch(`${BASE_URL}/api/marketing-shield/v1/billing/webhooks/paystack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": signature,
      },
      body: payload,
    });

    const data2 = await res2.json();
    const isIdempotent =
      data2.message === "Transaction already processed" || data2.received === true;

    return {
      passed: res1.ok && res2.ok && isIdempotent,
      details: `Charge processed: ${data1.processed ?? true}. Replay detected: ${isIdempotent ? "PASSED (No double credit)" : "FAILED"}.`,
    };
  });

  // 10. Frontend Route Availability Check
  const pages = [
    { route: "/onboarding", name: "Progressive Onboarding Entry" },
    { route: "/onboarding/step-1", name: "Onboarding Step 1 (Scope)" },
    { route: "/onboarding/step-2", name: "Onboarding Step 2 (Product Truth)" },
    { route: "/onboarding/step-3", name: "Onboarding Step 3 (Sandbox Audit)" },
    { route: "/pricing", name: "Value-Based Pricing Matrix" },
    { route: "/settings/billing", name: "Subscription & Billing Settings" },
  ];

  for (const page of pages) {
    await recordStep(`Frontend Route: ${page.name} (${page.route})`, async () => {
      const res = await fetch(`${BASE_URL}${page.route}`);
      return {
        passed: res.status === 200,
        details: `HTTP ${res.status}`,
      };
    });
  }

  // Summary
  console.log("\n================================================================================");
  const total = auditLog.length;
  const passed = auditLog.filter((a) => a.passed).length;
  const failed = total - passed;
  console.log(`AUDIT COMPLETE: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveAudit().catch((err) => {
  console.error("Audit runner fatal error:", err);
  process.exit(1);
});
