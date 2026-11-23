-- =====================================================================================
-- Cogent Compliance Platform — Product Feature Governance, Three Lines of Defence RBAC,
-- Interactive Launch Readiness Gate, PIR & Feature-Level Regulatory Ripple Engine
-- Migration Version: 20261123000001
-- =====================================================================================

-- 1. Expand tenant_memberships role constraint for Three Lines of Defence RBAC
ALTER TABLE public.tenant_memberships
    DROP CONSTRAINT IF EXISTS tenant_memberships_role_check;

ALTER TABLE public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_role_check
    CHECK (role IN (
        -- 1st Line of Defence (Business, Product, Engineering, Tech, Operations, InfoSec)
        'MARKETING_GROWTH',
        'PRODUCT_MANAGER',
        'ENGINEERING_LEAD',
        'OPERATIONS_LEAD',
        'TECHNOLOGY_LEAD',
        'INFOSEC_LEAD',
        -- 2nd Line of Defence (Compliance, Legal, Risk, AML/Fraud & InfoSec)
        'COMPLIANCE_ANALYST',
        'LEGAL_COUNSEL',
        'CHIEF_COMPLIANCE_OFFICER',
        'RISK_OFFICER',
        'AML_FRAUD_OFFICER',
        'INFOSEC_OFFICER',
        -- 3rd Line of Defence (Independent Assurance)
        'INTERNAL_AUDIT',
        'INTERNAL_AUDITOR',
        -- Delegated Governance Authorities (Policy Workflow OS)
        'COMMITTEE_MEMBER',
        'BOARD_MEMBER',
        -- Platform Administration
        'WORKSPACE_ADMIN'
    ));

-- 2. Product Features Registry (9-Stage Fintech Feature Governance Lifecycle)
CREATE TABLE IF NOT EXISTS public.product_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    feature_code TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    summary TEXT NOT NULL,
    business_objective TEXT NOT NULL DEFAULT '',
    financial_activity_type TEXT NOT NULL DEFAULT 'PAYMENTS_TRANSFER' CHECK (financial_activity_type IN (
        'PAYMENTS_TRANSFER',
        'RECURRING_DEBIT',
        'DIGITAL_LENDING_BNPL',
        'WALLET_DEPOSIT_SAVINGS',
        'FX_CROSS_BORDER',
        'CARD_ISSUANCE',
        'INVESTMENT_WEALTHTECH',
        'AGENCY_BANKING',
        'OPEN_BANKING_API',
        'OTHER_FINANCIAL_SERVICE'
    )),
    change_classification TEXT NOT NULL DEFAULT 'NEW_FEATURE' CHECK (change_classification IN (
        'NEW_PRODUCT',
        'NEW_FEATURE',
        'MATERIAL_MODIFICATION',
        'MINOR_CHANGE'
    )),
    materiality_tier TEXT NOT NULL DEFAULT 'HIGH' CHECK (materiality_tier IN (
        'CRITICAL',
        'HIGH',
        'MEDIUM',
        'LOW'
    )),
    target_market TEXT NOT NULL DEFAULT 'INDIVIDUALS_AND_BUSINESSES' CHECK (target_market IN (
        'INDIVIDUALS',
        'BUSINESSES',
        'INDIVIDUALS_AND_BUSINESSES',
        'AGENTS_MERCHANTS'
    )),
    revenue_model TEXT NOT NULL DEFAULT '',
    third_party_dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
    applicable_regulators TEXT[] NOT NULL DEFAULT ARRAY['CBN', 'NFIU', 'NDPC', 'FCCPC']::TEXT[],
    regulatory_domains TEXT[] NOT NULL DEFAULT ARRAY[
        'KYC_CDD',
        'AML_CFT_CPF',
        'TRANSACTION_MONITORING',
        'SANCTIONS',
        'CONSUMER_PROTECTION',
        'DATA_PROTECTION',
        'RECORD_KEEPING',
        'DISPUTES_COMPLAINTS'
    ]::TEXT[],
    ria_matrix JSONB NOT NULL DEFAULT '[]'::jsonb,
    lifecycle_stage TEXT NOT NULL DEFAULT 'PROPOSAL' CHECK (lifecycle_stage IN (
        'PROPOSAL',
        'REGULATORY_SCREENING',
        'RISK_AND_CONTROL_DESIGN',
        'PRODUCT_OPS_DESIGN',
        'IMPLEMENTATION',
        'VALIDATION_TESTING',
        'LAUNCH_GATE',
        'POST_LAUNCH_MONITORING',
        'MODIFICATION_OR_RETIREMENT',
        'SUSPENDED',
        'RETIRED'
    )),
    gate_status TEXT NOT NULL DEFAULT 'NOT_READY' CHECK (gate_status IN (
        'NOT_READY',
        'PENDING_GATE',
        'APPROVED',
        'CONDITIONALLY_APPROVED',
        'REJECTED'
    )),
    readiness_score_numerator INTEGER NOT NULL DEFAULT 0,
    readiness_score_denominator INTEGER NOT NULL DEFAULT 10,
    work_product_id UUID REFERENCES public.work_product_artifacts(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES public.marketing_conversations(id) ON DELETE SET NULL,
    linked_product_id UUID REFERENCES public.campaign_products(id) ON DELETE SET NULL,
    created_by TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    owner_role TEXT NOT NULL DEFAULT 'PRODUCT_MANAGER',
    launched_at TIMESTAMPTZ,
    next_pir_due_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT product_features_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT product_features_tenant_code_unique UNIQUE (tenant_id, feature_code)
);

CREATE INDEX IF NOT EXISTS idx_product_features_tenant_stage
    ON public.product_features(tenant_id, lifecycle_stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_features_tenant_gate
    ON public.product_features(tenant_id, gate_status, materiality_tier);
CREATE INDEX IF NOT EXISTS idx_product_features_work_product
    ON public.product_features(tenant_id, work_product_id);

-- 3. Feature Risk & Control Matrix + Compliance-to-Build Translation Chain
CREATE TABLE IF NOT EXISTS public.feature_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL,
    control_code TEXT NOT NULL,
    compliance_domain TEXT NOT NULL CHECK (compliance_domain IN (
        'KYC_CDD',
        'AML_CFT_CPF',
        'TRANSACTION_MONITORING',
        'SANCTIONS',
        'CONSUMER_PROTECTION',
        'DATA_PROTECTION',
        'RECORD_KEEPING',
        'DISPUTES_COMPLAINTS',
        'FRAUD_PREVENTION',
        'LICENSING_PERIMETER',
        'INFOSEC'
    )),
    regulator TEXT NOT NULL DEFAULT 'CBN',
    statutory_citation TEXT NOT NULL,
    risk_statement TEXT NOT NULL,
    risk_severity TEXT NOT NULL DEFAULT 'HIGH' CHECK (risk_severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    control_type TEXT NOT NULL CHECK (control_type IN ('PREVENTIVE', 'DETECTIVE', 'CORRECTIVE')),
    control_objective TEXT NOT NULL,
    -- Obligation -> Control -> Product Req -> Engineering Spec -> SOP -> QA Test Evidence
    product_requirement TEXT NOT NULL,
    engineering_spec TEXT NOT NULL,
    operational_sop_trigger TEXT NOT NULL,
    qa_test_case TEXT NOT NULL,
    -- Line of Defence Accountability
    owner_line TEXT NOT NULL DEFAULT 'FIRST_LINE' CHECK (owner_line IN ('FIRST_LINE', 'SECOND_LINE')),
    owner_role TEXT NOT NULL DEFAULT 'ENGINEERING_LEAD',
    required_evidence_description TEXT NOT NULL,
    is_mandatory_launch_blocker BOOLEAN NOT NULL DEFAULT true,
    verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN (
        'PENDING',
        'IN_PROGRESS',
        'EVIDENCE_SUBMITTED',
        'VERIFIED',
        'FAILED',
        'WAIVED_WITH_CONDITION',
        'REASSESSMENT_REQUIRED'
    )),
    evidence_attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    verified_by TEXT,
    verified_role TEXT,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT feature_controls_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_feature_controls_feature FOREIGN KEY (tenant_id, feature_id)
        REFERENCES public.product_features(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_controls_feature
    ON public.feature_controls(tenant_id, feature_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_feature_controls_domain
    ON public.feature_controls(tenant_id, compliance_domain, regulator);

-- 4. Interactive Launch Readiness Gates (Immutable Decision Ledger)
CREATE TABLE IF NOT EXISTS public.feature_readiness_gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL,
    gate_number INTEGER NOT NULL DEFAULT 1,
    decision TEXT NOT NULL CHECK (decision IN (
        'APPROVED',
        'CONDITIONALLY_APPROVED',
        'REJECTED'
    )),
    readiness_score_numerator INTEGER NOT NULL,
    readiness_score_denominator INTEGER NOT NULL DEFAULT 10,
    checklist_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    signoffs JSONB NOT NULL DEFAULT '[]'::jsonb,
    decided_by TEXT NOT NULL,
    decided_role TEXT NOT NULL,
    decision_rationale TEXT NOT NULL,
    snapshot_hash_sha256 CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT feature_readiness_gates_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_feature_gates_feature FOREIGN KEY (tenant_id, feature_id)
        REFERENCES public.product_features(tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_feature_readiness_gates_feature
    ON public.feature_readiness_gates(tenant_id, feature_id, created_at DESC);

-- 5. Post-Implementation Reviews (PIR), Material Change Reassessments & 3rd-Line Audit Notes
CREATE TABLE IF NOT EXISTS public.feature_post_launch_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL,
    review_type TEXT NOT NULL CHECK (review_type IN (
        'POST_IMPLEMENTATION_REVIEW',
        'MATERIAL_CHANGE_REASSESSMENT',
        'INCIDENT_ESCALATION',
        'SUSPENSION_REVIEW',
        'RETIREMENT_REVIEW',
        'INTERNAL_AUDIT_ASSURANCE'
    )),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN (
        'OPEN',
        'IN_REVIEW',
        'REMEDIATION_REQUIRED',
        'CLOSED'
    )),
    title TEXT NOT NULL,
    trigger_summary TEXT NOT NULL,
    monitoring_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    change_impact_summary TEXT,
    requires_reapproval BOOLEAN NOT NULL DEFAULT false,
    remediation_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    conducted_by TEXT NOT NULL,
    conducted_role TEXT NOT NULL,
    concluded_at TIMESTAMPTZ,
    conclusion_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT feature_pir_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_feature_pir_feature FOREIGN KEY (tenant_id, feature_id)
        REFERENCES public.product_features(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_pir_feature
    ON public.feature_post_launch_reviews(tenant_id, feature_id, created_at DESC);

-- 6. Extend regulatory_ripple_alerts to map new CBN/NFIU/NDPC circulars to live Features, Controls & Owners
ALTER TABLE public.regulatory_ripple_alerts
    ADD COLUMN IF NOT EXISTS impacted_feature_id UUID REFERENCES public.product_features(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS impacted_feature_name TEXT,
    ADD COLUMN IF NOT EXISTS impacted_control_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    ADD COLUMN IF NOT EXISTS impacted_control_codes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS impacted_owner_roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_regulatory_ripple_alerts_feature
    ON public.regulatory_ripple_alerts(tenant_id, impacted_feature_id);

-- 7. Row Level Security Policies (Strict Multi-Tenant Isolation)
ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_readiness_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_post_launch_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_features' AND policyname = 'Tenant isolation for product_features') THEN
        CREATE POLICY "Tenant isolation for product_features"
            ON public.product_features FOR ALL TO authenticated
            USING (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feature_controls' AND policyname = 'Tenant isolation for feature_controls') THEN
        CREATE POLICY "Tenant isolation for feature_controls"
            ON public.feature_controls FOR ALL TO authenticated
            USING (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feature_readiness_gates' AND policyname = 'Tenant isolation for feature_readiness_gates') THEN
        CREATE POLICY "Tenant isolation for feature_readiness_gates"
            ON public.feature_readiness_gates FOR ALL TO authenticated
            USING (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feature_post_launch_reviews' AND policyname = 'Tenant isolation for feature_post_launch_reviews') THEN
        CREATE POLICY "Tenant isolation for feature_post_launch_reviews"
            ON public.feature_post_launch_reviews FOR ALL TO authenticated
            USING (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text));
    END IF;
END $$;
