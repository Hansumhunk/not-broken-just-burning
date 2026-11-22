"""Phase III local-only SQLite / HMAC prototype; SYNTHETIC fixtures only.

This is an extension of the new Phase II reference policy, NOT the unrecovered
Phase I SQLite artifact. No production encryption, credentials, deployment,
remote identity provider, public export or external send is provided.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import shutil
import sqlite3
import stat
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .policy import AccessDenied, Actor, Approval, Source, authorize, _inside_git_tree

DB_NAME = "synthetic_vault.sqlite3"
KINDS = {"lesson", "workbook", "flame_letter", "short_video", "course_module"}
HANDOFF = {"education_handoff": "educational_platform", "newsletter_handoff": "eternal_flame",
           "commerce_handoff": "revenue_forge", "social_handoff": "content_social"}
MAX_BYTES = 1_000_000


def canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False).encode()


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _unb64(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def _key(key: bytes) -> bytes:
    if not isinstance(key, bytes) or len(key) < 32:
        raise ValueError("key must be independently supplied >=32-byte secret")
    return key


def mint_test_token(kind: str, claims: dict[str, Any], key: bytes) -> str:
    """Offline synthetic issuer only. A future service MUST keep signing keys outside the Vault."""
    if kind not in {"identity", "approval"}:
        raise ValueError("bad token kind")
    body = canonical({"v": 1, "kind": kind, "claims": claims})
    return _b64(body) + "." + _b64(hmac.new(_key(key), body, hashlib.sha256).digest())


def verify_token(token: str, kind: str, key: bytes, now: int | None = None) -> dict[str, Any]:
    try:
        if not isinstance(token, str) or len(token) > 8192 or token.count(".") != 1:
            raise ValueError("token format")
        a, b = token.split(".")
        raw, mac = _unb64(a), _unb64(b)
        if not hmac.compare_digest(hmac.new(_key(key), raw, hashlib.sha256).digest(), mac):
            raise ValueError("signature")
        obj = json.loads(raw)
        if obj.keys() != {"v", "kind", "claims"} or obj["v"] != 1 or obj["kind"] != kind:
            raise ValueError("token header")
        claims = obj["claims"]
        if not isinstance(claims, dict) or not isinstance(claims.get("exp"), int):
            raise ValueError("token claims")
        t = int(datetime.now(timezone.utc).timestamp()) if now is None else now
        if claims["exp"] <= t:
            raise ValueError("expired")
        return claims
    except (ValueError, KeyError, TypeError, json.JSONDecodeError, base64.binascii.Error) as exc:
        raise AccessDenied("invalid, forged or expired token") from exc


def _safe_root(path: Path, *, create: bool) -> Path:
    if not isinstance(path, Path):
        path = Path(path)
    if not path.is_absolute() or path.is_symlink() or (path.exists() and not path.is_dir()):
        raise AccessDenied("invalid private root")
    if _inside_git_tree(path.resolve()):
        raise AccessDenied("private vault cannot live within a Git tree")
    # Reject all symlinks below the resolved existing parent, preventing aliasing to Git trees.
    if create:
        path.mkdir(parents=True, exist_ok=True, mode=0o700)
    if not path.is_dir() or path.is_symlink():
        raise AccessDenied("private root missing")
    if (path.stat().st_mode & 0o077) != 0:
        raise AccessDenied("private directory permissions too broad")
    return path


def _private_file(path: Path) -> None:
    if path.is_symlink():
        raise AccessDenied("symlinked protected file")
    if path.exists():
        if not path.is_file() or (path.stat().st_mode & 0o077):
            raise AccessDenied("unprotected file")
    else:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        os.close(fd)


def _write_file(path: Path, content: bytes, *, exclusive: bool = True) -> None:
    flags = os.O_WRONLY | os.O_CREAT | os.O_NOFOLLOW | (os.O_EXCL if exclusive else os.O_TRUNC)
    fd = os.open(path, flags, 0o600)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())
    except BaseException:
        raise


def _fsync_dir(path: Path) -> None:
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


class DurableVault:
    """Non-production store; in-memory key verifier; SQLite bytes never enter Git/CI artifacts."""

    def __init__(self, root: Path, *, identity_key: bytes, owner_key: bytes, backup_key: bytes,
                 create: bool = True):
        self.identity_key = _key(identity_key)
        self.owner_key = _key(owner_key)
        self.backup_key = _key(backup_key)
        self.root = _safe_root(Path(root), create=create)
        self.path = self.root / DB_NAME
        if not create and not self.path.exists():
            raise AccessDenied("existing database required")
        _private_file(self.path)
        self.db = sqlite3.connect(self.path, isolation_level=None, timeout=10)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.execute("PRAGMA busy_timeout=5000")
        if create:
            self._initialize()
        elif not self.db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sources'").fetchone():
            raise AccessDenied("unknown or empty database")
        # No automatic migrations. Verification on open is important for restored state.
        if not self.verify_integrity():
            raise AccessDenied("vault integrity failure")
        self._recover_incomplete_exports()

    def close(self) -> None:
        self.db.close()

    def __enter__(self) -> DurableVault:
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()

    def _initialize(self) -> None:
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS sources (
           source_id TEXT PRIMARY KEY, account_id TEXT NOT NULL, owner_id TEXT NOT NULL,
           classification TEXT NOT NULL, rights TEXT NOT NULL, evidence_ref TEXT NOT NULL,
           rights_verified INTEGER NOT NULL, license_purposes TEXT NOT NULL,
           license_kinds TEXT NOT NULL, attribution_ref TEXT NOT NULL,
           attribution_required INTEGER NOT NULL, revoked_at TEXT,
           created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS source_versions (
           source_id TEXT NOT NULL REFERENCES sources(source_id), version INTEGER NOT NULL,
           account_id TEXT NOT NULL, sha256 TEXT NOT NULL, data BLOB NOT NULL,
           created_at TEXT NOT NULL, PRIMARY KEY(source_id,version), UNIQUE(account_id,sha256));
        CREATE TABLE IF NOT EXISTS approvals (
           approval_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, source_version INTEGER NOT NULL,
           account_id TEXT NOT NULL, actor_id TEXT NOT NULL, owner_id TEXT NOT NULL,
           purpose TEXT NOT NULL, token TEXT NOT NULL, revoked_at TEXT, consumed_at TEXT,
           created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS concepts (
           concept_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, source_version INTEGER NOT NULL,
           source_sha256 TEXT NOT NULL, approval_id TEXT NOT NULL,
           status TEXT NOT NULL CHECK(status='candidate_review_only'), created_at TEXT NOT NULL,
           FOREIGN KEY(source_id,source_version) REFERENCES source_versions(source_id,version));
        CREATE TABLE IF NOT EXISTS derivative_versions (
           derivative_id TEXT NOT NULL, version INTEGER NOT NULL, concept_id TEXT NOT NULL REFERENCES concepts(concept_id),
           source_id TEXT NOT NULL, source_version INTEGER NOT NULL, kind TEXT NOT NULL,
           sha256 TEXT NOT NULL, data BLOB NOT NULL, contributions TEXT NOT NULL,
           approval_id TEXT NOT NULL, status TEXT NOT NULL CHECK(status='candidate_review_only'),
           created_at TEXT NOT NULL, PRIMARY KEY(derivative_id,version),
           FOREIGN KEY(source_id,source_version) REFERENCES source_versions(source_id,version));
        CREATE TABLE IF NOT EXISTS local_exports (
           export_id TEXT PRIMARY KEY, derivative_id TEXT NOT NULL, derivative_version INTEGER NOT NULL,
           approval_id TEXT NOT NULL, filename TEXT NOT NULL UNIQUE, sha256 TEXT NOT NULL,
           state TEXT NOT NULL CHECK(state IN ('pending','complete','aborted')),
           created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS audit (
           seq INTEGER PRIMARY KEY AUTOINCREMENT, time TEXT NOT NULL, actor TEXT NOT NULL,
           operation TEXT NOT NULL, target_id TEXT NOT NULL, body_hash TEXT NOT NULL,
           previous_hash TEXT NOT NULL, event_hash TEXT NOT NULL);
        CREATE TRIGGER IF NOT EXISTS protect_source_original_update BEFORE UPDATE ON source_versions BEGIN SELECT RAISE(ABORT,'immutable original version'); END;
        CREATE TRIGGER IF NOT EXISTS protect_source_original_delete BEFORE DELETE ON source_versions BEGIN SELECT RAISE(ABORT,'immutable original version'); END;
        CREATE TRIGGER IF NOT EXISTS protect_derivative_update BEFORE UPDATE ON derivative_versions BEGIN SELECT RAISE(ABORT,'immutable derivative version'); END;
        CREATE TRIGGER IF NOT EXISTS protect_derivative_delete BEFORE DELETE ON derivative_versions BEGIN SELECT RAISE(ABORT,'immutable derivative version'); END;
        """)

    @contextmanager
    def _tx(self):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            yield self.db
            self.db.commit()
        except BaseException:
            self.db.rollback()
            raise

    @staticmethod
    def _time() -> str:
        return datetime.now(timezone.utc).isoformat()

    def _audit(self, db: sqlite3.Connection, actor: str, event: str, target_id: str, body: Any) -> None:
        prev = db.execute("SELECT event_hash FROM audit ORDER BY seq DESC LIMIT 1").fetchone()
        previous = prev[0] if prev else "0" * 64
        bh = digest(canonical(body))
        seq = db.execute("SELECT COALESCE(MAX(seq),0)+1 FROM audit").fetchone()[0]
        at = self._time()
        data = {"seq":seq,"time":at,"actor":actor,"operation":event,"target_id":target_id,
                "body_hash":bh,"previous_hash":previous}
        event_hash = digest(canonical(data))
        db.execute("INSERT INTO audit(seq,time,actor,operation,target_id,body_hash,previous_hash,event_hash) VALUES(?,?,?,?,?,?,?,?)",
                   (seq,at,actor,event,target_id,bh,previous,event_hash))

    def _identity(self, token: str) -> dict[str, Any]:
        claims = verify_token(token, "identity", self.identity_key)
        if set(claims) != {"sub","account_id","role","jti","exp"} or not all(
                isinstance(claims[x], str) and claims[x] for x in ("sub","account_id","role","jti")):
            raise AccessDenied("invalid identity claims")
        return claims

    def record_approval(self, token: str) -> str:
        claims = verify_token(token, "approval", self.owner_key)
        expected = {"approval_id","source_id","source_version","source_sha256","actor_id", "account_id",
                    "owner_id","purpose","scope","rights_evidence_ref","exp"}
        if set(claims) != expected or not isinstance(claims["scope"], dict) or not all(
                isinstance(claims[x], str) and claims[x] for x in
                ("approval_id","source_id","source_sha256","actor_id","account_id","owner_id","purpose","rights_evidence_ref")):
            raise AccessDenied("incomplete approval claims")
        if not isinstance(claims["source_version"],int) or claims["source_version"] < 1:
            raise AccessDenied("bad source version")
        if len(claims["source_sha256"]) != 64 or any(x not in "0123456789abcdef" for x in claims["source_sha256"]):
            raise AccessDenied("bad source hash")
        with self._tx() as db:
            db.execute("INSERT INTO approvals VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                      (claims["approval_id"],claims["source_id"],claims["source_version"],claims["account_id"],
                       claims["actor_id"],claims["owner_id"],claims["purpose"],token,None,None,self._time()))
            self._audit(db,claims["owner_id"],"approval_recorded",claims["approval_id"],
                        {"source_id":claims["source_id"],"purpose":claims["purpose"],"version":claims["source_version"]})
        return claims["approval_id"]

    def _check_and_consume(self, db: sqlite3.Connection, session: str, approval_id: str, source: Source,
                           owner_id: str, purpose: str, *, derivative_kind: str | None = None,
                           department: str | None = None, destination: str | None = None) -> dict[str, Any]:
        claims = self._identity(session)
        row = db.execute("SELECT * FROM approvals WHERE approval_id=?",(approval_id,)).fetchone()
        if not row or row["revoked_at"] or row["consumed_at"]:
            raise AccessDenied("approval absent, revoked or replayed")
        p = verify_token(row["token"], "approval", self.owner_key)
        scope = {k:v for k,v in {"derivative_kind":derivative_kind,"department":department,"destination":destination}.items() if v is not None}
        if (p["approval_id"] != approval_id or p["source_id"] != source.source_id or
            p["source_version"] != source.version or p["source_sha256"] != source.sha256_hex or
            p["actor_id"] != claims["sub"] or p["account_id"] != claims["account_id"] or
            p["owner_id"] != owner_id or p["purpose"] != purpose or p["scope"] != scope or
            p["rights_evidence_ref"] != source.rights_evidence_ref):
            raise AccessDenied("wrong scope, source version, owner, actor or account")
        actor = Actor(claims["sub"],claims["role"],claims["account_id"], True)
        approval = Approval(approval_id,source.source_id,source.account_id,actor.actor_id,purpose,True,
                            source.rights_evidence_ref,
                            datetime.fromtimestamp(p["exp"],timezone.utc),
                            derivative_kind=derivative_kind,department=department,destination=destination)
        authorize(actor,source,approval,purpose,derivative_kind=derivative_kind,department=department,destination=destination)
        db.execute("UPDATE approvals SET consumed_at=? WHERE approval_id=? AND consumed_at IS NULL", (self._time(),approval_id))
        return claims

    @staticmethod
    def _validate_data(data: bytes) -> str:
        if not isinstance(data,bytes) or not data or len(data)>MAX_BYTES:
            raise AccessDenied("invalid or oversized synthetic bytes")
        return digest(data)

    @staticmethod
    def _source_from(row: sqlite3.Row, v: sqlite3.Row) -> Source:
        return Source(source_id=row["source_id"],account_id=row["account_id"],
                      classification=row["classification"],rights=row["rights"],
                      rights_evidence_ref=row["evidence_ref"],rights_verified=bool(row["rights_verified"]),
                      sha256_hex=v["sha256"],version=v["version"],
                      license_purposes=frozenset(json.loads(row["license_purposes"])),
                      license_derivative_kinds=frozenset(json.loads(row["license_kinds"])),
                      attribution_required=bool(row["attribution_required"]),
                      attribution_ref=row["attribution_ref"],revoked=row["revoked_at"] is not None)

    def _source(self, db: sqlite3.Connection, source_id: str, version: int) -> tuple[sqlite3.Row,sqlite3.Row,Source]:
        s=db.execute("SELECT * FROM sources WHERE source_id=?",(source_id,)).fetchone()
        v=db.execute("SELECT * FROM source_versions WHERE source_id=? AND version=?",(source_id,version)).fetchone()
        if not s or not v:
            raise AccessDenied("source or requested original version missing")
        return s,v,self._source_from(s,v)

    def register_source(self, session: str, approval_id: str, *, source_id: str, account_id: str, owner_id: str,
                        data: bytes, classification: str = "public_educational_original",
                        rights: str = "original_verified", evidence_ref: str = "synthetic-proof",
                        rights_verified: bool = True, version: int = 1,
                        license_purposes: tuple[str,...] = (), license_kinds: tuple[str,...] = (),
                        attribution_ref: str = "", attribution_required: bool = False,
                        interrupt: bool = False) -> None:
        h = self._validate_data(data)
        if not source_id or not account_id or not owner_id or not evidence_ref or version != 1:
            raise AccessDenied("invalid source metadata")
        s=Source(source_id,account_id,classification,rights,evidence_ref,rights_verified,h,version,
                 frozenset(license_purposes),frozenset(license_kinds),attribution_required,attribution_ref)
        with self._tx() as db:
            self._check_and_consume(db,session,approval_id,s,owner_id,"ingest")
            if db.execute("SELECT 1 FROM sources WHERE source_id=?",(source_id,)).fetchone() or db.execute(
                    "SELECT 1 FROM source_versions WHERE account_id=? AND sha256=?",(account_id,h)).fetchone():
                raise AccessDenied("duplicate source identifier or bytes within account")
            db.execute("INSERT INTO sources VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                       (source_id,account_id,owner_id,classification,rights,evidence_ref,int(rights_verified),
                        json.dumps(sorted(license_purposes)),json.dumps(sorted(license_kinds)),attribution_ref,
                        int(attribution_required),None,self._time()))
            db.execute("INSERT INTO source_versions VALUES(?,?,?,?,?,?)",(source_id,1,account_id,h,data,self._time()))
            self._audit(db,owner_id,"source_ingested",source_id,{"version":1,"sha256":h})
            if interrupt: raise RuntimeError("simulated interruption before transaction commit")

    def add_source_version(self, session: str, approval_id: str, source_id: str, data: bytes,
                           *, interrupt: bool = False) -> int:
        h=self._validate_data(data)
        with self._tx() as db:
            s=db.execute("SELECT * FROM sources WHERE source_id=?",(source_id,)).fetchone()
            if not s or s["revoked_at"]:
                raise AccessDenied("source missing or revoked")
            prev=db.execute("SELECT max(version) FROM source_versions WHERE source_id=?",(source_id,)).fetchone()[0]
            v=prev+1
            candidate=Source(source_id,s["account_id"],s["classification"],s["rights"],s["evidence_ref"],
                             bool(s["rights_verified"]),h,v,
                             frozenset(json.loads(s["license_purposes"])),frozenset(json.loads(s["license_kinds"])),
                             bool(s["attribution_required"]),s["attribution_ref"])
            self._check_and_consume(db,session,approval_id,candidate,s["owner_id"],"ingest")
            if db.execute("SELECT 1 FROM source_versions WHERE account_id=? AND sha256=?",(s["account_id"],h)).fetchone():
                raise AccessDenied("duplicate original bytes within account")
            db.execute("INSERT INTO source_versions VALUES(?,?,?,?,?,?)",(source_id,v,s["account_id"],h,data,self._time()))
            self._audit(db,s["owner_id"],"source_versioned",source_id,{"version":v,"sha256":h})
            if interrupt: raise RuntimeError("simulated interrupted version registration")
            return v

    def preview_source(self, session: str, approval_id: str, source_id: str, version: int) -> bytes:
        with self._tx() as db:
            s,v,src=self._source(db,source_id,version)
            claims=self._check_and_consume(db,session,approval_id,src,s["owner_id"],"preview")
            if digest(v["data"])!=v["sha256"]:
                raise AccessDenied("original integrity mismatch")
            self._audit(db,claims["sub"],"source_preview",source_id,{"version":version,"sha256":v["sha256"]})
            return bytes(v["data"])

    def make_concept(self, session: str, approval_id: str, source_id: str, version: int, concept_id: str) -> None:
        if not concept_id: raise AccessDenied("empty concept ID")
        with self._tx() as db:
            s,v,src=self._source(db,source_id,version)
            actor=self._check_and_consume(db,session,approval_id,src,s["owner_id"],"concept")
            db.execute("INSERT INTO concepts VALUES(?,?,?,?,?,?,?)",(concept_id,source_id,version,v["sha256"],approval_id,
                            "candidate_review_only",self._time()))
            self._audit(db,actor["sub"],"concept_created",concept_id,{"source_id":source_id,"version":version})

    def make_derivative(self, session: str, approval_id: str, concept_id: str, derivative_id: str, kind: str,
                        data: bytes, *, contributions: tuple[str,...] = ("human_edit", "template_assisted"),
                        interrupt: bool = False) -> int:
        h=self._validate_data(data)
        if kind not in KINDS or not derivative_id or not contributions:
            raise AccessDenied("bad derivative metadata")
        if any(c not in {"original_source","human_edit","ai_assisted","template_assisted"} for c in contributions):
            raise AccessDenied("contribution provenance invalid")
        with self._tx() as db:
            c=db.execute("SELECT * FROM concepts WHERE concept_id=?",(concept_id,)).fetchone()
            if not c: raise AccessDenied("concept missing")
            s,v,src=self._source(db,c["source_id"],c["source_version"])
            if c["source_sha256"]!=v["sha256"]: raise AccessDenied("source lineage mutated")
            actor=self._check_and_consume(db,session,approval_id,src,s["owner_id"],"derivative",derivative_kind=kind)
            prior=db.execute("SELECT max(version) FROM derivative_versions WHERE derivative_id=?",(derivative_id,)).fetchone()[0]
            next_version=(prior or 0)+1
            if prior:
                existing=db.execute("SELECT kind,concept_id FROM derivative_versions WHERE derivative_id=? LIMIT 1",(derivative_id,)).fetchone()
                if existing["kind"]!=kind or existing["concept_id"]!=concept_id:
                    raise AccessDenied("derivative revision cannot change lineage or kind")
            db.execute("INSERT INTO derivative_versions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                       (derivative_id,next_version,concept_id,src.source_id,src.version,kind,h,data,
                        json.dumps(contributions),approval_id,"candidate_review_only",self._time()))
            self._audit(db,actor["sub"],"derivative_candidate",derivative_id,
                        {"version":next_version,"sha256":h,"kind":kind})
            if interrupt: raise RuntimeError("simulated interrupted derivative")
            return next_version

    def _derivative(self, db: sqlite3.Connection, derivative_id: str, version: int):
        row=db.execute("SELECT * FROM derivative_versions WHERE derivative_id=? AND version=?",(derivative_id,version)).fetchone()
        if row is None: raise AccessDenied("derivative version absent")
        s,v,src=self._source(db,row["source_id"],row["source_version"])
        if row["sha256"] != digest(row["data"]) or row["status"] != "candidate_review_only":
            raise AccessDenied("derivative integrity/status mismatch")
        return row,s,v,src

    def preview_handoff(self, session: str, approval_id: str, derivative_id: str, version: int, purpose: str) -> dict[str,Any]:
        if purpose not in HANDOFF: raise AccessDenied("not an authorized department")
        with self._tx() as db:
            d,s,v,src=self._derivative(db,derivative_id,version)
            actor=self._check_and_consume(db,session,approval_id,src,s["owner_id"],purpose,department=HANDOFF[purpose])
            out={"review_only":True,"department":HANDOFF[purpose],"derivative_id":derivative_id,
                 "derivative_version":version,"candidate_sha256":d["sha256"],"kind":d["kind"],
                 "source_version":src.version,"source_sha256":src.sha256_hex,
                 "next_gate":"department-specific editorial/consent/fulfillment or release approval"}
            self._audit(db,actor["sub"],"handoff_preview",derivative_id,
                        {"purpose":purpose,"version":version,"digest":d["sha256"]})
            return out  # intentionally no bytes and no outbound interface

    def executive_aggregate(self, session: str, approval_id: str, source_id: str, version: int) -> dict[str,int]:
        with self._tx() as db:
            s,v,src=self._source(db,source_id,version)
            actor=self._check_and_consume(db,session,approval_id,src,s["owner_id"],"executive_aggregate")
            counts={"sources":db.execute("SELECT count(*) FROM sources WHERE account_id=?",(s["account_id"],)).fetchone()[0],
                    "versions":db.execute("SELECT count(*) FROM source_versions WHERE account_id=?",(s["account_id"],)).fetchone()[0],
                    "concepts":db.execute("SELECT count(*) FROM concepts JOIN sources USING(source_id) WHERE account_id=?",(s["account_id"],)).fetchone()[0],
                    "derivative_versions":db.execute("SELECT count(*) FROM derivative_versions JOIN sources USING(source_id) WHERE account_id=?",(s["account_id"],)).fetchone()[0],
                    "revoked_sources":db.execute("SELECT count(*) FROM sources WHERE account_id=? AND revoked_at IS NOT NULL",(s["account_id"],)).fetchone()[0]}
            self._audit(db,actor["sub"],"executive_aggregate",source_id,{"keys":sorted(counts)})
            return counts

    def revoke_approval(self, owner_session: str, approval_id: str) -> None:
        actor=self._identity(owner_session)
        if actor["role"]!="vault_steward": raise AccessDenied("revoker role invalid")
        with self._tx() as db:
            row=db.execute("SELECT * FROM approvals WHERE approval_id=?",(approval_id,)).fetchone()
            if not row or row["owner_id"]!=actor["sub"] or row["account_id"]!=actor["account_id"] or row["revoked_at"]:
                raise AccessDenied("revocation not authorized")
            db.execute("UPDATE approvals SET revoked_at=? WHERE approval_id=?",(self._time(),approval_id))
            self._audit(db,actor["sub"],"approval_revoked",approval_id,{"source_id":row["source_id"]})

    def revoke_source(self, owner_session: str, source_id: str) -> None:
        actor=self._identity(owner_session)
        if actor["role"]!="vault_steward": raise AccessDenied("revoker role invalid")
        with self._tx() as db:
            row=db.execute("SELECT * FROM sources WHERE source_id=?",(source_id,)).fetchone()
            if not row or row["owner_id"]!=actor["sub"] or row["account_id"]!=actor["account_id"] or row["revoked_at"]:
                raise AccessDenied("source revocation not authorized")
            db.execute("UPDATE sources SET revoked_at=? WHERE source_id=?",(self._time(),source_id))
            self._audit(db,actor["sub"],"source_revoked",source_id,{"account_id":row["account_id"]})

    def controlled_local_export(self, session: str, approval_id: str, derivative_id: str, version: int,
                                filename: str, *, interrupt: str | None = None) -> Path:
        if not isinstance(filename,str) or not filename.endswith('.txt') or len(filename)>80 or not filename[:-4].replace('-','').replace('_','').isalnum() or '/' in filename or '\\' in filename:
            raise AccessDenied("unsafe export filename")
        out=self.root/'outbox'
        out.mkdir(mode=0o700,exist_ok=True)
        if out.is_symlink() or (out.stat().st_mode & 0o077):
            raise AccessDenied("unsafe local outbox")
        final=out/filename
        if final.exists() or final.is_symlink(): raise AccessDenied("export overwrite forbidden")
        export_id=str(uuid.uuid4())
        with self._tx() as db:
            d,s,v,src=self._derivative(db,derivative_id,version)
            actor=self._check_and_consume(db,session,approval_id,src,s["owner_id"],"controlled_export",
                                           destination="approved_local_outbox")
            db.execute("INSERT INTO local_exports VALUES(?,?,?,?,?,?,?,?)",
                       (export_id,derivative_id,version,approval_id,filename,d["sha256"],"pending",self._time()))
            self._audit(db,actor["sub"],"export_pending",export_id,{"sha256":d["sha256"],"filename":filename})
            payload=bytes(d["data"])
        if interrupt=="after_pending":
            raise RuntimeError("simulated interrupted export")
        temp=out/(".pending-"+export_id)
        try:
            _write_file(temp,payload)
            if interrupt=="after_write":
                raise RuntimeError("simulated interrupted export temp file")
            if final.exists() or final.is_symlink(): raise AccessDenied("export overwrite forbidden")
            os.replace(temp,final)
            _fsync_dir(out)
            if interrupt=="after_replace":
                raise RuntimeError("simulated interrupted post-rename export")
            with self._tx() as db:
                db.execute("UPDATE local_exports SET state='complete' WHERE export_id=? AND state='pending'",(export_id,))
                self._audit(db,actor["sub"],"export_complete",export_id,{"sha256":digest(payload)})
        except Exception:
            # A *future* restart must remove pending final/temp before any release claim.
            raise
        return final

    def _recover_incomplete_exports(self) -> None:
        rows=self.db.execute("SELECT export_id,filename FROM local_exports WHERE state='pending'").fetchall()
        if not rows: return
        out=self.root/'outbox'
        # Restored snapshots contain SQLite bytes only, never outbox files. Pending
        # exports are aborted even when a restored outbox had not existed yet.
        if not out.exists(): out.mkdir(mode=0o700)
        if out.is_symlink() or (out.stat().st_mode & 0o077): raise AccessDenied("unsafe outbox")
        with self._tx() as db:
            for r in rows:
                for path in (out/r["filename"], out/(".pending-"+r["export_id"])):
                    if path.is_symlink(): raise AccessDenied("unsafe pending export symlink")
                    if path.exists(): path.unlink()
                db.execute("UPDATE local_exports SET state='aborted' WHERE export_id=?",(r["export_id"],))
                self._audit(db,"system","export_aborted",r["export_id"],{"restart_recovery":True})
            _fsync_dir(out)

    def verify_integrity(self) -> bool:
        try:
            if self.db.execute("PRAGMA integrity_check").fetchone()[0] != 'ok': return False
            if self.db.execute("PRAGMA foreign_key_check").fetchall(): return False
            prev="0"*64
            rows=self.db.execute("SELECT * FROM audit ORDER BY seq").fetchall()
            for i,r in enumerate(rows,1):
                base={k:r[k] for k in ("seq","time","actor","operation","target_id","body_hash","previous_hash")}
                if r["seq"]!=i or r["previous_hash"]!=prev or digest(canonical(base))!=r["event_hash"]: return False
                prev=r["event_hash"]
            for r in self.db.execute("SELECT source_id,version,sha256,data FROM source_versions"):
                if digest(r["data"])!=r["sha256"] or r["version"]<1: return False
            for r in self.db.execute("SELECT sha256,data,status FROM derivative_versions"):
                if digest(r["data"])!=r["sha256"] or r["status"]!="candidate_review_only": return False
            for r in self.db.execute("SELECT source_id FROM sources"):
                if not self.db.execute("SELECT 1 FROM source_versions WHERE source_id=?",(r["source_id"],)).fetchone(): return False
            for r in self.db.execute("SELECT source_id,source_version,source_sha256 FROM concepts"):
                v=self.db.execute("SELECT sha256 FROM source_versions WHERE source_id=? AND version=?",(r["source_id"],r["source_version"])).fetchone()
                if not v or v[0]!=r["source_sha256"]: return False
            return True
        except (sqlite3.DatabaseError,ValueError,TypeError):
            return False

    def backup(self, snapshot_name: str = 'synthetic-snapshot') -> tuple[Path,Path]:
        if not snapshot_name or not snapshot_name.replace('-','').replace('_','').isalnum():
            raise AccessDenied("unsafe backup name")
        if not self.verify_integrity(): raise AccessDenied("source vault fails integrity check")
        backups=self.root/'backups'
        backups.mkdir(mode=0o700,exist_ok=True)
        if backups.is_symlink() or (backups.stat().st_mode & 0o077): raise AccessDenied("unsafe backup directory")
        final=backups/(snapshot_name+'.sqlite3')
        manifest=backups/(snapshot_name+'.manifest.json')
        if final.exists() or manifest.exists(): raise AccessDenied("backup overwrite forbidden")
        temp=backups/('.partial-'+str(uuid.uuid4())+'.sqlite3')
        _private_file(temp)
        try:
            with sqlite3.connect(temp) as dst:
                self.db.backup(dst)
            if not self._verify_database_file(temp): raise AccessDenied("backup snapshot failed integrity check")
            buf=temp.read_bytes()
            audit_head=self.db.execute("SELECT event_hash FROM audit ORDER BY seq DESC LIMIT 1").fetchone()
            body={"version":1,"db_sha256":digest(buf),"audit_head":audit_head[0] if audit_head else "0"*64,
                  "snapshot_name":snapshot_name,"created_at":self._time()}
            body["hmac_sha256"]=hmac.new(self.backup_key,canonical(body),hashlib.sha256).hexdigest()
            mtemp=backups/('.manifest-'+str(uuid.uuid4()))
            _write_file(mtemp,canonical(body))
            os.replace(temp,final)
            os.replace(mtemp,manifest)
            _fsync_dir(backups)
            return final,manifest
        finally:
            if temp.exists(): temp.unlink()

    @staticmethod
    def _verify_database_file(path: Path) -> bool:
        try:
            conn=sqlite3.connect('file:'+path.as_posix()+'?mode=ro',uri=True)
            try:
                if conn.execute("PRAGMA integrity_check").fetchone()[0]!='ok': return False
                if conn.execute("PRAGMA foreign_key_check").fetchall(): return False
                return True
            finally: conn.close()
        except sqlite3.DatabaseError:
            return False

    @classmethod
    def verify_backup(cls, backup_path: Path, manifest_path: Path, backup_key: bytes) -> bool:
        try:
            backup_path, manifest_path=Path(backup_path),Path(manifest_path)
            if backup_path.is_symlink() or manifest_path.is_symlink(): return False
            if (backup_path.stat().st_mode & 0o077) or (manifest_path.stat().st_mode & 0o077): return False
            obj=json.loads(manifest_path.read_bytes())
            mac=obj.pop('hmac_sha256')
            if not hmac.compare_digest(hmac.new(_key(backup_key),canonical(obj),hashlib.sha256).hexdigest(),mac): return False
            if digest(backup_path.read_bytes())!=obj['db_sha256']: return False
            if not cls._verify_database_file(backup_path): return False
            conn=sqlite3.connect('file:'+backup_path.as_posix()+'?mode=ro',uri=True)
            try:
                row=conn.execute('SELECT event_hash FROM audit ORDER BY seq DESC LIMIT 1').fetchone()
                if (row[0] if row else '0'*64)!=obj['audit_head']: return False
            finally: conn.close()
            return True
        except (OSError,ValueError,TypeError,KeyError,sqlite3.DatabaseError):
            return False

    @classmethod
    def restore(cls, backup_path: Path, manifest_path: Path, root: Path, *,
                identity_key: bytes, owner_key: bytes, backup_key: bytes) -> DurableVault:
        if not cls.verify_backup(backup_path,manifest_path,backup_key):
            raise AccessDenied("invalid backup integrity, manifest or signature")
        root=Path(root)
        if root.exists():
            raise AccessDenied("restore destination must be a new isolated directory")
        dest=_safe_root(root,create=True)
        target=dest/DB_NAME
        try:
            _write_file(target,Path(backup_path).read_bytes())
            _fsync_dir(dest)
            return cls(dest,identity_key=identity_key,owner_key=owner_key,backup_key=backup_key,create=False)
        except BaseException:
            # Never falsely report a complete restore after verification failure.
            raise