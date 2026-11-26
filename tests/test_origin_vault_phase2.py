"""Synthetic-only standard-library security tests, distinct from Phase 1's original ten."""
import dataclasses
import hashlib
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'internal'))
from origin_vault.policy import *

NOW = datetime(2026,11,22,12,tzinfo=timezone.utc)
# Keep fixture approvals valid for future CI runs; expiration rejection is tested explicitly.
SYN = b'This is a synthetic educational source. No real biography or private material.'
DIGEST = hashlib.sha256(SYN).hexdigest()

def fixture(classification='public_educational_original', rights='original_verified'):
    return Source('synthetic-source-1','test-account',classification,rights,'synthetic-proof-1',True,DIGEST)

def actor(role='vault_steward', user='steward', acct='test-account', verified=True):
    return Actor(user,role,acct,verified)

def grant(purpose='ingest', kind=None, user='steward', account='test-account', dept=None, destination=None):
    return Approval('synthetic-approved-'+purpose, 'synthetic-source-1', account, user,purpose,True,
                    'synthetic-proof-1',NOW+timedelta(days=3650),derivative_kind=kind,department=dept,destination=destination)

class PolicyCases(unittest.TestCase):
    def setUp(self): self.src=fixture(); self.actor=actor()
    def check(self,src=None,g=None,who=None,purpose='ingest',**kw):
        authorize(who or self.actor,src or self.src,g or grant(purpose),purpose,now=NOW,**kw)
    def deny(self,*args,**kwargs):
        with self.assertRaises(AccessDenied): self.check(*args,**kwargs)
    def test_01_authorized_synthetic_ingestion(self): self.check()
    def test_02_unverified_actor_denied(self): self.deny(who=actor(verified=False))
    def test_03_cross_account_denied(self): self.deny(who=actor(acct='other-account'))
    def test_04_wrong_actor_denied(self): self.deny(who=actor(user='attacker'))
    def test_05_wrong_role_denied(self): self.deny(who=actor(role='department_worker'))
    def test_06_personal_private_rejected(self): self.deny(src=fixture('personal_private'))
    def test_07_clinical_legal_rejected(self): self.deny(src=fixture('clinical_legal'))
    def test_08_uncertain_rights_rejected(self): self.deny(src=fixture('uncertain_rights'))
    def test_09_unknown_class_rejected(self): self.deny(src=fixture('other'))
    def test_10_missing_evidence_rejected(self): self.deny(src=dataclasses.replace(self.src,rights_evidence_ref=''))
    def test_11_unverified_rights_rejected(self): self.deny(src=dataclasses.replace(self.src,rights_verified=False))
    def test_12_revoked_source_rejected(self): self.deny(src=dataclasses.replace(self.src,revoked=True))
    def test_13_revoked_approval_rejected(self): self.deny(g=dataclasses.replace(grant(),revoked=True))
    def test_14_expired_approval_rejected(self): self.deny(g=dataclasses.replace(grant(),expires_at=NOW))
    def test_15_wrong_purpose_rejected(self): self.deny(purpose='concept',g=grant('ingest'))
    def test_16_license_scope_rejected(self): self.deny(src=fixture('third_party_licensed','license_verified'))
    def test_17_license_with_attribution(self):
        s=dataclasses.replace(fixture('third_party_licensed','license_verified'),license_purposes=frozenset({'ingest'}),attribution_required=True,attribution_ref='synthetic-citation')
        self.check(src=s)
    def test_18_missing_attribution_rejected(self):
        s=dataclasses.replace(fixture('third_party_licensed','license_verified'),license_purposes=frozenset({'ingest'}),attribution_required=True)
        self.deny(src=s)
    def test_19_wrong_derivative_kind_rejected(self):
        self.deny(purpose='derivative',g=grant('derivative','lesson'),derivative_kind='book')
    def test_20_wrong_derivative_grant_rejected(self):
        self.deny(purpose='derivative',g=grant('derivative','lesson'),derivative_kind='workbook')
    def test_21_valid_derivative_permission(self):
        self.check(purpose='derivative',g=grant('derivative','lesson'),derivative_kind='lesson')
    def test_22_export_not_implicit(self): self.deny(purpose='controlled_export',g=grant('ingest'))
    def test_23_publish_not_supported(self): self.deny(purpose='publish')
    def test_24_marketing_send_not_supported(self): self.deny(purpose='marketing_send')
    def test_25_cross_department_denied(self):
        self.deny(who=actor('editor','ed'),purpose='newsletter_handoff',g=grant('newsletter_handoff',user='ed',dept='eternal_flame'),department='revenue_forge')
    def test_26_approved_department_metadata_handoff(self):
        self.check(who=actor('editor','ed'),purpose='newsletter_handoff',g=grant('newsletter_handoff',user='ed',dept='eternal_flame'),department='eternal_flame')
    def test_27_register_duplicate_source_rejected(self):
        r=CandidateRegistry();r.register(self.actor,self.src,grant())
        with self.assertRaises(AccessDenied):r.register(self.actor,dataclasses.replace(self.src,source_id='copy'),dataclasses.replace(grant(),source_id='copy'))
    def test_28_concept_and_five_review_only_derivatives(self):
        r=CandidateRegistry();r.register(self.actor,self.src,grant());c=r.make_concept(self.actor,self.src.source_id,grant('concept'),'c1')
        self.assertEqual(c.status,'candidate_review_only')
        for k in sorted(KINDS):
            d=r.make_derivative(self.actor,'c1',grant('derivative',k),'d-'+k,k)
            self.assertEqual(d.source_sha256,DIGEST);self.assertEqual(d.status,'candidate_review_only')
        self.assertEqual(len(r.derivatives),5)
    def test_29_lineage_mismatch_rejected(self):
        r=CandidateRegistry();r.register(self.actor,self.src,grant());r.make_concept(self.actor,'synthetic-source-1',grant('concept'),'c1')
        r.concepts['c1']=dataclasses.replace(r.concepts['c1'],source_sha256='0'*64)
        with self.assertRaises(AccessDenied):r.make_derivative(self.actor,'c1',grant('derivative','lesson'),'d1','lesson')
    def test_30_source_tampering_detected(self):
        self.assertTrue(verify_source_bytes(self.src,SYN));self.assertFalse(verify_source_bytes(self.src,SYN+b'edited'))
    def test_31_audit_chain_tampering_detected(self):
        audit=AuditChain();audit.append('source','synthetic-1');audit.append('candidate','synthetic-c1')
        self.assertTrue(audit.verify());audit.rows[0]['action']='modified';self.assertFalse(audit.verify())
    def test_32_audit_order_tampering_detected(self):
        audit=AuditChain();audit.append('a','ref1');audit.append('b','ref2');audit.rows.reverse();self.assertFalse(audit.verify())
    def test_33_symlink_source_rejected(self):
        with tempfile.TemporaryDirectory() as x:
            p=Path(x);(p/'real.txt').write_bytes(SYN);(p/'link.txt').symlink_to(p/'real.txt')
            with self.assertRaises(AccessDenied):secure_read_candidate(p,'link.txt')
    def test_34_path_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as x:
            with self.assertRaises(AccessDenied):secure_read_candidate(Path(x),'../other.txt')
    def test_35_absolute_source_rejected(self):
        with tempfile.TemporaryDirectory() as x:
            with self.assertRaises(AccessDenied):secure_read_candidate(Path(x),'/etc/passwd')
    def test_36_git_worktree_rejected(self):
        with tempfile.TemporaryDirectory() as x:
            p=Path(x);(p/'.git').mkdir();(p/'synthetic.txt').write_bytes(SYN)
            with self.assertRaises(AccessDenied):secure_read_candidate(p,'synthetic.txt')
    def test_37_oversized_input_rejected(self):
        with tempfile.TemporaryDirectory() as x:
            p=Path(x);(p/'oversize.txt').write_bytes(SYN*20)
            with self.assertRaises(AccessDenied):secure_read_candidate(p,'oversize.txt',max_bytes=20)
    def test_38_symlink_directory_rejected(self):
        with tempfile.TemporaryDirectory() as x:
            p=Path(x);(p/'real').mkdir();(p/'real'/'source.txt').write_bytes(SYN);(p/'alias').symlink_to(p/'real',target_is_directory=True)
            with self.assertRaises(AccessDenied):secure_read_candidate(p,'alias/source.txt')
    def test_39_synthetic_read_exact_bytes(self):
        with tempfile.TemporaryDirectory() as x:
            p=Path(x);(p/'source.txt').write_bytes(SYN)
            self.assertEqual(secure_read_candidate(p,'source.txt'),SYN)
    def test_40_no_rights_assumption_from_hash(self):
        self.deny(src=dataclasses.replace(self.src,rights='pending'))
    def test_41_grant_evidence_mismatch(self):
        self.deny(g=dataclasses.replace(grant(),rights_evidence_ref='some-other-proof'))
    def test_42_invalid_hash_metadata(self):
        self.deny(src=dataclasses.replace(self.src,sha256_hex='not-a-hash'))
    def test_43_no_permanent_grant(self):
        self.deny(g=dataclasses.replace(grant(),expires_at=NOW-timedelta(days=1)))
    def test_44_approval_without_founder(self):
        self.deny(g=dataclasses.replace(grant(),approved_by_founder=False))

    def test_45_missing_approval_denied(self):
        with self.assertRaises(AccessDenied):authorize(self.actor,self.src,None,'ingest',now=NOW)
    def test_46_external_export_destination_denied(self):
        self.deny(purpose='controlled_export',g=grant('controlled_export',destination='https://example.org'),destination='https://example.org')
    def test_47_export_destination_mismatch_denied(self):
        self.deny(purpose='controlled_export',g=grant('controlled_export',destination='approved_local_outbox'),destination='review_only_local_bundle')
    def test_48_scoped_local_export_permission_only(self):
        self.check(purpose='controlled_export',g=grant('controlled_export',destination='review_only_local_bundle'),destination='review_only_local_bundle')
    def test_49_license_derivative_format_excluded(self):
        s=dataclasses.replace(fixture('third_party_licensed','license_verified'),license_purposes=frozenset({'derivative'}))
        self.deny(src=s,purpose='derivative',g=grant('derivative','lesson'),derivative_kind='lesson')
    def test_50_license_derivative_format_permitted(self):
        s=dataclasses.replace(fixture('third_party_licensed','license_verified'),license_purposes=frozenset({'derivative'}),license_derivative_kinds=frozenset({'lesson'}))
        self.check(src=s,purpose='derivative',g=grant('derivative','lesson'),derivative_kind='lesson')
    def test_51_invalid_path_type_denied(self):
        with tempfile.TemporaryDirectory() as x:
            with self.assertRaises(AccessDenied):secure_read_candidate(Path(x),None)

if __name__=='__main__': unittest.main()