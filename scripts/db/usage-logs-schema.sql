-- C8 — usage_logs migration.
--
-- The table was being INSERTed into by src/app/api/copywriter/route.ts but
-- never created (silent failure inside try/catch). This migration brings
-- prod into line with the code, and adds the token-tracking columns that
-- N13 needs.
--
-- Idempotent: safe to run on environments where part of the schema already
-- exists.

CREATE TABLE IF NOT EXISTS usage_logs (
  id                TEXT PRIMARY KEY,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event             TEXT NOT NULL,
  route             TEXT,
  model             TEXT,
  persona_name      TEXT,
  confidence_score  INTEGER,
  input_idea        TEXT,
  goal              TEXT,
  verdict           TEXT,
  prompt_tokens     INTEGER,
  completion_tokens INTEGER,
  cached_tokens     INTEGER,
  total_tokens      INTEGER,
  latency_ms        INTEGER,
  user_id           TEXT,
  payload           JSONB
);

-- Backfill columns on environments where the table already existed without them.
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS route             TEXT;
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS model             TEXT;
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS prompt_tokens     INTEGER;
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS completion_tokens INTEGER;
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS cached_tokens     INTEGER;
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS total_tokens      INTEGER;
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS latency_ms        INTEGER;
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS user_id           TEXT;

CREATE INDEX IF NOT EXISTS usage_logs_created_at_idx ON usage_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS usage_logs_route_idx      ON usage_logs (route);
CREATE INDEX IF NOT EXISTS usage_logs_event_idx      ON usage_logs (event);
