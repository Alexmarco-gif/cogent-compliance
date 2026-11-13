# DOCUMENT 11: INTERACTIVE ONBOARDING, VALUE-BASED PRICING & PAYSTACK BILLING ARCHITECTURE

**System:** Cogent Compliance Platform — Marketing Shield  
**Document Code:** `COG-DOC-11`  
**Version:** 1.0.0  
**Status:** Approved Specification  
**Target Architecture:** Next.js (App Router), Clerk Auth, Supabase (PostgreSQL + RLS), Paystack API v1, Inngest, Tailwind CSS

---

## 1. EXECUTIVE OVERVIEW & ARCHITECTURAL OBJECTIVES

This document specifies the self-serve growth, onboarding, entitlement enforcement, and monetization infrastructure for the **Cogent Marketing Shield**. 

### Core Objectives
1. **Zero-Friction "Aha!" Onboarding:** Deliver a 60-second interactive onboarding flow (`/onboarding`) that drops users into a live interactive compliance audit on Second 1 without requiring tedious form fills.
2. **Value-Based Pricing Strategy:** Anchor tiering ($149 / $449 / $1,499 USD per month) against the cost of regulatory non-compliance (ARCON/FCCPC fines of ₦1M–₦100M and external legal retainers), providing frictionless self-serve access for fast-growing fintechs while retaining high-margin enterprise expansion.
3. **Dual-Currency Billing Engine (USD Display / NGN Settlement):** Display global USD pricing on the frontend while executing real-time FX conversion and seamless Naira (or USD) settlement via Paystack.
4. **Strict Contextual Feature Gating:** Enforce tier-based quotas, separation-of-duties locks, watermarking, and post-publication URL drift monitoring at the API level using lightweight server middleware and client hooks.

---

## 2. INTERACTIVE 60-SECOND PROGRESSIVE ONBOARDING ENGINE (`/onboarding`)

Traditional multi-step B2B registration forms kill conversion. Cogent implements **Value-First Progressive Onboarding**: the user authenticates via Clerk (Google OAuth or Work Email) and is immediately guided through a 3-step interactive setup that populates their workspace context and demonstrates immediate value.

```
+-----------------------------------------------------------------------------------+
| STEP 1: Institution Scope  -->  STEP 2: Seed Product Truth  -->  STEP 3: Sandbox Audit  |
| Select License Type             Provide 1 Flagship Rate         Run Live Test Audit|
| (5 Seconds)                     (10 Seconds or Skip)            (30 Seconds - "Aha!")|
+-----------------------------------------------------------------------------------+
```

### Step 1: 1-Click Institution Scope Configuration (5 Seconds)
* **Route:** `/onboarding/step-1`
* **UI Design:** Centered monochrome container on `#FAFAFA` background with 1px solid `#E4E4E7` borders.
* **Fields:**
  * `organization_name`: Pre-populated from Clerk Organization or user domain.
  * `regulatory_scope` (Multi-select grid with toggle cards):
    * `DIGITAL_LENDING`: Activates FCCPC DEON Regulations (2025/2026) & CBN Microfinance Directives.
    * `PAYMENTS_SWITCHING`: Activates CBN PSSP / MMO / Switching Guidelines & Consumer Protection Framework.
    * `BANKING_DEPOSIT`: Activates CBN Consumer Protection Regulations (2019) & BOFIA 2020 Mandates.
    * `WEALTH_INVESTMENT`: Activates SEC Digital Assets, Robo-Advisory & Crowdfunding Rules.
    * `DATA_PRIVACY_GENERAL`: Activates NDPA 2023 & GAID cross-sector mandates.
* **Action:** Clicking **"Continue →"** writes the selected array to `tenants.active_regulatory_scopes` and automatically loads the relevant Statutory Vault rule subsets.

### Step 2: "Seed Your Product Truth" (10 Seconds — Optional)
* **Route:** `/onboarding/step-2`
* **Purpose:** Seed Lock 1 (Numerical & Rate Verifier) with the tenant's actual product parameters.
* **Inline Form:**
  * *"What is your flagship product's interest rate or fee structure?"*
  * Input 1: **Product Name** (e.g., `Quick Credit Loan`)
  * Input 2: **Monthly Interest Rate (%)** (e.g., `4.5%`)
  * Input 3: **Mandatory Fees / Processing (%)** (e.g., `1.5% one-off fee`)
* **Actions:**
  * **"Save & Initialize Lock 1 →"**: Upserts row into `campaign_products` and proceeds.
  * **"Skip for now →"**: Proceeds directly; populates sample sandbox rate card (`Sample Loan: 5% APR`).

### Step 3: The "Aha!" Moment — Interactive Sandbox Audit (30 Seconds)
* **Route:** `/onboarding/step-3` (redirects directly to `/studio?onboarding=true`)
* **Pre-Loaded Sample Campaign:**
  > *"Get an instant ₦500,000 loan in 3 minutes! Zero collateral, 0% hidden charges, guaranteed approval for all Nigerians."*
* **Interactive Directive:** A subtle monochrome banner highlights: **"Click 'Run Compliance Audit' to watch Cogent inspect this campaign against your regulatory scope."**
* **Execution Flow:**
  1. User clicks **"Run Compliance Audit"**.
  2. The Copilot executes real hybrid search against the active Statutory Vault, highlights non-compliant phrases on the canvas (`"0% hidden charges"`, `"guaranteed approval"`), and flags **FCCPC Digital Lending Reg. 18** and **ARCON Code §4.2**.
  3. The right canvas presents an interactive button: **`[Accept Compliant Rewrite]`**.
  4. Clicking it applies the rewrite (*"Instant loans up to ₦500,000 subject to credit evaluation..."*), clears the violation badges, and shows a celebration modal: **"Workspace Initialized — Your 7-Day Evaluation Pilot is Active."**

---

## 3. VALUE-BASED SAAS PRICING STRATEGY

### Pricing Benchmark & ROI Justification
Financial compliance in Nigeria carries massive financial risk:
* **ARCON Unvetted Ad Penalty:** ₦1,000,000 – ₦3,000,000 per unvetted digital advertisement or skit.
* **FCCPC Consumer Protection Penalty:** Up to ₦100,000,000 or 1% of annual turnover for deceptive loan disclosures.
* **External Legal Retainer:** ₦1,500,000 – ₦5,000,000 monthly with 5–10 day audit turnaround.

By offering Cogent at **$149 to $1,499 USD per month**, the platform delivers an instant 10x ROI for fintech CMOs and CCOs while maintaining an ultra-frictionless self-serve tier.

### Plan Tiering Matrix

| Parameter | Evaluation Pilot | Growth (Starter) | Scale (Pro — Most Popular) | Enterprise |
| :--- | :--- | :--- | :--- | :--- |
| **Target Audience** | Evaluation prospects | Seed Fintechs & MFBs | Series A/B Fintechs, MMOs & Banks | Tier-1 Banks & Enterprise Groups |
| **Monthly Price (USD)** | **$0** (7 Days) | **$149 / mo** | **$449 / mo** | **$1,499 / mo** |
| **Annual Price (-20%)** | — | **$119 / mo** ($1,428/yr) | **$359 / mo** ($4,308/yr) | **$1,199 / mo** ($14,388/yr) |
| **Included Seats** | 2 Seats (1 Mktg + 1 CCO) | 3 Seats (RBAC Enabled) | 10 Seats (CCO Lock Enabled) | Unlimited Seats |
| **Campaign Audits** | 3 Total Audits | 25 Audits / month | **Unlimited** Audits | **Unlimited** Audits |
| **Compliant Rewrites** | 10 Rewrites | **Unlimited** | **Unlimited** | **Unlimited** |
| **Rate Cards & Playbooks** | 1 Rate Card | 5 Rate Cards / Custom Rules | **Unlimited** Rate Cards & Playbooks | **Unlimited** Custom Corpora |
| **Export Watermark** | Watermarked PDF | Unwatermarked PDF | Signed Cryptographic PDF | Custom Co-Branded PDF |
| **URL Drift Monitors** | 0 URLs | 0 URLs | Up to 15 Live URLs Monitored | **Unlimited** URL Monitors |
| **Audit Log Retention** | 7 Days | 90 Days | 2 Years (FCCPC Mandate) | 7 Years (BOFIA Mandate) |
| **Support SLA** | Community | Standard Email (24h) | Priority Email + Chat (4h) | Dedicated Compliance Manager (1h) |

---

## 4. PAYSTACK BILLING ARCHITECTURE & DUAL-CURRENCY ENGINE

### USD Display / NGN Settlement Logic
1. **Frontend Presentation:** Prices are presented in **USD ($)** by default to maintain international SaaS positioning and hedge local currency volatility.
2. **Dynamic FX Conversion:** At the moment of checkout, the backend queries the stored system FX rate (or cached central rate, e.g., `₦1,550 / $1 USD`).
3. **Paystack Transaction Initialization:** The transaction amount is converted to Naira **Kobo** (`Amount_USD * FX_Rate * 100`) and sent to Paystack’s `/transaction/initialize` or `/subscription` API.
4. **Multi-Currency Card Processing:** If the user presents an international USD card on a Paystack merchant account with USD enabled, Paystack charges directly in USD; otherwise, it settles in NGN seamlessly.

```
+-----------------------------------------------------------------------------------+
| 1. User selects $449/mo Plan  -->  2. System fetches FX Rate (₦1,550/$1)           |
| 3. Computes NGN Amount: ₦695,950  -->  4. Converts to Kobo: 69,595,000 Kobo       |
| 5. Paystack Popup opens in App  -->  6. Webhook verifies signature & unlocks Tier |
+-----------------------------------------------------------------------------------+
```

### Database Schema (`supabase/migrations/20261113_billing_system.sql`)

```sql
-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL, -- 'evaluation', 'growth', 'scale', 'enterprise'
    name VARCHAR(128) NOT NULL,
    price_usd_cents INTEGER NOT NULL, -- e.g. 14900 for $149.00
    price_usd_annual_cents INTEGER NOT NULL, -- e.g. 142800 for $1,428.00/yr ($119/mo)
    paystack_plan_code_monthly VARCHAR(128),
    paystack_plan_code_annual VARCHAR(128),
    monthly_audit_limit INTEGER NOT NULL, -- -1 for unlimited
    seat_limit INTEGER NOT NULL, -- -1 for unlimited
    url_drift_monitor_limit INTEGER NOT NULL, -- -1 for unlimited
    retention_days INTEGER NOT NULL,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenant Subscriptions Table
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status VARCHAR(32) NOT NULL DEFAULT 'trialing', -- 'trialing', 'active', 'past_due', 'canceled'
    billing_interval VARCHAR(16) NOT NULL DEFAULT 'monthly', -- 'monthly', 'annual'
    paystack_customer_code VARCHAR(128),
    paystack_subscription_code VARCHAR(128),
    paystack_email_token VARCHAR(128),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    canceled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_subscription UNIQUE (tenant_id)
);

-- System FX Rates Table
CREATE TABLE IF NOT EXISTS public.system_fx_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_pair VARCHAR(16) NOT NULL DEFAULT 'USD_NGN',
    rate NUMERIC(12, 4) NOT NULL, -- e.g. 1550.0000
    source VARCHAR(64) NOT NULL DEFAULT 'MANUAL_OVERRIDE',
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Billing Transactions Log
CREATE TABLE IF NOT EXISTS public.billing_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    paystack_reference VARCHAR(128) UNIQUE NOT NULL,
    amount_kobo BIGINT NOT NULL,
    amount_usd_cents INTEGER NOT NULL,
    fx_rate_applied NUMERIC(12, 4) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    status VARCHAR(32) NOT NULL, -- 'success', 'failed', 'pending'
    channel VARCHAR(32),
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Security Policies
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public plans viewable by authenticated users" ON public.subscription_plans
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Users can view their tenant's subscription" ON public.tenant_subscriptions
    FOR SELECT TO authenticated 
    USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their tenant's transactions" ON public.billing_transactions
    FOR SELECT TO authenticated 
    USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
```

---

### Backend API: Checkout Endpoint (`POST /api/billing/checkout`)

```typescript
// src/app/api/billing/checkout/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planSlug, billingInterval = 'monthly' } = await req.json();

    // 1. Fetch Plan Details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('slug', planSlug)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    // 2. Fetch Active FX Rate (USD -> NGN)
    const { data: fxData } = await supabaseAdmin
      .from('system_fx_rates')
      .select('rate')
      .eq('currency_pair', 'USD_NGN')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const fxRate = fxData?.rate || 1550.0; // Fallback rate

    // 3. Calculate Price in USD Cents & NGN Kobo
    const priceUsdCents = billingInterval === 'annual' 
      ? plan.price_usd_annual_cents 
      : plan.price_usd_cents;

    const priceUsd = priceUsdCents / 100;
    const priceNgn = priceUsd * fxRate;
    const amountKobo = Math.round(priceNgn * 100);

    // 4. Fetch Tenant Admin Email
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, billing_email')
      .eq('clerk_org_id', orgId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant record not found' }, { status: 404 });
    }

    const reference = `COG_${tenant.id.slice(0, 8)}_${Date.now()}`;

    // 5. Initialize Paystack Transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: tenant.billing_email,
        amount: amountKobo,
        currency: 'NGN',
        reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?checkout=success`,
        metadata: {
          tenant_id: tenant.id,
          plan_id: plan.id,
          plan_slug: plan.slug,
          billing_interval: billingInterval,
          usd_cents: priceUsdCents,
          fx_rate: fxRate,
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      throw new Error(paystackData.message || 'Paystack initialization failed');
    }

    return NextResponse.json({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference,
      amount_kobo: amountKobo,
      fx_rate: fxRate,
    });
  } catch (err: any) {
    console.error('[BILLING_CHECKOUT_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
```

---

### Backend API: Paystack Webhook Handler (`POST /api/webhooks/paystack`)

```typescript
// src/app/api/webhooks/paystack/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    // 1. Verify HMAC SHA-512 Signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid Paystack signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // 2. Handle Charge Success Event
    if (event.event === 'charge.success') {
      const data = event.data;
      const { tenant_id, plan_id, billing_interval, usd_cents, fx_rate } = data.metadata || {};

      if (!tenant_id || !plan_id) {
        console.warn('[PAYSTACK_WEBHOOK] Missing metadata in successful charge:', data.reference);
        return NextResponse.json({ received: true });
      }

      // Check Idempotency
      const { data: existingTx } = await supabaseAdmin
        .from('billing_transactions')
        .select('id')
        .eq('paystack_reference', data.reference)
        .single();

      if (existingTx) {
        return NextResponse.json({ message: 'Transaction already processed' });
      }

      // Record Transaction
      await supabaseAdmin.from('billing_transactions').insert({
        tenant_id,
        paystack_reference: data.reference,
        amount_kobo: data.amount,
        amount_usd_cents: usd_cents || 0,
        fx_rate_applied: fx_rate || 1.0,
        currency: data.currency,
        status: 'success',
        channel: data.channel,
        raw_payload: data,
      });

      // Compute Period Duration (30 days for monthly, 365 for annual)
      const daysToAdd = billing_interval === 'annual' ? 365 : 30;
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + daysToAdd);

      // Upsert Subscription Status
      await supabaseAdmin.from('tenant_subscriptions').upsert(
        {
          tenant_id,
          plan_id,
          status: 'active',
          billing_interval: billing_interval || 'monthly',
          paystack_customer_code: data.customer?.customer_code,
          paystack_subscription_code: data.subscription_code || null,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      );

      // Log Better Stack Event
      console.log(`[BILLING_SUCCESS] Tenant ${tenant_id} upgraded to plan ${plan_id}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[PAYSTACK_WEBHOOK_ERROR]', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
```

---

## 5. FEATURE GATING & ENFORCEMENT ENGINE

### Server-Side Feature Gate Middleware (`src/lib/billing/gates.ts`)

```typescript
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface EntitlementCheck {
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
}

export async function checkTenantEntitlement(
  tenantId: string,
  feature: 'run_audit' | 'export_unwatermarked' | 'cco_approval_lock' | 'url_drift_monitoring'
): Promise<EntitlementCheck> {
  // 1. Fetch Subscription & Plan Limits
  const { data: sub } = await supabaseAdmin
    .from('tenant_subscriptions')
    .select('status, current_period_end, subscription_plans(*)')
    .eq('tenant_id', tenantId)
    .single();

  if (!sub || sub.status !== 'active') {
    // Check if within 7-Day Trial Period
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('created_at')
      .eq('id', tenantId)
      .single();

    const created = new Date(tenant?.created_at || Date.now());
    const trialEnd = new Date(created.valueOf() + 7 * 24 * 60 * 60 * 1000);

    if (new Date() > trialEnd) {
      return { allowed: false, reason: 'Evaluation trial expired. Upgrade to Growth or Scale.' };
    }
  }

  const plan = sub?.subscription_plans;

  // 2. Feature-Specific Logic
  if (feature === 'export_unwatermarked') {
    if (!plan || plan.slug === 'evaluation') {
      return { allowed: false, reason: 'Unwatermarked PDF dossiers require a Growth or Scale plan.' };
    }
  }

  if (feature === 'cco_approval_lock') {
    if (!plan || (plan.slug !== 'scale' && plan.slug !== 'enterprise')) {
      return { allowed: false, reason: 'CCO Separation-of-Duties Locks require Scale or Enterprise plan.' };
    }
  }

  if (feature === 'run_audit') {
    const limit = plan?.monthly_audit_limit ?? 3; // Default 3 for trial
    if (limit === -1) return { allowed: true }; // Unlimited

    // Query current month usage count from audit logs
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabaseAdmin
      .from('campaign_audits')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', startOfMonth.toISOString());

    const currentCount = count || 0;
    if (currentCount >= limit) {
      return {
        allowed: false,
        reason: `Monthly audit quota reached (${currentCount}/${limit}). Upgrade your plan to continue.`,
        currentCount,
        limit,
      };
    }
    return { allowed: true, currentCount, limit };
  }

  return { allowed: true };
}
```

---

### React Frontend Hook (`src/hooks/useEntitlement.ts`)

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

export function useEntitlement(feature: 'run_audit' | 'export_unwatermarked' | 'cco_approval_lock') {
  const { data, isLoading } = useQuery({
    queryKey: ['entitlement', feature],
    queryFn: async () => {
      const res = await fetch(`/api/billing/entitlements?feature=${feature}`);
      if (!res.ok) throw new Error('Failed to fetch entitlements');
      return res.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    allowed: data?.allowed ?? false,
    reason: data?.reason,
    currentCount: data?.currentCount,
    limit: data?.limit,
    isLoading,
  };
}
```

---

## 6. VERIFICATION & TEST CRITERIA

Before shipping Phase 6 / Onboarding & Billing, verify the following 4 assertions:

1. **Onboarding Flow:** `/onboarding` must complete in `< 60 seconds`, correctly seed `active_regulatory_scopes` in Supabase, and drop the user into `/studio?onboarding=true` with pre-loaded audit findings.
2. **Dynamic Checkout:** Initiating checkout on `$449/mo` must calculate exact NGN Kobo at current FX rate (e.g., `₦695,950 = 69,595,000 kobo`) and launch the Paystack inline modal cleanly.
3. **Webhook Idempotency:** Posting duplicate `charge.success` events to `/api/webhooks/paystack` must return `Transaction already processed` without double-crediting period duration.
4. **Feature Gate Enforcement:** Evaluation users attempting to export unwatermarked PDFs or toggle CCO Separation-of-Duties Locks must receive a 403 API response and trigger the inline Plan Selector modal.