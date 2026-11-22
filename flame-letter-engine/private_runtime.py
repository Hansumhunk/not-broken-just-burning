"""Phase III private-host operational harness. NOT a web service or email sender.

All ledger and authentication secret access is confined to the same trusted process,
on an owner-only directory. External HTTP must authenticate before ever calling this
class. Tokens are signed capabilities; a public repo cannot provide secrets, staff
identity, MFA, or a production identity provider. No Brevo credentials or sends.
"""
from __future__ import annotations
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import stat
import time
from datetime import datetime, timezone
from publication_ledger import Ledger, LedgerHold, check, dt, _ACTOR, _EVIDENCE

_CAPABILITIES = {
    "viewer": {"inspect"},
    "editor": {"inspect", "review"},
    "approver": {"inspect", "approve"},
    "dispatcher": {"inspect", "queue_simulated", "claim_simulated"},
    "incident_admin": {"inspect", "emergency_stop", "simulation_reset"},
    "data_custodian": {"inspect", "backup", "restore_rehearsal", "prune_backups"},
}
_BACKUP_NAME = re.compile(r"^backup-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{16}\.sqlite$")


class AuthorizationHold(LedgerHold):
    pass


def _b64(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _unb64(value):
    if not isinstance(value, str) or len(value) > 2048:
        raise AuthorizationHold("invalid signed capability")
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


class ServerAuthority:
    def __init__(self, secret):
        if not isinstance(secret, bytes) or len(secret) < 32:
            raise AuthorizationHold("server-only signing key must be at least 32 bytes")
        self.__secret = secret

    def mint_for_trusted_server(self, subject, role, expiry_epoch, *, now_epoch=None):
        """Never expose as a public API endpoint. Real IAM/MFA remains external."""
        check(subject, _ACTOR, "actor")
        if role not in _CAPABILITIES:
            raise AuthorizationHold("unknown role")
        now = int(time.time()) if now_epoch is None else int(now_epoch)
        if not isinstance(expiry_epoch, int) or not now < expiry_epoch <= now + 3600:
            raise AuthorizationHold("capability lifetime must be 1-3600 seconds")
        payload = {"aud":"nbjb-eternal-flame-private","sub":subject,"role":role,
                   "exp":expiry_epoch, "nonce":secrets.token_hex(12)}
        body = _b64(json.dumps(payload,sort_keys=True,separators=(",",":")).encode())
        tag = _b64(hmac.new(self.__secret,body.encode(),hashlib.sha256).digest())
        return body + "." + tag

    def check(self, token, capability, *, now_epoch=None):
        try:
            body, tag = token.split(".", 1)
            expected = _b64(hmac.new(self.__secret,body.encode(),hashlib.sha256).digest())
            if not hmac.compare_digest(expected,tag):
                raise AuthorizationHold("capability signature rejected")
            data = json.loads(_unb64(body).decode("utf-8"))
            now = int(time.time()) if now_epoch is None else int(now_epoch)
            if data.get("aud") != "nbjb-eternal-flame-private":
                raise AuthorizationHold("wrong audience")
            if not isinstance(data.get("exp"),int) or not now < data["exp"] <= now+3600:
                raise AuthorizationHold("capability expired")
            if data.get("role") not in _CAPABILITIES or capability not in _CAPABILITIES[data["role"]]:
                raise AuthorizationHold("least-privilege role refused")
            if not re.fullmatch(r"[a-f0-9]{24}",str(data.get("nonce"))):
                raise AuthorizationHold("missing capability nonce")
            return check(data.get("sub"),_ACTOR,"actor")
        except (AttributeError,ValueError,TypeError,UnicodeDecodeError) as exc:
            if isinstance(exc, AuthorizationHold):
                raise
            raise AuthorizationHold("invalid signed capability") from None


def _secure_dir(path):
    path = Path(path)
    if not path.is_absolute() or path.is_symlink():
        raise AuthorizationHold("absolute non-symlink private directory required")
    path.mkdir(mode=0o700,parents=False,exist_ok=True)
    info=path.stat()
    if not stat.S_ISDIR(info.st_mode) or (stat.S_IMODE(info.st_mode) & 0o077):
        raise AuthorizationHold("private directory must be owner-only mode 0700")
    if hasattr(os,"getuid") and info.st_uid != os.getuid():
        raise AuthorizationHold("private directory owner mismatch")
    return path


def _private_file(path):
    if path.is_symlink():
        raise AuthorizationHold("symlink target rejected")
    if path.exists():
        s=path.stat()
        if not stat.S_ISREG(s.st_mode) or (stat.S_IMODE(s.st_mode) & 0o077):
            raise AuthorizationHold("private file must have owner-only permissions")
        if hasattr(os,"getuid") and s.st_uid != os.getuid():
            raise AuthorizationHold("private file owner mismatch")


class PrivateRuntime:
    """Private local harness with startup halt; production dispatch has NO implementation."""

    def __init__(self, root, authority):
        if not isinstance(authority,ServerAuthority):
            raise AuthorizationHold("signed server authority required")
        self.root = _secure_dir(root)
        self.backups = self.root / "backups"
        self.restores = self.root / "restore-rehearsals"
        _secure_dir(self.backups)
        _secure_dir(self.restores)
        self.authority=authority
        db_path=self.root / "flame-ledger.sqlite"
        _private_file(db_path)
        # SQLite may create -wal/-shm; these also require a locked private directory.
        self.ledger=Ledger(db_path)
        os.chmod(db_path,0o600)
        with self.ledger._tx() as db:
            db.execute("UPDATE runtime_control SET halted=1,reason_ref='startup_fail_closed' WHERE singleton=1")
            db.execute("INSERT INTO operations_audit(event,actor_ref,at_utc,evidence_ref) VALUES(?,?,?,?)",
                       ("startup_halt","system:startup",self._utc_now(),"system:startup"))

    @staticmethod
    def _utc_now():
        return datetime.now(timezone.utc).isoformat().replace("+00:00","Z")

    def _actor(self,token,capability,now_epoch=None):
        return self.authority.check(token,capability,now_epoch=now_epoch)

    def _record(self,db,event,actor,at,evidence):
        db.execute("INSERT INTO operations_audit(event,actor_ref,at_utc,evidence_ref) VALUES(?,?,?,?)",
                   (event,actor,at,evidence))

    def inspect(self,token,*,now_epoch=None):
        self._actor(token,"inspect",now_epoch)
        with self.ledger._db() as db:
            stop=db.execute("SELECT halted,changed_at,reason_ref FROM runtime_control WHERE singleton=1").fetchone()
            rows=db.execute("SELECT state,count(*) AS n FROM editions GROUP BY state").fetchall()
            return {"mode":"DEVELOPMENT_SIMULATION_ONLY","halted":bool(stop["halted"]),
                    "reason_ref":stop["reason_ref"],"states":{r["state"]:r["n"] for r in rows},
                    "provider_adapter":"NOT_CONNECTED","live_sender_available":False}

    def reset_simulation_only(self,token,reason,now,*,now_epoch=None):
        actor=self._actor(token,"simulation_reset",now_epoch)
        check(reason,_EVIDENCE,"reason")
        dt(now)
        with self.ledger._tx() as db:
            # Reset only the local simulated claim gate. A live send adapter does not exist.
            db.execute("UPDATE runtime_control SET halted=0,changed_at=?,reason_ref=? WHERE singleton=1",
                       (now,reason))
            self._record(db,"resume_offline_simulation",actor,now,reason)

    def emergency_stop(self,token,reason,now,*,now_epoch=None):
        actor=self._actor(token,"emergency_stop",now_epoch)
        check(reason,_EVIDENCE,"reason")
        dt(now)
        with self.ledger._tx() as db:
            db.execute("UPDATE runtime_control SET halted=1,changed_at=?,reason_ref=? WHERE singleton=1",
                       (now,reason))
            # A local stop cannot cancel an independently scheduled Brevo campaign.
            # Ambiguous in-flight operations are QUARANTINED, never marked unsent.
            inflight=db.execute("SELECT id,attempt_count FROM editions WHERE state='inflight'").fetchall()
            for r in inflight:
                db.execute("UPDATE editions SET state='reconcile_required',updated_at=? WHERE id=?", (now,r["id"]))
                db.execute("UPDATE delivery_claims SET claim_state='unknown',ended_at=? "
                           "WHERE edition_id=? AND attempt_no=? AND claim_state='inflight'",
                           (now,r["id"],r["attempt_count"]))
                self.ledger._audit(db,r["id"],"emergency_quarantine",actor,
                                   "inflight","reconcile_required",now,reason)
            self._record(db,"EMERGENCY_STOP_LOCAL",actor,now,reason)
        return {"local_queue_claims_stopped":True,"quarantined_inflight":len(inflight),
                "provider_pending_queue_cancelled":False,"provider_verification_required":True}

    def review(self,token,edition_id,now,*,now_epoch=None):
        actor=self._actor(token,"review",now_epoch)
        self.ledger.review(edition_id,actor,now)

    def approve(self,token,edition_id,evidence,now,*,now_epoch=None):
        actor=self._actor(token,"approve",now_epoch)
        self.ledger.approve(edition_id,actor,evidence,now)

    def queue_simulated(self,token,edition_id,campaign,audience,start,end,now,*,now_epoch=None):
        actor=self._actor(token,"queue_simulated",now_epoch)
        with self.ledger._db() as db:
            stop=db.execute("SELECT halted FROM runtime_control WHERE singleton=1").fetchone()
            if not stop or stop["halted"]:
                raise LedgerHold("emergency stop engaged")
        self.ledger.queue(edition_id,campaign,audience,start,end,actor,now)

    def claim_simulated(self,token,edition_id,provider_snapshot,now,*,now_epoch=None):
        actor=self._actor(token,"claim_simulated",now_epoch)
        # Snapshot MUST be supplied by a controlled synthetic/read-only boundary.
        # The underlying ledger's same-transaction stop check closes stop/claim races.
        return self.ledger.claim_simulated(edition_id,provider_snapshot,actor,now)

    def backup(self,token,now,*,now_epoch=None):
        actor=self._actor(token,"backup",now_epoch)
        instant=dt(now)
        name=instant.strftime("backup-%Y%m%dT%H%M%SZ-")+secrets.token_hex(8)+".sqlite"
        target=self.backups/name
        with self.ledger._db() as source:
            dest=sqlite3.connect(str(target))
            try:
                source.backup(dest,pages=100)
            finally:
                dest.close()
        os.chmod(target,0o600)
        digest=hashlib.sha256(target.read_bytes()).hexdigest()
        sidecar=self.backups/(name+".sha256")
        with os.fdopen(os.open(sidecar,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600),"w") as f:
            f.write(digest+"\n")
        with self.ledger._tx() as db:
            self._record(db,"backup_created",actor,now,"backup:"+digest)
        return {"backup_name":name,"sha256":digest,"scope":"owner_only_local_copy",
                "includes_subscriber_data":False}

    def restore_rehearsal(self,token,backup_name,expected_sha,now,*,now_epoch=None):
        actor=self._actor(token,"restore_rehearsal",now_epoch)
        dt(now)
        if not isinstance(backup_name,str) or not _BACKUP_NAME.fullmatch(backup_name):
            raise LedgerHold("invalid backup identifier")
        if not re.fullmatch(r"[a-f0-9]{64}",str(expected_sha)):
            raise LedgerHold("invalid backup digest")
        with self.ledger._db() as db:
            stop=db.execute("SELECT halted FROM runtime_control WHERE singleton=1").fetchone()
            if not stop or not stop["halted"]:
                raise LedgerHold("halt local claims before restore rehearsal")
        source=self.backups/backup_name
        sidecar=self.backups/(backup_name+".sha256")
        _private_file(source);_private_file(sidecar)
        if not source.is_file() or not sidecar.is_file():
            raise LedgerHold("backup and checksum must exist")
        actual=hashlib.sha256(source.read_bytes()).hexdigest()
        if not hmac.compare_digest(actual,expected_sha) or sidecar.read_text().strip()!=expected_sha:
            raise LedgerHold("backup integrity verification failed")
        dest=self.restores/(backup_name.replace("backup-","rehearsal-"))
        if dest.exists() or dest.is_symlink():
            raise LedgerHold("restore rehearsal must never overwrite a database")
        # sqlite connection opens a fresh copy; source is never overwritten.
        source_conn=sqlite3.connect(str(source))
        dest_conn=sqlite3.connect(str(dest))
        try:
            source_conn.backup(dest_conn)
            if dest_conn.execute("PRAGMA integrity_check").fetchone()[0]!="ok":
                raise LedgerHold("restored database integrity failure")
            if dest_conn.execute("PRAGMA foreign_key_check").fetchall():
                raise LedgerHold("restored database foreign key failure")
            dest_conn.execute("UPDATE runtime_control SET halted=1,reason_ref='restore_rehearsal_held' WHERE singleton=1")
            dest_conn.commit()
        except BaseException:
            dest_conn.close();source_conn.close()
            if dest.exists():dest.unlink()
            raise
        finally:
            try:dest_conn.close();source_conn.close()
            except Exception:pass
        os.chmod(dest,0o600)
        with self.ledger._tx() as db:
            self._record(db,"restore_rehearsal_verified",actor,now,"backup:"+actual)
        return {"rehearsal_name":dest.name,"integrity":"ok","halted":True,
                "live_database_replaced":False}

    def prune_backups(self,token,now,minimum_age_days=90,*,now_epoch=None):
        actor=self._actor(token,"prune_backups",now_epoch)
        dt(now)
        if type(minimum_age_days) is not int or not 90<=minimum_age_days<=3650:
            raise LedgerHold("minimum retention must be at least 90 days")
        with self.ledger._db() as db:
            stop=db.execute("SELECT halted FROM runtime_control WHERE singleton=1").fetchone()
            if not stop or not stop["halted"]:
                raise LedgerHold("halt required before backup retention cleanup")
        # Backup files only. NEVER purge audit, approvals or suppression records.
        cutoff=dt(now).timestamp()-minimum_age_days*86400
        removed=0
        for p in self.backups.iterdir():
            if not _BACKUP_NAME.fullmatch(p.name) or p.is_symlink() or not p.is_file():
                continue
            sidecar=self.backups/(p.name+".sha256")
            if sidecar.is_symlink() or not sidecar.is_file():
                continue
            if max(p.stat().st_mtime,sidecar.stat().st_mtime)>=cutoff:
                continue
            _private_file(p);_private_file(sidecar)
            if not hmac.compare_digest(hashlib.sha256(p.read_bytes()).hexdigest(),
                                       sidecar.read_text().strip()):
                raise LedgerHold("tampered backup requires manual incident review")
            p.unlink();sidecar.unlink();removed+=1
        with self.ledger._tx() as db:
            self._record(db,"backup_retention_cleanup",actor,now,"retention:90_day_minimum")
        return {"backup_copies_deleted":removed,"audit_rows_deleted":0,
                "subscriber_rows_deleted":0,"live_database_modified":False}
