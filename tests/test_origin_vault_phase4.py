"""Origin Vault Phase IV: entirely synthetic, fail-closed security qualification tests.

These tests do NOT authenticate the real founder, protect the active SQLite DB,
or prove off-device recovery or operational readiness.
"""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from time import time

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from internal.origin_vault.durable import DurableVault, mint_test_token, digest, canonical
from internal.origin_vault.phase4_security import (
    seal_bytes, unseal_bytes, seal_review_artifact, read_sealed_review_artifact,
    seal_sqlite_snapshot, unseal_sqlite_snapshot, restore_sealed_snapshot,
    rotate_sealed_snapshot, make_external_checkpoint, verify_external_checkpoint,
    assert_separate_phase3_keys, verify_synthetic_founder_contract)
from internal.origin_vault.policy import AccessDenied

SYNTHETIC = b'FAKE SOURCE 003-F no founder/private/clinical/legal materials.'


class PhaseIV(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='ov-phase4-fake-')
        self.base = Path(self.tmp.name)
        self.root = self.base / 'private-synthetic'
        self.ik, self.ok, self.bk, self.ek = (os.urandom(32) for _ in range(4))
        self.vault = DurableVault(self.root, identity_key=self.ik, owner_key=self.ok, backup_key=self.bk)
        self.signer = Ed25519PrivateKey.generate()  # fake *separate* audit authority
        self.verifier = self.signer.public_key()

    def tearDown(self):
        self.vault.close()
        self.tmp.cleanup()

    def session(self):
        return mint_test_token('identity', {
            'sub':'fake-founder','account_id':'account-A','role':'vault_steward',
            'jti':os.urandom(6).hex(),'exp':int(time()+3600)},self.ik)

    def grant(self,purpose='ingest', version=1, data=SYNTHETIC,scope=None):
        t = mint_test_token('approval', {
            'approval_id':'g-'+os.urandom(8).hex(),'source_id':'synthetic-source',
            'source_version':version,'source_sha256':digest(data),
            'actor_id':'fake-founder','account_id':'account-A','owner_id':'fake-founder',
            'purpose':purpose,'scope':scope or {},'rights_evidence_ref':'synthetic-proof',
            'exp':int(time()+3600)},self.ok)
        return self.vault.record_approval(t)

    def source(self):
        grant=self.grant()
        self.vault.register_source(self.session(),grant,
            source_id='synthetic-source',account_id='account-A',owner_id='fake-founder',data=SYNTHETIC)

    def protected_path(self, name='fake.ovb'):
        return self.root / name

    def checkpoint(self, i=1):
        return make_external_checkpoint(self.vault,self.signer,
                                        vault_id='fake-vault-1',checkpoint_id=i)

    def test_q01_vetted_aes_gcm_round_trip(self):
        blob=seal_bytes(SYNTHETIC,self.ek,purpose='review_artifact',reference='fake-r1')
        self.assertEqual(unseal_bytes(blob,self.ek,purpose='review_artifact',reference='fake-r1'),SYNTHETIC)

    def test_q02_plaintext_not_present_in_envelope(self):
        blob=seal_bytes(SYNTHETIC,self.ek,purpose='review_artifact',reference='fake-r1')
        self.assertNotIn(SYNTHETIC,blob)

    def test_q03_wrong_key_rejected(self):
        blob=seal_bytes(SYNTHETIC,self.ek,purpose='review_artifact',reference='fake-r1')
        with self.assertRaises(AccessDenied): unseal_bytes(blob,os.urandom(32),purpose='review_artifact',reference='fake-r1')

    def test_q04_tampered_ciphertext_rejected(self):
        blob=bytearray(seal_bytes(SYNTHETIC,self.ek,purpose='review_artifact',reference='fake-r1'))
        blob[-19]^=0x80
        with self.assertRaises(AccessDenied): unseal_bytes(bytes(blob),self.ek,purpose='review_artifact',reference='fake-r1')

    def test_q05_truncated_ciphertext_rejected(self):
        blob=seal_bytes(SYNTHETIC,self.ek,purpose='review_artifact',reference='fake-r1')
        with self.assertRaises(AccessDenied): unseal_bytes(blob[:-17],self.ek,purpose='review_artifact',reference='fake-r1')

    def test_q06_purpose_or_ref_not_interchangeable(self):
        blob=seal_bytes(SYNTHETIC,self.ek,purpose='review_artifact',reference='fake-r1')
        for kind,ref in [('encrypted_snapshot','fake-r1'),('review_artifact','fake-r2')]:
            with self.assertRaises(AccessDenied): unseal_bytes(blob,self.ek,purpose=kind,reference=ref)

    def test_q07_reject_invalid_short_key(self):
        with self.assertRaises(AccessDenied): seal_bytes(SYNTHETIC,b'bad',purpose='review_artifact',reference='fake-r1')

    def test_q08_distinct_ciphertext_per_nonce(self):
        a=seal_bytes(SYNTHETIC,self.ek,purpose='review_artifact',reference='fake-r1')
        b=seal_bytes(SYNTHETIC,self.ek,purpose='review_artifact',reference='fake-r1')
        self.assertNotEqual(a,b)
        self.assertEqual(unseal_bytes(a,self.ek,purpose='review_artifact',reference='fake-r1'),
                         unseal_bytes(b,self.ek,purpose='review_artifact',reference='fake-r1'))

    def test_q09_encrypted_review_local_only_and_private_permissions(self):
        path=seal_review_artifact(SYNTHETIC,self.ek,self.protected_path('preview.ovr'),'fake-r1')
        self.assertEqual(path.stat().st_mode & 0o077,0)
        self.assertNotIn(SYNTHETIC,path.read_bytes())
        self.assertEqual(read_sealed_review_artifact(path,self.ek,'fake-r1'),SYNTHETIC)

    def test_q10_review_artifact_wont_overwrite(self):
        path=self.protected_path('preview.ovr')
        seal_review_artifact(SYNTHETIC,self.ek,path,'fake-r1')
        with self.assertRaises(AccessDenied): seal_review_artifact(SYNTHETIC,self.ek,path,'fake-r1')

    def test_q11_review_artifact_symlink_denied(self):
        path=self.protected_path('preview.ovr');path.symlink_to(self.vault.path)
        with self.assertRaises(AccessDenied): seal_review_artifact(SYNTHETIC,self.ek,path,'fake-r1')

    def test_q12_backup_ciphertext_contains_no_plain_source(self):
        self.source();p=seal_sqlite_snapshot(self.vault,self.protected_path(),self.ek,'fake-backup-1')
        raw=p.read_bytes()
        self.assertNotIn(SYNTHETIC,raw)
        self.assertEqual(p.stat().st_mode & 0o077,0)
        self.assertTrue(unseal_sqlite_snapshot(p,self.ek,'fake-backup-1').startswith(b'SQLite format 3'))

    def test_q13_encrypted_backup_isolated_restore(self):
        self.source();p=seal_sqlite_snapshot(self.vault,self.protected_path(),self.ek,'fake-backup-1')
        destination=self.base/'isolated-restore'
        restored=restore_sealed_snapshot(p,destination,self.ek,'fake-backup-1',
                 identity_key=self.ik,owner_key=self.ok,backup_key=self.bk)
        try:
            self.assertTrue(restored.verify_integrity())
            self.assertEqual(restored.db.execute('SELECT data FROM source_versions').fetchone()[0],SYNTHETIC)
        finally:restored.close()

    def test_q14_backup_wrong_key_denied_before_destination_creation(self):
        self.source();p=seal_sqlite_snapshot(self.vault,self.protected_path(),self.ek,'fake-backup-1')
        destination=self.base/'isolated-restore'
        with self.assertRaises(AccessDenied):restore_sealed_snapshot(p,destination,os.urandom(32),'fake-backup-1',
                 identity_key=self.ik,owner_key=self.ok,backup_key=self.bk)
        self.assertFalse(destination.exists())

    def test_q15_corrupt_encrypted_backup_denied(self):
        self.source();p=seal_sqlite_snapshot(self.vault,self.protected_path(),self.ek,'fake-backup-1')
        raw=bytearray(p.read_bytes());raw[-1]^=1;p.write_bytes(bytes(raw))
        with self.assertRaises(AccessDenied):unseal_sqlite_snapshot(p,self.ek,'fake-backup-1')

    def test_q16_encrypted_restore_rejects_existing_destination(self):
        self.source();p=seal_sqlite_snapshot(self.vault,self.protected_path(),self.ek,'fake-backup-1')
        with self.assertRaises(AccessDenied):restore_sealed_snapshot(p,self.root,self.ek,'fake-backup-1',
                 identity_key=self.ik,owner_key=self.ok,backup_key=self.bk)

    def test_q17_key_rotation_rewraps_new_snapshot_not_old_key(self):
        self.source();p=seal_sqlite_snapshot(self.vault,self.protected_path(),self.ek,'fake-backup-1')
        new=os.urandom(32)
        rotated=rotate_sealed_snapshot(p,self.protected_path('rotated.ovb'),self.ek,new,'fake-backup-1')
        self.assertEqual(unseal_sqlite_snapshot(p,self.ek,'fake-backup-1'),
                         unseal_sqlite_snapshot(rotated,new,'fake-backup-1'))
        with self.assertRaises(AccessDenied):unseal_sqlite_snapshot(rotated,self.ek,'fake-backup-1')

    def test_q18_checkpoint_signature_and_integrity_verifies(self):
        self.source();c=self.checkpoint()
        self.assertTrue(verify_external_checkpoint(self.vault,c,self.verifier,vault_id='fake-vault-1'))

    def test_q19_checkpoint_forgery_denied(self):
        self.source();c=json.loads(self.checkpoint());c['payload']['checkpoint_id']=900
        self.assertFalse(verify_external_checkpoint(self.vault,canonical(c),self.verifier,vault_id='fake-vault-1'))

    def test_q20_checkpoint_wrong_verifier_denied(self):
        self.source();c=self.checkpoint()
        other=Ed25519PrivateKey.generate().public_key()
        self.assertFalse(verify_external_checkpoint(self.vault,c,other,vault_id='fake-vault-1'))

    def test_q21_checkpoint_wrong_vault_rejected(self):
        self.source();c=self.checkpoint()
        self.assertFalse(verify_external_checkpoint(self.vault,c,self.verifier,vault_id='different-vault'))

    def test_q22_altered_privileged_metadata_internal_hash_passes_external_fails(self):
        self.source();anchor=self.checkpoint()
        # Privileged local DB owner modifies rights metadata but not audit: local
        # chain is still internally consistent, demonstrating its core weakness.
        self.vault.db.execute('UPDATE sources SET rights_verified=0')
        self.assertTrue(self.vault.verify_integrity())  # internal hash cannot prove metadata integrity
        self.assertFalse(verify_external_checkpoint(self.vault,anchor,self.verifier,vault_id='fake-vault-1'))

    def test_q23_privileged_recomputed_log_passes_internal_anchor_detects(self):
        self.source();anchor=self.checkpoint()
        entry=self.vault.db.execute('SELECT * FROM audit WHERE seq=1').fetchone()
        changed={k:entry[k] for k in ('seq','time','actor','operation','target_id','body_hash','previous_hash')}
        changed['operation']='forged-event'
        from internal.origin_vault.durable import digest as sha
        self.vault.db.execute('UPDATE audit SET operation=?,event_hash=? WHERE seq=1',
                              (changed['operation'],sha(canonical(changed))))
        # More than one row: rehash rest of chain so local consistency returns OK.
        for seq in range(2,self.vault.db.execute('SELECT count(*) FROM audit').fetchone()[0]+1):
            r=self.vault.db.execute('SELECT * FROM audit WHERE seq=?',(seq,)).fetchone()
            prior=self.vault.db.execute('SELECT event_hash FROM audit WHERE seq=?',(seq-1,)).fetchone()[0]
            item={k:r[k] for k in ('seq','time','actor','operation','target_id','body_hash','previous_hash')}
            item['previous_hash']=prior
            self.vault.db.execute('UPDATE audit SET previous_hash=?,event_hash=? WHERE seq=?',
                                  (prior,sha(canonical(item)),seq))
        self.assertTrue(self.vault.verify_integrity())
        self.assertFalse(verify_external_checkpoint(self.vault,anchor,self.verifier,vault_id='fake-vault-1'))

    def test_q24_trusted_latest_checkpoint_detects_replayed_backup_revocation(self):
        self.source();b=seal_sqlite_snapshot(self.vault,self.protected_path(),self.ek,'fake-backup-1')
        self.vault.revoke_source(self.session(),'synthetic-source')
        newer=self.checkpoint(i=2)
        restored=restore_sealed_snapshot(b,self.base/'isolated-restore',self.ek,'fake-backup-1',
                  identity_key=self.ik,owner_key=self.ok,backup_key=self.bk)
        try:
            self.assertTrue(restored.verify_integrity())
            self.assertFalse(verify_external_checkpoint(restored,newer,self.verifier,
                                                        vault_id='fake-vault-1',minimum_checkpoint_id=2))
        finally:restored.close()

    def test_q25_checkpoint_minimum_monotonic_index(self):
        self.source();c=self.checkpoint(i=2)
        self.assertTrue(verify_external_checkpoint(self.vault,c,self.verifier,vault_id='fake-vault-1',minimum_checkpoint_id=2))
        self.assertFalse(verify_external_checkpoint(self.vault,c,self.verifier,vault_id='fake-vault-1',minimum_checkpoint_id=3))

    def test_q26_injected_signing_keys_are_distinct(self):
        self.assertTrue(assert_separate_phase3_keys(self.vault))

    def test_q27_reusing_identity_and_owner_key_disallowed(self):
        with self.assertRaises(AccessDenied):
            DurableVault(self.base/'bad-reused-key',identity_key=self.ik,owner_key=self.ik,backup_key=self.bk)

    def test_q28_synthetic_founder_contract_requires_fresh_webauthn(self):
        now=int(time())
        assertion={'iss':'trusted-idp.example','aud':'origin-vault','sub':'fake-founder',
            'account_id':'account-A','auth_time':now-5,'exp':now+120,'amr':['pwd','webauthn'],'role':'vault_steward'}
        self.assertTrue(verify_synthetic_founder_contract(assertion,expected_issuer='trusted-idp.example',
            expected_audience='origin-vault',actor_id='fake-founder',account_id='account-A',now=now))

    def test_q29_synthetic_founder_claim_cannot_replace_actual_idp_validation(self):
        now=int(time())
        assertion={'iss':'trusted-idp.example','aud':'origin-vault','sub':'fake-founder',
            'account_id':'account-A','auth_time':now-5,'exp':now+120,'amr':['pwd'],'role':'vault_steward'}
        self.assertFalse(verify_synthetic_founder_contract(assertion,expected_issuer='trusted-idp.example',
            expected_audience='origin-vault',actor_id='fake-founder',account_id='account-A',now=now))
        assertion['amr']=['pwd','webauthn'];assertion['account_id']='wrong-account'
        self.assertFalse(verify_synthetic_founder_contract(assertion,expected_issuer='trusted-idp.example',
            expected_audience='origin-vault',actor_id='fake-founder',account_id='account-A',now=now))

    def test_q30_synthetic_founder_contract_rejects_stale_session(self):
        now=int(time())
        assertion={'iss':'trusted-idp.example','aud':'origin-vault','sub':'fake-founder',
            'account_id':'account-A','auth_time':now-3600,'exp':now+120,'amr':['pwd','webauthn'],'role':'vault_steward'}
        self.assertFalse(verify_synthetic_founder_contract(assertion,expected_issuer='trusted-idp.example',
            expected_audience='origin-vault',actor_id='fake-founder',account_id='account-A',now=now))

    def test_q31_symlinked_parent_private_root_rejected(self):
        actual=self.base/'actual-parent';actual.mkdir(mode=0o700)
        alias=self.base/'alias-parent';alias.symlink_to(actual,target_is_directory=True)
        with self.assertRaises(AccessDenied):
            DurableVault(alias/'child',identity_key=self.ik,owner_key=self.ok,backup_key=self.bk)

if __name__ == '__main__':unittest.main()