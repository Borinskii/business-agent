-- Migration: 20260325_003_create_sequences_pilots.sql
-- Owner: Person 3
-- Creates: sequences, pilots, pilot_requests, frank_replies tables

-- ─── SEQUENCES ────────────────────────────────────────────────────────────────

CREATE TABLE sequences (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             uuid        NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  workspace_id           text        NOT NULL,
  salesforge_sequence_id text        NOT NULL,
  type                   text        NOT NULL DEFAULT 'outreach'
    CHECK (type IN ('outreach', 'pilot')),
  status                 text        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  nodes_count            integer     NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sequences_company ON sequences(company_id);
CREATE INDEX idx_sequences_status  ON sequences(status);

ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON sequences
  FOR ALL TO service_role USING (true);

CREATE TRIGGER sequences_updated_at
  BEFORE UPDATE ON sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── PILOTS ───────────────────────────────────────────────────────────────────

CREATE TABLE pilots (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid        NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  workspace_id        text        NOT NULL,
  sequence_id         text        NOT NULL,
  icp_description     text        NOT NULL,
  contacts_count      integer     NOT NULL DEFAULT 0,
  contacts_reached    integer     NOT NULL DEFAULT 0,
  open_rate           numeric(5,2),
  positive_replies    integer     NOT NULL DEFAULT 0,
  reply_rate          numeric(5,2),
  demos_booked        integer     NOT NULL DEFAULT 0,
  live_conversations  jsonb       NOT NULL DEFAULT '[]',
  status              text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at          timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pilots_company ON pilots(company_id);
CREATE INDEX idx_pilots_status  ON pilots(status);

ALTER TABLE pilots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON pilots
  FOR ALL TO service_role USING (true);

-- ─── PILOT REQUESTS ───────────────────────────────────────────────────────────

CREATE TABLE pilot_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid        REFERENCES companies(id) ON DELETE SET NULL,
  icp_description  text        NOT NULL,
  requester_email  text,
  processed        boolean     NOT NULL DEFAULT false,
  requested_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pilot_requests_company   ON pilot_requests(company_id);
CREATE INDEX idx_pilot_requests_processed ON pilot_requests(processed);

ALTER TABLE pilot_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON pilot_requests
  FOR ALL TO service_role USING (true);

-- ─── FRANK REPLIES ────────────────────────────────────────────────────────────

CREATE TABLE frank_replies (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid        REFERENCES companies(id) ON DELETE SET NULL,
  thread_id     text        NOT NULL,
  mailbox_id    text        NOT NULL,
  email_id      text        NOT NULL UNIQUE,
  incoming_text text        NOT NULL,
  intent        text        NOT NULL CHECK (intent IN (
                  'pricing_question', 'demo_request', 'positive_intent',
                  'info_request', 'pilot_request', 'unsubscribe', 'other'
                )),
  reply_text    text        NOT NULL,
  sent_at       timestamptz,
  status        text        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'failed')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_frank_replies_company  ON frank_replies(company_id);
CREATE INDEX idx_frank_replies_email_id ON frank_replies(email_id);
CREATE INDEX idx_frank_replies_status   ON frank_replies(status);

ALTER TABLE frank_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON frank_replies
  FOR ALL TO service_role USING (true);
