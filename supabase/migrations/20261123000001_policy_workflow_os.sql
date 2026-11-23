-- ==============================================================================
-- Cogent Compliance OS — Policy Workflow OS (Phase 1 & Phase 2)
-- Stages 2, 3, 4, 5, 6, 7, 8:
--   - Expanded Three Lines of Defense RBAC Roles (including Advisory-Only Internal Audit)
--   - Policy Register (compliance_policies, policy_versions, policy_obligation_mappings)
--   - Multi-Tier Delegated Approval Routing (policy_approval_workflows, policy_approval_steps)
--   - Cross-Functional Stakeholder Review & Feasibility Blockers (policy_review_assignments, policy_clause_comments)
--   - Live Operationalization (policy_controls, policy_operational_clocks, policy_implementation_tasks)
--   - Publication Delta Briefs & Employee Attestations (policy_attestations)
--   - Work Product Artifact enum expansion for POLICY_DRAFT_NEW / policy_draft_document
-- ==============================================================================

-- 1. Expand tenant_memberships role CHECK constraint for Three Lines of Defense
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.tenant_memberships'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.tenant_memberships DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.tenant_memberships
  ADD CONSTRAINT tenant_memberships_role_check CHECK (
    role IN (
      -- First Line of Defense (Business, Product, Ops, Tech, InfoSec)
      'MARKETING_GROWTH',
      'OPERATIONS_LEAD',
      'TECHNOLOGY_LEAD',
      'INFOSEC_LEAD',
      -- Second Line of Defense (Compliance, Risk, Legal)
      'COMPLIANCE_ANALYST',
      'RISK_OFFICER',
      'LEGAL_COUNSEL',
      'CHIEF_COMPLIANCE_OFFICER',
      -- Third Line of Defense (Independent Assurance — Advisory Only)
      'INTERNAL_AUDIT',
      -- Governance / Delegated Approval Authorities
      'COMMITTEE_MEMBER',
      'BOARD_MEMBER',
      -- Platform Administration
      'WORKSPACE_ADMIN'
    )
  );

-- 2. Expand work_product_artifacts workflow_type & artifact_type CHECK constraints for POLICY_DRAFT_NEW
DO $$
DECLARE
  r RECORD;
BEGIN
  IF to_regclass('public.work_product_artifacts') IS NOT NULL THEN
    FOR r IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.work_product_artifacts'::regclass
        AND contype = 'c'
        AND (
          pg_get_constraintdef(oid) ILIKE '%workflow_type%'
          OR pg_get_constraintdef(oid) ILIKE '%artifact_type%'
        )
    LOOP
      EXECUTE format('ALTER TABLE public.work_product_artifacts DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    ALTER TABLE public.work_product_artifacts
      ADD CONSTRAINT work_product_artifacts_workflow_type_check CHECK (
        workflow_type IN (
          'PRODUCT_STRUCTURING_MEMO',
          'POLICY_GAP_REDLINE',
          'POLICY_DRAFT_NEW',
          'SUPERVISORY_DDQ_RESPONSE',
          'CROSS_BORDER_COMPARISON',
          'CAMPAIGN_COMPLIANCE_KIT'
        )
      );

    ALTER TABLE public.work_product_artifacts
      ADD CONSTRAINT work_product_artifacts_artifact_type_check CHECK (
        artifact_type IN (
          'statutory_structuring_memo',
          'policy_gap_redline',
          'policy_draft_document',
          'supervisory_ddq_response',
          'cross_border_matrix',
          'compliant_ad_rewrite',
          'cbn_kfs_statement',
          'arcon_vetting_memo',
          'audit_dossier_summary'
        )
      );
  END IF;
END $$;

-- ==============================================================================
-- PHASE 1: Policy Register, Clean Versions, Obligation Mappings & DoA Approvals
-- ==============================================================================

-- 3. Authoritative Compliance Policy Register
CREATE TABLE IF NOT EXISTS public.compliance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  policy_ref_no TEXT NOT NULL,
  title TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN (
    'AML_CFT_CPF',
    'KYC_CDD',
    'DATA_PROTECTION',
    'CONSUMER_PROTECTION',
    'DIGITAL_LENDING',
    'PAYMENTS_EFT',
    'FRAUD_CYBER',
    'ENTERPRISE_RISK',
    'MARKETING_COMMS',
    'GOVERNANCE_OTHER'
  )),
  description TEXT,
  owner_user_id TEXT NOT NULL,
  owner_name TEXT,
  owner_department TEXT NOT NULL DEFAULT 'Compliance',
  approval_tier TEXT NOT NULL DEFAULT 'TIER_1_CCO' CHECK (approval_tier IN (
    'TIER_1_CCO',
    'TIER_2_COMMITTEE',
    'TIER_3_BOARD'
  )),
  review_cycle_months INTEGER NOT NULL DEFAULT 12 CHECK (review_cycle_months BETWEEN 1 AND 60),
  status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (status IN (
    'INITIATED',
    'DRAFTING',
    'STAKEHOLDER_REVIEW',
    'COMPLIANCE_VALIDATION',
    'AWAITING_APPROVAL',
    'APPROVED',
    'PUBLISHED',
    'IMPLEMENTING',
    'ACTIVE_MONITORING',
    'UNDER_REVIEW',
    'SUPERSEDED',
    'RETIRED'
  )),
  current_version_id UUID,
  published_version_id UUID,
  approving_authority TEXT,
  approved_at TIMESTAMPTZ,
  effective_date DATE,
  next_review_date DATE,
  knowledge_document_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT compliance_policies_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT compliance_policies_tenant_ref_unique UNIQUE (tenant_id, policy_ref_no)
);

-- 4. Immutable Policy Versions (Drafts, Redlines, Clean Compiled vNext, Board Packs, Delta Briefs)
CREATE TABLE IF NOT EXISTS public.policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  status TEXT NOT NULL DEFAULT 'DRAFTING' CHECK (status IN (
    'INITIATED',
    'DRAFTING',
    'STAKEHOLDER_REVIEW',
    'COMPLIANCE_VALIDATION',
    'AWAITING_APPROVAL',
    'APPROVED',
    'PUBLISHED',
    'IMPLEMENTING',
    'ACTIVE_MONITORING',
    'UNDER_REVIEW',
    'SUPERSEDED',
    'RETIRED'
  )),
  change_type TEXT NOT NULL DEFAULT 'NEW_POLICY' CHECK (change_type IN (
    'NEW_POLICY',
    'AMENDMENT',
    'NO_CHANGE_REVIEW'
  )),
  trigger_source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (trigger_source IN (
    'REGULATORY_CHANGE',
    'AUDIT_FINDING',
    'NEW_PRODUCT',
    'PERIODIC_REVIEW',
    'INCIDENT',
    'MANUAL'
  )),
  trigger_reference TEXT,
  change_summary TEXT,
  source_work_product_id UUID,
  markdown_content TEXT NOT NULL,
  clean_compiled_markdown TEXT,
  structured_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  delta_brief_markdown TEXT,
  board_pack_markdown TEXT,
  qa_validation_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (qa_validation_status IN (
    'PENDING',
    'PASSED',
    'FAILED'
  )),
  qa_validation_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  qa_validated_at TIMESTAMPTZ,
  qa_validated_by TEXT,
  source_hash_sha256 CHAR(64) NOT NULL,
  created_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  published_by TEXT,
  published_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT policy_versions_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT policy_versions_policy_version_unique UNIQUE (tenant_id, policy_id, version_number),
  CONSTRAINT fk_policy_versions_policy FOREIGN KEY (tenant_id, policy_id)
    REFERENCES public.compliance_policies(tenant_id, id) ON DELETE CASCADE
);

-- 5. Regulatory Obligation to Policy Traceability Mappings
CREATE TABLE IF NOT EXISTS public.policy_obligation_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL,
  policy_version_id UUID NOT NULL,
  regulatory_clause_id UUID,
  regulatory_obligation_id UUID,
  regulator TEXT NOT NULL,
  instrument_title TEXT NOT NULL,
  clause_reference TEXT NOT NULL,
  obligation_summary TEXT NOT NULL,
  coverage_status TEXT NOT NULL DEFAULT 'COVERED' CHECK (coverage_status IN (
    'COVERED',
    'PARTIAL',
    'GAP',
    'NOT_APPLICABLE'
  )),
  mapped_policy_clause TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT policy_obligation_mappings_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_pol_obl_policy FOREIGN KEY (tenant_id, policy_id)
    REFERENCES public.compliance_policies(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_pol_obl_version FOREIGN KEY (tenant_id, policy_version_id)
    REFERENCES public.policy_versions(tenant_id, id) ON DELETE CASCADE
);

-- 6. Delegated Approval Workflows (DoA Routing: CCO -> Management Committee -> Board)
CREATE TABLE IF NOT EXISTS public.policy_approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL,
  policy_version_id UUID NOT NULL,
  approval_tier TEXT NOT NULL CHECK (approval_tier IN (
    'TIER_1_CCO',
    'TIER_2_COMMITTEE',
    'TIER_3_BOARD'
  )),
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN (
    'IN_PROGRESS',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
  )),
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  board_pack_hash_sha256 CHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT policy_approval_workflows_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_pol_app_wf_policy FOREIGN KEY (tenant_id, policy_id)
    REFERENCES public.compliance_policies(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_pol_app_wf_version FOREIGN KEY (tenant_id, policy_version_id)
    REFERENCES public.policy_versions(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.policy_approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL,
  policy_id UUID NOT NULL,
  policy_version_id UUID NOT NULL,
  step_order INTEGER NOT NULL CHECK (step_order >= 1),
  approver_role TEXT NOT NULL CHECK (approver_role IN (
    'CHIEF_COMPLIANCE_OFFICER',
    'COMMITTEE_MEMBER',
    'BOARD_MEMBER'
  )),
  approver_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'SKIPPED'
  )),
  decided_by TEXT,
  decided_by_name TEXT,
  decided_by_role TEXT,
  decided_at TIMESTAMPTZ,
  decision_reason TEXT,
  board_minutes_ref TEXT,
  decision_hash_sha256 CHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT policy_approval_steps_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_pol_app_step_wf FOREIGN KEY (tenant_id, workflow_id)
    REFERENCES public.policy_approval_workflows(tenant_id, id) ON DELETE CASCADE
);

-- ==============================================================================
-- PHASE 2: Cross-Functional Stakeholder Review, Operationalization & Attestations
-- ==============================================================================

-- 7. Departmental Stakeholder Review Assignments (Three Lines of Defense)
CREATE TABLE IF NOT EXISTS public.policy_review_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL,
  policy_version_id UUID NOT NULL,
  reviewer_department TEXT NOT NULL,
  reviewer_role TEXT NOT NULL,
  defense_line TEXT NOT NULL CHECK (defense_line IN (
    'FIRST_LINE',
    'SECOND_LINE',
    'THIRD_LINE',
    'GOVERNANCE'
  )),
  reviewer_user_id TEXT,
  reviewer_name TEXT,
  is_advisory_only BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'IN_REVIEW',
    'APPROVED_WITH_COMMENTS',
    'FEASIBILITY_BLOCKER',
    'SIGNED_OFF'
  )),
  summary_notes TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT policy_review_assignments_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_pol_rev_assign_policy FOREIGN KEY (tenant_id, policy_id)
    REFERENCES public.compliance_policies(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_pol_rev_assign_version FOREIGN KEY (tenant_id, policy_version_id)
    REFERENCES public.policy_versions(tenant_id, id) ON DELETE CASCADE
);

-- 8. Clause-Level Stakeholder Comments & Feasibility Blockers
CREATE TABLE IF NOT EXISTS public.policy_clause_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL,
  policy_version_id UUID NOT NULL,
  assignment_id UUID,
  clause_reference TEXT NOT NULL,
  section_heading TEXT,
  comment_type TEXT NOT NULL DEFAULT 'GENERAL' CHECK (comment_type IN (
    'GENERAL',
    'LEGAL_ISSUE',
    'RISK_CONCERN',
    'FEASIBILITY_BLOCKER',
    'AUDIT_OBSERVATION',
    'EDITORIAL'
  )),
  is_feasibility_blocker BOOLEAN NOT NULL DEFAULT false,
  blocker_impact TEXT,
  comment_text TEXT NOT NULL,
  proposed_change TEXT,
  author_user_id TEXT NOT NULL,
  author_name TEXT,
  author_role TEXT NOT NULL,
  author_department TEXT NOT NULL DEFAULT 'Compliance',
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN (
    'OPEN',
    'RESOLVED',
    'DEFERRED_TO_EXCEPTION',
    'REJECTED'
  )),
  resolution_notes TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  linked_task_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT policy_clause_comments_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_pol_comment_policy FOREIGN KEY (tenant_id, policy_id)
    REFERENCES public.compliance_policies(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_pol_comment_version FOREIGN KEY (tenant_id, policy_version_id)
    REFERENCES public.policy_versions(tenant_id, id) ON DELETE CASCADE
);

-- 9. Live Operational Controls Compiled from Policy Clauses (Policy vs. Procedure vs. Control)
CREATE TABLE IF NOT EXISTS public.policy_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL,
  policy_version_id UUID NOT NULL,
  control_code TEXT NOT NULL,
  clause_reference TEXT NOT NULL,
  policy_rule_summary TEXT NOT NULL,
  procedure_steps TEXT NOT NULL,
  control_statement TEXT NOT NULL,
  control_type TEXT NOT NULL DEFAULT 'PREVENTIVE' CHECK (control_type IN (
    'PREVENTIVE',
    'DETECTIVE',
    'CORRECTIVE'
  )),
  automation_level TEXT NOT NULL DEFAULT 'SEMI_AUTOMATED' CHECK (automation_level IN (
    'AUTOMATED',
    'SEMI_AUTOMATED',
    'MANUAL'
  )),
  owner_department TEXT NOT NULL DEFAULT 'Operations',
  owner_role TEXT,
  test_frequency TEXT NOT NULL DEFAULT 'QUARTERLY' CHECK (test_frequency IN (
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'ANNUAL'
  )),
  statutory_basis TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
    'DRAFT',
    'ACTIVE',
    'NEEDS_REMEDIATION',
    'RETIRED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT policy_controls_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_pol_ctrl_policy FOREIGN KEY (tenant_id, policy_id)
    REFERENCES public.compliance_policies(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_pol_ctrl_version FOREIGN KEY (tenant_id, policy_version_id)
    REFERENCES public.policy_versions(tenant_id, id) ON DELETE CASCADE
);

-- 10. Live Statutory Timing & Operational Clock Register (Compiled from Section 3)
CREATE TABLE IF NOT EXISTS public.policy_operational_clocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL,
  policy_version_id UUID NOT NULL,
  event_trigger TEXT NOT NULL,
  binding_sla TEXT NOT NULL,
  sla_hours INTEGER,
  governing_authority TEXT NOT NULL,
  owner_department TEXT NOT NULL DEFAULT 'Compliance',
  escalation_path TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'RETIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT policy_operational_clocks_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_pol_clock_policy FOREIGN KEY (tenant_id, policy_id)
    REFERENCES public.compliance_policies(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_pol_clock_version FOREIGN KEY (tenant_id, policy_version_id)
    REFERENCES public.policy_versions(tenant_id, id) ON DELETE CASCADE
);

-- 11. Live P0-P3 Implementation & Remediation Tasks (Compiled from Section 5 & Feasibility Blockers)
CREATE TABLE IF NOT EXISTS public.policy_implementation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL,
  policy_version_id UUID NOT NULL,
  priority TEXT NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  title TEXT NOT NULL,
  description TEXT,
  accountable_owner TEXT NOT NULL,
  owner_department TEXT NOT NULL DEFAULT 'Operations',
  target_deadline TEXT,
  due_at TIMESTAMPTZ,
  source_type TEXT NOT NULL DEFAULT 'REMEDIATION_SCHEDULE' CHECK (source_type IN (
    'REMEDIATION_SCHEDULE',
    'FEASIBILITY_BLOCKER',
    'GOVERNANCE_CLAUSE',
    'MANUAL'
  )),
  source_clause_ref TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN (
    'OPEN',
    'IN_PROGRESS',
    'BLOCKED',
    'COMPLETED',
    'VERIFIED'
  )),
  evidence_notes TEXT,
  completed_by TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT policy_implementation_tasks_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_pol_task_policy FOREIGN KEY (tenant_id, policy_id)
    REFERENCES public.compliance_policies(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_pol_task_version FOREIGN KEY (tenant_id, policy_version_id)
    REFERENCES public.policy_versions(tenant_id, id) ON DELETE CASCADE
);

-- 12. Employee Publication Attestations & Training Acknowledgements (Stage 7)
CREATE TABLE IF NOT EXISTS public.policy_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL,
  policy_version_id UUID NOT NULL,
  recipient_user_id TEXT,
  recipient_email TEXT,
  recipient_name TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'All Staff',
  role TEXT,
  requires_training BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'ACKNOWLEDGED',
    'TRAINING_COMPLETED',
    'OVERDUE'
  )),
  due_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledgement_hash CHAR(64),
  training_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT policy_attestations_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_pol_attest_policy FOREIGN KEY (tenant_id, policy_id)
    REFERENCES public.compliance_policies(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_pol_attest_version FOREIGN KEY (tenant_id, policy_version_id)
    REFERENCES public.policy_versions(tenant_id, id) ON DELETE CASCADE
);

-- ==============================================================================
-- Indexes for High-Velocity Operational Queries
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_compliance_policies_tenant_status
  ON public.compliance_policies (tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_tenant_review_due
  ON public.compliance_policies (tenant_id, next_review_date)
  WHERE status NOT IN ('RETIRED', 'SUPERSEDED');
CREATE INDEX IF NOT EXISTS idx_policy_versions_policy
  ON public.policy_versions (tenant_id, policy_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_policy_obligation_mappings_policy
  ON public.policy_obligation_mappings (tenant_id, policy_id, policy_version_id);
CREATE INDEX IF NOT EXISTS idx_policy_approval_workflows_policy
  ON public.policy_approval_workflows (tenant_id, policy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_approval_steps_workflow
  ON public.policy_approval_steps (tenant_id, workflow_id, step_order ASC);
CREATE INDEX IF NOT EXISTS idx_policy_review_assignments_version
  ON public.policy_review_assignments (tenant_id, policy_version_id, status);
CREATE INDEX IF NOT EXISTS idx_policy_clause_comments_version
  ON public.policy_clause_comments (tenant_id, policy_version_id, status, is_feasibility_blocker);
CREATE INDEX IF NOT EXISTS idx_policy_controls_policy
  ON public.policy_controls (tenant_id, policy_id, status);
CREATE INDEX IF NOT EXISTS idx_policy_operational_clocks_policy
  ON public.policy_operational_clocks (tenant_id, policy_id, status);
CREATE INDEX IF NOT EXISTS idx_policy_implementation_tasks_policy
  ON public.policy_implementation_tasks (tenant_id, policy_id, priority, status);
CREATE INDEX IF NOT EXISTS idx_policy_attestations_version
  ON public.policy_attestations (tenant_id, policy_version_id, status);

-- ==============================================================================
-- Row Level Security (Strict Multi-Tenant Isolation)
-- ==============================================================================
ALTER TABLE public.compliance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_obligation_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_clause_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_operational_clocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_implementation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_attestations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
  pol_name TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'compliance_policies',
    'policy_versions',
    'policy_obligation_mappings',
    'policy_approval_workflows',
    'policy_approval_steps',
    'policy_review_assignments',
    'policy_clause_comments',
    'policy_controls',
    'policy_operational_clocks',
    'policy_implementation_tasks',
    'policy_attestations'
  ] LOOP
    pol_name := tbl || '_tenant_isolation';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_name, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (tenant_id = (auth.jwt() ->> ''tenant_id'')::uuid)',
      pol_name,
      tbl
    );
  END LOOP;
END $$;
