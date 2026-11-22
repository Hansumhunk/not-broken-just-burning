"""Synthetic policy negative cases. This suite NEVER accesses a real Brevo contact."""
import copy
import unittest
from provider_gate import evaluate_synthetic,conservative_readonly_inspection

NOW="2026-11-23T19:00:00Z"
SHA="b"*64

def fixture():
    ed={"id":"reviewable-edition-one","state":"queued","approval_ref":"review:editorial",
        "content_sha256":SHA,"provider_campaign_ref":"6","audience_ref":"segment:4",
        "window_start":"2026-11-23T18:00:00Z","window_end":"2026-11-23T20:00:00Z"}
    approval={"edition_id":ed["id"],"approval_ref":"campaign:founder",
              "approver_ref":"operator:campaign_approver",
              "content_sha256":SHA,"provider_campaign_ref":"6","audience_ref":"segment:4",
              "window_start":ed["window_start"],"window_end":ed["window_end"]}
    provider={"checked_at":"2026-11-23T18:59:45Z",
              "all_audience_profiles_inspected":True,"authoritative_segment_count":1,
              "campaign":{"id":"6","status":"draft","audience_ref":"segment:4",
                          "scheduled":False,"scheduledAt":None},
              "account":{"sender_verified":True,"dkim_aligned":True,"dmarc_aligned":True,
                         "quota_verified":True,"daily_remaining":300,"protected_reserve":60},
              "queue":{"full_provider_queue_inspected":True,"duplicate_campaign_pending":False},
              "workflow":{"welcome_weekly_coordination_confirmed":True,
                          "emergency_shutdown_procedure_verified":True}}
    recipient={"marketing_opted_in":True,"doi_confirmed":True,"consent_version_verified":True,
               "consent_at":"2026-11-20T15:00:00Z",
               "unsubscribed":False,"blocklisted":False,
               "hard_bounced":False,"soft_bounce_pending":False,"complaint":False,
               "welcome_active":False,"previous_weekly_exists":False,
               "previous_welcome_exists":False}
    return ed,approval,provider,[recipient]


class SyntheticGateTests(unittest.TestCase):
    def verify(self,expected,*modify):
        e,a,p,c=fixture()
        for f in modify:f(e,a,p,c)
        r=evaluate_synthetic(e,a,p,c,NOW)
        self.assertFalse(r["live_provider_acceptance"])
        self.assertFalse(r["dispatch_authorized"])
        self.assertIn(expected,r["hold_codes"])
        self.assertFalse(r["model_preflight_pass"])
        return r

    def test_01_valid_synthetic_case_is_still_not_a_live_provider_pass(self):
        r=evaluate_synthetic(*fixture(),NOW)
        self.assertTrue(r["model_preflight_pass"])
        self.assertFalse(r["dispatch_authorized"])
        self.assertEqual(r["assessment"],"SYNTHETIC_UNIT_TEST_ONLY")

    def test_02_missing_marketing_optin(self):
        self.verify("marketing_permission_missing",lambda e,a,p,c:c[0].update(marketing_opted_in=False))

    def test_03_double_opt_in_unconfirmed(self):
        self.verify("double_opt_in_unverified",lambda e,a,p,c:c[0].update(doi_confirmed=False))

    def test_04_missing_consent_version_or_timestamp(self):
        self.verify("double_opt_in_unverified",lambda e,a,p,c:c[0].update(consent_version_verified=False))
        self.verify("double_opt_in_unverified",lambda e,a,p,c:c[0].update(consent_at=None))

    def test_05_blacklisted_and_unsubscribed(self):
        self.verify("unsubscription_or_blocklist",lambda e,a,p,c:c[0].update(blocklisted=True))
        self.verify("unsubscription_or_blocklist",lambda e,a,p,c:c[0].update(unsubscribed=True))

    def test_06_hard_soft_bounces(self):
        self.verify("hard_bounce",lambda e,a,p,c:c[0].update(hard_bounced=True))
        self.verify("soft_bounce_hold",lambda e,a,p,c:c[0].update(soft_bounce_pending=True))

    def test_07_complaint_suppression(self):
        self.verify("complaint_hold",lambda e,a,p,c:c[0].update(complaint=True))

    def test_08_weekly_frequency_and_missing_last_sent_time(self):
        self.verify("weekly_frequency_conflict",lambda e,a,p,c:c[0].update(
            previous_weekly_exists=True,last_weekly_sent_at="2026-11-21T19:00:00Z"))
        self.verify("weekly_frequency_conflict",lambda e,a,p,c:c[0].update(
            previous_weekly_exists=True,last_weekly_sent_at=None))

    def test_09_welcome_overlap_and_48_hour_gap(self):
        self.verify("welcome_overlap_unverified",lambda e,a,p,c:c[0].update(welcome_active=True))
        self.verify("welcome_frequency_conflict",lambda e,a,p,c:c[0].update(
            previous_welcome_exists=True,last_welcome_sent_at="2026-11-23T18:00:00Z"))

    def test_10_unknown_or_incomplete_audience_cannot_pass(self):
        self.verify("audience_completeness_unknown",lambda e,a,p,c:p.update(all_audience_profiles_inspected=False))
        self.verify("audience_completeness_unknown",lambda e,a,p,c:p.update(authoritative_segment_count=2))
        self.verify("marketing_permission_missing",lambda e,a,p,c:c.clear())

    def test_11_quota_not_confirmed_or_reserve_breached(self):
        self.verify("quota_unverified_or_exhausted",lambda e,a,p,c:p["account"].update(quota_verified=False))
        self.verify("quota_unverified_or_exhausted",lambda e,a,p,c:p["account"].update(daily_remaining=60))
        self.verify("quota_unverified_or_exhausted",lambda e,a,p,c:p["account"].update(protected_reserve=0))

    def test_12_pending_provider_duplicate_blocks(self):
        self.verify("duplicate_pending_campaign",lambda e,a,p,c:p["queue"].update(duplicate_campaign_pending=True))

    def test_13_queue_visibility_unknown(self):
        self.verify("provider_queue_visibility_unknown",lambda e,a,p,c:p["queue"].update(full_provider_queue_inspected=False))

    def test_14_welcome_coordination_or_shutdown_unknown(self):
        self.verify("welcome_overlap_unverified",lambda e,a,p,c:p["workflow"].update(welcome_weekly_coordination_confirmed=False))
        self.verify("shutdown_controls_unknown",lambda e,a,p,c:p["workflow"].update(emergency_shutdown_procedure_verified=False))

    def test_15_wrong_campaign_and_already_scheduled(self):
        self.verify("campaign_identity_mismatch",lambda e,a,p,c:p["campaign"].update(id="99"))
        self.verify("campaign_not_draft",lambda e,a,p,c:p["campaign"].update(status="sent"))
        self.verify("campaign_already_scheduled",lambda e,a,p,c:p["campaign"].update(scheduled=True))

    def test_16_wrong_audience_and_window(self):
        self.verify("audience_mismatch",lambda e,a,p,c:p["campaign"].update(audience_ref="segment:99"))
        self.verify("invalid_dispatch_window",lambda e,a,p,c:a.update(window_end="2026-11-24T20:00:00Z"))

    def test_17_editorial_and_campaign_approvals_are_independent(self):
        self.verify("missing_editorial_approval",lambda e,a,p,c:e.update(approval_ref=None))
        self.verify("missing_campaign_approval",lambda e,a,p,c:a.update(approval_ref=None))
        self.verify("content_hash_mismatch",lambda e,a,p,c:a.update(content_sha256="0"*64))

    def test_18_expired_provider_snapshot_and_sender_failure(self):
        self.verify("provider_snapshot_stale",lambda e,a,p,c:p.update(checked_at="2026-11-23T18:40:00Z"))
        self.verify("sender_authentication_unknown",lambda e,a,p,c:p["account"].update(dkim_aligned=False))

    def test_19_never_returns_any_recipient_data(self):
        e,a,p,c=fixture()
        c[0]["id"]="synthetic-01"
        r=evaluate_synthetic(e,a,p,c,NOW)
        self.assertNotIn("synthetic-01",repr(r))
        c[0]["email"]="nobody@example.invalid"
        r=evaluate_synthetic(e,a,p,c,NOW)
        self.assertIn("referral_or_access_scope_unknown",r["hold_codes"])
        self.assertNotIn("nobody@example.invalid",repr(r))

    def test_20_readonly_inspection_avoids_inference_of_suppression_or_queue_safety(self):
        class Stub:
            def account(self):return {"verified_scope":"account_metadata_only"}
            def campaigns(self):return {"count":31,"campaigns":[{"id":6,"htmlContent":"private"}]}
            def lists(self):return {"lists":[{"id":4,"totalSubscribers":1}]}
        r=conservative_readonly_inspection(Stub())
        self.assertEqual(r["campaign_count"],31)
        self.assertFalse(r["opt_in_and_suppression_verified"])
        self.assertFalse(r["dispatch_authorized"])
        self.assertNotIn("private",repr(r))

if __name__=="__main__":
    unittest.main()
