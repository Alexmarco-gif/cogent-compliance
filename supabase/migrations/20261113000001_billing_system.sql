-- =====================================================================================
-- Cogent Marketing Shield - Value-Based Pricing, Paystack Billing & Entitlements Schema
-- Document Reference: Document 11 (Section 4) & Document 08 (Phase 6 / Phase 12)
-- =====================================================================================

-- 1. Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL, -- 'evaluation', 'growth', 'scale', 'enterprise'
    name VARCHAR(128) NOT NULL,
    price_usd_cents INTEGER NOT NULL, -- e.g. 14900 for $149.00
    price_usd_annual_cents INTEGER NOT NULL, -- e.g. 142800 for $1,428.00/yr ($119/mo)
    paystack_plan_code_monthly VARCHAR(128),
    paystack_plan_code_annual VARCHAR(128),
    monthly_audit_limit INTEGER NOT NULL, -- -1 for unlimited, 3 for trial, 25 for growth
    seat_limit INTEGER NOT NULL, -- -1 for unlimited, 2 for trial, 3 for growth, 10 for scale
    url_drift_monitor_limit INTEGER NOT NULL, -- 0 for trial/growth, 15 for scale, -1 for enterprise
    retention_days INTEGER NOT NULL, -- 7 for trial, 90 for growth, 730 for scale, 2555 for enterprise
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tenant Subscriptions Table
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

-- 3. System FX Rates Table (USD -> NGN)
CREATE TABLE IF NOT EXISTS public.system_fx_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_pair VARCHAR(16) NOT NULL DEFAULT 'USD_NGN',
    rate NUMERIC(12, 4) NOT NULL, -- e.g. 1550.0000
    source VARCHAR(64) NOT NULL DEFAULT 'MANUAL_OVERRIDE',
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Billing Transactions Table
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

-- 5. Indexes for Fast Multi-Tenant Billing Queries
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON public.tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON public.tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_tenant ON public.billing_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_ref ON public.billing_transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_system_fx_rates_pair ON public.system_fx_rates(currency_pair, created_at DESC);

-- 6. RLS Security Policies
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Public plans viewable by authenticated users'
    ) THEN
        CREATE POLICY "Public plans viewable by authenticated users" ON public.subscription_plans
            FOR SELECT TO authenticated USING (is_active = true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'tenant_subscriptions' AND policyname = 'Users can view their tenant subscription'
    ) THEN
        CREATE POLICY "Users can view their tenant subscription" ON public.tenant_subscriptions
            FOR SELECT TO authenticated 
            USING (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'billing_transactions' AND policyname = 'Users can view their tenant transactions'
    ) THEN
        CREATE POLICY "Users can view their tenant transactions" ON public.billing_transactions
            FOR SELECT TO authenticated 
            USING (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'system_fx_rates' AND policyname = 'Authenticated users can view FX rates'
    ) THEN
        CREATE POLICY "Authenticated users can view FX rates" ON public.system_fx_rates
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- 7. Seed Initial Plans (Evaluation, Growth, Scale, Enterprise)
INSERT INTO public.subscription_plans (
    slug, name, price_usd_cents, price_usd_annual_cents, 
    monthly_audit_limit, seat_limit, url_drift_monitor_limit, 
    retention_days, features
) VALUES 
(
    'evaluation',
    'Evaluation Pilot',
    0,
    0,
    3,
    2,
    0,
    7,
    '{"export_unwatermarked": false, "cco_approval_lock": false, "url_drift_monitoring": false, "custom_rate_cards": 1, "compliant_rewrites": 10, "support_sla": "Community"}'::jsonb
),
(
    'growth',
    'Growth (Starter)',
    14900,
    142800,
    25,
    3,
    0,
    90,
    '{"export_unwatermarked": true, "cco_approval_lock": false, "url_drift_monitoring": false, "custom_rate_cards": 5, "compliant_rewrites": -1, "support_sla": "Standard Email (24h)"}'::jsonb
),
(
    'scale',
    'Scale (Pro — Most Popular)',
    44900,
    430800,
    -1,
    10,
    15,
    730,
    '{"export_unwatermarked": true, "cco_approval_lock": true, "url_drift_monitoring": true, "custom_rate_cards": -1, "compliant_rewrites": -1, "support_sla": "Priority Email + Chat (4h)"}'::jsonb
),
(
    'enterprise',
    'Enterprise',
    149900,
    1438800,
    -1,
    -1,
    -1,
    2555,
    '{"export_unwatermarked": true, "cco_approval_lock": true, "url_drift_monitoring": true, "custom_rate_cards": -1, "compliant_rewrites": -1, "support_sla": "Dedicated Compliance Manager (1h)", "custom_corpora": true}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    price_usd_cents = EXCLUDED.price_usd_cents,
    price_usd_annual_cents = EXCLUDED.price_usd_annual_cents,
    monthly_audit_limit = EXCLUDED.monthly_audit_limit,
    seat_limit = EXCLUDED.seat_limit,
    url_drift_monitor_limit = EXCLUDED.url_drift_monitor_limit,
    retention_days = EXCLUDED.retention_days,
    features = EXCLUDED.features;

-- 8. Seed Default System FX Rate (USD -> NGN) idempotently
INSERT INTO public.system_fx_rates (currency_pair, rate, source)
SELECT 'USD_NGN', 1550.0000, 'CENTRAL_BANK_BENCHMARK'
WHERE NOT EXISTS (
    SELECT 1 FROM public.system_fx_rates WHERE currency_pair = 'USD_NGN'
);
