"""Synthetic incident checks: no provider access, mutation or contact data."""
import unittest
from provider_shutdown import check_shutdown, stop_sequence
T="2026-11-23T19:00:00Z"
def good():
    return dict(local_runtime_halted=True,
    provider_inspected_at="2026-11-23T19:05:00Z",
    authenticated_provider_session=True,
    all_scheduled_campaign_pages_inspected=True,
    scheduled_or_queued_marketing_campaigns=0,
    all_relevant_automations_inspected=True,
    all_relevant_automations_inactive=True,
    workflow_waiting_or_active_contacts=0,
    native_test_form_disabled=True,
    direct_form_url_enrollment_rejected=True,
    provider_wide_queue_empty=True,
    marketing_suppression_kept=True,
    provider_workflow_logs_inspected_after_stop=True,
    authorized_shutdown_operator_verified=True)

class ShutdownTests(unittest.TestCase):
    def test_missing_snapshot_is_not_safe(self):
        r=check_shutdown(None,stopped_at=T)
        self.assertFalse(r["provider_shutdown_accepted"])
        self.assertGreater(len(r["holds"]),8)
    def test_complete_synthetic_fixture_not_live_validation(self):
        r=check_shutdown(good(),stopped_at=T)
        self.assertTrue(r["provider_shutdown_accepted"])
        self.assertFalse(r["live_provider_activity_executed_by_this_check"])
    def test_local_halt_alone_never_proves_provider_stop(self):
        r=check_shutdown({"local_runtime_halted":True},stopped_at=T)
        self.assertFalse(r["provider_shutdown_accepted"])
        self.assertIn("PROVIDER_QUEUE_NOT_VERIFIED_EMPTY",r["holds"])
    def test_pending_campaign_is_a_hard_hold(self):
        s=good();s["scheduled_or_queued_marketing_campaigns"]=1
        self.assertIn("PENDING_MARKETING_CAMPAIGNS_NOT_ZERO",check_shutdown(s,stopped_at=T)["holds"])
    def test_paused_workflow_with_contacts_waiting_is_a_hold(self):
        s=good();s["workflow_waiting_or_active_contacts"]=1
        self.assertFalse(check_shutdown(s,stopped_at=T)["provider_shutdown_accepted"])
    def test_empty_workflow_logs_alone_no_proof_of_global_queue(self):
        s=good();s["provider_wide_queue_empty"]=None
        self.assertIn("PROVIDER_QUEUE_NOT_VERIFIED_EMPTY",check_shutdown(s,stopped_at=T)["holds"])
    def test_stale_provider_inspection_rejected(self):
        s=good();s["provider_inspected_at"]="2026-11-23T18:59:00Z"
        self.assertIn("PROVIDER_INSPECTION_PREDATES_STOP",check_shutdown(s,stopped_at=T)["holds"])
    def test_unknown_or_incomplete_schedule_pagination_rejected(self):
        s=good();s["all_scheduled_campaign_pages_inspected"]=False
        self.assertFalse(check_shutdown(s,stopped_at=T)["provider_shutdown_accepted"])
    def test_lingering_native_hosted_form_is_a_hold(self):
        s=good();s["direct_form_url_enrollment_rejected"]=False
        self.assertIn("DIRECT_FORM_REJECTION_NOT_VERIFIED",check_shutdown(s,stopped_at=T)["holds"])
    def test_test_marketing_suppression_is_a_hold_when_unknown(self):
        s=good();s["marketing_suppression_kept"]=None
        self.assertIn("SUPPRESSION_RETENTION_NOT_VERIFIED",check_shutdown(s,stopped_at=T)["holds"])
    def test_unauthenticated_operator_is_a_hold(self):
        s=good();s["authorized_shutdown_operator_verified"]=False
        self.assertIn("SHUTDOWN_OPERATOR_NOT_VERIFIED",check_shutdown(s,stopped_at=T)["holds"])
    def test_boolean_zero_not_misread_as_integer_zero(self):
        s=good();s["scheduled_or_queued_marketing_campaigns"]=False
        self.assertIn("PENDING_MARKETING_CAMPAIGNS_NOT_ZERO",check_shutdown(s,stopped_at=T)["holds"])
    def test_nonmutating_stop_procedure_includes_brevo_and_forms(self):
        steps=stop_sequence()
        self.assertGreaterEqual(len(steps),8)
        self.assertTrue(any("Brevo" in step for step in steps))
        self.assertTrue(any("direct enrollment URL" in step for step in steps))
        self.assertTrue(any("without" in step.lower() or "not" in step.lower() for step in steps))
if __name__=="__main__":unittest.main()
