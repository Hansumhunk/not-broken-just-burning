"""Eternal Flame Engine: isolated SQLite lifecycle ledger.

DEVELOPMENT / SIMULATION ONLY. No provider sends, subscriber identities, production
database migrations, auth decisions or network calls. A future server adapter must
authenticate the actor, re-read Brevo at dispatch, and atomically reconcile the
provider operation. SQLite transactions protect this local test ledger only.
"""
from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import re
import secrets
import sqlite3

_ID = re.compile(r"^[a-z0-9][a-z0-9-]{3,90}$")
_SHA = re.compile(r"^[a-f0-9]{64}$")
_ACTOR = re.compile(r"^[a-zA-Z0-9:_./-]{4,100}$")
_EVIDENCE = re.compile(r"^[a-zA-Z0-9:_./#-]{5,160}$")
_CAMPAIGN = re.compile(r"^[1-9][0-9]{0,15}$")
_AUDIENCE = re.compile(r"^segment:[a-zA-Z0-9_-]{1,50}$")
_SOURCE = re.compile(r"^https://notbrokenjustburning\.com/[a-z0-9-]+\.html$")
_WINDOW_SECONDS = 300
_FLAGS = (
    "verified_live", "marketing_consent_enforced", "suppression_enforced",
    "welcome_overlap_clear", "quota_available", "provider_queue_clear",
    "provider_status_draft",
)

class LedgerHold(ValueError):
    """Release/preflight gate refusal; no marketing action was performed."""


def require(condition, message):
    if not condition:
        raise LedgerHold(message)


def check(value, pattern, label):
    require(isinstance(value, str) and pattern.fullmatch(value) is not None, "invalid " + label)
    return value


def dt(value):
    require(isinstance(value, str), "timestamp missing")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise LedgerHold("invalid timestamp") from exc
    require(parsed.tzinfo is not None and parsed.utcoffset().total_seconds() == 0, "UTC timestamp required")
    return parsed


def hash_value(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


class Ledger:
    def __init__(self, db_file: str | Path):
        self.db_file = str(Path(db_file).resolve())
        require(self.db_file != ":memory:", "persistent file path required")
        schema = Path(__file__).with_name("ledger_schema.sqlite.sql").read_text(encoding="utf-8")
        with self._db() as db:
            db.executescript(schema)

    @contextmanager
    def _db(self):
        db = sqlite3.connect(self.db_file, timeout=5, isolation_level=None)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("PRAGMA busy_timeout=5000")
        try:
            yield db
        finally:
            db.close()

    @contextmanager
    def _tx(self):
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                yield db
                db.execute("COMMIT")
            except BaseException:
                db.execute("ROLLBACK")
                raise

    def _get(self, db, edition_id):
        row = db.execute("SELECT * FROM editions WHERE id=?", (edition_id,)).fetchone()
        require(row is not None, "edition not found")
        return row

    def _audit(self, db, edition_id, event, actor, old, new, at, evidence=None):
        check(actor, _ACTOR, "operator reference")
        if evidence is not None:
            check(evidence, _EVIDENCE, "evidence reference")
        db.execute(
            "INSERT INTO audit_log(edition_id,event,actor_ref,from_state,to_state,at_utc,evidence_ref) "
            "VALUES(?,?,?,?,?,?,?)", (edition_id, event, actor, old, new, at, evidence)
        )

    def create(self, *, edition_id, title, source_url, source_sha256, content_sha256, actor, now):
        check(edition_id, _ID, "edition id")
        check(source_url, _SOURCE, "public source url")
        check(source_sha256, _SHA, "source digest")
        check(content_sha256, _SHA, "content digest")
        require(isinstance(title, str) and 8 <= len(title) <= 160 and "@" not in title, "invalid title")
        check(actor, _ACTOR, "operator reference")
        dt(now)
        with self._tx() as db:
            db.execute(
                "INSERT INTO editions(id,title,source_url,source_sha256,content_sha256,created_at,updated_at) "
                "VALUES(?,?,?,?,?,?,?)",
                (edition_id, title, source_url, source_sha256, content_sha256, now, now)
            )
            self._audit(db, edition_id, "created", actor, None, "draft", now)

    def review(self, edition_id, actor, now):
        dt(now)
        with self._tx() as db:
            row = self._get(db, edition_id)
            require(row["state"] == "draft", "only a draft can enter review")
            db.execute("UPDATE editions SET state='review',reviewed_by=?,updated_at=? WHERE id=?",
                       (check(actor, _ACTOR, "editor ref"), now, edition_id))
            self._audit(db, edition_id, "review_requested", actor, "draft", "review", now)

    def approve(self, edition_id, actor, evidence, now):
        dt(now)
        check(evidence, _EVIDENCE, "editorial approval reference")
        with self._tx() as db:
            row = self._get(db, edition_id)
            require(row["state"] == "review", "review required before approval")
            # Actor reference is traceable, but this offline tool cannot verify identity or permissions.
            check(actor, _ACTOR, "approver ref")
            db.execute("UPDATE editions SET state='approved',approval_ref=?,approved_at=?,updated_at=? "
                       "WHERE id=?", (evidence, now, now, edition_id))
            self._audit(db, edition_id, "approved", actor, "review", "approved", now, evidence)

    def queue(self, edition_id, campaign_ref, audience_ref, window_start, window_end, actor, now):
        check(campaign_ref, _CAMPAIGN, "existing campaign id")
        check(audience_ref, _AUDIENCE, "segment ref")
        dt(now)
        require(dt(window_start) < dt(window_end), "invalid dispatch window")
        with self._tx() as db:
            row = self._get(db, edition_id)
            require(row["state"] == "approved", "approval required")
            require(bool(row["approval_ref"]), "missing approval evidence")
            db.execute(
                "UPDATE editions SET state='queued', provider_campaign_ref=?,audience_ref=?, "
                "window_start=?,window_end=?,updated_at=? WHERE id=?",
                (campaign_ref, audience_ref, window_start, window_end, now, edition_id)
            )
            self._audit(db, edition_id, "queue_simulated", actor, "approved", "queued", now)

    def claim_simulated(self, edition_id, snapshot, actor, now, *, release_enabled=False):
        """A simulated atomic claim ONLY. Cannot call a provider."""
        dt(now)
        require(release_enabled is False, "PRODUCTION RELEASE HOLD: no live dispatch implemented")
        require(isinstance(snapshot, dict), "missing Brevo provider snapshot")
        with self._tx() as db:
            stop = db.execute("SELECT halted FROM runtime_control WHERE singleton=1").fetchone()
            require(stop is not None and stop["halted"] == 0, "emergency stop engaged; no queue claims")
            row = self._get(db, edition_id)
            require(row["state"] == "queued", "edition not claimable / duplicate claim")
            require(dt(row["window_start"]) <= dt(now) <= dt(row["window_end"]), "outside dispatch window")
            require(snapshot.get("campaign_ref") == row["provider_campaign_ref"], "campaign mismatch")
            require(snapshot.get("audience_ref") == row["audience_ref"], "audience mismatch")
            require(snapshot.get("provider_evidence_kind") == "read_only_snapshot", "provider evidence required")
            checked = dt(snapshot.get("checked_at"))
            age = (dt(now) - checked).total_seconds()
            require(0 <= age <= _WINDOW_SECONDS, "provider snapshot stale or future-dated")
            require(all(snapshot.get(f) is True for f in _FLAGS), "Brevo consent, suppression, overlap, queue or quota hold")
            require(type(snapshot.get("eligible_count")) is int and snapshot["eligible_count"] > 0,
                    "no verified eligible recipients")
            require(row["attempt_count"] < 3, "retry ceiling reached")
            attempt = row["attempt_count"] + 1
            token = secrets.token_hex(32)
            stable_idempotency = hash_value("|".join((
                row["id"], row["content_sha256"], row["provider_campaign_ref"],
                row["audience_ref"], row["window_start"], row["window_end"]
            )))
            db.execute("UPDATE editions SET state='inflight',attempt_count=?,updated_at=? WHERE id=?",
                       (attempt, now, edition_id))
            db.execute(
                "INSERT INTO delivery_claims(edition_id,attempt_no,token_sha256,idempotency_sha256,claim_state,claimed_at) "
                "VALUES(?,?,?,?,'inflight',?)",
                (edition_id, attempt, hash_value(token), stable_idempotency, now)
            )
            self._audit(db, edition_id, "simulated_claim", actor, "queued", "inflight", now)
        return {"attempt": attempt, "claim_token": token, "idempotency_sha256": stable_idempotency,
                "mode": "SIMULATION_ONLY"}

    def _claim_row(self, db, row, token):
        require(isinstance(token, str) and re.fullmatch(r"[a-f0-9]{64}", token), "invalid claim token")
        claim = db.execute(
            "SELECT * FROM delivery_claims WHERE edition_id=? AND attempt_no=? AND token_sha256=?",
            (row["id"], row["attempt_count"], hash_value(token))
        ).fetchone()
        require(claim is not None and claim["claim_state"] == "inflight", "unknown or used claim")
        return claim

    def resolve_claim(self, edition_id, token, result, actor, now, evidence):
        """Simulated receipt, or safe pre-provider/unknown failure. No network."""
        dt(now)
        check(evidence, _EVIDENCE, "provider or failure evidence")
        targets = {
            "provider_ack": ("sent", "provider_ack"),
            "definitely_not_sent": ("failed", "before_provider_failure"),
            "unknown": ("reconcile_required", "unknown")
        }
        require(result in targets, "unsupported claim disposition")
        new, claim_state = targets[result]
        with self._tx() as db:
            row = self._get(db, edition_id)
            require(row["state"] == "inflight", "no inflight claim")
            self._claim_row(db, row, token)
            db.execute("UPDATE delivery_claims SET claim_state=?,ended_at=? "
                       "WHERE edition_id=? AND attempt_no=?",
                       (claim_state, now, edition_id, row["attempt_count"]))
            db.execute("UPDATE editions SET state=?,receipt_ref=?,retry_proof_ref=?,updated_at=? WHERE id=?",
                       (new, evidence if new == "sent" else None,
                        evidence if new == "failed" else None, now, edition_id))
            self._audit(db, edition_id, "simulated_"+result, actor, "inflight", new, now, evidence)

    def quarantine_interrupted(self, edition_id, actor, now):
        """After process crash: NEVER automatically requeue unknown provider activity."""
        dt(now)
        with self._tx() as db:
            row = self._get(db, edition_id)
            require(row["state"] == "inflight", "not an inflight attempt")
            db.execute("UPDATE delivery_claims SET claim_state='unknown',ended_at=? "
                       "WHERE edition_id=? AND attempt_no=? AND claim_state='inflight'",
                       (now, edition_id, row["attempt_count"]))
            db.execute("UPDATE editions SET state='reconcile_required',updated_at=? WHERE id=?",
                       (now, edition_id))
            self._audit(db, edition_id, "crash_quarantine", actor, "inflight", "reconcile_required", now)

    def reconcile(self, edition_id, provider_result, actor, now, evidence):
        """Only an inspected provider receipt can resolve an unknown attempt."""
        check(evidence, _EVIDENCE, "provider reconciliation evidence")
        dt(now)
        require(provider_result in ("confirmed_sent", "confirmed_not_sent"), "authoritative provider result required")
        target = "sent" if provider_result == "confirmed_sent" else "failed"
        with self._tx() as db:
            row = self._get(db, edition_id)
            require(row["state"] == "reconcile_required", "no ambiguous claim awaiting reconciliation")
            db.execute("UPDATE delivery_claims SET claim_state='reconciled',ended_at=? "
                       "WHERE edition_id=? AND attempt_no=? AND claim_state='unknown'",
                       (now, edition_id, row["attempt_count"]))
            db.execute("UPDATE editions SET state=?,receipt_ref=?,retry_proof_ref=?,updated_at=? WHERE id=?",
                       (target, evidence if target=="sent" else None,
                        evidence if target=="failed" else None, now, edition_id))
            self._audit(db, edition_id, "provider_reconciled_"+provider_result,
                        actor, "reconcile_required", target, now, evidence)

    def retry_after_confirmed_non_send(self, edition_id, actor, now):
        dt(now)
        with self._tx() as db:
            row = self._get(db, edition_id)
            require(row["state"] == "failed" and bool(row["retry_proof_ref"]),
                    "retry requires documented provider non-send")
            require(row["attempt_count"] < 3, "retry ceiling reached")
            db.execute("UPDATE editions SET state='queued',updated_at=? WHERE id=?", (now, edition_id))
            self._audit(db, edition_id, "authorized_retry_simulated", actor, "failed", "queued", now,
                        row["retry_proof_ref"])

    def delivery_report(self, edition_id, delivered_count, actor, now, evidence):
        """Provider-verified aggregate only. No recipient details or click data."""
        check(evidence, _EVIDENCE, "provider delivery evidence")
        dt(now)
        require(type(delivered_count) is int and delivered_count > 0, "delivery count must be positive")
        with self._tx() as db:
            row = self._get(db, edition_id)
            require(row["state"] == "sent" and row["receipt_ref"], "provider receipt required")
            db.execute("UPDATE editions SET state='delivered',provider_delivery_ref=?,updated_at=? WHERE id=?",
                       (evidence, now, edition_id))
            self._audit(db, edition_id, "provider_delivery_aggregate", actor, "sent", "delivered", now, evidence)

    def suppress(self, edition_id, actor, now, reason):
        check(reason, _EVIDENCE, "suppression evidence")
        dt(now)
        with self._tx() as db:
            row = self._get(db, edition_id)
            require(row["state"] in ("approved","queued","failed"), "cannot suppress an active or sent claim")
            db.execute("UPDATE editions SET state='suppressed',updated_at=? WHERE id=?",
                       (now, edition_id))
            self._audit(db, edition_id, "provider_hold", actor, row["state"], "suppressed", now, reason)

    def cancel(self, edition_id, actor, now, reason):
        check(reason, _EVIDENCE, "cancellation evidence")
        dt(now)
        with self._tx() as db:
            row = self._get(db, edition_id)
            require(row["state"] in ("draft","review","approved","queued","failed","suppressed"),
                    "active/ambiguous/sent attempts need provider reconciliation, not silent cancellation")
            db.execute("UPDATE editions SET state='cancelled',updated_at=? WHERE id=?",
                       (now, edition_id))
            self._audit(db, edition_id, "cancelled_simulated", actor, row["state"], "cancelled", now, reason)

    def status(self, edition_id):
        with self._db() as db:
            return dict(self._get(db, edition_id))

    def audit(self, edition_id):
        with self._db() as db:
            self._get(db, edition_id)
            return [dict(x) for x in db.execute(
                "SELECT seq,event,actor_ref,from_state,to_state,at_utc,evidence_ref "
                "FROM audit_log WHERE edition_id=? ORDER BY seq", (edition_id,))]
