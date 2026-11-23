-- =====================================================================================
-- Cogent Compliance Operations - Path A: End-to-End DDQ Operations Platform
-- Migration Version: 20261123000001
-- Scope:
--   1. Central Evidence Repository (compliance_evidence_items + compliance_evidence_chunks)
--   2. Approved Q&A Knowledge Library (ddq_qa_library) with staleness & evidence linking
--   3. DDQ Register & Operations Engine (ddq_engagements, ddq_questions,
--      ddq_question_evidence_links, ddq_signoffs, ddq_followups)
--   4. Hybrid Vector + FTS RRF Search RPCs & Strict Composite-Tenant RLS
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Central Evidence Repository (Reusable across DDQs, Sponsor Audits, Regulator Audits)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_evidence_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'OTHER' CHECK (category IN (
        'AML_CFT_POLICY',
        'KYC_CDD_PROCEDURES',
        'SANCTIONS_SCREENING',
        'LICENCE_AUTHORISATION',
        'TRANSACTION_MONITORING',
        'DATA_PROTECTION_NDPA',
        'CYBERSECURITY_VAPT',
        'GOVERNANCE_BOARD',
        'RISK_MANAGEMENT',
        'BUSINESS_CONTINUITY',
        'FINANCIAL_AUDITED_ACCOUNTS',
        'STAFF_TRAINING',
        'REGULATORY_FILING_RECEIPT',
        'SETTLEMENT_RECONCILIATION',
        'FRAUD_MANAGEMENT',
        'CONTRACT_SLA',
        'OTHER'
    )),
    owner_department TEXT NOT NULL DEFAULT 'COMPLIANCE' CHECK (owner_department IN (
        'COMPLIANCE',
        'RISK',
        'LEGAL',
        'INFOSEC',
        'TECHNOLOGY',
        'FINANCE',
        'OPERATIONS',
        'HR',
        'INTERNAL_AUDIT',
        'EXECUTIVE'
    )),
    owner_user_id TEXT,
    owner_name TEXT,
    version_number INTEGER NOT NULL DEFAULT 1,
    parent_evidence_id UUID,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
        'DRAFT',
        'ACTIVE',
        'EXPIRING_SOON',
        'EXPIRED',
        'SUPERSEDED',
        'ARCHIVED'
    )),
    effective_date DATE,
    expiry_date DATE,
    review_cycle_days INTEGER NOT NULL DEFAULT 365,
    file_name TEXT,
    mime_type TEXT,
    file_size_bytes BIGINT,
    storage_key TEXT,
    sha256_hash CHAR(64),
    extracted_text TEXT,
    knowledge_document_id UUID,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    uploaded_by TEXT NOT NULL,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT compliance_evidence_items_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_evidence_parent FOREIGN KEY (tenant_id, parent_evidence_id)
        REFERENCES public.compliance_evidence_items(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.compliance_evidence_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    evidence_item_id UUID NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT compliance_evidence_chunks_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_evidence_chunks_item FOREIGN KEY (tenant_id, evidence_item_id)
        REFERENCES public.compliance_evidence_items(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evidence_items_tenant_status
    ON public.compliance_evidence_items (tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_items_tenant_category
    ON public.compliance_evidence_items (tenant_id, category, owner_department);
CREATE INDEX IF NOT EXISTS idx_evidence_items_tenant_expiry
    ON public.compliance_evidence_items (tenant_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_evidence_items_fts
    ON public.compliance_evidence_items USING gin (
        to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(extracted_text, ''))
    );
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_item
    ON public.compliance_evidence_chunks (tenant_id, evidence_item_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_fts
    ON public.compliance_evidence_chunks USING gin (to_tsvector('english', chunk_text));

-- -------------------------------------------------------------------------------------
-- 2. Approved Q&A Knowledge Library (Institutional DDQ Memory + Staleness Checks)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ddq_qa_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    canonical_question TEXT NOT NULL,
    approved_answer TEXT NOT NULL,
    domain TEXT NOT NULL DEFAULT 'OTHER' CHECK (domain IN (
        'AML_CFT',
        'KYC_CDD',
        'SANCTIONS',
        'LICENSING_REGULATORY',
        'GOVERNANCE',
        'CYBERSECURITY',
        'DATA_PROTECTION',
        'RISK_MANAGEMENT',
        'OPERATIONS_SETTLEMENT',
        'FINANCIAL',
        'LEGAL',
        'TECHNOLOGY_INFRASTRUCTURE',
        'HR_TRAINING',
        'BUSINESS_CONTINUITY',
        'FRAUD_MANAGEMENT',
        'THIRD_PARTY_MERCHANTS',
        'OTHER'
    )),
    owner_department TEXT NOT NULL DEFAULT 'COMPLIANCE' CHECK (owner_department IN (
        'COMPLIANCE',
        'RISK',
        'LEGAL',
        'INFOSEC',
        'TECHNOLOGY',
        'FINANCE',
        'OPERATIONS',
        'HR',
        'INTERNAL_AUDIT',
        'EXECUTIVE'
    )),
    linked_evidence_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    statutory_citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    source_ddq_id UUID,
    source_question_id UUID,
    embedding VECTOR(768),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'NEEDS_REVIEW', 'STALE', 'ARCHIVED')),
    approved_by TEXT NOT NULL,
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    review_due_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '180 days'),
    times_reused INTEGER NOT NULL DEFAULT 0,
    last_reused_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT ddq_qa_library_tenant_id_id_unique UNIQUE (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_ddq_qa_library_tenant_status
    ON public.ddq_qa_library (tenant_id, status, domain);
CREATE INDEX IF NOT EXISTS idx_ddq_qa_library_tenant_review
    ON public.ddq_qa_library (tenant_id, review_due_at);
CREATE INDEX IF NOT EXISTS idx_ddq_qa_library_fts
    ON public.ddq_qa_library USING gin (
        to_tsvector('english', canonical_question || ' ' || approved_answer)
    );

-- -------------------------------------------------------------------------------------
-- 3. DDQ Register, Questions, Evidence Links, Multi-Executive Sign-Offs & Follow-Ups
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ddq_engagements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    requesting_institution TEXT NOT NULL,
    requester_type TEXT NOT NULL DEFAULT 'SPONSOR_BANK' CHECK (requester_type IN (
        'SPONSOR_BANK',
        'COMMERCIAL_BANK',
        'PAYMENT_PROCESSOR',
        'ACQUIRER',
        'REGULATOR',
        'INVESTOR',
        'ENTERPRISE_CUSTOMER',
        'OTHER'
    )),
    reference_code TEXT,
    contact_name TEXT,
    contact_email TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',
        'INGESTING',
        'IN_PROGRESS',
        'UNDER_CCO_REVIEW',
        'PENDING_EXECUTIVE_SIGNOFF',
        'APPROVED',
        'SUBMITTED',
        'FOLLOW_UP',
        'CLOSED_APPROVED',
        'CLOSED_CONDITIONAL',
        'CLOSED_REJECTED',
        'ARCHIVED'
    )),
    due_date DATE,
    submitted_at TIMESTAMPTZ,
    decision_notes TEXT,
    source_file_name TEXT,
    source_mime_type TEXT,
    source_storage_key TEXT,
    source_sha256 CHAR(64),
    source_format TEXT NOT NULL DEFAULT 'TEXT' CHECK (source_format IN ('XLSX', 'DOCX', 'PDF', 'CSV', 'TEXT')),
    source_structure JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_questions INTEGER NOT NULL DEFAULT 0,
    answered_count INTEGER NOT NULL DEFAULT 0,
    auto_matched_count INTEGER NOT NULL DEFAULT 0,
    validated_count INTEGER NOT NULL DEFAULT 0,
    evidence_gap_count INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    cco_owner_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT ddq_engagements_tenant_id_id_unique UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS public.ddq_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ddq_id UUID NOT NULL,
    question_index INTEGER NOT NULL,
    question_code TEXT NOT NULL,
    section_name TEXT,
    question_text TEXT NOT NULL,
    domain TEXT NOT NULL DEFAULT 'OTHER' CHECK (domain IN (
        'AML_CFT',
        'KYC_CDD',
        'SANCTIONS',
        'LICENSING_REGULATORY',
        'GOVERNANCE',
        'CYBERSECURITY',
        'DATA_PROTECTION',
        'RISK_MANAGEMENT',
        'OPERATIONS_SETTLEMENT',
        'FINANCIAL',
        'LEGAL',
        'TECHNOLOGY_INFRASTRUCTURE',
        'HR_TRAINING',
        'BUSINESS_CONTINUITY',
        'FRAUD_MANAGEMENT',
        'THIRD_PARTY_MERCHANTS',
        'OTHER'
    )),
    assigned_department TEXT NOT NULL DEFAULT 'COMPLIANCE' CHECK (assigned_department IN (
        'COMPLIANCE',
        'RISK',
        'LEGAL',
        'INFOSEC',
        'TECHNOLOGY',
        'FINANCE',
        'OPERATIONS',
        'HR',
        'INTERNAL_AUDIT',
        'EXECUTIVE'
    )),
    assigned_user_id TEXT,
    assigned_user_name TEXT,
    assigned_email TEXT,
    due_date DATE,
    source_sheet_name TEXT,
    source_row_number INTEGER,
    source_question_col INTEGER,
    source_answer_col INTEGER,
    source_evidence_col INTEGER,
    status TEXT NOT NULL DEFAULT 'UNASSIGNED' CHECK (status IN (
        'UNASSIGNED',
        'ASSIGNED',
        'AI_DRAFTED',
        'NEEDS_EVIDENCE',
        'IN_REVIEW',
        'CCO_VALIDATED',
        'APPROVED'
    )),
    answer_source TEXT NOT NULL DEFAULT 'NONE' CHECK (answer_source IN (
        'NONE',
        'QA_LIBRARY_EXACT',
        'QA_LIBRARY_STALE',
        'AI_EVIDENCE_GROUNDED',
        'AI_GAP_FLAGGED',
        'MANUAL'
    )),
    matched_qa_id UUID,
    match_confidence NUMERIC(4, 3),
    draft_answer TEXT,
    final_answer TEXT,
    grounding_classification TEXT NOT NULL DEFAULT 'MISSING_EVIDENCE' CHECK (grounding_classification IN (
        'VERIFIED_EVIDENCE',
        'MANAGEMENT_ASSERTION',
        'PROSPECTIVE_COMMITMENT',
        'MISSING_EVIDENCE'
    )),
    evidence_gap_flag BOOLEAN NOT NULL DEFAULT true,
    evidence_gap_reason TEXT,
    statutory_citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_confidence NUMERIC(4, 3),
    reviewer_notes TEXT,
    validated_by TEXT,
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT ddq_questions_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_ddq_questions_engagement FOREIGN KEY (tenant_id, ddq_id)
        REFERENCES public.ddq_engagements(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_ddq_questions_matched_qa FOREIGN KEY (tenant_id, matched_qa_id)
        REFERENCES public.ddq_qa_library(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.ddq_question_evidence_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ddq_id UUID NOT NULL,
    question_id UUID NOT NULL,
    evidence_item_id UUID NOT NULL,
    annexure_label TEXT NOT NULL,
    relevance_note TEXT,
    linked_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT ddq_q_evidence_unique UNIQUE (tenant_id, question_id, evidence_item_id),
    CONSTRAINT fk_ddq_q_evidence_ddq FOREIGN KEY (tenant_id, ddq_id)
        REFERENCES public.ddq_engagements(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_ddq_q_evidence_question FOREIGN KEY (tenant_id, question_id)
        REFERENCES public.ddq_questions(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_ddq_q_evidence_item FOREIGN KEY (tenant_id, evidence_item_id)
        REFERENCES public.compliance_evidence_items(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.ddq_signoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ddq_id UUID NOT NULL,
    signoff_role TEXT NOT NULL CHECK (signoff_role IN (
        'CCO_MLRO',
        'CEO',
        'CFO',
        'CISO',
        'GENERAL_COUNSEL',
        'HEAD_OF_RISK',
        'INTERNAL_AUDIT'
    )),
    signer_user_id TEXT,
    signer_name TEXT,
    signer_email TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'WAIVED')),
    attestation_statement TEXT,
    comments TEXT,
    snapshot_sha256 CHAR(64),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT ddq_signoffs_tenant_ddq_role_unique UNIQUE (tenant_id, ddq_id, signoff_role),
    CONSTRAINT fk_ddq_signoffs_ddq FOREIGN KEY (tenant_id, ddq_id)
        REFERENCES public.ddq_engagements(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.ddq_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ddq_id UUID NOT NULL,
    question_id UUID,
    round_number INTEGER NOT NULL DEFAULT 1,
    requester_query TEXT NOT NULL,
    response_text TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ANSWERED', 'RESOLVED')),
    due_date DATE,
    created_by TEXT NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_ddq_followups_ddq FOREIGN KEY (tenant_id, ddq_id)
        REFERENCES public.ddq_engagements(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_ddq_followups_question FOREIGN KEY (tenant_id, question_id)
        REFERENCES public.ddq_questions(tenant_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ddq_engagements_tenant_status
    ON public.ddq_engagements (tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_ddq_questions_ddq_order
    ON public.ddq_questions (tenant_id, ddq_id, question_index);
CREATE INDEX IF NOT EXISTS idx_ddq_questions_dept_status
    ON public.ddq_questions (tenant_id, ddq_id, assigned_department, status);
CREATE INDEX IF NOT EXISTS idx_ddq_q_evidence_ddq
    ON public.ddq_question_evidence_links (tenant_id, ddq_id, evidence_item_id);
CREATE INDEX IF NOT EXISTS idx_ddq_signoffs_ddq
    ON public.ddq_signoffs (tenant_id, ddq_id);
CREATE INDEX IF NOT EXISTS idx_ddq_followups_ddq
    ON public.ddq_followups (tenant_id, ddq_id, round_number);

-- -------------------------------------------------------------------------------------
-- 4. Hybrid RRF Search RPCs for Central Evidence Vault & Approved Q&A Library
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_compliance_evidence_rrf(
    p_tenant_id UUID,
    p_query_text TEXT,
    p_query_embedding VECTOR(768) DEFAULT NULL,
    p_match_count INTEGER DEFAULT 6,
    p_rrf_k INTEGER DEFAULT 60
)
RETURNS TABLE (
    evidence_item_id UUID,
    chunk_id UUID,
    title TEXT,
    category TEXT,
    owner_department TEXT,
    status TEXT,
    expiry_date DATE,
    file_name TEXT,
    chunk_text TEXT,
    rrf_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tsquery TSQUERY := websearch_to_tsquery('english', COALESCE(p_query_text, ''));
BEGIN
    RETURN QUERY
    WITH lexical AS (
        SELECT
            c.id AS chunk_id,
            ROW_NUMBER() OVER (
                ORDER BY ts_rank_cd(to_tsvector('english', c.chunk_text), v_tsquery) DESC
            ) AS rank_ix
        FROM public.compliance_evidence_chunks c
        JOIN public.compliance_evidence_items e
          ON e.tenant_id = c.tenant_id AND e.id = c.evidence_item_id
        WHERE c.tenant_id = p_tenant_id
          AND e.status NOT IN ('ARCHIVED', 'SUPERSEDED')
          AND v_tsquery <> ''::tsquery
          AND to_tsvector('english', c.chunk_text) @@ v_tsquery
        LIMIT p_match_count * 3
    ),
    semantic AS (
        SELECT
            c.id AS chunk_id,
            ROW_NUMBER() OVER (
                ORDER BY c.embedding <=> p_query_embedding ASC
            ) AS rank_ix
        FROM public.compliance_evidence_chunks c
        JOIN public.compliance_evidence_items e
          ON e.tenant_id = c.tenant_id AND e.id = c.evidence_item_id
        WHERE c.tenant_id = p_tenant_id
          AND e.status NOT IN ('ARCHIVED', 'SUPERSEDED')
          AND p_query_embedding IS NOT NULL
          AND c.embedding IS NOT NULL
        LIMIT p_match_count * 3
    ),
    fused AS (
        SELECT
            COALESCE(l.chunk_id, s.chunk_id) AS chunk_id,
            (COALESCE(1.0 / (p_rrf_k + l.rank_ix), 0.0) + COALESCE(1.0 / (p_rrf_k + s.rank_ix), 0.0))::NUMERIC AS score
        FROM lexical l
        FULL OUTER JOIN semantic s ON l.chunk_id = s.chunk_id
    )
    SELECT
        e.id AS evidence_item_id,
        c.id AS chunk_id,
        e.title,
        e.category,
        e.owner_department,
        e.status,
        e.expiry_date,
        e.file_name,
        c.chunk_text,
        f.score AS rrf_score
    FROM fused f
    JOIN public.compliance_evidence_chunks c ON c.id = f.chunk_id AND c.tenant_id = p_tenant_id
    JOIN public.compliance_evidence_items e ON e.id = c.evidence_item_id AND e.tenant_id = p_tenant_id
    ORDER BY f.score DESC
    LIMIT p_match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_ddq_qa_library_rrf(
    p_tenant_id UUID,
    p_query_text TEXT,
    p_query_embedding VECTOR(768) DEFAULT NULL,
    p_match_count INTEGER DEFAULT 5,
    p_rrf_k INTEGER DEFAULT 60
)
RETURNS TABLE (
    qa_id UUID,
    canonical_question TEXT,
    approved_answer TEXT,
    domain TEXT,
    owner_department TEXT,
    linked_evidence_ids UUID[],
    statutory_citations JSONB,
    status TEXT,
    review_due_at TIMESTAMPTZ,
    times_reused INTEGER,
    similarity NUMERIC,
    rrf_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tsquery TSQUERY := websearch_to_tsquery('english', COALESCE(p_query_text, ''));
BEGIN
    RETURN QUERY
    WITH lexical AS (
        SELECT
            q.id AS qa_id,
            ROW_NUMBER() OVER (
                ORDER BY ts_rank_cd(to_tsvector('english', q.canonical_question || ' ' || q.approved_answer), v_tsquery) DESC
            ) AS rank_ix
        FROM public.ddq_qa_library q
        WHERE q.tenant_id = p_tenant_id
          AND q.status <> 'ARCHIVED'
          AND v_tsquery <> ''::tsquery
          AND to_tsvector('english', q.canonical_question || ' ' || q.approved_answer) @@ v_tsquery
        LIMIT p_match_count * 3
    ),
    semantic AS (
        SELECT
            q.id AS qa_id,
            (1.0 - (q.embedding <=> p_query_embedding))::NUMERIC AS cos_sim,
            ROW_NUMBER() OVER (
                ORDER BY q.embedding <=> p_query_embedding ASC
            ) AS rank_ix
        FROM public.ddq_qa_library q
        WHERE q.tenant_id = p_tenant_id
          AND q.status <> 'ARCHIVED'
          AND p_query_embedding IS NOT NULL
          AND q.embedding IS NOT NULL
        LIMIT p_match_count * 3
    ),
    fused AS (
        SELECT
            COALESCE(l.qa_id, s.qa_id) AS qa_id,
            COALESCE(s.cos_sim, 0.0)::NUMERIC AS similarity,
            (COALESCE(1.0 / (p_rrf_k + l.rank_ix), 0.0) + COALESCE(1.0 / (p_rrf_k + s.rank_ix), 0.0))::NUMERIC AS score
        FROM lexical l
        FULL OUTER JOIN semantic s ON l.qa_id = s.qa_id
    )
    SELECT
        q.id AS qa_id,
        q.canonical_question,
        q.approved_answer,
        q.domain,
        q.owner_department,
        q.linked_evidence_ids,
        q.statutory_citations,
        q.status,
        q.review_due_at,
        q.times_reused,
        f.similarity,
        f.score AS rrf_score
    FROM fused f
    JOIN public.ddq_qa_library q ON q.id = f.qa_id AND q.tenant_id = p_tenant_id
    ORDER BY f.score DESC
    LIMIT p_match_count;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 5. Strict Row Level Security (RLS)
-- -------------------------------------------------------------------------------------
ALTER TABLE public.compliance_evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_evidence_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ddq_qa_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ddq_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ddq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ddq_question_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ddq_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ddq_followups ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'compliance_evidence_items',
        'compliance_evidence_chunks',
        'ddq_qa_library',
        'ddq_engagements',
        'ddq_questions',
        'ddq_question_evidence_links',
        'ddq_signoffs',
        'ddq_followups'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = 'Tenant members access ' || tbl
        ) THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text)) WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()::text))',
                'Tenant members access ' || tbl,
                tbl
            );
        END IF;
    END LOOP;
END $$;
