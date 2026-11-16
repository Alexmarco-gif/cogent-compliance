-- =====================================================================================
-- Cogent Marketing Shield - Autonomous Nigerian Compliance Analyst Schema Extensions
-- Document Reference: Document 13 (Section 5.6, Phase D)
-- =====================================================================================

-- 1. Extend campaign_drift_monitors with target type and Zero-Prompt incident thread link
ALTER TABLE public.campaign_drift_monitors
    ADD COLUMN IF NOT EXISTS monitor_target_type VARCHAR(64) NOT NULL DEFAULT 'WEB_LANDING_PAGE',
    ADD COLUMN IF NOT EXISTS incident_conversation_id UUID REFERENCES public.marketing_conversations(id) ON DELETE SET NULL;

-- 2. Regulatory Ripple Alerts Table (Zero-Prompt Circular Impact Sentinel)
CREATE TABLE IF NOT EXISTS public.regulatory_ripple_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    regulatory_instrument_id UUID REFERENCES public.regulatory_instruments(id) ON DELETE SET NULL,
    regulator VARCHAR(32) NOT NULL DEFAULT 'CBN',
    circular_title TEXT NOT NULL,
    impacted_product_id UUID REFERENCES public.campaign_products(id) ON DELETE SET NULL,
    impacted_product_name TEXT,
    impacted_campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
    impacted_campaign_name TEXT,
    incident_conversation_id UUID REFERENCES public.marketing_conversations(id) ON DELETE SET NULL,
    blind_spot_summary TEXT NOT NULL,
    consequence_summary TEXT NOT NULL,
    recommended_fix TEXT NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'HIGH', -- 'CRITICAL', 'HIGH', 'MEDIUM'
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_ripple_alert UNIQUE (tenant_id, id)
);

-- 3. Indexes for Fast Multi-Tenant Ripple & Drift Queries
CREATE INDEX IF NOT EXISTS idx_regulatory_ripple_alerts_tenant_status
    ON public.regulatory_ripple_alerts(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulatory_ripple_alerts_product
    ON public.regulatory_ripple_alerts(tenant_id, impacted_product_id);
CREATE INDEX IF NOT EXISTS idx_drift_monitors_incident_conversation
    ON public.campaign_drift_monitors(tenant_id, incident_conversation_id);

-- 4. RLS Security Policies
ALTER TABLE public.regulatory_ripple_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'regulatory_ripple_alerts'
          AND policyname = 'Users can view their tenant regulatory ripple alerts'
    ) THEN
        CREATE POLICY "Users can view their tenant regulatory ripple alerts"
            ON public.regulatory_ripple_alerts
            FOR SELECT TO authenticated
            USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'regulatory_ripple_alerts'
          AND policyname = 'Users can update their tenant regulatory ripple alerts'
    ) THEN
        CREATE POLICY "Users can update their tenant regulatory ripple alerts"
            ON public.regulatory_ripple_alerts
            FOR UPDATE TO authenticated
            USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text
                )
            );
    END IF;
END $$;
