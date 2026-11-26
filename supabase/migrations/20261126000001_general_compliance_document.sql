-- ==============================================================================
-- Cogent Regulatory Intelligence Platform
-- Migration: General Compliance Document Work Products (Ad-Hoc Daily Compliance)
-- Expands work_product_artifacts workflow_type & artifact_type CHECK constraints
-- so users can generate, edit, version, and export (PDF/DOCX/MD) compliance
-- documents from ANY freeform prompt, uploaded file, or follow-up turn without
-- having to select a preset workflow first.
-- ==============================================================================

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
          'CAMPAIGN_COMPLIANCE_KIT',
          'GENERAL_COMPLIANCE_DOCUMENT'
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
          'audit_dossier_summary',
          'compliance_document'
        )
      );
  END IF;
END $$;
