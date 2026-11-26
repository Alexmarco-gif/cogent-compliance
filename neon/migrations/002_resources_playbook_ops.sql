-- Cogent Resources Hub & Master Content Operations Playbook Upgrade (v2.0)
-- Isolated Neon Postgres Migration (Zero Supabase DB or Storage usage)
-- Safe & idempotent: can be run repeatedly in Neon SQL Editor.

ALTER TABLE resource_posts
  -- Editorial workflow & strategy (Part 1 + Phase 1)
  ADD COLUMN IF NOT EXISTS workflow_stage TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS content_pillar TEXT,
  ADD COLUMN IF NOT EXISTS target_persona TEXT,
  ADD COLUMN IF NOT EXISTS workflow_track TEXT,
  ADD COLUMN IF NOT EXISTS primary_keyword TEXT,
  ADD COLUMN IF NOT EXISTS secondary_keywords TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS priority_urgency SMALLINT,
  ADD COLUMN IF NOT EXISTS priority_commercial SMALLINT,
  ADD COLUMN IF NOT EXISTS priority_winnability SMALLINT,

  -- Research brief & regulatory snapshot (Phases 2 & 3)
  ADD COLUMN IF NOT EXISTS target_word_count INTEGER,
  ADD COLUMN IF NOT EXISTS serp_gap_notes TEXT,
  ADD COLUMN IF NOT EXISTS product_tie_in TEXT,
  ADD COLUMN IF NOT EXISTS circular_code TEXT,
  ADD COLUMN IF NOT EXISTS regulators TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS effective_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS authoritative_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS update_callout_note TEXT,

  -- Phase 4: FAQPage JSON-LD, Mid-Article CTA, Legal Disclaimer & 12-Point Maker-Checker QA
  ADD COLUMN IF NOT EXISTS faq_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mid_article_cta JSONB,
  ADD COLUMN IF NOT EXISTS show_legal_disclaimer BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS qa_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Phases 5 & 6: 1-to-7 Atomization Hub & 30-Day Freshness Refresh Tracking
  ADD COLUMN IF NOT EXISTS atomization_kit JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_statutory_audit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refresh_due_at TIMESTAMPTZ;

-- Backfill workflow_stage for already-published posts
UPDATE resource_posts
SET workflow_stage = 'published'
WHERE status = 'published' AND workflow_stage = 'draft';

CREATE INDEX IF NOT EXISTS idx_resource_posts_workflow_stage
  ON resource_posts (workflow_stage);

CREATE INDEX IF NOT EXISTS idx_resource_posts_content_pillar
  ON resource_posts (content_pillar);

CREATE INDEX IF NOT EXISTS idx_resource_posts_refresh_due_at
  ON resource_posts (refresh_due_at)
  WHERE status = 'published';
