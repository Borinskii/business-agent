-- Migration: 20260325_001_create_companies_signals.sql
-- Owner: Person 1
-- Creates: companies, signals, upload_log tables

-- ─── UPDATED_AT TRIGGER FUNCTION ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── COMPANIES ────────────────────────────────────────────────────────────────

CREATE TABLE companies (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   text        NOT NULL,
  domain                 text        UNIQUE NOT NULL,
  logo_url               text,
  industry               text,
  size                   integer,
  location               text,
  icp                    text,
  acv_estimate           integer,
  sdr_count              integer     NOT NULL DEFAULT 1 CHECK (sdr_count > 0),
  pain_score             integer     NOT NULL DEFAULT 0 CHECK (pain_score BETWEEN 0 AND 100),
  decision_maker         jsonb,
  tech_stack             jsonb       NOT NULL DEFAULT '[]',
  competitor_using_ai    text,
  monthly_loss_estimate  integer,
  salesforce_contact_id  text,
  status                 text        NOT NULL DEFAULT 'detected'
    CHECK (status IN (
      'detected', 'profiled', 'content_generated',
      'outreach_sent', 'page_opened', 'responded',
      'pilot_running', 'pilot_results_ready', 'demo_booked', 'dnc_blocked'
    )),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_domain  ON companies(domain);
CREATE INDEX idx_companies_status  ON companies(status);
CREATE INDEX idx_companies_created ON companies(created_at DESC);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON companies
  FOR ALL TO service_role USING (true);

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── SIGNALS ──────────────────────────────────────────────────────────────────

CREATE TABLE signals (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN (
                'hiring_sdrs', 'funding', 'sdr_churn',
                'g2_negative_review', 'competitor_ai_adoption'
              )),
  detail      text        NOT NULL,
  source      text        NOT NULL,
  source_url  text,
  raw_data    jsonb       NOT NULL DEFAULT '{}',
  pain_points integer     NOT NULL DEFAULT 0 CHECK (pain_points BETWEEN 0 AND 50),
  archived    boolean     NOT NULL DEFAULT false,
  detected_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_signals_company  ON signals(company_id);
CREATE INDEX idx_signals_type     ON signals(type);
CREATE INDEX idx_signals_detected ON signals(detected_at DESC);

ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON signals
  FOR ALL TO service_role USING (true);

-- ─── UPLOAD LOG ───────────────────────────────────────────────────────────────

CREATE TABLE upload_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid        REFERENCES companies(id) ON DELETE SET NULL,
  action        text        NOT NULL CHECK (action IN ('dnc_check', 'validation', 'bulk_upload')),
  status        text        NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  response_data jsonb,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_upload_log_company ON upload_log(company_id);
CREATE INDEX idx_upload_log_action  ON upload_log(action);

ALTER TABLE upload_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON upload_log
  FOR ALL TO service_role USING (true);
