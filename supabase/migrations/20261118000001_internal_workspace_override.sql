-- =====================================================================
-- Cogent Marketing Shield - Owner-Only Internal Workspace Override
-- ---------------------------------------------------------------------
-- Adds a dedicated, single-purpose column that marks a tenant as an
-- "Internal Workspace" (product walkthroughs, demos, marketing).
--
-- Internal workspaces resolve to an unlimited Enterprise plan on every
-- entitlement check. The flag lives in its own column (NOT inside the
-- shared `tenants.settings` JSONB) so that concurrent read-modify-write
-- updates to settings (trial anchor, pending roles, onboarding, Paystack
-- mirror) can never erase it.
--
-- Only the platform owner (PLATFORM_OWNER_EMAIL, verified in Clerk) can
-- set or clear this column through the application.
-- =====================================================================

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS billing_override TEXT NULL,
    ADD COLUMN IF NOT EXISTS billing_override_set_by TEXT NULL,
    ADD COLUMN IF NOT EXISTS billing_override_set_at TIMESTAMPTZ NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tenants_billing_override_check'
    ) THEN
        ALTER TABLE public.tenants
            ADD CONSTRAINT tenants_billing_override_check
            CHECK (billing_override IS NULL OR billing_override IN ('internal_enterprise'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_billing_override
    ON public.tenants (billing_override)
    WHERE billing_override IS NOT NULL;

COMMENT ON COLUMN public.tenants.billing_override IS
    'Owner-only billing override. ''internal_enterprise'' = internal demo/walkthrough workspace with unlimited Enterprise access.';

-- Backfill: carry over workspaces previously comped by the legacy
-- INTERNAL_ENTERPRISE_EMAILS / INTERNAL_ENTERPRISE_ORG_IDS allowlist.
UPDATE public.tenants
   SET billing_override = 'internal_enterprise',
       billing_override_set_by = COALESCE(settings->>'enterprise_comp_owner_user_id', 'legacy_allowlist'),
       billing_override_set_at = NOW()
 WHERE billing_override IS NULL
   AND settings->>'enterprise_comp_granted_at' IS NOT NULL
   AND status <> 'INACTIVE';
