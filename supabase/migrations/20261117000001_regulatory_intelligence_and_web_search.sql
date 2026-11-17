-- =====================================================================================
-- Cogent Regulatory Intelligence - Dual-Engine Web Search & Work Products Migration
-- Migration Version: 20261117000001
-- Document Reference: Document 14 & Document 15 (Section 2)
-- =====================================================================================

-- 1. Expand Conversation Context Types & Processing Job Types (Backward-Compatible)
ALTER TABLE public.marketing_conversations
    DROP CONSTRAINT IF EXISTS marketing_conversations_context_type_check;

ALTER TABLE public.marketing_conversations
    ADD CONSTRAINT marketing_conversations_context_type_check
    CHECK (context_type IN (
        'GENERAL',
        'REGULATORY',
        'CAMPAIGN',
        'WORKFLOW_RESEARCH',
        'POLICY_REDLINE',
        'DDQ_RESPONSE',
        'CROSS_BORDER'
    ));

ALTER TABLE public.processing_jobs
    DROP CONSTRAINT IF EXISTS processing_jobs_job_type_check;

ALTER TABLE public.processing_jobs
    ADD CONSTRAINT processing_jobs_job_type_check
    CHECK (job_type IN (
        'ASSET_SECURITY_AND_EXTRACTION',
        'CAMPAIGN_COMPLIANCE_ASSESSMENT',
        'PLAYBOOK_DOCUMENT_INGESTION',
        'REGULATORY_CORPUS_EMBEDDING',
        'STATUTORY_DOSSIER_GENERATION',
        'CAMPAIGN_URL_DRIFT_CHECK',
        'WORK_PRODUCT_EXPORT',
        'LIVE_WEB_RIPPLE_SCAN',
        'DDQ_BATCH_EXTRACTION'
    ));

-- 2. Extend live_web_retrievals for Dual-Engine Provenance & Trust Tiering
ALTER TABLE public.live_web_retrievals
    ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'GEMINI_GOOGLE_SEARCH'
        CHECK (provider IN ('GEMINI_GOOGLE_SEARCH', 'SERPAPI_GOOGLE', 'SERPAPI_NEWS', 'EXA_AI', 'DIRECT_FETCH')),
    ADD COLUMN IF NOT EXISTS jurisdiction_code VARCHAR(32) NOT NULL DEFAULT 'NG',
    ADD COLUMN IF NOT EXISTS trust_tier TEXT NOT NULL DEFAULT 'GENERAL_LIVE_WEB'
        CHECK (trust_tier IN ('OFFICIAL_REGULATOR_WEB', 'VERIFIED_AFRICAN_LEGAL_MEDIA', 'GENERAL_LIVE_WEB')),
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS full_content_excerpt TEXT,
    ADD COLUMN IF NOT EXISTS highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS canonical_url_hash CHAR(64),
    ADD COLUMN IF NOT EXISTS search_latency_ms INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cache_hit BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS promoted_instrument_id UUID REFERENCES public.regulatory_instruments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_live_web_retrievals_tenant_time
    ON public.live_web_retrievals (tenant_id, retrieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_web_retrievals_canonical_hash
    ON public.live_web_retrievals (canonical_url_hash, retrieved_at DESC);

-- 3. Extend subscription_plans with Paid Live Search Quotas & Regional Scope
ALTER TABLE public.subscription_plans
    ADD COLUMN IF NOT EXISTS monthly_live_search_limit INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS allowed_search_jurisdictions TEXT[] NOT NULL DEFAULT ARRAY['NG']::TEXT[];

UPDATE public.subscription_plans
SET
    monthly_live_search_limit = CASE slug
        WHEN 'evaluation' THEN 0
        WHEN 'growth' THEN 100
        WHEN 'scale' THEN 500
        WHEN 'enterprise' THEN -1
        ELSE 0
    END,
    allowed_search_jurisdictions = CASE slug
        WHEN 'evaluation' THEN ARRAY[]::TEXT[]
        WHEN 'growth' THEN ARRAY['NG']::TEXT[]
        WHEN 'scale' THEN ARRAY['NG', 'GH', 'KE', 'ZA', 'RW', 'EG', 'AFRICA_REGIONAL']::TEXT[]
        WHEN 'enterprise' THEN ARRAY['NG', 'GH', 'KE', 'ZA', 'RW', 'EG', 'AFRICA_REGIONAL', 'GLOBAL']::TEXT[]
        ELSE ARRAY[]::TEXT[]
    END,
    features = COALESCE(features, '{}'::jsonb) || CASE slug
        WHEN 'evaluation' THEN '{"live_web_search": false, "cross_border_research": false, "work_product_docx_export": false, "regulatory_ripple_live_web": false, "monthly_live_search_limit": 0}'::jsonb
        WHEN 'growth' THEN '{"live_web_search": true, "cross_border_research": false, "work_product_docx_export": true, "regulatory_ripple_live_web": false, "monthly_live_search_limit": 100}'::jsonb
        WHEN 'scale' THEN '{"live_web_search": true, "cross_border_research": true, "work_product_docx_export": true, "regulatory_ripple_live_web": true, "monthly_live_search_limit": 500}'::jsonb
        WHEN 'enterprise' THEN '{"live_web_search": true, "cross_border_research": true, "work_product_docx_export": true, "regulatory_ripple_live_web": true, "monthly_live_search_limit": -1}'::jsonb
        ELSE '{}'::jsonb
    END;

-- 4. Shared Normalized Public Web Search Cache (Cost & Latency Guard)
-- Accessed strictly server-side via Service Role; never holds tenant-private queries or internal docs.
CREATE TABLE IF NOT EXISTS public.live_web_search_cache (
    cache_key CHAR(64) PRIMARY KEY,
    normalized_query TEXT NOT NULL,
    jurisdiction_code VARCHAR(32) NOT NULL,
    search_mode VARCHAR(32) NOT NULL DEFAULT 'REGULATORY',
    providers_used TEXT[] NOT NULL DEFAULT ARRAY['SERPAPI_GOOGLE', 'EXA_AI']::TEXT[],
    results_json JSONB NOT NULL,
    web_summary TEXT,
    hit_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_live_web_cache_expiry
    ON public.live_web_search_cache (expires_at);

-- 5. Monthly Per-Tenant Live Web Search Usage Ledger
CREATE TABLE IF NOT EXISTS public.live_web_search_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    billing_period CHAR(7) NOT NULL, -- 'YYYY-MM' UTC month
    search_count INTEGER NOT NULL DEFAULT 0,
    cache_hit_count INTEGER NOT NULL DEFAULT 0,
    serpapi_calls INTEGER NOT NULL DEFAULT 0,
    exa_calls INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT live_web_search_usage_tenant_period_unique UNIQUE (tenant_id, billing_period)
);

CREATE INDEX IF NOT EXISTS idx_live_web_usage_tenant_period
    ON public.live_web_search_usage (tenant_id, billing_period DESC);

-- 6. Atomic Quota Check & Increment RPC (Prevents Parallel Tab / Race Condition Quota Bypass)
CREATE OR REPLACE FUNCTION public.consume_live_search_quota(
    p_tenant_id UUID,
    p_billing_period CHAR(7),
    p_monthly_limit INTEGER,
    p_increment INTEGER DEFAULT 1
)
RETURNS TABLE (
    allowed BOOLEAN,
    current_count INTEGER,
    remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_new_count INTEGER;
    v_inc INTEGER := GREATEST(0, COALESCE(p_increment, 1));
BEGIN
    IF p_monthly_limit = 0 THEN
        RETURN QUERY SELECT false, 0, 0;
        RETURN;
    END IF;

    -- Unlimited plan (-1): record telemetry usage without blocking
    IF p_monthly_limit < 0 THEN
        INSERT INTO public.live_web_search_usage (tenant_id, billing_period, search_count, updated_at)
        VALUES (p_tenant_id, p_billing_period, v_inc, NOW())
        ON CONFLICT (tenant_id, billing_period)
        DO UPDATE SET
            search_count = live_web_search_usage.search_count + v_inc,
            updated_at = NOW()
        RETURNING search_count INTO v_new_count;

        RETURN QUERY SELECT true, v_new_count, -1;
        RETURN;
    END IF;

    -- Ensure row exists
    INSERT INTO public.live_web_search_usage (tenant_id, billing_period, search_count, updated_at)
    VALUES (p_tenant_id, p_billing_period, 0, NOW())
    ON CONFLICT (tenant_id, billing_period) DO NOTHING;

    -- Atomic conditional increment
    UPDATE public.live_web_search_usage
    SET
        search_count = search_count + v_inc,
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id
      AND billing_period = p_billing_period
      AND (search_count + v_inc) <= p_monthly_limit
    RETURNING search_count INTO v_new_count;

    IF FOUND THEN
        RETURN QUERY SELECT true, v_new_count, GREATEST(0, p_monthly_limit - v_new_count);
    ELSE
        SELECT u.search_count INTO v_new_count
        FROM public.live_web_search_usage u
        WHERE u.tenant_id = p_tenant_id AND u.billing_period = p_billing_period;
        RETURN QUERY SELECT false, COALESCE(v_new_count, p_monthly_limit), 0;
    END IF;
END;
$$;

-- 7. Persisted Editable Work Products & Revision History (Right-Pane 50/50 Canvas System of Record)
CREATE TABLE IF NOT EXISTS public.work_product_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    conversation_id UUID,
    message_id UUID,
    workflow_type TEXT NOT NULL CHECK (workflow_type IN (
        'PRODUCT_STRUCTURING_MEMO',
        'POLICY_GAP_REDLINE',
        'SUPERVISORY_DDQ_RESPONSE',
        'CROSS_BORDER_COMPARISON',
        'CAMPAIGN_COMPLIANCE_KIT'
    )),
    artifact_type TEXT NOT NULL CHECK (artifact_type IN (
        'statutory_structuring_memo',
        'policy_gap_redline',
        'supervisory_ddq_response',
        'cross_border_matrix',
        'compliant_ad_rewrite',
        'cbn_kfs_statement',
        'arcon_vetting_memo',
        'audit_dossier_summary'
    )),
    title TEXT NOT NULL,
    jurisdiction_scope TEXT[] NOT NULL DEFAULT ARRAY['NG']::TEXT[],
    markdown_content TEXT NOT NULL,
    structured_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    guardrail_report JSONB NOT NULL DEFAULT '{}'::jsonb,
    version_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'REVIEWED', 'FINALIZED', 'ARCHIVED')),
    source_hash_sha256 CHAR(64) NOT NULL,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    last_exported_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT work_product_artifacts_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_work_product_conversation FOREIGN KEY (tenant_id, conversation_id)
        REFERENCES public.marketing_conversations(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.work_product_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    work_product_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    markdown_content TEXT NOT NULL,
    structured_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    change_summary TEXT,
    edited_by TEXT NOT NULL,
    source_hash_sha256 CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT work_product_revisions_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_wp_revisions_artifact FOREIGN KEY (tenant_id, work_product_id)
        REFERENCES public.work_product_artifacts(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_work_products_tenant_conv
    ON public.work_product_artifacts (tenant_id, conversation_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_products_tenant_type
    ON public.work_product_artifacts (tenant_id, artifact_type, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_products_fts
    ON public.work_product_artifacts USING gin (to_tsvector('english', title || ' ' || markdown_content));
CREATE INDEX IF NOT EXISTS idx_work_product_revisions_wp
    ON public.work_product_revisions (tenant_id, work_product_id, version_number DESC);

-- 8. Unified Command Center Search RPC (Cmd+K Across Tenant Workspace & 141-PDF Vault)
CREATE OR REPLACE FUNCTION public.search_workspace_command_center(
    p_tenant_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 15
)
RETURNS TABLE (
    entity_type TEXT,
    entity_id UUID,
    title TEXT,
    subtitle TEXT,
    snippet TEXT,
    route_href TEXT,
    score NUMERIC,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean TEXT := trim(COALESCE(p_query, ''));
    v_escaped TEXT;
    v_tsquery TSQUERY;
    v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 15), 1), 50);
BEGIN
    IF length(v_clean) < 2 THEN
        RETURN;
    END IF;

    v_escaped := replace(replace(replace(v_clean, '\', '\\'), '%', '\%'), '_', '\_');
    v_tsquery := websearch_to_tsquery('english', v_clean);

    RETURN QUERY
    SELECT * FROM (
        (
            -- Conversations
            SELECT
                'CONVERSATION'::TEXT AS entity_type,
                mc.id AS entity_id,
                mc.title AS title,
                COALESCE(mc.context_type, 'GENERAL') AS subtitle,
                ''::TEXT AS snippet,
                ('/chat?conversationId=' || mc.id::text)::TEXT AS route_href,
                0.90::NUMERIC AS score,
                mc.last_message_at AS updated_at
            FROM public.marketing_conversations mc
            WHERE mc.tenant_id = p_tenant_id
              AND mc.status = 'ACTIVE'
              AND mc.title ILIKE '%' || v_escaped || '%' ESCAPE '\'
            ORDER BY mc.last_message_at DESC
            LIMIT 5
        )
        UNION ALL
        (
            -- Persisted Work Products
            SELECT
                'WORK_PRODUCT'::TEXT AS entity_type,
                wp.id AS entity_id,
                wp.title AS title,
                wp.artifact_type AS subtitle,
                LEFT(wp.markdown_content, 180) AS snippet,
                ('/chat?conversationId=' || COALESCE(wp.conversation_id::text, '') || '&workProductId=' || wp.id::text)::TEXT AS route_href,
                GREATEST(ts_rank_cd(to_tsvector('english', wp.title || ' ' || wp.markdown_content), v_tsquery), 0.75)::NUMERIC AS score,
                wp.updated_at AS updated_at
            FROM public.work_product_artifacts wp
            WHERE wp.tenant_id = p_tenant_id
              AND wp.status <> 'ARCHIVED'
              AND (
                  wp.title ILIKE '%' || v_escaped || '%' ESCAPE '\'
                  OR (v_tsquery <> ''::tsquery AND to_tsvector('english', wp.title || ' ' || wp.markdown_content) @@ v_tsquery)
              )
            ORDER BY score DESC, wp.updated_at DESC
            LIMIT 5
        )
        UNION ALL
        (
            -- Tenant Internal Knowledge Base / Policies
            SELECT
                'PLAYBOOK'::TEXT AS entity_type,
                kd.id AS entity_id,
                kd.title AS title,
                kd.document_type AS subtitle,
                COALESCE(LEFT(kd.description, 180), '') AS snippet,
                ('/knowledge-base?tab=playbooks&docId=' || kd.id::text)::TEXT AS route_href,
                0.80::NUMERIC AS score,
                kd.updated_at AS updated_at
            FROM public.marketing_knowledge_documents kd
            WHERE kd.tenant_id = p_tenant_id
              AND kd.status = 'ACTIVE'
              AND (
                  kd.title ILIKE '%' || v_escaped || '%' ESCAPE '\'
                  OR COALESCE(kd.description, '') ILIKE '%' || v_escaped || '%' ESCAPE '\'
              )
            ORDER BY kd.updated_at DESC
            LIMIT 4
        )
        UNION ALL
        (
            -- Public 141-PDF Statutory Vault Clauses
            SELECT
                'STATUTORY_CLAUSE'::TEXT AS entity_type,
                rc.id AS entity_id,
                (rb.acronym || ' — ' || ri.title)::TEXT AS title,
                rc.clause_reference AS subtitle,
                LEFT(rc.clause_text, 180) AS snippet,
                ('/search?q=' || replace(v_clean, ' ', '+') || '&clauseId=' || rc.id::text)::TEXT AS route_href,
                ts_rank_cd(to_tsvector('english', rc.clause_text), v_tsquery)::NUMERIC AS score,
                rc.created_at AS updated_at
            FROM public.regulatory_clauses rc
            JOIN public.regulatory_document_versions rdv ON rc.document_version_id = rdv.id
            JOIN public.regulatory_instruments ri ON rdv.instrument_id = ri.id
            JOIN public.regulatory_bodies rb ON ri.regulator_id = rb.id
            WHERE rdv.lifecycle_status = 'CURRENT'
              AND v_tsquery <> ''::tsquery
              AND to_tsvector('english', rc.clause_text) @@ v_tsquery
            ORDER BY score DESC
            LIMIT 6
        )
    ) AS combined
    ORDER BY combined.score DESC, combined.updated_at DESC
    LIMIT v_limit;
END;
$$;

-- 9. Strict Row Level Security (RLS) Policies
ALTER TABLE public.live_web_retrievals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_web_search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_web_search_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_product_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_product_revisions ENABLE ROW LEVEL SECURITY;

-- Note: live_web_search_cache has NO authenticated SELECT policy by default so only server/admin role reads/writes.

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'live_web_retrievals' AND policyname = 'Tenant members view live_web_retrievals') THEN
        CREATE POLICY "Tenant members view live_web_retrievals" ON public.live_web_retrievals
            FOR SELECT TO authenticated
            USING (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'live_web_search_usage' AND policyname = 'Tenant members view live_web_search_usage') THEN
        CREATE POLICY "Tenant members view live_web_search_usage" ON public.live_web_search_usage
            FOR SELECT TO authenticated
            USING (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'work_product_artifacts' AND policyname = 'Tenant members view work_product_artifacts') THEN
        CREATE POLICY "Tenant members view work_product_artifacts" ON public.work_product_artifacts
            FOR SELECT TO authenticated
            USING (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'work_product_artifacts' AND policyname = 'Tenant members modify work_product_artifacts') THEN
        CREATE POLICY "Tenant members modify work_product_artifacts" ON public.work_product_artifacts
            FOR ALL TO authenticated
            USING (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text))
            WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'work_product_revisions' AND policyname = 'Tenant members view work_product_revisions') THEN
        CREATE POLICY "Tenant members view work_product_revisions" ON public.work_product_revisions
            FOR SELECT TO authenticated
            USING (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text));
    END IF;
END $$;
