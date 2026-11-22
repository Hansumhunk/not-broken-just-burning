-- Eternal Flame Engine / server-only SQLite development ledger (NOT a Supabase migration).
-- No subscriber IDs, addresses, consent flags, private lesson bodies or Brevo secrets.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS editions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL CHECK (source_url LIKE 'https://notbrokenjustburning.com/%'),
  source_sha256 TEXT NOT NULL CHECK (length(source_sha256)=64),
  content_sha256 TEXT NOT NULL CHECK (length(content_sha256)=64),
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN (
    'draft','review','approved','queued','inflight','sent','delivered',
    'failed','suppressed','cancelled','reconcile_required')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  reviewed_by TEXT,
  approval_ref TEXT,
  approved_at TEXT,
  provider_campaign_ref TEXT UNIQUE,
  audience_ref TEXT,
  window_start TEXT,
  window_end TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 3),
  retry_proof_ref TEXT,
  failure_code TEXT,
  receipt_ref TEXT,
  provider_delivery_ref TEXT
);
CREATE TABLE IF NOT EXISTS delivery_claims (
  edition_id TEXT NOT NULL REFERENCES editions(id),
  attempt_no INTEGER NOT NULL,
  token_sha256 TEXT NOT NULL UNIQUE CHECK (length(token_sha256)=64),
  idempotency_sha256 TEXT NOT NULL CHECK (length(idempotency_sha256)=64),
  claim_state TEXT NOT NULL CHECK (claim_state IN (
     'inflight','provider_ack','before_provider_failure','unknown','reconciled')),
  claimed_at TEXT NOT NULL,
  ended_at TEXT,
  PRIMARY KEY(edition_id, attempt_no)
);
CREATE TABLE IF NOT EXISTS audit_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  edition_id TEXT NOT NULL REFERENCES editions(id),
  event TEXT NOT NULL,
  actor_ref TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  at_utc TEXT NOT NULL,
  evidence_ref TEXT
);
CREATE TRIGGER IF NOT EXISTS editions_content_immutable
BEFORE UPDATE OF title, source_url, source_sha256, content_sha256 ON editions
BEGIN SELECT RAISE(ABORT,'immutable edition version'); END;
CREATE TRIGGER IF NOT EXISTS audit_cannot_update BEFORE UPDATE ON audit_log
BEGIN SELECT RAISE(ABORT,'append-only audit'); END;
CREATE TRIGGER IF NOT EXISTS audit_cannot_delete BEFORE DELETE ON audit_log
BEGIN SELECT RAISE(ABORT,'append-only audit'); END;
CREATE INDEX IF NOT EXISTS editions_window_idx ON editions(state, window_start);


-- Operational stop applies to SIMULATED claims only; live dispatch does not exist.
-- Default preserves Phase II offline tests. PrivateOperations initializes halted=1.
CREATE TABLE IF NOT EXISTS runtime_control (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  halted INTEGER NOT NULL CHECK(halted IN (0,1)),
  changed_at TEXT,
  reason_ref TEXT
);
INSERT OR IGNORE INTO runtime_control(singleton,halted,reason_ref)
VALUES (1,0,'offline_phase2_compatibility');
CREATE TABLE IF NOT EXISTS operations_audit (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  actor_ref TEXT NOT NULL,
  at_utc TEXT NOT NULL,
  evidence_ref TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS operations_audit_no_update
BEFORE UPDATE ON operations_audit
BEGIN SELECT RAISE(ABORT,'append-only operations audit'); END;
CREATE TRIGGER IF NOT EXISTS operations_audit_no_delete
BEFORE DELETE ON operations_audit
BEGIN SELECT RAISE(ABORT,'append-only operations audit'); END;
