-- ==============================================================================
-- COGENT MARKETING SHIELD - MASTER CANONICAL DATABASE MIGRATION
-- Migration Version: 20261111000001
-- Document Reference: Document 03 (Database & Data Model Specification v2.0)
-- Target Engine: Supabase PostgreSQL 15+ with pgvector
-- ==============================================================================

-- 1. Enable Required Database Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- ==============================================================================
-- 2. Identity & Tenancy Domain
-- ==============================================================================

-- Tenants (Institutions)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    clerk_org_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INACTIVE')),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT tenants_id_unique UNIQUE (id)
);

-- Tenant Memberships (Connecting Users to Institutions with RBAC)
CREATE TABLE IF NOT EXISTS tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- Clerk User ID (e.g. user_2...)
    clerk_membership_id TEXT UNIQUE,
    role TEXT NOT NULL CHECK (role IN (
        'MARKETING_GROWTH',
        'COMPLIANCE_ANALYST',
        'LEGAL_COUNSEL',
        'CHIEF_COMPLIANCE_OFFICER',
        'WORKSPACE_ADMIN'
    )),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT tenant_memberships_tenant_user_unique UNIQUE (tenant_id, user_id)
);

-- ==============================================================================
-- 3. Conversation Domain
-- ==============================================================================

-- Marketing Conversations (Persistent Sessions)
CREATE TABLE IF NOT EXISTS marketing_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'CLOSED')),
    context_type TEXT NOT NULL DEFAULT 'GENERAL' CHECK (context_type IN ('GENERAL', 'REGULATORY', 'CAMPAIGN')),
    active_campaign_id UUID,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT marketing_conversations_tenant_id_id_unique UNIQUE (tenant_id, id)
);

-- Marketing Messages
CREATE TABLE IF NOT EXISTS marketing_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL')),
    content TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (content_type IN ('TEXT', 'STRUCTURED', 'MIXED')),
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'STREAMING', 'COMPLETED', 'FAILED')),
    sequence_number BIGINT NOT NULL,
    parent_message_id UUID REFERENCES marketing_messages(id),
    model_run_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT marketing_messages_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_marketing_messages_conversation FOREIGN KEY (tenant_id, conversation_id)
        REFERENCES marketing_conversations(tenant_id, id) ON DELETE CASCADE
);

-- Conversation Campaign Links
CREATE TABLE IF NOT EXISTS conversation_campaign_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    relationship_type TEXT NOT NULL DEFAULT 'ORIGINATING' CHECK (relationship_type IN ('ORIGINATING', 'RELATED', 'FOLLOW_UP')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT conversation_campaign_links_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_conv_camp_conversation FOREIGN KEY (tenant_id, conversation_id)
        REFERENCES marketing_conversations(tenant_id, id) ON DELETE CASCADE
);

-- ==============================================================================
-- 4. Campaign Management Domain
-- ==============================================================================

-- Marketing Campaigns (11-State Canonical Lifecycle)
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID,
    created_by TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT NOT NULL DEFAULT 'PROMOTIONAL',
    channel TEXT NOT NULL CHECK (channel IN (
        'SOCIAL_MEDIA', 'SMS', 'WEB_LANDING', 'PRINT_FLYER', 'EMAIL', 'RADIO_TV', 'INFLUENCER', 'OTHER'
    )),
    product_id UUID,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'SUBMITTED', 'PROCESSING', 'ASSESSMENT_IN_PROGRESS',
        'FINDINGS_AVAILABLE', 'REVISION_REQUIRED', 'RESUBMITTED',
        'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'
    )),
    risk_level TEXT DEFAULT 'PENDING' CHECK (risk_level IN ('PENDING', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    current_revision_id UUID,
    approved_revision_id UUID,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    archived_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT marketing_campaigns_tenant_id_id_unique UNIQUE (tenant_id, id)
);

-- Campaign Status History (Immutable State Transitions)
CREATE TABLE IF NOT EXISTS campaign_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_status_history_campaign FOREIGN KEY (tenant_id, campaign_id)
        REFERENCES marketing_campaigns(tenant_id, id) ON DELETE CASCADE
);

-- Campaign Products (Deterministic Lock 2 Product Truth)
CREATE TABLE IF NOT EXISTS campaign_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_type TEXT NOT NULL,
    description TEXT,
    approved_terms JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT campaign_products_tenant_id_id_unique UNIQUE (tenant_id, id)
);

-- ==============================================================================
-- 5. Asset & Extraction Domain
-- ==============================================================================

-- Campaign Assets (Files, Flyers, Documents, URLs)
CREATE TABLE IF NOT EXISTS campaign_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID,
    conversation_id UUID,
    uploaded_by TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    storage_provider TEXT NOT NULL DEFAULT 'CLOUDFLARE_R2',
    storage_bucket TEXT NOT NULL DEFAULT 'cogent-compliance-production',
    storage_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256_hash TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('IMAGE', 'PDF', 'DOCX', 'TEXT', 'URL')),
    processing_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSING', 'EXTRACTED', 'FAILED', 'REJECTED')),
    malware_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (malware_status IN ('PENDING', 'CLEAN', 'SUSPICIOUS', 'FAILED')),
    extraction_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (extraction_status IN ('PENDING', 'COMPLETED', 'FAILED')),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT campaign_assets_tenant_id_id_unique UNIQUE (tenant_id, id)
);

-- Asset Extractions (OCR / Document Parser Results)
CREATE TABLE IF NOT EXISTS asset_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL,
    extraction_method TEXT NOT NULL CHECK (extraction_method IN ('OCR', 'PDF_PARSER', 'DOCX_PARSER', 'URL_SCRAPER', 'DIRECT_TEXT')),
    extraction_version TEXT NOT NULL DEFAULT 'v2.0',
    extracted_text TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    extraction_confidence NUMERIC(5,2),
    extraction_status TEXT NOT NULL DEFAULT 'COMPLETED',
    page_count INTEGER DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT asset_extractions_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_asset_extractions_asset FOREIGN KEY (tenant_id, asset_id)
        REFERENCES campaign_assets(tenant_id, id) ON DELETE CASCADE
);

-- Asset Extraction Segments (Bounding Boxes and Page Provenance)
CREATE TABLE IF NOT EXISTS asset_extraction_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL,
    extraction_id UUID NOT NULL,
    segment_index INTEGER NOT NULL,
    text_content TEXT NOT NULL,
    page_number INTEGER DEFAULT 1,
    bounding_box JSONB,
    source_type TEXT NOT NULL CHECK (source_type IN ('DIRECT_TEXT', 'OCR')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT asset_extraction_segments_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_segments_asset FOREIGN KEY (tenant_id, asset_id)
        REFERENCES campaign_assets(tenant_id, id) ON DELETE CASCADE
);

-- ==============================================================================
-- 6. Claim Management Domain
-- ==============================================================================

-- Campaign Claims (11 Controlled Claim Categories)
CREATE TABLE IF NOT EXISTS campaign_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL,
    asset_id UUID REFERENCES campaign_assets(id),
    extraction_segment_id UUID REFERENCES asset_extraction_segments(id),
    claim_text TEXT NOT NULL,
    normalized_claim TEXT,
    claim_category TEXT NOT NULL CHECK (claim_category IN (
        'INTEREST_RATE_OR_APR',
        'FEE_OR_CHARGE_REPRESENTATION',
        'GUARANTEED_APPROVAL_OR_RETURN',
        'SPEED_OR_INSTANT_DISBURSEMENT',
        'PROMOTIONAL_OFFER_OR_DISCOUNT',
        'ELIGIBILITY_OR_TENOR_TERM',
        'REGULATORY_ENDORSEMENT_OR_LICENSE_CLAIM',
        'SECURITY_OR_DATA_PRIVACY_CLAIM',
        'COMPARATIVE_OR_SUPERLATIVE_CLAIM',
        'MANDATORY_DISCLOSURE_OR_DISCLAIMER',
        'INFLUENCER_OR_TESTIMONIAL_REPRESENTATION'
    )),
    extraction_method TEXT NOT NULL,
    extraction_confidence NUMERIC(5,2),
    verification_status TEXT NOT NULL DEFAULT 'EXTRACTED' CHECK (verification_status IN ('EXTRACTED', 'VERIFIED', 'UNCERTAIN', 'REJECTED')),
    revision_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT campaign_claims_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_claims_campaign FOREIGN KEY (tenant_id, campaign_id)
        REFERENCES marketing_campaigns(tenant_id, id) ON DELETE CASCADE
);

-- ==============================================================================
-- 7. Golden 50 Nigerian Statutory Vault (Global, Shared Read-Only)
-- ==============================================================================

-- Regulatory Bodies (CBN, FCCPC, ARCON, NDPC, SEC)
CREATE TABLE IF NOT EXISTS regulatory_bodies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    acronym TEXT NOT NULL UNIQUE,
    description TEXT,
    official_domain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Regulatory Instruments (Acts, Guidelines, Circulars, Codes)
CREATE TABLE IF NOT EXISTS regulatory_instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulator_id UUID NOT NULL REFERENCES regulatory_bodies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instrument_type TEXT NOT NULL CHECK (instrument_type IN (
        'ACT', 'REGULATION', 'GUIDELINE', 'CIRCULAR', 'CODE', 'DIRECTIVE', 'NOTICE'
    )),
    jurisdiction TEXT NOT NULL DEFAULT 'NIGERIA',
    instrument_number TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'DRAFT', 'REPEALED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Regulatory Document Versions (Verified PDFs with Cryptographic Hashes)
CREATE TABLE IF NOT EXISTS regulatory_document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES regulatory_instruments(id) ON DELETE CASCADE,
    version_number TEXT NOT NULL,
    source_url TEXT NOT NULL,
    document_hash TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    publication_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED_OFFICIAL_SOURCE' CHECK (verification_status IN ('PENDING', 'VERIFIED_OFFICIAL_SOURCE', 'REJECTED')),
    lifecycle_status TEXT NOT NULL DEFAULT 'CURRENT' CHECK (lifecycle_status IN ('CURRENT', 'SUPERSEDED', 'DRAFT', 'FUTURE_EFFECTIVE', 'REPEALED')),
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Regulatory Clauses (Verbatim Provisions with VECTOR(768) Embeddings)
CREATE TABLE IF NOT EXISTS regulatory_clauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_version_id UUID NOT NULL REFERENCES regulatory_document_versions(id) ON DELETE CASCADE,
    clause_reference TEXT NOT NULL,
    parent_clause_id UUID REFERENCES regulatory_clauses(id),
    clause_text TEXT NOT NULL,
    page_number INTEGER DEFAULT 1,
    extraction_status TEXT NOT NULL DEFAULT 'VERIFIED',
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED',
    embedding VECTOR(768),
    embedded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Regulatory Obligations
CREATE TABLE IF NOT EXISTS regulatory_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clause_id UUID NOT NULL REFERENCES regulatory_clauses(id) ON DELETE CASCADE,
    obligation_text TEXT NOT NULL,
    obligation_type TEXT NOT NULL CHECK (obligation_type IN (
        'PRESCRIPTIVE', 'PROHIBITIVE', 'DISCLOSURE', 'PROCEDURAL', 'RESTRICTION'
    )),
    applicability_description TEXT,
    severity TEXT NOT NULL DEFAULT 'HIGH' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Applicability Rules
CREATE TABLE IF NOT EXISTS applicability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES regulatory_obligations(id) ON DELETE CASCADE,
    institution_type TEXT NOT NULL DEFAULT 'ALL',
    product_type TEXT NOT NULL DEFAULT 'ALL',
    activity_type TEXT NOT NULL DEFAULT 'ALL',
    channel TEXT,
    jurisdiction TEXT NOT NULL DEFAULT 'NIGERIA',
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 8. Institutional Knowledge Base & Playbook Domain (Tenant-Isolated)
-- ==============================================================================

-- Marketing Knowledge Documents (Internal Playbooks & SOPs)
CREATE TABLE IF NOT EXISTS marketing_knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    uploaded_by TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    document_type TEXT NOT NULL CHECK (document_type IN (
        'MARKETING_POLICY', 'BRAND_GUIDELINE', 'PRODUCT_DISCLOSURE', 'SOP', 'OTHER'
    )),
    asset_id UUID REFERENCES campaign_assets(id),
    version_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED')),
    effective_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT marketing_knowledge_documents_tenant_id_id_unique UNIQUE (tenant_id, id)
);

-- Marketing Knowledge Chunks (Playbook RAG Chunks with VECTOR(768))
CREATE TABLE IF NOT EXISTS marketing_knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    knowledge_document_id UUID NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding VECTOR(768),
    embedded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT marketing_knowledge_chunks_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_knowledge_chunks_doc FOREIGN KEY (tenant_id, knowledge_document_id)
        REFERENCES marketing_knowledge_documents(tenant_id, id) ON DELETE CASCADE
);

-- Marketing Knowledge Rules (Extracted & Activated Internal Rules)
CREATE TABLE IF NOT EXISTS marketing_knowledge_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    knowledge_document_id UUID NOT NULL,
    rule_title TEXT NOT NULL,
    rule_text TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN (
        'PROHIBITED', 'REQUIRED_DISCLOSURE', 'APPROVED_LANGUAGE', 'RATE_FEE_LIMIT', 'SOP_RULE'
    )),
    severity TEXT NOT NULL DEFAULT 'HIGH' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED')),
    effective_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT marketing_knowledge_rules_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_knowledge_rules_doc FOREIGN KEY (tenant_id, knowledge_document_id)
        REFERENCES marketing_knowledge_documents(tenant_id, id) ON DELETE CASCADE
);

-- Prohibited Terms (Statutory & Institutional)
CREATE TABLE IF NOT EXISTS prohibited_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    normalized_term TEXT NOT NULL,
    category TEXT NOT NULL,
    reason TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'HIGH',
    source_type TEXT NOT NULL CHECK (source_type IN ('STATUTORY', 'INSTITUTIONAL')),
    source_reference_id UUID,
    matching_mode TEXT NOT NULL DEFAULT 'EXACT' CHECK (matching_mode IN ('EXACT', 'PHRASE', 'REGEX')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 9. Real-Time Live Web & URL Intelligence Domain
-- ==============================================================================

-- Live Web Retrievals
CREATE TABLE IF NOT EXISTS live_web_retrievals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    retrieved_url TEXT NOT NULL,
    page_title TEXT,
    snippet_content TEXT NOT NULL,
    source_class TEXT NOT NULL DEFAULT 'LIVE_WEB_INTELLIGENCE',
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT live_web_retrievals_tenant_id_id_unique UNIQUE (tenant_id, id)
);

-- ==============================================================================
-- 10. Compliance Assessment & Findings Domain
-- ==============================================================================

-- Campaign Assessments (ON DELETE RESTRICT on historical compliance records)
CREATE TABLE IF NOT EXISTS campaign_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL,
    revision_id UUID NOT NULL,
    assessment_number INTEGER NOT NULL,
    assessment_type TEXT NOT NULL DEFAULT 'INITIAL' CHECK (assessment_type IN ('INITIAL', 'REASSESSMENT', 'MANUAL_REVIEW')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    overall_risk_level TEXT DEFAULT 'PENDING' CHECK (overall_risk_level IN ('PENDING', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    summary TEXT,
    regulatory_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    assessment_started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    assessment_completed_at TIMESTAMPTZ,
    model_run_id UUID,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT campaign_assessments_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_assessments_campaign FOREIGN KEY (tenant_id, campaign_id)
        REFERENCES marketing_campaigns(tenant_id, id) ON DELETE RESTRICT
);

-- Compliance Findings (ON DELETE RESTRICT on assessment link)
CREATE TABLE IF NOT EXISTS compliance_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL,
    assessment_id UUID NOT NULL,
    claim_id UUID REFERENCES campaign_claims(id),
    revision_id UUID NOT NULL,
    finding_code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    finding_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (finding_status IN ('OPEN', 'RESOLVED', 'ACCEPTED_RISK', 'UNDER_REVIEW')),
    confidence NUMERIC(5,2),
    applicability_status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (applicability_status IN (
        'VERIFIED', 'POTENTIALLY_APPLICABLE', 'APPLICABILITY_UNCERTAIN', 'INSUFFICIENT_EVIDENCE'
    )),
    recommended_action TEXT NOT NULL,
    requires_human_review BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT compliance_findings_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_findings_assessment FOREIGN KEY (tenant_id, assessment_id)
        REFERENCES campaign_assessments(tenant_id, id) ON DELETE RESTRICT
);

-- Finding Evidence (Connecting Findings to Golden 50, Playbook, or Live Web)
CREATE TABLE IF NOT EXISTS finding_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    finding_id UUID NOT NULL,
    evidence_type TEXT NOT NULL CHECK (evidence_type IN (
        'REGULATORY_CLAUSE', 'REGULATORY_OBLIGATION', 'KNOWLEDGE_RULE', 'LIVE_WEB_RETRIEVAL'
    )),
    regulatory_clause_id UUID REFERENCES regulatory_clauses(id),
    regulatory_obligation_id UUID REFERENCES regulatory_obligations(id),
    knowledge_rule_id UUID REFERENCES marketing_knowledge_rules(id),
    live_web_retrieval_id UUID REFERENCES live_web_retrievals(id),
    relevance_explanation TEXT NOT NULL,
    applicability_status TEXT NOT NULL DEFAULT 'VERIFIED',
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT finding_evidence_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_finding_evidence_finding FOREIGN KEY (tenant_id, finding_id)
        REFERENCES compliance_findings(tenant_id, id) ON DELETE CASCADE
);

-- Assessment Evidence Snapshots (Immutable Audit Protection)
CREATE TABLE IF NOT EXISTS assessment_evidence_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('REGULATORY', 'INSTITUTIONAL', 'LIVE_WEB')),
    source_record_id UUID NOT NULL,
    source_version_id UUID,
    source_text_hash TEXT NOT NULL,
    evidence_snapshot JSONB NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT assessment_evidence_snapshots_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_evidence_snapshots_assessment FOREIGN KEY (tenant_id, assessment_id)
        REFERENCES campaign_assessments(tenant_id, id) ON DELETE RESTRICT
);

-- ==============================================================================
-- 11. Revision, Review, Approval & Drift Domain
-- ==============================================================================

-- Campaign Revisions (Immutable Versions)
CREATE TABLE IF NOT EXISTS campaign_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL,
    revision_number INTEGER NOT NULL,
    parent_revision_id UUID REFERENCES campaign_revisions(id),
    content_text TEXT NOT NULL,
    revision_source TEXT NOT NULL CHECK (revision_source IN ('USER_EDIT', 'AI_REWRITE_ACCEPTED', 'INITIAL_IMPORT')),
    change_summary TEXT,
    created_by TEXT NOT NULL,
    model_run_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT campaign_revisions_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT campaign_revisions_number_unique UNIQUE (tenant_id, campaign_id, revision_number),
    CONSTRAINT fk_revisions_campaign FOREIGN KEY (tenant_id, campaign_id)
        REFERENCES marketing_campaigns(tenant_id, id) ON DELETE RESTRICT
);

-- Campaign Reviews
CREATE TABLE IF NOT EXISTS campaign_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL,
    revision_id UUID NOT NULL,
    reviewer_id TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (review_status IN ('PENDING', 'COMPLETED', 'ESCALATED')),
    review_comments TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT campaign_reviews_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_reviews_campaign FOREIGN KEY (tenant_id, campaign_id)
        REFERENCES marketing_campaigns(tenant_id, id) ON DELETE CASCADE
);

-- Campaign Approvals (Formal CCO / Legal Sign-Off)
CREATE TABLE IF NOT EXISTS campaign_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL,
    revision_id UUID NOT NULL,
    approved_by TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
    decision_reason TEXT NOT NULL,
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT campaign_approvals_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_approvals_campaign FOREIGN KEY (tenant_id, campaign_id)
        REFERENCES marketing_campaigns(tenant_id, id) ON DELETE RESTRICT
);

-- Campaign Drift Monitors (Post-Publication URL Checks)
CREATE TABLE IF NOT EXISTS campaign_drift_monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL,
    approved_revision_id UUID NOT NULL,
    published_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'DRIFT_DETECTED')),
    last_checked_at TIMESTAMPTZ,
    last_drift_detected_at TIMESTAMPTZ,
    drift_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT campaign_drift_monitors_tenant_id_id_unique UNIQUE (tenant_id, id),
    CONSTRAINT fk_drift_campaign FOREIGN KEY (tenant_id, campaign_id)
        REFERENCES marketing_campaigns(tenant_id, id) ON DELETE CASCADE
);

-- ==============================================================================
-- 12. AI Telemetry & Tool Call Audit Domain
-- ==============================================================================

-- AI Model Runs
CREATE TABLE IF NOT EXISTS ai_model_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    conversation_id UUID,
    message_id UUID,
    campaign_id UUID,
    assessment_id UUID,
    provider TEXT NOT NULL DEFAULT 'GOOGLE_GEMINI',
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    task_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    input_tokens BIGINT NOT NULL DEFAULT 0,
    output_tokens BIGINT NOT NULL DEFAULT 0,
    estimated_cost NUMERIC(10,6) NOT NULL DEFAULT 0,
    latency_ms BIGINT NOT NULL DEFAULT 0,
    error_code TEXT,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

-- AI Tool Calls
CREATE TABLE IF NOT EXISTS ai_tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    model_run_id UUID NOT NULL REFERENCES ai_model_runs(id) ON DELETE CASCADE,
    conversation_id UUID,
    tool_name TEXT NOT NULL,
    arguments JSONB NOT NULL DEFAULT '{}'::jsonb,
    execution_status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (execution_status IN ('REQUESTED', 'AUTHORIZED', 'COMPLETED', 'FAILED')),
    authorization_result TEXT NOT NULL DEFAULT 'AUTHORIZED',
    result_reference JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

-- ==============================================================================
-- 13. Background Processing & Cryptographic Audit Domain
-- ==============================================================================

-- Processing Jobs (Asynchronous Worker Tasks)
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    job_type TEXT NOT NULL CHECK (job_type IN (
        'ASSET_SECURITY_AND_EXTRACTION',
        'CAMPAIGN_COMPLIANCE_ASSESSMENT',
        'PLAYBOOK_DOCUMENT_INGESTION',
        'REGULATORY_CORPUS_EMBEDDING',
        'STATUTORY_DOSSIER_GENERATION',
        'CAMPAIGN_URL_DRIFT_CHECK'
    )),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')),
    priority INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    available_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_details JSONB,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Marketing Audit Events (Tamper-Evident SHA-256 Hash Chain)
CREATE TABLE IF NOT EXISTS marketing_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    actor_id TEXT,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('USER', 'SYSTEM', 'SERVICE')),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    previous_state_hash TEXT,
    new_state_hash TEXT,
    event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    correlation_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 14. Performance, Vector & Full-Text Search Indexes
-- ==============================================================================

-- Relational indexes
CREATE INDEX IF NOT EXISTS marketing_conversations_tenant_idx ON marketing_conversations (tenant_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS marketing_messages_conv_seq_idx ON marketing_messages (conversation_id, sequence_number ASC);
CREATE INDEX IF NOT EXISTS marketing_campaigns_tenant_status_idx ON marketing_campaigns (tenant_id, status);
CREATE INDEX IF NOT EXISTS campaign_assets_tenant_sha_idx ON campaign_assets (tenant_id, sha256_hash);
CREATE INDEX IF NOT EXISTS campaign_claims_campaign_idx ON campaign_claims (campaign_id, claim_category);
CREATE INDEX IF NOT EXISTS processing_jobs_poll_idx ON processing_jobs (status, available_at, priority DESC);
CREATE INDEX IF NOT EXISTS marketing_audit_events_tenant_time_idx ON marketing_audit_events (tenant_id, created_at DESC);

-- PostgreSQL Full-Text Search GIN Indexes
CREATE INDEX IF NOT EXISTS regulatory_clauses_fts_idx ON regulatory_clauses 
    USING gin (to_tsvector('english', clause_text));

CREATE INDEX IF NOT EXISTS marketing_knowledge_chunks_fts_idx ON marketing_knowledge_chunks 
    USING gin (to_tsvector('english', chunk_text));

-- pgvector ivfflat Cosine Indexes (Vector 768)
CREATE INDEX IF NOT EXISTS regulatory_clauses_embedding_idx ON regulatory_clauses 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx ON marketing_knowledge_chunks 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ==============================================================================
-- 15. Hybrid Reciprocal Rank Fusion (RRF) RPC Functions
-- ==============================================================================

-- Function 1: Hybrid RRF Search across Golden 50 Statutory Vault
CREATE OR REPLACE FUNCTION search_regulatory_clauses_rrf(
    query_text TEXT,
    query_embedding VECTOR(768),
    match_count INT DEFAULT 10,
    rrf_k INT DEFAULT 60,
    filter_regulator_id UUID DEFAULT NULL
)
RETURNS TABLE (
    clause_id UUID,
    document_version_id UUID,
    clause_reference TEXT,
    clause_text TEXT,
    instrument_title TEXT,
    regulator_acronym TEXT,
    effective_date DATE,
    rrf_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH semantic_search AS (
        SELECT 
            rc.id,
            ROW_NUMBER() OVER (ORDER BY rc.embedding <=> query_embedding) AS rank
        FROM regulatory_clauses rc
        JOIN regulatory_document_versions rdv ON rc.document_version_id = rdv.id
        JOIN regulatory_instruments ri ON rdv.instrument_id = ri.id
        WHERE rc.embedding IS NOT NULL
          AND rdv.lifecycle_status = 'CURRENT'
          AND (filter_regulator_id IS NULL OR ri.regulator_id = filter_regulator_id)
        LIMIT 25
    ),
    fts_search AS (
        SELECT 
            rc.id,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(to_tsvector('english', rc.clause_text), websearch_to_tsquery('english', query_text)) DESC) AS rank
        FROM regulatory_clauses rc
        JOIN regulatory_document_versions rdv ON rc.document_version_id = rdv.id
        JOIN regulatory_instruments ri ON rdv.instrument_id = ri.id
        WHERE to_tsvector('english', rc.clause_text) @@ websearch_to_tsquery('english', query_text)
          AND rdv.lifecycle_status = 'CURRENT'
          AND (filter_regulator_id IS NULL OR ri.regulator_id = filter_regulator_id)
        LIMIT 25
    ),
    fused_scores AS (
        SELECT 
            COALESCE(s.id, f.id) AS id,
            (COALESCE(1.0 / (rrf_k + s.rank), 0.0) + COALESCE(1.0 / (rrf_k + f.rank), 0.0))::NUMERIC AS combined_rrf_score
        FROM semantic_search s
        FULL OUTER JOIN fts_search f ON s.id = f.id
    )
    SELECT 
        rc.id AS clause_id,
        rc.document_version_id,
        rc.clause_reference,
        rc.clause_text,
        ri.title AS instrument_title,
        rb.acronym AS regulator_acronym,
        rdv.effective_date,
        fs.combined_rrf_score AS rrf_score
    FROM fused_scores fs
    JOIN regulatory_clauses rc ON fs.id = rc.id
    JOIN regulatory_document_versions rdv ON rc.document_version_id = rdv.id
    JOIN regulatory_instruments ri ON rdv.instrument_id = ri.id
    JOIN regulatory_bodies rb ON ri.regulator_id = rb.id
    ORDER BY fs.combined_rrf_score DESC
    LIMIT match_count;
END;
$$;

-- Function 2: Hybrid RRF Search across Tenant Playbook Chunks
CREATE OR REPLACE FUNCTION search_knowledge_chunks_rrf(
    p_tenant_id UUID,
    query_text TEXT,
    query_embedding VECTOR(768),
    match_count INT DEFAULT 10,
    rrf_k INT DEFAULT 60
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    chunk_index INT,
    chunk_text TEXT,
    document_title TEXT,
    rrf_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH semantic_search AS (
        SELECT 
            kc.id,
            ROW_NUMBER() OVER (ORDER BY kc.embedding <=> query_embedding) AS rank
        FROM marketing_knowledge_chunks kc
        JOIN marketing_knowledge_documents kd ON kc.knowledge_document_id = kd.id
        WHERE kc.tenant_id = p_tenant_id
          AND kc.embedding IS NOT NULL
          AND kd.status = 'ACTIVE'
        LIMIT 25
    ),
    fts_search AS (
        SELECT 
            kc.id,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(to_tsvector('english', kc.chunk_text), websearch_to_tsquery('english', query_text)) DESC) AS rank
        FROM marketing_knowledge_chunks kc
        JOIN marketing_knowledge_documents kd ON kc.knowledge_document_id = kd.id
        WHERE kc.tenant_id = p_tenant_id
          AND to_tsvector('english', kc.chunk_text) @@ websearch_to_tsquery('english', query_text)
          AND kd.status = 'ACTIVE'
        LIMIT 25
    ),
    fused_scores AS (
        SELECT 
            COALESCE(s.id, f.id) AS id,
            (COALESCE(1.0 / (rrf_k + s.rank), 0.0) + COALESCE(1.0 / (rrf_k + f.rank), 0.0))::NUMERIC AS combined_rrf_score
        FROM semantic_search s
        FULL OUTER JOIN fts_search f ON s.id = f.id
    )
    SELECT 
        kc.id AS chunk_id,
        kd.id AS document_id,
        kc.chunk_index,
        kc.chunk_text,
        kd.title AS document_title,
        fs.combined_rrf_score AS rrf_score
    FROM fused_scores fs
    JOIN marketing_knowledge_chunks kc ON fs.id = kc.id
    JOIN marketing_knowledge_documents kd ON kc.knowledge_document_id = kd.id
    WHERE kc.tenant_id = p_tenant_id
    ORDER BY fs.combined_rrf_score DESC
    LIMIT match_count;
END;
$$;

-- ==============================================================================
-- 16. Row Level Security (RLS) Configuration
-- ==============================================================================

-- A. Enable RLS across all 22 tenant-owned tables
ALTER TABLE marketing_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_campaign_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_extraction_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_knowledge_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_evidence_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_drift_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_audit_events ENABLE ROW LEVEL SECURITY;

-- B. Public Read-Only Access for Golden 50 Statutory Vault tables
ALTER TABLE regulatory_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicability_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to regulatory bodies" ON regulatory_bodies FOR SELECT USING (true);
CREATE POLICY "Allow public read access to regulatory instruments" ON regulatory_instruments FOR SELECT USING (true);
CREATE POLICY "Allow public read access to regulatory document versions" ON regulatory_document_versions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to regulatory clauses" ON regulatory_clauses FOR SELECT USING (true);
CREATE POLICY "Allow public read access to regulatory obligations" ON regulatory_obligations FOR SELECT USING (true);
CREATE POLICY "Allow public read access to applicability rules" ON applicability_rules FOR SELECT USING (true);
