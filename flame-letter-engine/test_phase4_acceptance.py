"""Phase IV exact-case provenance validation; wholly synthetic and offline."""
import unittest
from phase4_acceptance import ORIGINAL, STATES, reconcile, evidence_is_acceptable

class AcceptanceMatrixTests(unittest.TestCase):
    def test_original_case_count_and_all_ids(self):
        self.assertEqual(list(ORIGINAL),[f"T{i:02d}" for i in range(1,21)])
        self.assertEqual(len(STATES),20)
    def test_full_test_definitions_not_loose_labels(self):
        for n,definition in ORIGINAL.items():
            self.assertGreater(len(definition),20,(n,definition))
        self.assertIn("timestamp and exact consent version",ORIGINAL["T07"])
        self.assertIn("direct URL cannot enroll",ORIGINAL["T19"])
    def test_prior_cases_do_not_automatically_become_passes(self):
        report=reconcile()
        self.assertEqual(report["case_count"],20)
        self.assertEqual(report["synthetic_tests_counted_as_provider_passes"],0)
        self.assertTrue(all(c["status"]!="PASS" for c in report["cases"]))
    def test_original_t20_locked_without_founder_release(self):
        c=reconcile()["cases"][19]
        self.assertEqual(c["status"],"WITHHELD")
    def test_founder_release_record_alone_does_not_pass_t20(self):
        self.assertEqual(reconcile(founder_public_release=True)["cases"][19]["status"],
                         "REQUIRES_SEPARATE_PROVIDER_EXECUTION")
    def test_synthetic_success_cannot_override_original_t07(self):
        proof={"case_id":"T07","kind":"synthetic_unit_test",
               "ref":"github_run:44989074644","observed_at_utc":"2026-11-22T05:20:00Z",
               "claims_live_provider_acceptance":False}
        data=reconcile((proof,))
        self.assertEqual(data["cases"][6]["status"],"PARTIAL")
        self.assertEqual(data["cases"][6]["new_provenance_records_accepted"],1)
        self.assertFalse(data["cases"][6]["provider_scope_current"])
    def test_forged_synthetic_provider_pass_rejected(self):
        data=reconcile(({"case_id":"T18","kind":"synthetic_unit_test",
                         "ref":"github_run:44989074644",
                         "claims_live_provider_acceptance":True},))
        self.assertEqual(data["rejected_untrusted_evidence_records"],[0])
        self.assertEqual(data["cases"][17]["status"],"PARTIAL")
    def test_historical_snapshot_is_not_current_provider_state(self):
        data=reconcile(({"case_id":"T10","kind":"historical_issue_comment",
                         "ref":"issue:7055807880",
                         "claims_current_provider_state":True},))
        self.assertEqual(data["rejected_untrusted_evidence_records"],[0])
    def test_untrusted_proof_with_email_url_or_arbitrary_reference_is_rejected(self):
        self.assertFalse(evidence_is_acceptable(
            {"kind":"owner_dashboard_observation","ref":"me@example.invalid"}))
        self.assertFalse(evidence_is_acceptable(
            {"kind":"authenticated_provider_read","ref":"https://secret.example.com"}))
    def test_live_proof_requires_timestamp_scope(self):
        self.assertFalse(evidence_is_acceptable({"kind":"authenticated_provider_read",
            "ref":"provider_event:current-sender-a","claims_live_provider_acceptance":True}))
    def test_well_formed_new_evidence_still_requires_independent_review(self):
        ev={"case_id":"T02","kind":"authenticated_provider_read",
            "ref":"provider_event:sender-readback-2026",
            "observed_at_utc":"2026-11-22T20:00:00Z",
            "scope_verified":True,"claims_live_provider_acceptance":True}
        data=reconcile((ev,),current_authentication_verified=True)
        self.assertEqual(data["cases"][1]["status"],"PARTIAL")
        self.assertFalse(data["current_authenticated_brevo_inspection_verified"])
    def test_existing_marketing_unsubscribe_is_not_t11_automation_pass(self):
        self.assertEqual(reconcile()["cases"][10]["status"],"NOT_RUN")
    def test_bounce_complaint_cases_remain_unrun(self):
        cases=reconcile()["cases"]
        self.assertEqual([x["status"] for x in cases[11:14]],["NOT_RUN"]*3)
    def test_failed_historical_source_cannot_be_used_to_resubscribe(self):
        d=reconcile(({"case_id":"T08","kind":"historical_issue_comment",
                       "ref":"issue:7055834268",
                       "claims_current_provider_state":False},))
        self.assertEqual(d["cases"][7]["status"],"PARTIAL")

if __name__=="__main__":unittest.main()
