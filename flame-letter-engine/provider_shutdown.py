"""Offline Brevo marketing shutdown acceptance rehearsal; never modifies provider.

The ONLY state that counts as safe is observed provider-wide queue empty, all
known relevant automations inactive, hosted intake disabled, no pending
campaigns, recorded after incident stop. Missing evidence always fails closed.
The integration MUST NOT infer shutdown from a local SQLite halt.
"""
from __future__ import annotations
from datetime import datetime, timezone
from publication_ledger import dt

def check_shutdown(snapshot, *, stopped_at):
    t=dt(stopped_at)
    p=snapshot if isinstance(snapshot,dict) else {}
    holds=[]
    if p.get("local_runtime_halted") is not True:
        holds.append("LOCAL_RUNTIME_NOT_HALTED")
    inspected=p.get("provider_inspected_at")
    try:
        if dt(inspected)<t:
            holds.append("PROVIDER_INSPECTION_PREDATES_STOP")
    except Exception:
        holds.append("PROVIDER_POST_STOP_INSPECTION_MISSING")
    if p.get("authenticated_provider_session") is not True:
        holds.append("NO_AUTHENTICATED_PROVIDER_INSPECTION")
    if p.get("all_scheduled_campaign_pages_inspected") is not True:
        holds.append("SCHEDULED_CAMPAIGN_INVENTORY_INCOMPLETE")
    if p.get("scheduled_or_queued_marketing_campaigns")!=0 or type(p.get("scheduled_or_queued_marketing_campaigns")) is not int:
        holds.append("PENDING_MARKETING_CAMPAIGNS_NOT_ZERO")
    if p.get("all_relevant_automations_inspected") is not True:
        holds.append("AUTOMATION_INVENTORY_INCOMPLETE")
    if p.get("all_relevant_automations_inactive") is not True:
        holds.append("AUTOMATIONS_NOT_VERIFIED_INACTIVE")
    if p.get("workflow_waiting_or_active_contacts")!=0 or type(p.get("workflow_waiting_or_active_contacts")) is not int:
        holds.append("WORKFLOW_CONTACT_QUEUE_NOT_ZERO")
    if p.get("native_test_form_disabled") is not True:
        holds.append("HOSTED_TEST_FORM_NOT_VERIFIED_DISABLED")
    if p.get("direct_form_url_enrollment_rejected") is not True:
        holds.append("DIRECT_FORM_REJECTION_NOT_VERIFIED")
    if p.get("provider_wide_queue_empty") is not True:
        holds.append("PROVIDER_QUEUE_NOT_VERIFIED_EMPTY")
    if p.get("marketing_suppression_kept") is not True:
        holds.append("SUPPRESSION_RETENTION_NOT_VERIFIED")
    if p.get("provider_workflow_logs_inspected_after_stop") is not True:
        holds.append("WORKFLOW_EVENT_RECONCILIATION_MISSING")
    if p.get("authorized_shutdown_operator_verified") is not True:
        holds.append("SHUTDOWN_OPERATOR_NOT_VERIFIED")
    return {"operation":"OFFLINE_INCIDENT_READINESS_CHECK",
            "case":"T18_AND_T19_REQUIRING_SEPARATE_LIVE_PROOFS",
            "provider_shutdown_accepted":not holds,
            "live_provider_activity_executed_by_this_check":False,
            "holds":sorted(set(holds))}

def stop_sequence():
    """Operational checklist. NO executable provider mutation or credentials."""
    return (
        "Record incident UTC time, authenticated authorized operator and issue evidence.",
        "Set local engine emergency stop; quarantine uncertain in-flight claims.",
        "In Brevo, with separate authorized operator, review scheduled and running email campaigns.",
        "Where necessary and separately authorized, use Brevo campaign Suspend/Cancel controls; "
        "record campaign ID and before/after status, avoid deleting audit evidence.",
        "Confirm both existing welcome workflows remain inactive; inspect contacts waiting in workflows.",
        "Disable native hosted test/prod enrollment forms only if an incident scope authorizes; "
        "verify direct enrollment URL rejects the intended test request.",
        "Inspect campaign statuses and delivery/event logs after the stop, including pagination and filters.",
        "Verify marketing suppression remains effective; do not resubscribe a blocklisted contact.",
        "Do not declare zero provider queue from the local stop, empty workflow logs alone, "
        "or a scheduled-campaign listing alone.",
        "Resume only on a new founder-approved incident release decision and a fresh provider check.",
    )
