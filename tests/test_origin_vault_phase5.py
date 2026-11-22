"""Meaningful Phase V synthetic security tests; no real users, secrets or outside services."""
import base64
import json
import os
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from time import time

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from internal.origin_vault.durable import DurableVault,mint_test_token,digest,canonical
from internal.origin_vault.phase4_security import seal_sqlite_snapshot, restore_sealed_snapshot, make_external_checkpoint
from internal.origin_vault.phase5_security import InMemorySeparateCustodian, restore_to_quarantine
from internal.origin_vault.phase5_identity import PinnedAssertionVerifier
from internal.origin_vault.policy import AccessDenied

DATA=b'FAKE-PHASE5-SOURCE-data: original educational placeholder, not private.'
DERIVATIVE=b'FAKE-PHASE5-LESSON-DRAFT-only-not-a-publication.'


class PhaseV(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix='ov5-synthetic-')
        self.addCleanup(self.tmp.cleanup)
        self.base=Path(self.tmp.name)
        self.root=self.base/'protected-vault'
        self.ik,self.ok,self.bk,self.ck,self.ek=(os.urandom(32) for _ in range(5))
        self.v=DurableVault(self.root,identity_key=self.ik,owner_key=self.ok,backup_key=self.bk,content_key=self.ck)
        self.addCleanup(self.v.close)
        self.signer=Ed25519PrivateKey.generate()
        self.external=InMemorySeparateCustodian({'sim-anchor-key':self.signer.public_key()})

    def sess(self,role='vault_steward',actor='fake-founder',account='acct-X'):
        return mint_test_token('identity',{'sub':actor,'account_id':account,'role':role,'jti':os.urandom(8).hex(),'exp':int(time())+3600},self.ik)

    def grant(self,purpose='ingest',data=DATA,actor='fake-founder',scope=None):
        return self.v.record_approval(mint_test_token('approval',{
            'approval_id':'approval-'+os.urandom(9).hex(),
            'source_id':'synthetic-origin','source_version':1,'source_sha256':digest(DATA),
            'actor_id':actor,'account_id':'acct-X','owner_id':'fake-founder',
            'purpose':purpose,'scope':scope or {},'rights_evidence_ref':'synthetic-proof',
            'exp':int(time())+3600},self.ok))

    def ingest(self):
        self.v.register_source(self.sess(),self.grant(),source_id='synthetic-origin',account_id='acct-X',owner_id='fake-founder',data=DATA)

    def derivative(self):
        self.ingest()
        self.v.make_concept(self.sess(),self.grant('concept'),'synthetic-origin',1,'concept-1')
        return self.v.make_derivative(self.sess('editor','fake-editor'),self.grant('derivative',actor='fake-editor',scope={'derivative_kind':'lesson'}),'concept-1','lesson-1','lesson',DERIVATIVE)

    def snapshot(self,name='fake-ov5-1'):
        return seal_sqlite_snapshot(self.v,self.root/(name+'.ovb'),self.ek,name)

    def checkpoint(self,n):
        cp=make_external_checkpoint(self.v,self.signer,vault_id='isolated-vault',checkpoint_id=n)
        return self.external.publish_synthetic(self.v,'isolated-vault','sim-anchor-key',cp)

    def test_v01_active_source_encrypted_on_disk_and_wal(self):
        self.ingest()
        rec=self.v.db.execute('SELECT data FROM source_versions').fetchone()[0]
        self.assertNotEqual(rec,DATA)
        self.assertNotIn(DATA,rec)
        self.assertNotIn(DATA,self.v.path.read_bytes())
        wal=self.root/'synthetic_vault.sqlite3-wal'
        if wal.exists():self.assertNotIn(DATA,wal.read_bytes())
        self.assertTrue(self.v.verify_integrity())

    def test_v02_preview_requires_original_approval_and_decrypts(self):
        self.ingest()
        with self.assertRaises(AccessDenied):self.v.preview_source(self.sess(),'missing','synthetic-origin',1)
        self.assertEqual(self.v.preview_source(self.sess(),self.grant('preview'),'synthetic-origin',1),DATA)

    def test_v03_derivative_encrypted_in_SQLite(self):
        v=self.derivative()
        r=self.v.db.execute('SELECT data FROM derivative_versions WHERE version=?',(v,)).fetchone()[0]
        self.assertNotIn(DERIVATIVE,r)
        self.assertTrue(self.v.verify_integrity())
        self.assertTrue(self.v.preview_handoff(self.sess('editor','fake-editor'),self.grant('education_handoff',actor='fake-editor',scope={'department':'educational_platform'}),'lesson-1',v,'education_handoff')['review_only'])

    def test_v04_protected_mode_wrong_key_rejected_after_restart(self):
        self.ingest();self.v.close()
        with self.assertRaises(AccessDenied):DurableVault(self.root,identity_key=self.ik,owner_key=self.ok,backup_key=self.bk,content_key=os.urandom(32),create=False)

    def test_v05_protected_mode_refuses_missing_key(self):
        self.ingest();self.v.close()
        with self.assertRaises(AccessDenied):DurableVault(self.root,identity_key=self.ik,owner_key=self.ok,backup_key=self.bk,create=False)

    def test_v06_legacy_mode_refuses_protected_content_key(self):
        old=self.base/'old';v=DurableVault(old,identity_key=self.ik,owner_key=self.ok,backup_key=self.bk);v.close()
        with self.assertRaises(AccessDenied):DurableVault(old,identity_key=self.ik,owner_key=self.ok,backup_key=self.bk,content_key=self.ck,create=False)

    def test_v07_protected_key_must_be_independent(self):
        with self.assertRaises(AccessDenied):DurableVault(self.base/'new-key',identity_key=self.ik,owner_key=self.ok,backup_key=self.bk,content_key=self.ik)

    def test_v08_no_plaintext_legacy_export_even_with_authorized_grant(self):
        self.derivative()
        with self.assertRaises(AccessDenied):self.v.controlled_local_export(self.sess(),self.grant('controlled_export',scope={'destination':'approved_local_outbox'}),'lesson-1',1,'fake.txt')
        self.assertFalse((self.root/'outbox'/'fake.txt').exists())

    def test_v09_no_plaintext_backup_generation(self):
        self.ingest()
        with self.assertRaises(AccessDenied):self.v.backup('bad-plaintext')
        self.assertFalse((self.root/'backups'/'bad-plaintext.sqlite3').exists())

    def test_v10_replacing_ciphertext_with_plaintext_rejected(self):
        self.ingest()
        self.v.db.execute('DROP TRIGGER protect_source_original_update')
        self.v.db.execute('UPDATE source_versions SET data=?',(DATA,))
        self.assertFalse(self.v.verify_integrity())

    def test_v11_tampered_ciphertext_fails_integrity(self):
        self.ingest();b=bytearray(self.v.db.execute('SELECT data FROM source_versions').fetchone()[0]);b[-4]^=1
        self.v.db.execute('DROP TRIGGER protect_source_original_update');self.v.db.execute('UPDATE source_versions SET data=?',(bytes(b),))
        self.assertFalse(self.v.verify_integrity())

    def test_v12_sealed_snapshot_recovers_protected_blob_only_with_content_key(self):
        self.ingest();p=self.snapshot();raw=p.read_bytes();self.assertNotIn(DATA,raw)
        x=restore_sealed_snapshot(p,self.base/'restored',self.ek,'fake-ov5-1',identity_key=self.ik,owner_key=self.ok,backup_key=self.bk,content_key=self.ck)
        try:
            self.assertTrue(x.verify_integrity())
            self.assertEqual(x.preview_source(self.sess(),x.record_approval(mint_test_token('approval',{
                'approval_id':'q1','source_id':'synthetic-origin','source_version':1,'source_sha256':digest(DATA),
                'actor_id':'fake-founder','account_id':'acct-X','owner_id':'fake-founder','purpose':'preview','scope':{},
                'rights_evidence_ref':'synthetic-proof','exp':int(time()+3600)},self.ok)),'synthetic-origin',1),DATA)
        finally:x.close()

    def test_v13_checkpoint_issued_to_independent_simulated_registry(self):
        self.ingest();cp=self.checkpoint(1)
        self.assertEqual(cp.sequence,1)
        self.assertTrue(self.external.verify_state(self.v,'isolated-vault'))

    def test_v14_checkpoint_replay_denied(self):
        self.ingest();self.checkpoint(1)
        with self.assertRaises(AccessDenied):self.checkpoint(1)

    def test_v15_checkpoint_regression_denied(self):
        self.ingest();self.checkpoint(2)
        with self.assertRaises(AccessDenied):self.checkpoint(1)

    def test_v16_missing_latest_anchor_fails_closed(self):
        self.ingest();p=self.snapshot()
        empty=InMemorySeparateCustodian({'sim-anchor-key':self.signer.public_key()})
        with self.assertRaises(AccessDenied):restore_to_quarantine(p,self.base/'q-missing',self.ek,'fake-ov5-1',vault_id='isolated-vault',custodian=empty,identity_key=self.ik,owner_key=self.ok,signing_backup_key=self.bk,content_key=self.ck)
        self.assertFalse((self.base/'q-missing').exists())

    def test_v17_matching_latest_backup_restores_quarantined_not_released(self):
        self.ingest();self.checkpoint(1);p=self.snapshot()
        q=restore_to_quarantine(p,self.base/'q-good',self.ek,'fake-ov5-1',vault_id='isolated-vault',custodian=self.external,identity_key=self.ik,owner_key=self.ok,signing_backup_key=self.bk,content_key=self.ck)
        self.assertEqual(q.state,'QUARANTINED');self.assertFalse(q.release_allowed)
        marker=json.loads((q.destination/'QUARANTINE_NOT_RELEASED.json').read_text())
        self.assertFalse(marker['release_allowed'])

    def test_v18_old_signed_backup_cannot_resurrect_revoked_approval(self):
        self.ingest();self.checkpoint(1);old=self.snapshot('fake-old')
        g=self.grant('preview');self.v.revoke_approval(self.sess(),g)
        self.checkpoint(2)
        with self.assertRaises(AccessDenied):restore_to_quarantine(old,self.base/'q-rollback',self.ek,'fake-old',vault_id='isolated-vault',custodian=self.external,identity_key=self.ik,owner_key=self.ok,signing_backup_key=self.bk,content_key=self.ck)
        self.assertFalse((self.base/'q-rollback').exists())

    def test_v19_foreign_checkpoint_cannot_qualify_recovery(self):
        self.ingest();self.checkpoint(1);p=self.snapshot()
        with self.assertRaises(AccessDenied):restore_to_quarantine(p,self.base/'q-wrong-vault',self.ek,'fake-ov5-1',vault_id='wrong-vault',custodian=self.external,identity_key=self.ik,owner_key=self.ok,signing_backup_key=self.bk,content_key=self.ck)

    def test_v20_rejected_wrong_backup_key_does_not_leave_decrypted_files(self):
        self.ingest();self.checkpoint(1);p=self.snapshot()
        with self.assertRaises(AccessDenied):restore_to_quarantine(p,self.base/'q-wrong-key',os.urandom(32),'fake-ov5-1',vault_id='isolated-vault',custodian=self.external,identity_key=self.ik,owner_key=self.ok,signing_backup_key=self.bk,content_key=self.ck)
        self.assertFalse((self.base/'q-wrong-key').exists())

    def _assertion(self,*,key=None,kid='fake-key',changes=None):
        now=int(time());p={'iss':'https://fake.invalid','aud':'vault-private-service','sub':'synthetic-founder',
          'account_id':'acct-X','role':'vault_steward','jti':'fake-session-1','iat':now-30,'exp':now+100,
          'auth_time':now-40,'mfa_time':now-10,'amr':['webauthn']}
        p.update(changes or {})
        h={'alg':'EdDSA','typ':'JWT','kid':kid}
        enc=lambda v:base64.urlsafe_b64encode(canonical(v)).rstrip(b'=').decode()
        msg=(enc(h)+'.'+enc(p)).encode();sig=(key or self.signer).sign(msg)
        return msg.decode()+'.'+base64.urlsafe_b64encode(sig).rstrip(b'=').decode()

    def _verifier(self):
        return PinnedAssertionVerifier(expected_issuer='https://fake.invalid',expected_audience='vault-private-service',key_id='fake-key',public_key=self.signer.public_key(),trusted_actor='synthetic-founder',trusted_account='acct-X')

    def test_v21_pinned_fake_idp_signature_plus_mfa_checked(self):
        v=self._verifier();r=v.verify(self._assertion(),now=int(time()))
        self.assertEqual(r.actor_id,'synthetic-founder');self.assertEqual(r.role,'vault_steward')

    def test_v22_forged_fake_idp_signature_denied(self):
        with self.assertRaises(AccessDenied):self._verifier().verify(self._assertion(key=Ed25519PrivateKey.generate()),now=int(time()))

    def test_v23_wrong_audience_or_cross_tenant_denied(self):
        for changes in ({'aud':'anything'}, {'account_id':'other-account'},{'role':'custodian'}, {'sub':'somebody-else'}):
            with self.subTest(changes=changes):
                with self.assertRaises(AccessDenied):self._verifier().verify(self._assertion(changes=changes),now=int(time()))

    def test_v24_stale_passkey_assertion_denied(self):
        with self.assertRaises(AccessDenied):self._verifier().verify(self._assertion(changes={'mfa_time':int(time())-600}),now=int(time()))

    def test_v25_browser_claim_without_verified_signature_denied(self):
        fake=self._assertion();h,p,sig=fake.split('.');payload=json.loads(base64.urlsafe_b64decode(p+'='*(-len(p)%4)));payload['role']='vault_superadmin';payload['account_id']='acct-X'
        forged=base64.urlsafe_b64encode(canonical(payload)).rstrip(b'=').decode()
        with self.assertRaises(AccessDenied):self._verifier().verify(h+'.'+forged+'.'+sig,now=int(time()))

    def test_v26_revoked_idp_session_denied(self):
        v=self._verifier();v.revoke_session('fake-session-1')
        with self.assertRaises(AccessDenied):v.verify(self._assertion(),now=int(time()))

    def test_v27_wrong_kid_denied(self):
        with self.assertRaises(AccessDenied):self._verifier().verify(self._assertion(kid='untrusted'),now=int(time()))


if __name__=='__main__':unittest.main()