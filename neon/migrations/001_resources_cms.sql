-- Cogent Resources Hub & Private Publishing Studio
-- Isolated Neon Postgres Schema (Zero Supabase DB or Storage usage)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS resource_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('insights', 'videos', 'reports', 'events')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body_markdown TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  author_name TEXT NOT NULL DEFAULT 'Cogent Editorial',
  author_role TEXT DEFAULT 'Regulatory Research',
  tags TEXT[] NOT NULL DEFAULT '{}',
  featured BOOLEAN NOT NULL DEFAULT false,
  reading_time_minutes INTEGER,

  -- Video fields
  video_embed_url TEXT,
  video_duration TEXT,

  -- Report / Guide fields (Drive, pCloud, or separate Resources R2)
  report_file_url TEXT,
  report_file_label TEXT,

  -- Event fields
  event_starts_at TIMESTAMPTZ,
  event_location TEXT,
  event_registration_url TEXT,

  -- SEO & lifecycle
  seo_title TEXT,
  seo_description TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_posts_status_category_published
  ON resource_posts (status, category, published_at DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resource_posts_tags
  ON resource_posts USING GIN (tags);
