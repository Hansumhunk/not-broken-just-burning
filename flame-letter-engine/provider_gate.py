"""Fail-closed Brevo-style PREVIEW policy. Only synthetic fixtures, NEVER sending.

A true result means synthetic fixtures satisfy a *model* of release rules.
It does not mean Brevo has been inspected, consent verified in a live account,
a queue drained, or a public send authorized. Real provider data needs private
authentication, full-audience completeness and separate explicit founder approval.
"""
from __future__ import annotations
from datetime import datetime, timezone
import re
from publication_ledger import dt

_REQUIRED_CAMPAIGN_STATUS = "draft"
_ALLOWED_AUDIENCE = re.compile(r"^segment:[a-zA-Z0-9_-]{1,50}$")
_BLOCK = (
    "missing_authorized_edition", "content_hash_mismatch", "missing_editorial_approval",
    "missing_campaign_approval", "campaign_identity_mismatch", "campaign_not_draft",
    "campaign_already_scheduled", "audience_mismatch", "invalid_dispatch_window",
    "provider_snapshot_stale", "sender_authentication_unknown",
    "quota_unverified_or_exhausted", "provider_queue_visibility_unknown",
    "duplicate_pending_campaign", "welcome_overlap_unverified",
    "audience_completeness_unknown", "marketing_permission_missing",
    "double_opt_in_unverified", "unsubscription_or_blocklist",
    "hard_bounce", "soft_bounce_hold", "complaint_hold",
    "weekly_frequency_conflict", "welcome_frequency_conflict",
    "referral_or_access_scope_unknown", "shutdown_controls_unknown",
)

def _as_utc(s):
    try:return dt(s)
    except Exception:return None

def _positive_int(v):
    return type(v) is int and v>0

def _bool(v):
    return v is True

def _safe_aggregate_profile(entry,now):
    """Synthetic recipient; never accept identities or addresses in these fixtures."""
    if not isinstance(entry,dict):
        return ["marketing_permission_missing"]
    if set(entry) & {"email","address","name","phone","ip","first_name","last_name"}:
        return ["referral_or_access_scope_unknown"]
    reasons=[]
    for k,code in [
       ("marketing_opted_in","marketing_permission_missing"),
       ("doi_confirmed","double_opt_in_unverified"),
       ("consent_version_verified","double_opt_in_unverified")]:
        if not _bool(entry.get(k)):reasons.append(code)
    if _as_utc(entry.get("consent_at")) is None:
        reasons.append("double_opt_in_unverified")
    for k,code in [
       ("unsubscribed","unsubscription_or_blocklist"),
       ("blocklisted","unsubscription_or_blocklist"),
       ("hard_bounced","hard_bounce"),
       ("soft_bounce_pending","soft_bounce_hold"),
       ("complaint","complaint_hold")]:
        if entry.get(k) is not False:reasons.append(code)
    if entry.get("welcome_active") is not False:
        reasons.append("welcome_overlap_unverified")
    if entry.get("previous_weekly_exists") is True:
        last=_as_utc(entry.get("last_weekly_sent_at"))
        if last is None or (now-last).total_seconds()<7*86400:
            reasons.append("weekly_frequency_conflict")
    elif entry.get("previous_weekly_exists") is not False:
        reasons.append("weekly_frequency_conflict")
    if entry.get("previous_welcome_exists") is True:
        prev=_as_utc(entry.get("last_welcome_sent_at"))
        if prev is None or (now-prev).total_seconds()<48*3600:
            reasons.append("welcome_frequency_conflict")
    elif entry.get("previous_welcome_exists") is not False:
        reasons.append("welcome_frequency_conflict")
    return sorted(set(reasons))


def evaluate_synthetic(edition,approval,provider,profiles,now_utc):
    """Return ONLY aggregated hold codes; zero recipient identities or contact attributes."""
    now=_as_utc(now_utc)
    if now is None:
        raise ValueError("current UTC timestamp required")
    reasons=set()
    ed=edition if isinstance(edition,dict) else {}
    auth=approval if isinstance(approval,dict) else {}
    p=provider if isinstance(provider,dict) else {}
    campaign=p.get("campaign") if isinstance(p.get("campaign"),dict) else {}
    account=p.get("account") if isinstance(p.get("account"),dict) else {}
    queue=p.get("queue") if isinstance(p.get("queue"),dict) else {}
    workflow=p.get("workflow") if isinstance(p.get("workflow"),dict) else {}

    if ed.get("state")!="queued" or not ed.get("id"):
        reasons.add("missing_authorized_edition")
    if not re.fullmatch(r"[a-f0-9]{64}",str(ed.get("content_sha256"))):
        reasons.add("content_hash_mismatch")
    if not isinstance(ed.get("approval_ref"),str) or len(ed["approval_ref"])<5:
        reasons.add("missing_editorial_approval")
    if (not isinstance(auth.get("approval_ref"),str) or len(auth["approval_ref"])<5
        or not isinstance(auth.get("approver_ref"),str) or len(auth["approver_ref"])<4
        or auth.get("edition_id")!=ed.get("id")):
        reasons.add("missing_campaign_approval")
    if auth.get("content_sha256")!=ed.get("content_sha256"):
        reasons.add("content_hash_mismatch")
    if campaign.get("id")!=ed.get("provider_campaign_ref") or auth.get("provider_campaign_ref")!=ed.get("provider_campaign_ref"):
        reasons.add("campaign_identity_mismatch")
    if campaign.get("status")!=_REQUIRED_CAMPAIGN_STATUS:
        reasons.add("campaign_not_draft")
    if campaign.get("scheduled") is not False or campaign.get("scheduledAt") is not None:
        reasons.add("campaign_already_scheduled")
    if (not isinstance(ed.get("audience_ref"),str) or not _ALLOWED_AUDIENCE.fullmatch(ed["audience_ref"])
        or auth.get("audience_ref")!=ed.get("audience_ref")
        or campaign.get("audience_ref")!=ed.get("audience_ref")):
        reasons.add("audience_mismatch")
    start=_as_utc(ed.get("window_start"))
    end=_as_utc(ed.get("window_end"))
    if (start is None or end is None or not start<=now<=end
        or auth.get("window_start")!=ed.get("window_start")
        or auth.get("window_end")!=ed.get("window_end")):
        reasons.add("invalid_dispatch_window")
    checked=_as_utc(p.get("checked_at"))
    if checked is None or not 0<=(now-checked).total_seconds()<=300:
        reasons.add("provider_snapshot_stale")
    if (not _bool(account.get("sender_verified")) or
        not _bool(account.get("dkim_aligned")) or not _bool(account.get("dmarc_aligned"))):
        reasons.add("sender_authentication_unknown")
    if (not _bool(account.get("quota_verified")) or type(account.get("daily_remaining")) is not int
        or type(account.get("protected_reserve")) is not int or account["protected_reserve"]<60
        or not _positive_int(account["daily_remaining"]-account["protected_reserve"])):
        reasons.add("quota_unverified_or_exhausted")
    if not _bool(queue.get("full_provider_queue_inspected")):
        reasons.add("provider_queue_visibility_unknown")
    if queue.get("duplicate_campaign_pending") is not False:
        reasons.add("duplicate_pending_campaign")
    if not _bool(workflow.get("welcome_weekly_coordination_confirmed")):
        reasons.add("welcome_overlap_unverified")
    if not _bool(workflow.get("emergency_shutdown_procedure_verified")):
        reasons.add("shutdown_controls_unknown")

    # Full-audience completeness cannot be inferred from a handful of contact records.
    if not isinstance(profiles,list):
        profiles=[]
        reasons.add("audience_completeness_unknown")
    if (not _bool(p.get("all_audience_profiles_inspected")) or
        type(p.get("authoritative_segment_count")) is not int or
        p["authoritative_segment_count"]!=len(profiles)):
        reasons.add("audience_completeness_unknown")
    if not profiles:
        reasons.add("marketing_permission_missing")
    for profile in profiles:
        reasons.update(_safe_aggregate_profile(profile,now))
    if (type(account.get("daily_remaining")) is int and type(account.get("protected_reserve")) is int
        and len(profiles)>account["daily_remaining"]-account["protected_reserve"]):
        reasons.add("quota_unverified_or_exhausted")
    # We produce no dispatch-capable approval regardless of synthetic readiness.
    holds=sorted(reasons)
    return {"assessment":"SYNTHETIC_UNIT_TEST_ONLY",
            "model_preflight_pass":not holds,
            "live_provider_acceptance":False,
            "dispatch_authorized":False,
            "candidate_segment_size":len(profiles),
            "hold_codes":holds,
            "contains_subscriber_data":False}


def conservative_readonly_inspection(adapter):
    """GET-only campaign/list summary. Never obtain a recipient/consent approval here."""
    account=adapter.account()
    campaigns=adapter.campaigns()
    lists=adapter.lists()
    return {"account_scope":account.get("verified_scope"),
            "campaign_count":campaigns.get("count"),
            "returned_campaign_metadata_count":len(campaigns.get("campaigns",[])),
            "returned_list_count":len(lists.get("lists",[])),
            "campaign_ids":sorted(str(c.get("id")) for c in campaigns.get("campaigns",[])),
            "provider_queue_zero_verified":False,
            "opt_in_and_suppression_verified":False,
            "dispatch_authorized":False,
            "note":"Read-only metadata cannot establish full Brevo queue safety or subscriber consent."}
