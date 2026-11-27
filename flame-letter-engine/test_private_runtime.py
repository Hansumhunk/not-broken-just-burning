"""Private-host role, kill-switch and backup/recovery tests. All inputs synthetic."""
import importlib.util
import os
from pathlib import Path
import sqlite3
import tempfile
import time
import unittest

HERE=Path(__file__).resolve().parent
def load(name):
    spec=importlib.util.spec_from_file_location(name,HERE/(name+".py"))
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

from private_runtime import PrivateRuntime,ServerAuthority,AuthorizationHold
from publication_ledger import LedgerHold,_FLAGS

UTC="2026-11-23T19:00:00Z"
EXP=1795470000    # fixed synthetic epoch well after Nov 2026 example time below
EPOCH=1795464000
SHA="a"*64
TITLE="An educational original edition ready for review"
ED="reviewable-edition-one"
CAMPAIGN="6"
SEGMENT="segment:4"
START="2026-11-23T18:00:00Z"
END="2026-11-23T20:00:00Z"

class OperationalHarnessTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.root=Path(self.tmp.name)/"server-private"
        self.auth=ServerAuthority(b"dev-only-32-byte-signing-test-key-xxxxxx")
        self.rt=PrivateRuntime(self.root,self.auth)
        self.tokens={role:self.auth.mint_for_trusted_server(
            "operator:"+role,role,EPOCH+3000,now_epoch=EPOCH)
            for role in ("viewer","editor","approver","campaign_approver",
                         "dispatcher","incident_admin","data_custodian")}

    def tearDown(self):
        self.tmp.cleanup()

    def op(self,role):return self.tokens[role]
    def reset(self):
        self.rt.reset_simulation_only(self.op("incident_admin"),"review:synthetic_reset",
                                      "2026-11-23T17:00:00Z",now_epoch=EPOCH)

    def new_edition(self):
        self.rt.ledger.create(edition_id=ED,title=TITLE,
            source_url="https://notbrokenjustburning.com/story-boundaries.html",
            source_sha256=SHA,content_sha256="b"*64,
            actor="operator:editor",now="2026-11-23T15:00:00Z")
        return ED

    def ready(self):
        e=self.new_edition()
        self.rt.review(self.op("editor"),e,"2026-11-23T15:10:00Z",now_epoch=EPOCH)
        self.rt.approve(self.op("approver"),e,"review:editorial-accepted",
                        "2026-11-23T15:20:00Z",now_epoch=EPOCH)
        self.rt.authorize_campaign_simulation(self.op("campaign_approver"),e,
            CAMPAIGN,SEGMENT,START,END,"campaign:founder-test-approval",
            "2026-11-23T15:30:00Z",now_epoch=EPOCH)
        self.reset()
        self.rt.queue_simulated(self.op("dispatcher"),e,CAMPAIGN,SEGMENT,START,END,
                                "2026-11-23T17:01:00Z",now_epoch=EPOCH)
        return e

    def snapshot(self):
        snap={k:True for k in _FLAGS}
        snap.update({"provider_evidence_kind":"read_only_snapshot","campaign_ref":CAMPAIGN,
                     "audience_ref":SEGMENT,"checked_at":"2026-11-23T18:59:45Z",
                     "eligible_count":1})
        return snap

    def test_01_boot_halted_and_private_files(self):
        x=self.rt.inspect(self.op("viewer"),now_epoch=EPOCH)
        self.assertTrue(x["halted"])
        self.assertFalse(x["live_sender_available"])
        self.assertEqual(self.root.stat().st_mode&0o777,0o700)
        self.assertEqual((self.root/"flame-ledger.sqlite").stat().st_mode&0o777,0o600)

    def test_02_rejects_world_readable_root(self):
        tmp=Path(self.tmp.name)/"bad"
        tmp.mkdir(mode=0o700);os.chmod(tmp,0o755)
        with self.assertRaises(AuthorizationHold):
            PrivateRuntime(tmp,self.auth)

    def test_03_requires_signed_scoped_token(self):
        with self.assertRaises(AuthorizationHold):
            self.rt.inspect("viewer",now_epoch=EPOCH)
        valid=self.op("viewer")
        with self.assertRaises(AuthorizationHold):
            self.rt.inspect(valid[:-1]+("A" if valid[-1]!="A" else "B"),now_epoch=EPOCH)
        with self.assertRaises(AuthorizationHold):
            self.rt.inspect(valid,now_epoch=EPOCH+4000)

    def test_04_non_admin_cannot_resume_or_stop(self):
        with self.assertRaises(AuthorizationHold):
            self.rt.reset_simulation_only(self.op("viewer"),"review:try",UTC,now_epoch=EPOCH)
        with self.assertRaises(AuthorizationHold):
            self.rt.emergency_stop(self.op("dispatcher"),"review:try",UTC,now_epoch=EPOCH)

    def test_05_editor_and_approver_are_distinct_permissions(self):
        e=self.new_edition()
        with self.assertRaises(AuthorizationHold):
            self.rt.review(self.op("approver"),e,UTC,now_epoch=EPOCH)
        self.rt.review(self.op("editor"),e,UTC,now_epoch=EPOCH)
        with self.assertRaises(AuthorizationHold):
            self.rt.approve(self.op("editor"),e,"review:ok",UTC,now_epoch=EPOCH)
        self.rt.approve(self.op("approver"),e,"review:ok",UTC,now_epoch=EPOCH)

    def test_06_cannot_queue_without_a_separate_campaign_approval(self):
        e=self.new_edition()
        self.rt.review(self.op("editor"),e,UTC,now_epoch=EPOCH)
        self.rt.approve(self.op("approver"),e,"review:ok",UTC,now_epoch=EPOCH)
        self.reset()
        with self.assertRaisesRegex(LedgerHold,"separate immutable"):
            self.rt.queue_simulated(self.op("dispatcher"),e,CAMPAIGN,SEGMENT,START,END,
                                    UTC,now_epoch=EPOCH)

    def test_07_unauthorized_campaign_binding_change_rejected(self):
        self.ready()
        with self.assertRaisesRegex(LedgerHold,"only a draft can enter review"):
            self.rt.review(self.op("editor"),ED,UTC,now_epoch=EPOCH)
        with sqlite3.connect(self.rt.ledger.db_file) as db,self.assertRaises(sqlite3.IntegrityError):
            db.execute("UPDATE dispatch_authorizations SET audience_ref='segment:99' WHERE edition_id=?",(ED,))

    def test_08_halt_blocks_queue_and_claim(self):
        self.ready()
        self.rt.emergency_stop(self.op("incident_admin"),"incident:emergency",UTC,now_epoch=EPOCH)
        with self.assertRaisesRegex(LedgerHold,"emergency stop"):
            self.rt.claim_simulated(self.op("dispatcher"),ED,self.snapshot(),UTC,now_epoch=EPOCH)
        self.assertTrue(self.rt.inspect(self.op("viewer"),now_epoch=EPOCH)["halted"])

    def test_09_inflight_claim_becomes_ambiguous_not_cancelled(self):
        self.ready()
        c=self.rt.claim_simulated(self.op("dispatcher"),ED,self.snapshot(),UTC,now_epoch=EPOCH)
        self.assertEqual(c["mode"],"SIMULATION_ONLY")
        stop=self.rt.emergency_stop(self.op("incident_admin"),"incident:quarantine",UTC,now_epoch=EPOCH)
        self.assertEqual(stop["quarantined_inflight"],1)
        self.assertFalse(stop["provider_pending_queue_cancelled"])
        self.assertEqual(self.rt.ledger.status(ED)["state"],"reconcile_required")

    def test_10_restart_always_uses_fail_closed_startup_halt(self):
        self.reset()
        self.assertFalse(self.rt.inspect(self.op("viewer"),now_epoch=EPOCH)["halted"])
        reopened=PrivateRuntime(self.root,self.auth)
        self.assertTrue(reopened.inspect(self.op("viewer"),now_epoch=EPOCH)["halted"])

    def test_11_concurrency_stop_and_claim_serialized(self):
        self.ready()
        self.rt.emergency_stop(self.op("incident_admin"),"incident:race_guard",UTC,now_epoch=EPOCH)
        with self.assertRaisesRegex(LedgerHold,"emergency stop"):
            self.rt.ledger.claim_simulated(ED,self.snapshot(),"operator:dispatcher",UTC)

    def test_12_backup_has_integrity_hash_and_no_provider_side_effect(self):
        self.new_edition()
        result=self.rt.backup(self.op("data_custodian"),UTC,now_epoch=EPOCH)
        self.assertRegex(result["sha256"],"^[a-f0-9]{64}$")
        self.assertEqual(len(list(self.rt.backups.glob("*.sqlite"))),1)
        self.assertEqual((self.rt.backups/result["backup_name"]).stat().st_mode&0o777,0o600)
        self.assertFalse(hasattr(self.rt,"send"))

    def test_13_verified_restore_is_new_halted_copy_only(self):
        e=self.new_edition()
        bk=self.rt.backup(self.op("data_custodian"),UTC,now_epoch=EPOCH)
        result=self.rt.restore_rehearsal(self.op("data_custodian"),bk["backup_name"],bk["sha256"],UTC,now_epoch=EPOCH)
        self.assertTrue(result["halted"])
        self.assertFalse(result["live_database_replaced"])
        self.assertEqual(self.rt.ledger.status(e)["state"],"draft")
        with sqlite3.connect(self.rt.restores/result["rehearsal_name"]) as db:
            self.assertEqual(db.execute("SELECT halted FROM runtime_control").fetchone()[0],1)
            self.assertEqual(db.execute("PRAGMA integrity_check").fetchone()[0],"ok")

    def test_14_tampered_backup_is_refused(self):
        bk=self.rt.backup(self.op("data_custodian"),UTC,now_epoch=EPOCH)
        with (self.rt.backups/bk["backup_name"]).open("ab") as f:f.write(b"attack")
        with self.assertRaisesRegex(LedgerHold,"integrity verification"):
            self.rt.restore_rehearsal(self.op("data_custodian"),bk["backup_name"],bk["sha256"],UTC,now_epoch=EPOCH)

    def test_15_restore_rejects_active_simulation_and_overwrite(self):
        bk=self.rt.backup(self.op("data_custodian"),UTC,now_epoch=EPOCH)
        self.reset()
        with self.assertRaisesRegex(LedgerHold,"halt"):
            self.rt.restore_rehearsal(self.op("data_custodian"),bk["backup_name"],bk["sha256"],UTC,now_epoch=EPOCH)
        self.rt.emergency_stop(self.op("incident_admin"),"incident:halt",UTC,now_epoch=EPOCH)
        self.rt.restore_rehearsal(self.op("data_custodian"),bk["backup_name"],bk["sha256"],UTC,now_epoch=EPOCH)
        with self.assertRaisesRegex(LedgerHold,"must never overwrite"):
            self.rt.restore_rehearsal(self.op("data_custodian"),bk["backup_name"],bk["sha256"],UTC,now_epoch=EPOCH)

    def test_16_strict_backup_filename_denies_path_traversal(self):
        with self.assertRaisesRegex(LedgerHold,"invalid backup identifier"):
            self.rt.restore_rehearsal(self.op("data_custodian"),"../../outside.sqlite",SHA,UTC,now_epoch=EPOCH)

    def test_17_rejects_cleanup_before_minimum_retention(self):
        with self.assertRaisesRegex(LedgerHold,"at least 90"):
            self.rt.prune_backups(self.op("data_custodian"),UTC,30,now_epoch=EPOCH)

    def test_18_cleanup_only_old_verified_backup_copies(self):
        bk=self.rt.backup(self.op("data_custodian"),UTC,now_epoch=EPOCH)
        path=self.rt.backups/bk["backup_name"]
        checksum=self.rt.backups/(bk["backup_name"]+".sha256")
        old=1770000000
        os.utime(path,(old,old));os.utime(checksum,(old,old))
        r=self.rt.prune_backups(self.op("data_custodian"),"2027-06-01T19:00:00Z",90,now_epoch=EPOCH)
        self.assertEqual(r["backup_copies_deleted"],1)
        self.assertFalse(path.exists())
        self.assertEqual(r["audit_rows_deleted"],0)

    def test_19_audit_append_only_and_secret_never_persisted(self):
        self.reset()
        with sqlite3.connect(self.rt.ledger.db_file) as db:
            row=db.execute("SELECT seq FROM operations_audit LIMIT 1").fetchone()
            with self.assertRaises(sqlite3.IntegrityError):
                db.execute("DELETE FROM operations_audit WHERE seq=?",(row[0],))
        content=(self.rt.ledger.db_file and Path(self.rt.ledger.db_file).read_bytes())
        self.assertNotIn(b"dev-only-32-byte-signing-test-key",content)

    def test_20_no_sender_or_api_or_public_http_handler(self):
        for name in ("send","post","publish","schedule_live","create_web_server","connect_brevo"):
            self.assertFalse(hasattr(self.rt,name))
        self.assertTrue(self.rt.inspect(self.op("viewer"),now_epoch=EPOCH)["halted"])

if __name__=="__main__":
    unittest.main()
