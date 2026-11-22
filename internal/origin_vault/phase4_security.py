"""Phase IV: SYNTHETIC-ONLY security proofs; not a real-source Vault or IdP.

The pinned third-party pyca/cryptography library supplies AES-256-GCM and
Ed25519 primitives. This module does NOT implement cryptographic algorithms.
Keys are injected by trusted callers in memory; none are generated from
passwords, saved in Git, or minted on behalf of the real founder.

Important: the Phase III *running SQLite database and outbox are still plaintext*.
A sealed snapshot protects only a separate backup file; after restoration the
isolated SQLite destination is again plaintext. Real source ingestion remains
prohibited until an encrypted active store and trusted custody are qualified.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature, InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

from .durable import DB_NAME, DurableVault, canonical, digest, _safe_root, _write_file, _fsync_dir
from .policy import AccessDenied

MAGIC = b'OV-ENC4\x00'
MAX_SNAPSHOT = 32_000_000  # Bound synthetic memory use; not a real capacity promise.
TABLES = ('sources', 'source_versions', 'approvals', 'concepts', 'derivative_versions',
          'local_exports', 'audit')


def _aeskey(key: bytes) -> bytes:
    if not isinstance(key, bytes) or len(key) != 32:
        raise AccessDenied('independent 32-byte AES-256 key required')
    return key


def _sealed_header(purpose: str, reference: str) -> bytes:
    if purpose not in {'encrypted_snapshot', 'review_artifact'}:
        raise AccessDenied('unsupported envelope purpose')
    if not isinstance(reference, str) or not reference.isascii() or not (1 <= len(reference) <= 72) or not all(c.isalnum() or c in '-_' for c in reference):
        raise AccessDenied('invalid non-identifying reference')
    return canonical({'v': 1, 'alg': 'AES-256-GCM', 'purpose': purpose, 'reference': reference})


def seal_bytes(data: bytes, key: bytes, *, purpose: str, reference: str) -> bytes:
    """Authenticated envelope; random 96-bit nonce; header bound via GCM AAD."""
    _aeskey(key)
    if not isinstance(data, bytes) or not data or len(data) > MAX_SNAPSHOT:
        raise AccessDenied('invalid synthetic payload size')
    header = _sealed_header(purpose, reference)
    nonce = os.urandom(12)  # never reuse nonce with same key
    ct = AESGCM(key).encrypt(nonce, data, header)
    return MAGIC + len(header).to_bytes(2, 'big') + header + nonce + ct


def unseal_bytes(blob: bytes, key: bytes, *, purpose: str, reference: str) -> bytes:
    """Reject truncated/tampered ciphertext, wrong context, purpose or key."""
    _aeskey(key)
    if not isinstance(blob, bytes) or len(blob) > MAX_SNAPSHOT + 512 or not blob.startswith(MAGIC):
        raise AccessDenied('invalid encrypted envelope')
    try:
        offset = len(MAGIC)
        length = int.from_bytes(blob[offset:offset + 2], 'big')
        if length > 256 or length == 0:
            raise ValueError('bad header')
        header = blob[offset + 2:offset + 2 + length]
        if header != _sealed_header(purpose, reference):
            raise ValueError('wrong purpose or reference')
        pos = offset + 2 + length
        if len(blob) < pos + 12 + 16:
            raise ValueError('truncated ciphertext')
        result = AESGCM(key).decrypt(blob[pos:pos + 12], blob[pos + 12:], header)
        if not result or len(result) > MAX_SNAPSHOT:
            raise ValueError('invalid decrypted size')
        return result
    except (InvalidTag, ValueError, TypeError) as exc:
        raise AccessDenied('encrypted artifact authentication failed') from exc


def _private_destination(target: Path, *, suffix: str) -> Path:
    target = Path(target)
    if not target.is_absolute() or target.suffix != suffix or target.is_symlink() or target.exists():
        raise AccessDenied('protected file must be new with approved extension')
    _safe_root(target.parent, create=False)
    return target


def seal_review_artifact(data: bytes, key: bytes, target: Path, reference: str) -> Path:
    """Local *encrypted* review fixture; never sends to a department."""
    target = _private_destination(target, suffix='.ovr')
    _write_file(target, seal_bytes(data, key, purpose='review_artifact', reference=reference))
    _fsync_dir(target.parent)
    return target


def read_sealed_review_artifact(target: Path, key: bytes, reference: str) -> bytes:
    target = Path(target)
    if target.is_symlink() or not target.is_file() or (target.stat().st_mode & 0o077):
        raise AccessDenied('unsafe sealed review artifact')
    return unseal_bytes(target.read_bytes(), key, purpose='review_artifact', reference=reference)


def seal_sqlite_snapshot(vault: DurableVault, target: Path, key: bytes, reference: str) -> Path:
    """SQLite online backup to :memory:, then AEAD on *in-memory serialization*.

    No unencrypted `.sqlite3` backup file is emitted, but Python/SQLite memory
    and the running Vault database remain plaintext and cannot be zeroized here.
    """
    target = _private_destination(target, suffix='.ovb')
    if not vault.verify_integrity():
        raise AccessDenied('refusing to snapshot failed-integrity Vault')
    with sqlite3.connect(':memory:') as memory:
        vault.db.backup(memory)
        image = bytearray(memory.serialize())
        # sqlite3.deserialize(:memory:) cannot open a WAL-mode serialized image:
        # SQLite file header offsets 18 and 19 select WAL (2) vs rollback (1).
        # Snapshot is complete and independent; normalize just these official
        # file-format header flags *in memory* before AEAD sealing. Validate it
        # with an in-memory integrity check again before writing ciphertext.
        if not image.startswith(b'SQLite format 3\x00') or len(image) < 100:
            raise AccessDenied('invalid serialized SQLite image')
        image[18:20] = b'\x01\x01'
        raw = bytes(image)
        with sqlite3.connect(':memory:') as validation:
            validation.deserialize(raw)
            if validation.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise AccessDenied('normalized in-memory snapshot integrity failure')
    blob = seal_bytes(raw, key, purpose='encrypted_snapshot', reference=reference)
    _write_file(target, blob)
    _fsync_dir(target.parent)
    return target


def unseal_sqlite_snapshot(target: Path, key: bytes, reference: str) -> bytes:
    target = Path(target)
    if target.is_symlink() or not target.is_file() or (target.stat().st_mode & 0o077):
        raise AccessDenied('unsafe sealed snapshot')
    return unseal_bytes(target.read_bytes(), key, purpose='encrypted_snapshot', reference=reference)


def restore_sealed_snapshot(target: Path, destination: Path, key: bytes, reference: str, *,
                            identity_key: bytes, owner_key: bytes, backup_key: bytes) -> DurableVault:
    """Restore *only into a new isolated plaintext synthetic test directory*."""
    destination = Path(destination)
    if destination.exists():
        raise AccessDenied('restore never overwrites existing target')
    raw = unseal_sqlite_snapshot(target, key, reference)
    with sqlite3.connect(':memory:') as memory:
        try:
            memory.deserialize(raw)
            if memory.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise AccessDenied('invalid restored database')
            if memory.execute('PRAGMA foreign_key_check').fetchall():
                raise AccessDenied('invalid restored foreign keys')
            # Avoid any local SQLite output until authentication and basic DB checks succeed.
            dest = _safe_root(destination, create=True)
            db_path = dest / DB_NAME
            fd = os.open(db_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
            os.close(fd)
            with sqlite3.connect(db_path) as restored:
                memory.backup(restored)
            _fsync_dir(dest)
        except (sqlite3.DatabaseError, ValueError) as exc:
            raise AccessDenied('invalid encrypted snapshot') from exc
    return DurableVault(destination, identity_key=identity_key, owner_key=owner_key,
                        backup_key=backup_key, create=False)


def rotate_sealed_snapshot(source: Path, destination: Path, old_key: bytes,
                           new_key: bytes, reference: str) -> Path:
    if old_key == new_key:
        raise AccessDenied('rotation requires independently changed key')
    _private_destination(destination, suffix='.ovb')
    raw = unseal_sqlite_snapshot(source, old_key, reference)
    _write_file(destination, seal_bytes(raw, new_key, purpose='encrypted_snapshot', reference=reference))
    _fsync_dir(Path(destination).parent)
    return destination


def _snapshot_state(vault: DurableVault) -> dict[str, Any]:
    """Canonical digest of all security-relevant SQLite rows, without source bytes."""
    tables = {}
    for name in TABLES:
        rows = []
        for record in vault.db.execute('SELECT * FROM ' + name + ' ORDER BY rowid').fetchall():
            values = []
            for value in record:
                if isinstance(value, bytes):
                    values.append({'sha256': digest(value), 'size': len(value)})
                else:
                    values.append(value)
            rows.append(values)
        tables[name] = rows
    audit = vault.db.execute('SELECT seq,event_hash FROM audit ORDER BY seq DESC LIMIT 1').fetchone()
    return {'state_sha256': digest(canonical(tables)),
            'audit_seq': audit[0] if audit else 0,
            'audit_head': audit[1] if audit else '0' * 64}


def make_external_checkpoint(vault: DurableVault, private_signer: Ed25519PrivateKey,
                             *, vault_id: str, checkpoint_id: int) -> bytes:
    """Return signed checkpoint *for independent off-Vault custody*.

    The caller is responsible for authenticating/physically separating the signer
    and persisting the latest checkpoint with anti-rollback guarantees.
    """
    _sealed_header('review_artifact', vault_id)  # enforce non-identifying ID syntax
    if not isinstance(checkpoint_id, int) or checkpoint_id <= 0:
        raise AccessDenied('invalid monotonic checkpoint ID')
    if not vault.verify_integrity():
        raise AccessDenied('cannot checkpoint a corrupt Vault')
    payload = {'v':1, 'vault_id':vault_id, 'checkpoint_id':checkpoint_id,
               'created_at':datetime.now(timezone.utc).isoformat(), **_snapshot_state(vault)}
    msg = canonical(payload)
    signed = {'payload':payload,'signature_b64':base64.b64encode(private_signer.sign(msg)).decode('ascii')}
    return canonical(signed)


def verify_external_checkpoint(vault: DurableVault, blob: bytes, public_verifier: Ed25519PublicKey,
                               *, vault_id: str, minimum_checkpoint_id: int = 1) -> bool:
    """Detect changed data, forged checkpoint, mismatched vault or rollback.

    `blob` must originate from an independent trusted store and be guaranteed
    to be the latest checkpoint. A local attacker can otherwise replay an old
    *genuine* signed checkpoint alongside an old genuine database.
    """
    try:
        if not isinstance(blob, bytes) or len(blob) > 16_384:
            return False
        obj=json.loads(blob)
        if set(obj) != {'payload','signature_b64'}:
            return False
        p=obj['payload']
        if set(p) != {'v','vault_id','checkpoint_id','created_at','state_sha256','audit_seq','audit_head'}:
            return False
        if p['v'] != 1 or p['vault_id'] != vault_id or type(p['checkpoint_id']) is not int or p['checkpoint_id'] < minimum_checkpoint_id:
            return False
        signature=base64.b64decode(obj['signature_b64'], validate=True)
        public_verifier.verify(signature,canonical(p))
        return all(p[k]==v for k,v in _snapshot_state(vault).items())
    except (InvalidSignature, ValueError, TypeError, KeyError, sqlite3.Error):
        return False


def assert_separate_phase3_keys(vault: DurableVault) -> bool:
    """Audit diagnostic only: future credential service must enforce key separation."""
    return (vault.identity_key != vault.owner_key and
            vault.identity_key != vault.backup_key and
            vault.owner_key != vault.backup_key)


def verify_synthetic_founder_contract(assertion: dict[str, Any], *,
                                      expected_issuer: str, expected_audience: str,
                                      actor_id: str, account_id: str, now: int) -> bool:
    """Structural *test contract*, NOT actual OIDC/JWT authentication or MFA.

    Call only after a separately authenticated service verified JWT signatures,
    issuer JWKS and session freshness. No claims from client-editable metadata.
    """
    required = {'iss','aud','sub','account_id','auth_time','exp','amr','role'}
    if not isinstance(assertion,dict) or set(assertion)!=required:
        return False
    if assertion['iss']!=expected_issuer or assertion['aud']!=expected_audience or assertion['sub']!=actor_id or assertion['account_id']!=account_id:
        return False
    if assertion['role']!='vault_steward' or not isinstance(assertion['amr'],list) or 'webauthn' not in assertion['amr']:
        return False
    if type(assertion['exp']) is not int or type(assertion['auth_time']) is not int:
        return False
    if assertion['exp']<=now or assertion['exp']>now+900 or not(now-300<=assertion['auth_time']<=now):
        return False
    return True