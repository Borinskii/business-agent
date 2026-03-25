-- Migration: 20260325_002_create_reports_pageviews.sql
-- Owner: Person 2
-- Creates: reports, page_views tables

-- ─── REPORTS ──────────────────────────────────────────────────────────────────

CREATE TABLE reports (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid        NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  pdf_url             text,
  video_url           text,
  personal_page_slug  text        NOT NULL UNIQUE,
  personal_page_url   text        NOT NULL,
  win_card_url        text,
  status              text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  failure_reason      text,
  video_provider      text        CHECK (video_provider IN ('sora', 'heygen', 'skipped')),
  video_script        jsonb,
  generated_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_company ON reports(company_id);
CREATE INDEX idx_reports_status  ON reports(status);
CREATE INDEX idx_reports_slug    ON reports(personal_page_slug);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON reports
  FOR ALL TO service_role USING (true);

-- ─── PAGE VIEWS ───────────────────────────────────────────────────────────────

CREATE TABLE page_views (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        REFERENCES companies(id) ON DELETE SET NULL,
  ip_hash     text,
  user_agent  text,
  viewed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_views_company ON page_views(company_id);
CREATE INDEX idx_page_views_viewed  ON page_views(viewed_at DESC);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON page_views
  FOR ALL TO service_role USING (true);

-- ─── SUPABASE STORAGE BUCKETS ─────────────────────────────────────────────────
-- Run these in Supabase Dashboard > Storage, or via CLI:
-- supabase storage create reports --public
-- supabase storage create videos  --public
