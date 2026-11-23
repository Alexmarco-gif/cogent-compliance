-- ==============================================================================
-- Cogent Compliance OS — Cross-Border Expansion Operating System (Stages 1–8)
--
-- Turns cross-border compliance from a static Stage-1 research memo into a full
-- multi-country Compliance Control Plane & System of Record:
--   - Group → Local Country policy inheritance on `compliance_policies`
--   - Expansion Programs (`expansion_programs`) across all 8 canonical stages
--   - Country-scoped governance roles (`expansion_country_roles`)
--   - Stage 1–2: Regulatory Obligations & Licensing Register (`expansion_obligations`)
--   - Stage 3:   Group → Local Policy Localisation Matrix (`expansion_policy_localisations`)
--   - Stage 4:   Country Compliance Risk Register (`expansion_risks`)
--   - Stage 5:   Cross-Functional Workstreams & Control Specs (`expansion_workstreams`)
--   - Stage 6:   Pre-Launch Compliance Validation Tests (`expansion_validation_tests`)
--                and Formal CCO / Board Go-Live Readiness Gate (`expansion_go_live_gates`)
--   - Stage 7:   Country Regulatory Reporting Calendar (`expansion_reporting_calendar`)
--                and Compliance Incident Register (`expansion_incidents`)
--   - Stage 8:   Multi-Country Regulatory Change Log (`expansion_regulatory_changes`)
--   - Core 13 Compliance Artefacts Tracker (`expansion_artefacts`)
-- ==============================================================================

-- 1. Extend compliance_policies for Group vs. Local Country Policy Localisation
DO $$
BEGIN
  IF to_regclass('public.compliance_policies') IS NOT NULL THEN
    ALTER TABLE public.compliance_policies
      ADD COLUMN IF NOT EXISTS jurisdiction_code TEXT NOT NULL DEFAULT 'NG';

    ALTER TABLE public.compliance_policies
      ADD COLUMN IF NOT EXISTS policy_scope TEXT NOT NULL DEFAULT 'GROUP';

    ALTER TABLE public.compliance_policies
      ADD COLUMN IF NOT EXISTS parent_group_policy_id UUID;

    ALTER TABLE public.compliance_policies
      ADD COLUMN IF NOT EXISTS expansion_program_id UUID;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'compliance_policies_policy_scope_check'
    ) THEN
      ALTER TABLE public.compliance_policies
        ADD CONSTRAINT compliance_policies_policy_scope_check
        CHECK (policy_scope IN ('GROUP', 'LOCAL_COUNTRY'));
    END IF;
  END IF;
END $$;

-- 2. Master Cross-Border Expansion Programs (8-Stage Operating Lifecycle)
CREATE TABLE IF NOT EXISTS public.expansion_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  program_ref_no TEXT NOT NULL,
  title TEXT NOT NULL,
  home_jurisdiction TEXT NOT NULL DEFAULT 'NG',
  target_jurisdiction TEXT NOT NULL,
  target_country_name TEXT NOT NULL,
  primary_regulators JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_scope TEXT NOT NULL DEFAULT 'PAYMENTS' CHECK (product_scope IN (
    'PAYMENTS',
    'REMITTANCE',
    'DIGITAL_LENDING',
    'E_MONEY_WALLET',
    'FX_CARDS',
    'WEALTHTECH',
    'BANKING_MFB',
    'MULTI_PRODUCT'
  )),
  operating_model TEXT NOT NULL DEFAULT 'UNDECIDED' CHECK (operating_model IN (
    'DIRECT_LICENSE',
    'PARTNER_LED',
    'PASSPORTING',
    'HYBRID',
    'UNDECIDED'
  )),
  operating_model_rationale TEXT,
  current_stage TEXT NOT NULL DEFAULT 'MARKET_ENTRY_ASSESSMENT' CHECK (current_stage IN (
    'MARKET_ENTRY_ASSESSMENT',
    'LICENSING_AUTHORISATION',
    'FRAMEWORK_LOCALISATION',
    'RISK_ASSESSMENT',
    'CONTROL_IMPLEMENTATION',
    'PRE_LAUNCH_VALIDATION',
    'LIVE_OPERATIONS',
    'ONGOING_OVERSIGHT'
  )),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
    'ACTIVE',
    'ON_HOLD',
    'GO_LIVE_PENDING',
    'LIVE',
    'SUSPENDED',
    'ARCHIVED'
  )),
  risk_appetite_statement TEXT,
  prohibited_activities JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_launch_date DATE,
  source_work_product_id UUID,
  go_live_approved_at TIMESTAMPTZ,
  go_live_approved_by TEXT,
  go_live_approval_hash CHAR(64),
  readiness_score INTEGER NOT NULL DEFAULT 0 CHECK (readiness_score BETWEEN 0 AND 100),
  executive_summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT expansion_programs_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT expansion_programs_tenant_ref_unique UNIQUE (tenant_id, program_ref_no)
);

-- 3. Country-Scoped Compliance Governance Roles (Group vs. Country Separation)
CREATE TABLE IF NOT EXISTS public.expansion_country_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expansion_id UUID NOT NULL,
  jurisdiction_code TEXT NOT NULL,
  governance_role TEXT NOT NULL CHECK (governance_role IN (
    'GROUP_CCO_SPONSOR',
    'COUNTRY_COMPLIANCE_OFFICER',
    'COUNTRY_MLRO',
    'REGULATORY_AFFAIRS_LEAD',
    'LOCAL_LEGAL_COUNSEL',
    'ENGINEERING_CONTROLS_LEAD',
    'OPERATIONS_READINESS_LEAD',
    'LOCAL_PARTNER_LIAISON',
    'INTERNAL_AUDIT_OBSERVER'
  )),
  assignee_user_id TEXT,
  assignee_name TEXT NOT NULL,
  assignee_email TEXT,
  entity_or_partner TEXT,
  fit_and_proper_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED' CHECK (fit_and_proper_status IN (
    'NOT_REQUIRED',
    'PENDING',
    'SUBMITTED_TO_REGULATOR',
    'APPROVED',
    'REJECTED'
  )),
  appointed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT expansion_country_roles_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_exp_roles_program FOREIGN KEY (tenant_id, expansion_id)
    REFERENCES public.expansion_programs(tenant_id, id) ON DELETE CASCADE
);

-- 4. Stage 1 & 2: Regulatory Obligations & Licensing Requirements Register
CREATE TABLE IF NOT EXISTS public.expansion_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expansion_id UUID NOT NULL,
  stage_category TEXT NOT NULL CHECK (stage_category IN (
    'MARKET_ENTRY',
    'LICENSING',
    'GOVERNANCE_FIT_PROPER',
    'CAPITAL_ESCROW',
    'AML_CFT',
    'DATA_PROTECTION',
    'FX_CURRENCY',
    'CONSUMER_PROTECTION',
    'PARTNER_APPROVAL',
    'REPORTING'
  )),
  regulator TEXT NOT NULL,
  statute_reference TEXT NOT NULL,
  obligation_title TEXT NOT NULL,
  obligation_summary TEXT NOT NULL,
  gap_status TEXT NOT NULL DEFAULT 'UNASSESSED' CHECK (gap_status IN (
    'UNASSESSED',
    'COMPLIANT',
    'PARTIAL_GAP',
    'CRITICAL_GAP',
    'NOT_APPLICABLE'
  )),
  licensing_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED' CHECK (licensing_status IN (
    'NOT_REQUIRED',
    'NOT_STARTED',
    'IN_PREPARATION',
    'SUBMITTED',
    'UNDER_REVIEW',
    'CONDITIONAL_APPROVAL',
    'APPROVED',
    'REJECTED'
  )),
  is_mandatory_for_go_live BOOLEAN NOT NULL DEFAULT true,
  owner_department TEXT NOT NULL DEFAULT 'Regulatory Affairs',
  owner_name TEXT,
  due_date DATE,
  evidence_ref TEXT,
  source_url TEXT,
  linked_policy_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT expansion_obligations_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_exp_obl_program FOREIGN KEY (tenant_id, expansion_id)
    REFERENCES public.expansion_programs(tenant_id, id) ON DELETE CASCADE
);

-- 5. Stage 3: Group → Local Policy Framework Localisation Matrix
CREATE TABLE IF NOT EXISTS public.expansion_policy_localisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expansion_id UUID NOT NULL,
  compliance_area TEXT NOT NULL CHECK (compliance_area IN (
    'KYC',
    'AML_CFT',
    'SANCTIONS',
    'TRANSACTION_MONITORING',
    'DATA_PROTECTION',
    'CONSUMER_PROTECTION',
    'RECORDKEEPING',
    'REGULATORY_REPORTING'
  )),
  area_title TEXT NOT NULL,
  local_requirements_summary TEXT NOT NULL,
  gap_summary TEXT,
  group_policy_id UUID,
  local_policy_id UUID,
  localisation_status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (localisation_status IN (
    'NOT_STARTED',
    'GAP_IDENTIFIED',
    'DRAFTING',
    'IN_REVIEW',
    'APPROVED',
    'PUBLISHED'
  )),
  owner_name TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT expansion_policy_localisations_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT expansion_policy_localisations_unique_area UNIQUE (tenant_id, expansion_id, compliance_area),
  CONSTRAINT fk_exp_loc_program FOREIGN KEY (tenant_id, expansion_id)
    REFERENCES public.expansion_programs(tenant_id, id) ON DELETE CASCADE
);

-- 6. Stage 4: Country-Specific & Enterprise Risk Assessment Register
CREATE TABLE IF NOT EXISTS public.expansion_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expansion_id UUID NOT NULL,
  risk_category TEXT NOT NULL CHECK (risk_category IN (
    'MONEY_LAUNDERING',
    'TERRORIST_FINANCING',
    'SANCTIONS',
    'FRAUD',
    'REGULATORY_LICENSING',
    'DATA_PROTECTION',
    'THIRD_PARTY_PARTNER',
    'CURRENCY_FX',
    'CONSUMER_PROTECTION',
    'OPERATIONAL_RESILIENCE'
  )),
  risk_title TEXT NOT NULL,
  risk_description TEXT NOT NULL,
  inherent_likelihood INTEGER NOT NULL DEFAULT 3 CHECK (inherent_likelihood BETWEEN 1 AND 5),
  inherent_impact INTEGER NOT NULL DEFAULT 4 CHECK (inherent_impact BETWEEN 1 AND 5),
  inherent_rating TEXT NOT NULL DEFAULT 'HIGH' CHECK (inherent_rating IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  appetite_decision TEXT NOT NULL DEFAULT 'MITIGATE' CHECK (appetite_decision IN (
    'MITIGATE',
    'PROHIBIT',
    'ACCEPT_WITH_ESCALATION',
    'TRANSFER'
  )),
  mitigation_plan TEXT NOT NULL,
  residual_likelihood INTEGER NOT NULL DEFAULT 2 CHECK (residual_likelihood BETWEEN 1 AND 5),
  residual_impact INTEGER NOT NULL DEFAULT 2 CHECK (residual_impact BETWEEN 1 AND 5),
  residual_rating TEXT NOT NULL DEFAULT 'LOW' CHECK (residual_rating IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN (
    'OPEN',
    'MITIGATING',
    'MITIGATED',
    'ACCEPTED',
    'PROHIBITED_BLOCKED'
  )),
  owner_name TEXT,
  accepted_by TEXT,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT expansion_risks_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_exp_risks_program FOREIGN KEY (tenant_id, expansion_id)
    REFERENCES public.expansion_programs(tenant_id, id) ON DELETE CASCADE
);

-- 7. Stage 5: Cross-Functional Operational Workstreams & Control Specs
CREATE TABLE IF NOT EXISTS public.expansion_workstreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expansion_id UUID NOT NULL,
  workstream_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'CONTROL_IMPLEMENTATION' CHECK (stage IN (
    'MARKET_ENTRY_ASSESSMENT',
    'LICENSING_AUTHORISATION',
    'FRAMEWORK_LOCALISATION',
    'RISK_ASSESSMENT',
    'CONTROL_IMPLEMENTATION',
    'PRE_LAUNCH_VALIDATION',
    'LIVE_OPERATIONS',
    'ONGOING_OVERSIGHT'
  )),
  responsible_team TEXT NOT NULL CHECK (responsible_team IN (
    'REGULATORY_AFFAIRS',
    'LEGAL',
    'AML_COMPLIANCE',
    'RISK',
    'PROCUREMENT_PARTNERS',
    'ENGINEERING',
    'INFOSEC',
    'OPERATIONS',
    'HR_TRAINING',
    'FINANCE',
    'LOCAL_PARTNER',
    'MANAGEMENT_COMPLIANCE'
  )),
  priority TEXT NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN (
    'NOT_STARTED',
    'IN_PROGRESS',
    'BLOCKED',
    'EVIDENCE_SUBMITTED',
    'VERIFIED'
  )),
  control_specification TEXT,
  expected_evidence TEXT NOT NULL,
  completion_evidence_ref TEXT,
  owner_name TEXT,
  due_date DATE,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT expansion_workstreams_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_exp_ws_program FOREIGN KEY (tenant_id, expansion_id)
    REFERENCES public.expansion_programs(tenant_id, id) ON DELETE CASCADE
);

-- 8. Stage 6: Pre-Launch Compliance Validation & Assurance Tests
CREATE TABLE IF NOT EXISTS public.expansion_validation_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expansion_id UUID NOT NULL,
  test_category TEXT NOT NULL CHECK (test_category IN (
    'KYC_VERIFICATION',
    'SANCTIONS_SCREENING',
    'TRANSACTION_MONITORING',
    'ALERT_ESCALATION',
    'REGULATORY_REPORTING',
    'DATA_PROTECTION',
    'OPERATIONAL_RESILIENCE',
    'PARTNER_DUE_DILIGENCE',
    'STAFF_TRAINING',
    'POLICY_APPROVAL'
  )),
  test_name TEXT NOT NULL,
  test_objective TEXT NOT NULL,
  is_critical_gate BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'PASSED',
    'FAILED',
    'REMEDIATING',
    'WAIVED'
  )),
  evidence_ref TEXT,
  actual_result TEXT,
  remediation_log TEXT,
  tested_by TEXT,
  tested_at TIMESTAMPTZ,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT expansion_validation_tests_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_exp_tests_program FOREIGN KEY (tenant_id, expansion_id)
    REFERENCES public.expansion_programs(tenant_id, id) ON DELETE CASCADE
);

-- 9. Stage 6: Formal Go-Live Readiness Gate Decisions (CCO / Board Sign-Off)
CREATE TABLE IF NOT EXISTS public.expansion_go_live_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expansion_id UUID NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN (
    'APPROVED_FOR_LAUNCH',
    'CONDITIONAL_LAUNCH',
    'BLOCKED_REMEDIATION_REQUIRED'
  )),
  approver_role TEXT NOT NULL CHECK (approver_role IN (
    'CHIEF_COMPLIANCE_OFFICER',
    'COMMITTEE_MEMBER',
    'BOARD_MEMBER'
  )),
  approver_user_id TEXT NOT NULL,
  approver_name TEXT,
  readiness_score INTEGER NOT NULL CHECK (readiness_score BETWEEN 0 AND 100),
  cco_questions_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  conditions_or_notes TEXT,
  readiness_dossier_markdown TEXT,
  approval_hash_sha256 CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT expansion_go_live_gates_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_exp_gate_program FOREIGN KEY (tenant_id, expansion_id)
    REFERENCES public.expansion_programs(tenant_id, id) ON DELETE CASCADE
);

-- 10. Stage 7: Country Regulatory Reporting Calendar
CREATE TABLE IF NOT EXISTS public.expansion_reporting_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expansion_id UUID NOT NULL,
  regulator TEXT NOT NULL,
  report_name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN (
    'REAL_TIME',
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'ANNUALLY',
    'AS_REQUIRED'
  )),
  submission_channel TEXT NOT NULL,
  statutory_reference TEXT,
  owner_name TEXT,
  next_due_date DATE,
  last_submitted_at TIMESTAMPTZ,
  last_submission_ref TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN (
    'SCHEDULED',
    'IN_PREPARATION',
    'SUBMITTED',
    'OVERDUE',
    'EXEMPT'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT expansion_reporting_calendar_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_exp_rep_program FOREIGN KEY (tenant_id, expansion_id)
    REFERENCES public.expansion_programs(tenant_id, id) ON DELETE CASCADE
);

-- 11. Stage 7: Compliance Incident & Breach Register
CREATE TABLE IF NOT EXISTS public.expansion_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expansion_id UUID NOT NULL,
  incident_ref_no TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  category TEXT NOT NULL DEFAULT 'COMPLIANCE_BREACH' CHECK (category IN (
    'COMPLIANCE_BREACH',
    'AML_STR_ESCALATION',
    'SANCTIONS_HIT',
    'DATA_BREACH',
    'PARTNER_FAILURE',
    'REGULATORY_INQUIRY',
    'CONTROL_FAILURE'
  )),
  regulator_notification_required BOOLEAN NOT NULL DEFAULT false,
  regulator_notified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN (
    'OPEN',
    'INVESTIGATING',
    'REMEDIATING',
    'REGULATOR_NOTIFIED',
    'CLOSED'
  )),
  owner_name TEXT,
  root_cause TEXT,
  remediation_summary TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT expansion_incidents_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_exp_inc_program FOREIGN KEY (tenant_id, expansion_id)
    REFERENCES public.expansion_programs(tenant_id, id) ON DELETE CASCADE
);

-- 12. Stage 8: Multi-Country Regulatory Change Log
CREATE TABLE IF NOT EXISTS public.expansion_regulatory_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expansion_id UUID NOT NULL,
  jurisdiction_code TEXT NOT NULL,
  regulator TEXT NOT NULL,
  circular_title TEXT NOT NULL,
  source_url TEXT,
  detected_source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (detected_source IN (
    'MANUAL',
    'RIPPLE_SENTINEL',
    'LIVE_WEB_MONITOR'
  )),
  impact_severity TEXT NOT NULL DEFAULT 'HIGH' CHECK (impact_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  impact_summary TEXT NOT NULL,
  impacted_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_owner TEXT,
  implementation_deadline DATE,
  status TEXT NOT NULL DEFAULT 'DETECTED' CHECK (status IN (
    'DETECTED',
    'IMPACT_ASSESSING',
    'IMPLEMENTING',
    'EVIDENCE_VERIFIED',
    'CLOSED'
  )),
  evidence_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT expansion_regulatory_changes_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT fk_exp_chg_program FOREIGN KEY (tenant_id, expansion_id)
    REFERENCES public.expansion_programs(tenant_id, id) ON DELETE CASCADE
);

-- 13. Core 13 Compliance Artefacts Tracker
CREATE TABLE IF NOT EXISTS public.expansion_artefacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expansion_id UUID NOT NULL,
  artefact_type TEXT NOT NULL CHECK (artefact_type IN (
    'REGULATORY_OBLIGATIONS_REGISTER',
    'REGULATORY_GAP_ASSESSMENT',
    'COUNTRY_RISK_ASSESSMENT',
    'AML_CFT_POLICY',
    'KYC_CDD_PROCEDURES',
    'SANCTIONS_SCREENING_POLICY',
    'COMPLIANCE_RISK_REGISTER',
    'REGULATORY_REPORTING_CALENDAR',
    'COMPLIANCE_MONITORING_PLAN',
    'COMPLIANCE_TESTING_REPORT',
    'REGULATORY_CHANGE_LOG',
    'COMPLIANCE_INCIDENT_REGISTER',
    'MARKET_ENTRY_COMPLIANCE_ASSESSMENT'
  )),
  title TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'MISSING' CHECK (status IN (
    'MISSING',
    'DRAFT',
    'IN_REVIEW',
    'APPROVED',
    'LIVE'
  )),
  linked_policy_id UUID,
  linked_work_product_id UUID,
  evidence_ref TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT expansion_artefacts_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT expansion_artefacts_unique_type UNIQUE (tenant_id, expansion_id, artefact_type),
  CONSTRAINT fk_exp_art_program FOREIGN KEY (tenant_id, expansion_id)
    REFERENCES public.expansion_programs(tenant_id, id) ON DELETE CASCADE
);

-- ==============================================================================
-- Operational Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_expansion_programs_tenant_status
  ON public.expansion_programs (tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_expansion_programs_tenant_jurisdiction
  ON public.expansion_programs (tenant_id, target_jurisdiction);
CREATE INDEX IF NOT EXISTS idx_expansion_country_roles_program
  ON public.expansion_country_roles (tenant_id, expansion_id);
CREATE INDEX IF NOT EXISTS idx_expansion_obligations_program
  ON public.expansion_obligations (tenant_id, expansion_id, stage_category, gap_status);
CREATE INDEX IF NOT EXISTS idx_expansion_policy_localisations_program
  ON public.expansion_policy_localisations (tenant_id, expansion_id);
CREATE INDEX IF NOT EXISTS idx_expansion_risks_program
  ON public.expansion_risks (tenant_id, expansion_id, residual_rating);
CREATE INDEX IF NOT EXISTS idx_expansion_workstreams_program
  ON public.expansion_workstreams (tenant_id, expansion_id, priority, status);
CREATE INDEX IF NOT EXISTS idx_expansion_validation_tests_program
  ON public.expansion_validation_tests (tenant_id, expansion_id, status);
CREATE INDEX IF NOT EXISTS idx_expansion_go_live_gates_program
  ON public.expansion_go_live_gates (tenant_id, expansion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expansion_reporting_calendar_program
  ON public.expansion_reporting_calendar (tenant_id, expansion_id, next_due_date);
CREATE INDEX IF NOT EXISTS idx_expansion_incidents_program
  ON public.expansion_incidents (tenant_id, expansion_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_expansion_regulatory_changes_program
  ON public.expansion_regulatory_changes (tenant_id, expansion_id, status);
CREATE INDEX IF NOT EXISTS idx_expansion_artefacts_program
  ON public.expansion_artefacts (tenant_id, expansion_id);

-- ==============================================================================
-- Row Level Security (Strict Multi-Tenant Isolation)
-- ==============================================================================
ALTER TABLE public.expansion_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expansion_country_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expansion_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expansion_policy_localisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expansion_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expansion_workstreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expansion_validation_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expansion_go_live_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expansion_reporting_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expansion_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expansion_regulatory_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expansion_artefacts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
  pol_name TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'expansion_programs',
    'expansion_country_roles',
    'expansion_obligations',
    'expansion_policy_localisations',
    'expansion_risks',
    'expansion_workstreams',
    'expansion_validation_tests',
    'expansion_go_live_gates',
    'expansion_reporting_calendar',
    'expansion_incidents',
    'expansion_regulatory_changes',
    'expansion_artefacts'
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
