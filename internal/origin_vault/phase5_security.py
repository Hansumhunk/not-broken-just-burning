"""Origin Vault Phase V: SYNTHETIC, offline trust-custody and quarantine interface.

No network, credentials, production access or real founder identity. The in-memory
custodian deliberately lives outside the Vault object; it is NOT independent remote
custody. Quarantine never issues release authority.
"""
from __future__ import annotations

import json
import shutil
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from .durable import DurableVault, canonical, _write_file
from .phase4_security import (unseal_sqlite_snapshot, restore_sealed_snapshot,
                              verify_external_checkpoint)
from .policy import AccessDenied


@dataclass(frozen=True)
class TrustedCheckpoint:
    vault_id: str
    sequence: int
    key_id: str
    signed_bytes: bytes


class InMemorySeparateCustodian:
    """Simulates an independently administered *latest known* record.

    Real use requires external append-only custody and independently protected
    signing keys. An attacker with this in-memory object's control can roll it back.
    """
    def __init__(self, trusted_keys: dict[str, Ed25519PublicKey]):
        if not trusted_keys or not all(isinstance(k, str) and k and isinstance(v,Ed25519PublicKey)
                                           for k,v in trusted_keys.items()):
            raise AccessDenied('trusted verification keys required')
        self._trusted_keys=trusted_keys.copy()
        self._latest: dict[str,TrustedCheckpoint]={}

    def publish_synthetic(self, vault: DurableVault, vault_id: str, key_id: str, signed_blob: bytes) -> TrustedCheckpoint:
        if key_id not in self._trusted_keys: raise AccessDenied('unknown checkpoint signing key')
        try:
            p=json.loads(signed_blob)['payload']
            seq=p['checkpoint_id']
        except (KeyError,TypeError,ValueError) as exc:
            raise AccessDenied('invalid checkpoint structure') from exc
        if type(seq) is not int or seq<=0 or p.get('vault_id')!=vault_id:
            raise AccessDenied('checkpoint vault or sequence mismatch')
        prev=self._latest.get(vault_id)
        if prev and seq<=prev.sequence:
            raise AccessDenied('checkpoint sequence replay or rollback')
        if not verify_external_checkpoint(vault,signed_blob,self._trusted_keys[key_id],
                                          vault_id=vault_id,minimum_checkpoint_id=seq):
            raise AccessDenied('invalid checkpoint signature or current state')
        next_cp=TrustedCheckpoint(vault_id,seq,key_id,bytes(signed_blob))
        self._latest[vault_id]=next_cp
        return next_cp

    def latest(self, vault_id: str) -> TrustedCheckpoint:
        cp=self._latest.get(vault_id)
        if not cp:
            raise AccessDenied('independent latest checkpoint unavailable; fail closed')
        return cp

    def verify_state(self, vault: Any, vault_id: str) -> bool:
        cp=self.latest(vault_id)
        return verify_external_checkpoint(vault,cp.signed_bytes,self._trusted_keys[cp.key_id],
                                          vault_id=vault_id,minimum_checkpoint_id=cp.sequence)


@dataclass(frozen=True)
class QuarantineResult:
    destination: Path
    state: str
    release_allowed: bool
    checkpoint_sequence: int
    required_next_gate: str


class _MemorySnapshot:
    def __init__(self, db: sqlite3.Connection):
        self.db=db


def restore_to_quarantine(snapshot: Path, destination: Path, backup_key: bytes, reference: str, *,
                          vault_id: str, custodian: InMemorySeparateCustodian,
                          identity_key: bytes, owner_key: bytes, signing_backup_key: bytes,
                          content_key: bytes | None = None) -> QuarantineResult:
    """Fail closed before accepting an old, valid snapshot; never authorize release.

    Preflight verifies current external anchor against the *in-memory* decrypted
    snapshot. Even on success, destination is a SYNTHETIC-ONLY local quarantine,
    not a released or remotely recoverable Vault.
    """
    destination=Path(destination)
    if destination.exists(): raise AccessDenied('quarantine destination must not exist')
    cp=custodian.latest(vault_id)  # external dependency required, no fallback
    raw=unseal_sqlite_snapshot(Path(snapshot),backup_key,reference)
    with sqlite3.connect(':memory:') as memory:
        try:
            memory.deserialize(raw)
            if memory.execute('PRAGMA integrity_check').fetchone()[0]!='ok' or memory.execute('PRAGMA foreign_key_check').fetchall():
                raise AccessDenied('snapshot database structure failed integrity')
            if not custodian.verify_state(_MemorySnapshot(memory),vault_id):
                raise AccessDenied('backup does not match independently trusted latest checkpoint; stale revocation/rollback')
        except sqlite3.DatabaseError as exc:
            raise AccessDenied('invalid snapshot database') from exc
    # No plaintext restored DB is written until cryptographic verification above.
    restored=None
    try:
        restored=restore_sealed_snapshot(snapshot,destination,backup_key,reference,
                        identity_key=identity_key,owner_key=owner_key,backup_key=signing_backup_key,
                        content_key=content_key)
        if not custodian.verify_state(restored,vault_id):
            raise AccessDenied('restored state mutated or differs from external checkpoint')
        restored.close();restored=None
        marker=destination/'QUARANTINE_NOT_RELEASED.json'
        _write_file(marker,canonical({'state':'QUARANTINED','release_allowed':False,
                         'checkpoint_sequence':cp.sequence,'vault_id':vault_id,
                         'required_next_gate':'verified founder step-up, rights/session revocation reconciliation and operator acceptance'}))
    except BaseException:
        if restored is not None:restored.close()
        # Only delete a destination newly created by this invocation; never user data.
        if destination.exists() and destination.is_dir() and not destination.is_symlink():
            shutil.rmtree(destination)
        raise
    return QuarantineResult(destination,'QUARANTINED',False,cp.sequence,
                  'verified founder step-up, rights/session revocation reconciliation and operator acceptance')