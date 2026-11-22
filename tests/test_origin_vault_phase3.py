"""Phase III SYNTHETIC-ONLY tests: durable SQLite, HMAC scope, backup, restart and handoff."""
from __future__ import annotations
import hashlib
import json
import os
import shutil
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from time import time

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from internal.origin_vault.durable import DurableVault, mint_test_token, verify_token, digest
from internal.origin_vault.policy import AccessDenied

DATA=b'SYNTHETIC educational source. No private founder materials.'
OWNER='test-owner'; ACCOUNT='test-account'; EDITOR='test-editor'; OTHER='different-test-account'

class PhaseIII(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='synthetic-origin-vault-')
        self.base=Path(self.temp.name)
        self.auth_key=os.urandom(32)
        self.owner_key=os.urandom(32)
        self.backup_key=os.urandom(32)
        self.path=self.base/'local-private-vault'
        self.v=DurableVault(self.path,identity_key=self.auth_key,owner_key=self.owner_key,backup_key=self.backup_key)
        self.owner=self.session(OWNER,ACCOUNT,'vault_steward')
        self.editor=self.session(EDITOR,ACCOUNT,'editor')
        self.other=self.session('outsider',OTHER,'vault_steward')

    def tearDown(self):
        if getattr(self,'v',None) is not None:
            self.v.close()
        self.temp.cleanup()

    def session(self, actor=OWNER,account=ACCOUNT,role='vault_steward',exp=None):
        return mint_test_token('identity', {'sub':actor,'account_id':account,'role':role,
            'jti':os.urandom(8).hex(),'exp':int(exp if exp is not None else time()+3600)},self.auth_key)

    def token(self,purpose,*,data=DATA,source_id='s1',source_version=1,actor_id=OWNER,
              account=ACCOUNT,owner=OWNER,scope=None,exp=None,hash_override=None,evidence='synthetic-proof'):
        return mint_test_token('approval',{
            'approval_id':'approval-'+os.urandom(8).hex(), 'source_id':source_id,
            'source_version':source_version,'source_sha256':hash_override or digest(data),
            'actor_id':actor_id,'account_id':account,'owner_id':owner,
            'purpose':purpose,'scope':scope or {},'rights_evidence_ref':evidence,
            'exp':int(exp if exp is not None else time()+3600)},self.owner_key)

    def permit(self,purpose,**kw):
        t=self.token(purpose,**kw)
        return self.v.record_approval(t)

    def source(self,source_id='s1',data=DATA):
        g=self.permit('ingest',source_id=source_id,data=data)
        self.v.register_source(self.owner,g,source_id=source_id,account_id=ACCOUNT,owner_id=OWNER,data=data)
        return g

    def concept(self):
        self.source()
        g=self.permit('concept')
        self.v.make_concept(self.owner,g,'s1',1,'c1')

    def derivative(self,kind='lesson',data=b'SYNTHETIC lesson draft review only'):
        self.concept()
        grant=self.permit('derivative',actor_id=EDITOR,scope={'derivative_kind':kind})
        version=self.v.make_derivative(self.editor,grant,'c1','d1',kind,data)
        return version

    def reopen(self):
        self.v.close()
        self.v=DurableVault(self.path,identity_key=self.auth_key,owner_key=self.owner_key,backup_key=self.backup_key,create=False)

    def test_p01_persists_source_payload_reopen(self):
        self.source()
        self.reopen()
        g=self.permit('preview')
        self.assertEqual(self.v.preview_source(self.owner,g,'s1',1),DATA)

    def test_p02_permissions_are_private_on_disk(self):
        self.source()
        self.assertEqual(self.path.stat().st_mode & 0o077,0)
        self.assertEqual(self.v.path.stat().st_mode & 0o077,0)

    def test_p03_content_hash_does_not_establish_rights(self):
        a=self.permit('ingest')
        with self.assertRaises(AccessDenied):
            self.v.register_source(self.owner,a,source_id='s1',account_id=ACCOUNT,owner_id=OWNER,
              data=DATA,classification='uncertain_rights',rights='original_verified')

    def test_p04_transaction_rollback_on_interrupted_ingest(self):
        a=self.permit('ingest')
        with self.assertRaises(RuntimeError):
            self.v.register_source(self.owner,a,source_id='s1',account_id=ACCOUNT,owner_id=OWNER,data=DATA,interrupt=True)
        self.assertEqual(self.v.db.execute('select count(*) from sources').fetchone()[0],0)
        self.v.register_source(self.owner,a,source_id='s1',account_id=ACCOUNT,owner_id=OWNER,data=DATA)
        self.assertTrue(self.v.verify_integrity())

    def test_p05_duplicate_id_denied(self):
        self.source()
        g=self.permit('ingest',data=b'new synthetic bytes')
        with self.assertRaises(AccessDenied):
            self.v.register_source(self.owner,g,source_id='s1',account_id=ACCOUNT,owner_id=OWNER,data=b'new synthetic bytes')
        self.assertTrue(self.v.verify_integrity())

    def test_p06_duplicate_bytes_across_sources_denied(self):
        self.source()
        g=self.permit('ingest',source_id='s2')
        with self.assertRaises(AccessDenied):
            self.v.register_source(self.owner,g,source_id='s2',account_id=ACCOUNT,owner_id=OWNER,data=DATA)
        self.assertTrue(self.v.verify_integrity())

    def test_p07_source_new_version_retains_original(self):
        self.source()
        new=b'SYNTHETIC second revision'
        g=self.permit('ingest',source_version=2,data=new)
        self.assertEqual(self.v.add_source_version(self.owner,g,'s1',new),2)
        self.reopen()
        g1=self.permit('preview',source_version=1)
        g2=self.permit('preview',source_version=2,data=new)
        self.assertEqual(self.v.preview_source(self.owner,g1,'s1',1),DATA)
        self.assertEqual(self.v.preview_source(self.owner,g2,'s1',2),new)

    def test_p08_source_version_cannot_be_mutated(self):
        self.source()
        with self.assertRaises(sqlite3.IntegrityError):
            self.v.db.execute("UPDATE source_versions SET data=? WHERE source_id='s1'",(b'changed',))

    def test_p09_source_version_cannot_be_deleted(self):
        self.source()
        with self.assertRaises(sqlite3.IntegrityError):
            self.v.db.execute("DELETE FROM source_versions WHERE source_id='s1'")

    def test_p10_interrupted_source_version_rolls_back(self):
        self.source()
        new=b'SYNTHETIC next revision'
        g=self.permit('ingest',source_version=2,data=new)
        with self.assertRaises(RuntimeError): self.v.add_source_version(self.owner,g,'s1',new,interrupt=True)
        self.assertEqual(self.v.add_source_version(self.owner,g,'s1',new),2)

    def test_p11_signed_grant_scoped_and_stored(self):
        self.source()
        a=self.permit('preview')
        row=self.v.db.execute("select token from approvals where approval_id=?",(a,)).fetchone()
        self.assertEqual(verify_token(row['token'],'approval',self.owner_key)['source_id'],'s1')

    def test_p12_forged_signature_denied(self):
        t=self.token('ingest')
        altered=t[:-3]+('AAA' if t[-3:]!='AAA' else 'BBB')
        with self.assertRaises(AccessDenied): self.v.record_approval(altered)

    def test_p13_wrong_owner_credential_denied(self):
        token=self.token('ingest')
        with self.assertRaises(AccessDenied): verify_token(token,'approval',os.urandom(32))

    def test_p14_replayed_approval_denied(self):
        self.source()
        g=self.permit('preview')
        self.v.preview_source(self.owner,g,'s1',1)
        with self.assertRaises(AccessDenied): self.v.preview_source(self.owner,g,'s1',1)

    def test_p15_expired_session_denied(self):
        self.source()
        a=self.permit('preview')
        with self.assertRaises(AccessDenied): self.v.preview_source(self.session(exp=time()-4),a,'s1',1)

    def test_p16_expired_permission_denied(self):
        self.source()
        t=self.token('preview',exp=time()-4)
        with self.assertRaises(AccessDenied): self.v.record_approval(t)

    def test_p17_cross_account_token_denied(self):
        self.source()
        g=self.permit('preview')
        with self.assertRaises(AccessDenied): self.v.preview_source(self.other,g,'s1',1)

    def test_p18_cross_actor_permission_denied(self):
        self.source()
        g=self.permit('preview')
        with self.assertRaises(AccessDenied): self.v.preview_source(self.editor,g,'s1',1)

    def test_p19_source_version_substitution_denied(self):
        self.source()
        new=b'SYNTHETIC v2 bytes'
        g=self.permit('ingest',source_version=2,data=new)
        self.v.add_source_version(self.owner,g,'s1',new)
        g=self.permit('preview',source_version=1)
        with self.assertRaises(AccessDenied): self.v.preview_source(self.owner,g,'s1',2)

    def test_p20_source_hash_substitution_denied(self):
        self.source()
        g=self.permit('preview',hash_override='0'*64)
        with self.assertRaises(AccessDenied): self.v.preview_source(self.owner,g,'s1',1)

    def test_p21_permission_revocation_persists(self):
        self.source()
        g=self.permit('preview')
        self.v.revoke_approval(self.owner,g)
        self.reopen()
        with self.assertRaises(AccessDenied): self.v.preview_source(self.owner,g,'s1',1)

    def test_p22_wrong_account_revocation_denied(self):
        self.source()
        g=self.permit('preview')
        with self.assertRaises(AccessDenied): self.v.revoke_approval(self.other,g)

    def test_p23_source_revocation_blocks_existing_authority(self):
        self.source()
        g=self.permit('preview')
        self.v.revoke_source(self.owner,'s1')
        with self.assertRaises(AccessDenied): self.v.preview_source(self.owner,g,'s1',1)

    def test_p24_role_restriction_blocks_editor_ingest(self):
        g=self.permit('ingest',actor_id=EDITOR)
        with self.assertRaises(AccessDenied):
            self.v.register_source(self.editor,g,source_id='s1',account_id=ACCOUNT,owner_id=OWNER,data=DATA)

    def test_p25_concept_persists_linkage(self):
        self.concept()
        self.reopen()
        row=self.v.db.execute('select source_id,source_version,source_sha256,status from concepts').fetchone()
        self.assertEqual((row['source_id'],row['source_version'],row['source_sha256'],row['status']),
                         ('s1',1,digest(DATA),'candidate_review_only'))

    def test_p26_all_five_review_only_derivative_formats(self):
        self.concept()
        for kind in ('lesson','workbook','flame_letter','short_video','course_module'):
            g=self.permit('derivative',scope={'derivative_kind':kind},actor_id=EDITOR)
            self.v.make_derivative(self.editor,g,'c1','d-'+kind,kind,('SYNTHETIC '+kind).encode())
        self.assertEqual(self.v.db.execute('select count(*) from derivative_versions').fetchone()[0],5)

    def test_p27_derivative_version_is_immutable(self):
        self.derivative()
        with self.assertRaises(sqlite3.IntegrityError):
            self.v.db.execute('UPDATE derivative_versions SET data=?',(b'mutate',))

    def test_p28_derivative_revision_is_append_only(self):
        self.derivative()
        g=self.permit('derivative',actor_id=EDITOR,scope={'derivative_kind':'lesson'})
        v=self.v.make_derivative(self.editor,g,'c1','d1','lesson',b'SYNTHETIC revised lesson')
        self.assertEqual(v,2)
        self.assertEqual(self.v.db.execute('select count(*) from derivative_versions').fetchone()[0],2)

    def test_p29_derivative_reparenting_refused(self):
        self.derivative()
        g=self.permit('derivative',actor_id=EDITOR,scope={'derivative_kind':'workbook'})
        with self.assertRaises(AccessDenied):
            self.v.make_derivative(self.editor,g,'c1','d1','workbook',b'new synthetic workbook')

    def test_p30_derivative_interruption_is_rolled_back(self):
        self.concept()
        g=self.permit('derivative',actor_id=EDITOR,scope={'derivative_kind':'lesson'})
        with self.assertRaises(RuntimeError):
            self.v.make_derivative(self.editor,g,'c1','d1','lesson',b'SYNTHETIC lesson',interrupt=True)
        self.assertEqual(self.v.db.execute('select count(*) from derivative_versions').fetchone()[0],0)
        self.assertEqual(self.v.make_derivative(self.editor,g,'c1','d1','lesson',b'SYNTHETIC lesson'),1)

    def test_p31_export_requires_distinct_permission(self):
        self.derivative()
        wrong=self.permit('preview')
        with self.assertRaises(AccessDenied):
            self.v.controlled_local_export(self.owner,wrong,'d1',1,'draft.txt')

    def test_p32_authorized_export_writes_review_only_bytes(self):
        self.derivative()
        g=self.permit('controlled_export',scope={'destination':'approved_local_outbox'})
        path=self.v.controlled_local_export(self.owner,g,'d1',1,'draft.txt')
        self.assertEqual(path.read_bytes(),b'SYNTHETIC lesson draft review only')
        self.assertEqual(path.stat().st_mode & 0o077,0)
        self.assertEqual(self.v.db.execute("select state from local_exports").fetchone()[0],'complete')

    def test_p33_external_destination_rejected(self):
        self.derivative()
        g=self.permit('controlled_export',scope={'destination':'unapproved-public-path'})
        with self.assertRaises(AccessDenied): self.v.controlled_local_export(self.owner,g,'d1',1,'test.txt')

    def test_p34_traversal_export_filename_rejected(self):
        self.derivative()
        g=self.permit('controlled_export',scope={'destination':'approved_local_outbox'})
        for filename in ('../../bad.txt','/tmp/bad.txt','../bad.txt','evil\\file.txt'):
            with self.assertRaises(AccessDenied): self.v.controlled_local_export(self.owner,g,'d1',1,filename)

    def test_p35_export_overwrite_denied(self):
        self.derivative()
        p=self.v.path.parent/'outbox'
        p.mkdir(mode=0o700,exist_ok=True)
        (p/'draft.txt').write_bytes(b'pre-existing synthetic')
        g=self.permit('controlled_export',scope={'destination':'approved_local_outbox'})
        with self.assertRaises(AccessDenied): self.v.controlled_local_export(self.owner,g,'d1',1,'draft.txt')

    def test_p36_pending_export_interruption_recovered(self):
        self.derivative()
        g=self.permit('controlled_export',scope={'destination':'approved_local_outbox'})
        with self.assertRaises(RuntimeError): self.v.controlled_local_export(self.owner,g,'d1',1,'draft.txt',interrupt='after_pending')
        self.reopen()
        self.assertEqual(self.v.db.execute('select state from local_exports').fetchone()[0],'aborted')
        self.assertFalse((self.path/'outbox'/'draft.txt').exists())

    def test_p37_replaced_export_interruption_is_removed(self):
        self.derivative()
        g=self.permit('controlled_export',scope={'destination':'approved_local_outbox'})
        with self.assertRaises(RuntimeError): self.v.controlled_local_export(self.owner,g,'d1',1,'draft.txt',interrupt='after_replace')
        self.assertTrue((self.path/'outbox'/'draft.txt').exists())
        self.reopen()
        self.assertFalse((self.path/'outbox'/'draft.txt').exists())
        self.assertEqual(self.v.db.execute('select state from local_exports').fetchone()[0],'aborted')

    def test_p38_valid_department_handoff_metadata_only(self):
        self.derivative()
        for purpose,dest in [('education_handoff','educational_platform'),('newsletter_handoff','eternal_flame'),
                              ('commerce_handoff','revenue_forge'),('social_handoff','content_social')]:
            g=self.permit(purpose,actor_id=EDITOR,scope={'department':dest})
            out=self.v.preview_handoff(self.editor,g,'d1',1,purpose)
            self.assertEqual(out['department'],dest)
            self.assertTrue(out['review_only'])
            self.assertNotIn('data',out)
            self.assertNotIn('body',out)

    def test_p39_wrong_department_scope_denied(self):
        self.derivative()
        g=self.permit('education_handoff',actor_id=EDITOR,scope={'department':'revenue_forge'})
        with self.assertRaises(AccessDenied): self.v.preview_handoff(self.editor,g,'d1',1,'education_handoff')

    def test_p40_unsupported_marketing_sale_action_denied(self):
        self.derivative()
        g=self.permit('publish',actor_id=EDITOR)
        with self.assertRaises(AccessDenied):
            self.v._check_and_consume(self.v.db,self.editor,g,
                self.v._source(self.v.db,'s1',1)[2],OWNER,'publish')

    def test_p41_executive_aggregate_redacts_source_details(self):
        self.derivative()
        g=self.permit('executive_aggregate')
        out=self.v.executive_aggregate(self.owner,g,'s1',1)
        self.assertEqual((out['sources'],out['derivative_versions']),(1,1))
        self.assertNotIn('source_id',out)
        self.assertNotIn('data',out)

    def test_p42_audit_chain_passes_after_reopen(self):
        self.source()
        self.reopen()
        self.assertTrue(self.v.verify_integrity())

    def test_p43_modified_audit_hash_detected(self):
        self.source()
        self.v.db.execute("UPDATE audit SET event_hash='f' WHERE seq=1")
        self.assertFalse(self.v.verify_integrity())

    def test_p44_audit_sequence_reordering_detected(self):
        self.source()
        self.v.db.execute("UPDATE audit SET previous_hash='bogus' WHERE seq=2")
        self.assertFalse(self.v.verify_integrity())

    def test_p45_valid_backup_and_restore(self):
        self.derivative()
        b,m=self.v.backup('snapshot')
        self.assertTrue(DurableVault.verify_backup(b,m,self.backup_key))
        restored=DurableVault.restore(b,m,self.base/'restored',identity_key=self.auth_key,owner_key=self.owner_key,backup_key=self.backup_key)
        try:
            self.assertTrue(restored.verify_integrity())
            self.assertEqual(restored.db.execute('select count(*) from derivative_versions').fetchone()[0],1)
        finally:
            restored.close()

    def test_p46_backup_rejects_changed_bytes(self):
        self.source()
        b,m=self.v.backup('snapshot')
        with b.open('ab') as f: f.write(b'corruption')
        self.assertFalse(DurableVault.verify_backup(b,m,self.backup_key))

    def test_p47_backup_rejects_manipulated_manifest(self):
        self.source()
        b,m=self.v.backup('snapshot')
        payload=json.loads(m.read_bytes());payload['audit_head']='0'*64
        m.write_text(json.dumps(payload))
        self.assertFalse(DurableVault.verify_backup(b,m,self.backup_key))

    def test_p48_backup_rejects_wrong_key(self):
        self.source()
        b,m=self.v.backup('snapshot')
        self.assertFalse(DurableVault.verify_backup(b,m,os.urandom(32)))

    def test_p49_restore_requires_missing_manifest(self):
        self.source()
        b,m=self.v.backup('snapshot')
        m.unlink()
        with self.assertRaises(AccessDenied): DurableVault.restore(b,m,self.base/'restored',
            identity_key=self.auth_key,owner_key=self.owner_key,backup_key=self.backup_key)

    def test_p50_restore_never_overwrites_existing_environment(self):
        self.source()
        b,m=self.v.backup('snapshot')
        with self.assertRaises(AccessDenied): DurableVault.restore(b,m,self.path,
            identity_key=self.auth_key,owner_key=self.owner_key,backup_key=self.backup_key)

    def test_p51_corrupted_source_payload_detected(self):
        self.source()
        self.v.db.execute('DROP TRIGGER protect_source_original_update')  # hostile local DB owner simulation
        self.v.db.execute('UPDATE source_versions SET data=?',(b'wrong content',))
        self.assertFalse(self.v.verify_integrity())

    def test_p52_missing_source_version_detected(self):
        self.source()
        self.v.db.execute('DROP TRIGGER protect_source_original_delete')
        self.v.db.execute('DELETE FROM source_versions')
        self.assertFalse(self.v.verify_integrity())

    def test_p53_restore_no_signature_cannot_be_declared_valid(self):
        self.source()
        b,m=self.v.backup('snapshot')
        x=json.loads(m.read_bytes());x.pop('hmac_sha256');m.write_text(json.dumps(x))
        self.assertFalse(DurableVault.verify_backup(b,m,self.backup_key))

    def test_p54_source_path_inside_git_tree_denied(self):
        root=self.base/'gitroot'; root.mkdir(mode=0o700)
        (root/'.git').mkdir(mode=0o700)
        with self.assertRaises(AccessDenied): DurableVault(root/'vault',identity_key=self.auth_key,
            owner_key=self.owner_key,backup_key=self.backup_key)

    def test_p55_forbidden_broad_permissions_denied(self):
        root=self.base/'badperm';root.mkdir(mode=0o755)
        with self.assertRaises(AccessDenied): DurableVault(root,identity_key=self.auth_key,
            owner_key=self.owner_key,backup_key=self.backup_key)

    def test_p56_restored_previously_revoked_permission_stays_revoked(self):
        self.source()
        g=self.permit('preview')
        self.v.revoke_approval(self.owner,g)
        b,m=self.v.backup('snapshot')
        restored=DurableVault.restore(b,m,self.base/'restored',identity_key=self.auth_key,owner_key=self.owner_key,backup_key=self.backup_key)
        try:
            with self.assertRaises(AccessDenied): restored.preview_source(self.owner,g,'s1',1)
        finally: restored.close()

    def test_p57_partial_backup_source_not_accepted(self):
        self.source()
        b,m=self.v.backup('snapshot')
        b.write_bytes(b.read_bytes()[:64])
        self.assertFalse(DurableVault.verify_backup(b,m,self.backup_key))

    def test_p58_backup_snapshot_source_isolated_from_further_writes(self):
        self.source()
        b,m=self.v.backup('before')
        new=b'SYNTHETIC second version'
        g=self.permit('ingest',source_version=2,data=new)
        self.v.add_source_version(self.owner,g,'s1',new)
        restored=DurableVault.restore(b,m,self.base/'restored',identity_key=self.auth_key,owner_key=self.owner_key,backup_key=self.backup_key)
        try:
            self.assertEqual(restored.db.execute('select count(*) from source_versions').fetchone()[0],1)
            self.assertEqual(self.v.db.execute('select count(*) from source_versions').fetchone()[0],2)
        finally: restored.close()

    def test_p59_rejected_cross_account_hand_off(self):
        self.derivative()
        g=self.permit('education_handoff',actor_id=EDITOR,scope={'department':'educational_platform'})
        with self.assertRaises(AccessDenied): self.v.preview_handoff(self.other,g,'d1',1,'education_handoff')

    def test_p60_forged_identity_denied(self):
        self.source()
        g=self.permit('preview')
        fake=mint_test_token('identity',{'sub':OWNER,'account_id':ACCOUNT,'role':'vault_steward',
                                      'jti':'fake','exp':int(time()+3600)},os.urandom(32))
        with self.assertRaises(AccessDenied): self.v.preview_source(fake,g,'s1',1)

    def test_p61_restored_pending_export_record_recovers_without_outbox(self):
        self.derivative()
        g=self.permit('controlled_export',scope={'destination':'approved_local_outbox'})
        with self.assertRaises(RuntimeError):
            self.v.controlled_local_export(self.owner,g,'d1',1,'draft.txt',interrupt='after_pending')
        b,m=self.v.backup('pending-state')
        restored=DurableVault.restore(b,m,self.base/'restored',identity_key=self.auth_key,
                                     owner_key=self.owner_key,backup_key=self.backup_key)
        try:
            self.assertEqual(restored.db.execute('SELECT state FROM local_exports').fetchone()[0],'aborted')
            self.assertFalse((self.base/'restored'/'outbox'/'draft.txt').exists())
        finally: restored.close()

    def test_p62_tampered_approval_record_is_not_accepted(self):
        self.source()
        g=self.permit('preview')
        self.v.db.execute('UPDATE approvals SET token=? WHERE approval_id=?',('invalid-token',g))
        with self.assertRaises(AccessDenied): self.v.preview_source(self.owner,g,'s1',1)

    def test_p63_duplicate_version_bytes_rejected(self):
        self.source()
        grant=self.permit('ingest',source_version=2)
        with self.assertRaises(AccessDenied): self.v.add_source_version(self.owner,grant,'s1',DATA)
        self.assertTrue(self.v.verify_integrity())

    def test_p64_export_failure_does_not_automatically_retry_grant(self):
        self.derivative()
        grant=self.permit('controlled_export',scope={'destination':'approved_local_outbox'})
        with self.assertRaises(RuntimeError):
            self.v.controlled_local_export(self.owner,grant,'d1',1,'draft.txt',interrupt='after_write')
        self.reopen()
        with self.assertRaises(AccessDenied): self.v.controlled_local_export(self.owner,grant,'d1',1,'draft.txt')

    def test_p65_invalid_rights_evidence_record_denied(self):
        grant=self.permit('ingest',evidence='fake-other-record')
        with self.assertRaises(AccessDenied):
            self.v.register_source(self.owner,grant,source_id='s1',account_id=ACCOUNT,owner_id=OWNER,data=DATA)

if __name__=='__main__': unittest.main()