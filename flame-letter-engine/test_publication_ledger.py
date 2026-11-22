"""Isolated durable-ledger tests, zero subscriber data and no provider writes."""
import importlib.util
from pathlib import Path
import sqlite3
import tempfile
import threading
import unittest

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("ledger", ROOT / "publication_ledger.py")
ledger_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ledger_mod)
Ledger, LedgerHold = ledger_mod.Ledger, ledger_mod.LedgerHold
NOW = "2026-11-23T19:00:00Z"
T = "2026-11-23T19:01:00Z"
SHA1 = "1"*64
SHA2 = "2"*64
OP = "editor:founder"
REF = "review:accepted-001"
CAMPAIGN = "42"
AUDIENCE = "segment:4"


class PublicationLedgerTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "isolated-ledger.sqlite"
        self.l = Ledger(self.path)

    def tearDown(self):
        self.dir.cleanup()

    def make(self, edition="draft-nbjb-week-one"):
        self.l.create(
            edition_id=edition, title="Educational source-backed newsletter edition",
            source_url="https://notbrokenjustburning.com/story-boundaries.html",
            source_sha256=SHA1, content_sha256=SHA2, actor=OP,
            now="2026-11-23T16:00:00Z"
        )
        return edition

    def queue(self, edition="draft-nbjb-week-one"):
        self.make(edition)
        self.l.review(edition, OP, "2026-11-23T16:10:00Z")
        self.l.approve(edition, OP, REF, "2026-11-23T16:20:00Z")
        self.l.queue(edition, CAMPAIGN, AUDIENCE, "2026-11-23T18:00:00Z",
                     "2026-11-23T20:00:00Z", OP, "2026-11-23T16:30:00Z")
        return edition

    def snap(self, **overrides):
        data = {key: True for key in ledger_mod._FLAGS}
        data.update({
            "provider_evidence_kind":"read_only_snapshot",
            "campaign_ref":CAMPAIGN, "audience_ref":AUDIENCE,
            "checked_at":"2026-11-23T18:59:40Z", "eligible_count":1
        })
        data.update(overrides)
        return data

    def claim(self, edition="draft-nbjb-week-one", **options):
        return self.l.claim_simulated(edition, self.snap(), OP, NOW, **options)

    def test_01_lifecycle_survives_reopen_and_audit_is_append_only(self):
        edition = self.queue()
        self.assertEqual(Ledger(self.path).status(edition)["state"], "queued")
        audit = self.l.audit(edition)
        self.assertEqual([a["event"] for a in audit],
                         ["created","review_requested","approved","queue_simulated"])
        with sqlite3.connect(self.path) as db, self.assertRaises(sqlite3.IntegrityError):
            db.execute("DELETE FROM audit_log WHERE seq=?", (audit[0]["seq"],))

    def test_02_no_approval_without_review(self):
        e = self.make()
        with self.assertRaisesRegex(LedgerHold, "review required"):
            self.l.approve(e, OP, REF, NOW)
        self.assertEqual(self.l.status(e)["state"], "draft")

    def test_03_immutable_edition_hash_even_under_direct_sql(self):
        e = self.make()
        with sqlite3.connect(self.path) as db, self.assertRaises(sqlite3.IntegrityError):
            db.execute("UPDATE editions SET content_sha256=? WHERE id=?", (SHA1,e))
        self.assertEqual(self.l.status(e)["content_sha256"], SHA2)

    def test_04_unique_existing_campaign_binding(self):
        self.queue()
        e = "draft-nbjb-week-two"
        self.make(e)
        self.l.review(e, OP, NOW)
        self.l.approve(e, OP, REF, NOW)
        with self.assertRaises(sqlite3.IntegrityError):
            self.l.queue(e, CAMPAIGN, AUDIENCE, "2026-11-24T18:00:00Z",
                         "2026-11-24T20:00:00Z", OP, NOW)
        self.assertEqual(self.l.status(e)["state"], "approved")

    def test_05_provider_snapshot_requires_exact_campaign_and_audience(self):
        e=self.queue()
        for bad in ({"campaign_ref":"99"},{"audience_ref":"segment:99"},
                    {"provider_evidence_kind":"unverified"}):
            with self.assertRaises(LedgerHold):
                self.l.claim_simulated(e,self.snap(**bad),OP,NOW)
        self.assertEqual(self.l.status(e)["attempt_count"],0)

    def test_06_all_required_marketing_and_queue_preflight_flags_fail_closed(self):
        e=self.queue()
        for key in ledger_mod._FLAGS:
            with self.subTest(key=key), self.assertRaisesRegex(LedgerHold,"consent"):
                self.l.claim_simulated(e,self.snap(**{key:False}),OP,NOW)
        for count in (0,False,-1):
            with self.assertRaises(LedgerHold):
                self.l.claim_simulated(e,self.snap(eligible_count=count),OP,NOW)

    def test_07_stale_future_and_out_of_window_claims_rejected(self):
        e=self.queue()
        for date in ("2026-11-23T18:50:00Z","2026-11-23T19:05:01Z"):
            with self.assertRaisesRegex(LedgerHold,"stale"):
                self.l.claim_simulated(e,self.snap(checked_at=date),OP,NOW)
        with self.assertRaisesRegex(LedgerHold,"outside"):
            self.l.claim_simulated(e,self.snap(),OP,"2026-11-23T20:01:00Z")

    def test_08_atomic_duplicate_claim_fails_even_on_second_connection(self):
        e=self.queue()
        first=self.claim()
        self.assertEqual(first["mode"],"SIMULATION_ONLY")
        with self.assertRaisesRegex(LedgerHold,"not claimable"):
            Ledger(self.path).claim_simulated(e,self.snap(),OP,NOW)
        self.assertEqual(self.l.status(e)["attempt_count"],1)

    def test_09_no_live_dispatch_even_if_flag_supplied(self):
        e=self.queue()
        with self.assertRaisesRegex(LedgerHold,"PRODUCTION RELEASE HOLD"):
            self.claim(release_enabled=True)
        self.assertEqual(self.l.status(e)["state"],"queued")

    def test_10_replay_and_wrong_claim_token_never_succeed(self):
        e=self.queue()
        claim=self.claim()
        with self.assertRaises(LedgerHold):
            self.l.resolve_claim(e, "f"*64,"provider_ack",OP,T,"provider:receipt-1")
        self.l.resolve_claim(e,claim["claim_token"],"provider_ack",OP,T,"provider:receipt-1")
        with self.assertRaises(LedgerHold):
            self.l.resolve_claim(e,claim["claim_token"],"provider_ack",OP,T,"provider:receipt-1")
        self.assertEqual(self.l.status(e)["state"],"sent")

    def test_11_crash_quarantine_disallows_automatic_resend(self):
        e=self.queue()
        self.claim()
        Ledger(self.path).quarantine_interrupted(e,OP,T)
        self.assertEqual(self.l.status(e)["state"],"reconcile_required")
        with self.assertRaises(LedgerHold):
            self.claim()
        with self.assertRaises(LedgerHold):
            self.l.retry_after_confirmed_non_send(e,OP,T)
        self.l.reconcile(e,"confirmed_sent",OP,"2026-11-23T19:02:00Z","provider:receipt-2")
        self.assertEqual(self.l.status(e)["state"],"sent")

    def test_12_known_not_sent_can_be_explicitly_retried_after_new_preflight(self):
        e=self.queue()
        claim=self.claim()
        self.l.resolve_claim(e,claim["claim_token"],"definitely_not_sent",OP,T,"provider:no-send-proof-1")
        self.assertEqual(self.l.status(e)["state"],"failed")
        self.l.retry_after_confirmed_non_send(e,OP,"2026-11-23T19:02:00Z")
        again=self.l.claim_simulated(e,self.snap(checked_at="2026-11-23T19:02:00Z"),OP,
                                     "2026-11-23T19:02:10Z")
        self.assertEqual(again["attempt"],2)
        self.assertEqual(claim["idempotency_sha256"],again["idempotency_sha256"])
        self.assertNotEqual(claim["claim_token"],again["claim_token"])

    def test_13_retry_ceiling_requires_new_approval_workflow(self):
        e=self.queue()
        for i in range(3):
            a=self.l.claim_simulated(e,self.snap(checked_at=f"2026-11-23T19:0{i}:00Z"),OP,
                                     f"2026-11-23T19:0{i}:10Z")
            self.l.resolve_claim(e,a["claim_token"],"definitely_not_sent",OP,
                                 f"2026-11-23T19:0{i}:20Z",f"provider:no-send-proof-{i}")
            if i<2:self.l.retry_after_confirmed_non_send(e,OP,f"2026-11-23T19:0{i}:30Z")
        with self.assertRaisesRegex(LedgerHold,"ceiling"):
            self.l.retry_after_confirmed_non_send(e,OP,"2026-11-23T19:04:00Z")
        self.assertEqual(self.l.status(e)["attempt_count"],3)

    def test_14_cancellation_blocks_dispatch_and_is_audited(self):
        e=self.queue()
        self.l.cancel(e,OP,NOW,"operator:approved-stop")
        with self.assertRaises(LedgerHold):self.claim()
        self.assertEqual(self.l.status(e)["state"],"cancelled")
        self.assertEqual(self.l.audit(e)[-1]["event"],"cancelled_simulated")

    def test_15_cannot_silently_cancel_claim_with_unknown_provider_side_effect(self):
        e=self.queue()
        self.claim()
        with self.assertRaises(LedgerHold):
            self.l.cancel(e,OP,NOW,"operator:stop")
        self.l.quarantine_interrupted(e,OP,T)
        with self.assertRaises(LedgerHold):
            self.l.cancel(e,OP,T,"operator:stop")

    def test_16_suppression_is_terminal(self):
        e=self.queue()
        self.l.suppress(e,OP,NOW,"provider:campaign-suppression")
        with self.assertRaises(LedgerHold):self.claim()
        self.assertEqual(self.l.status(e)["state"],"suppressed")

    def test_17_delivery_not_claimed_before_provider_receipt(self):
        e=self.queue()
        self.claim()
        with self.assertRaises(LedgerHold):
            self.l.delivery_report(e,1,OP,T,"provider:delivered-report")
        self.assertEqual(self.l.status(e)["state"],"inflight")

    def test_18_delivery_success_only_after_aggregate_evidence(self):
        e=self.queue()
        c=self.claim()
        self.l.resolve_claim(e,c["claim_token"],"provider_ack",OP,T,"provider:receipt-3")
        with self.assertRaises(LedgerHold):
            self.l.delivery_report(e,0,OP,T,"provider:delivery-zero")
        self.l.delivery_report(e,1,OP,"2026-11-23T19:03:00Z","provider:delivery-report-3")
        self.assertEqual(self.l.status(e)["state"],"delivered")

    def test_19_identity_data_not_accepted_as_audit_reference(self):
        e=self.make()
        self.l.review(e,OP,NOW)
        with self.assertRaises(LedgerHold):
            self.l.approve(e,OP,"founder@example.com",NOW)
        self.assertEqual(self.l.status(e)["state"],"review")

    def test_20_concurrent_claim_only_one_wins(self):
        e=self.queue()
        results=[]
        lock=threading.Lock()
        def worker():
            try: outcome=Ledger(self.path).claim_simulated(e,self.snap(),OP,NOW)["mode"]
            except Exception as exc: outcome=type(exc).__name__
            with lock:results.append(outcome)
        threads=[threading.Thread(target=worker) for _ in range(4)]
        for t in threads:t.start()
        for t in threads:t.join()
        self.assertEqual(results.count("SIMULATION_ONLY"),1)
        self.assertEqual(results.count("LedgerHold"),3)
        self.assertEqual(self.l.status(e)["attempt_count"],1)

    def test_21_unknown_provider_result_requires_authoritative_confirmation(self):
        e=self.queue()
        c=self.claim()
        self.l.resolve_claim(e,c["claim_token"],"unknown",OP,T,"provider:timeout")
        with self.assertRaises(LedgerHold):
            self.l.reconcile(e,"maybe_sent",OP,T,"provider:unclear")
        self.l.reconcile(e,"confirmed_not_sent",OP,"2026-11-23T19:02:00Z","provider:verified-no-send")
        self.assertEqual(self.l.status(e)["state"],"failed")

    def test_22_no_secrets_or_recipient_rows_in_schema(self):
        with sqlite3.connect(self.path) as db:
            tables=[row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")]
            self.assertNotIn("contacts",tables)
            self.assertNotIn("subscribers",tables)
            columns=[row[1] for row in db.execute("PRAGMA table_info(editions)")]
            for disallowed in ("email","subscriber_id","consent","phone","first_name","token"):
                self.assertNotIn(disallowed,columns)


if __name__ == "__main__":
    unittest.main()
