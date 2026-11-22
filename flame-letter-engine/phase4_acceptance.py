"""Original 20-case Flame Letter test matrix: conservative, provenance-aware report.

The full original test definitions are transcribed from the owner-only
provider_integration/lifecycle_tests.csv into this NON-PII code. Individual
case status is carried from dated GitHub issue #1 evidence, NOT auto-promoted by
local simulations. The file contains no addresses, passwords, subscriber IDs,
test contact identifiers or Brevo secrets. No provider network calls.
"""
from __future__ import annotations
import re

ORIGINAL = {
"T01":"Owner account free and allowance verified (accepted from Command)",
"T02":"Sender verification and reply routing Operation 08",
"T03":"Approved address and final privacy consent version",
"T04":"Required unchecked consent rejects submission without consent",
"T05":"CAPTCHA rejection and successful keyboard/mobile submission",
"T06":"Owned address submits without clicking DOI: no marketing/list admission",
"T07":"DOI confirms once; recorded timestamp and exact consent version",
"T08":"Duplicate signup and repeat token: no duplicate welcome",
"T09":"All six test emails in order, one each",
"T10":"Marketing campaign unsubscribe stops automation before next send",
"T11":"Automation unsubscribe excludes next broadcast",
"T12":"Hard bounce safe simulation or unresolved",
"T13":"Soft bounce safe simulation or unresolved",
"T14":"Complaint safe simulation or unresolved",
"T15":"Deletion and lawful suppression retention",
"T16":"HTML/plain text Gmail and Outlook rendering, sender alignment headers",
"T17":"No test contacts in production recipients",
"T18":"Deactivate automation and inspect zero queued sends",
"T19":"Disable hosted form and verify direct URL cannot enroll",
"T20":"Production smoke test after separate release authorization",
}
# Source comments in existing GH Issue #1; never paste private contact identities.
# Historical evidence is not CURRENT authenticated provider acceptance.
STATES = {
 "T01":("PARTIAL",["issue:7055834268"],"Current Brevo quota and account allowance unavailable"),
 "T02":("PARTIAL",["issue:7017941986"],"Live sender/reply and domain routing not currently inspected"),
 "T03":("PARTIAL",["issue:7055834268"],"Final privacy consent version and recipient-visible footer approval"),
 "T04":("NOT_RUN",[],"Unchecked consent negative-path provider test"),
 "T05":("PARTIAL",["issue:7055834268"],"CAPTCHA negative and keyboard/mobile full acceptance"),
 "T06":("PARTIAL",["issue:7055834268"],"Pre-confirmation marketing exclusion across provider entry routes"),
 "T07":("PARTIAL",["issue:7055834268"],"Consent timestamp and exact version stored on provider record"),
 "T08":("PARTIAL",["issue:7055834268"],"Repeat token and welcome re-entry negative-path test"),
 "T09":("NOT_RUN",[],"Welcome automation intentionally inactive; six sends not executed"),
 "T10":("PARTIAL",["issue:7055807880"],"Stopped active automation after unsubscribe not executed"),
 "T11":("NOT_RUN",[],"Unsubscribe from active welcome preventing next broadcast"),
 "T12":("NOT_RUN",[],"Hard bounce safe provider scenario or authorized deferral"),
 "T13":("NOT_RUN",[],"Soft bounce safe provider scenario or authorized deferral"),
 "T14":("NOT_RUN",[],"Complaint safe provider scenario or authorized deferral"),
 "T15":("PARTIAL",["issue:7055433265"],"Deletion and retained suppression proof"),
 "T16":("PARTIAL",["issue:7017941986","issue:7055834268"],"Outlook rendering and complete two-client header check"),
 "T17":("PARTIAL",["issue:7055834268"],"Verified real test/production recipients isolation"),
 "T18":("PARTIAL",["issue:7055732869"],"Brevo-wide scheduled/pending queue empty after deactivation"),
 "T19":("NOT_RUN",[],"Disable native hosted test form then reject direct URL; separate authorization"),
 "T20":("WITHHELD",[],"Exact-head production release authorization required"),
}

PROOF_TYPES = {
 "authenticated_provider_read","authorized_provider_mutation","owner_dashboard_observation",
 "historical_issue_comment","synthetic_unit_test","local_static_code_review"
}
_VALID_REF = re.compile(r"^(issue:[0-9]{6,20}|github_run:[0-9]{6,20}|provider_event:[A-Za-z0-9_-]{8,80}|approved_record:[A-Za-z0-9_.:-]{8,100})$")
_NOIDENTITY = re.compile(r"@|https?://|email|phone",re.I)

def evidence_is_acceptable(proof):
    """Validate sanitized provenance; NEVER transform a test fixture into provider PASS."""
    if not isinstance(proof,dict) or proof.get("case_id") not in ORIGINAL:
        return False
    if proof.get("kind") not in PROOF_TYPES or not _VALID_REF.fullmatch(str(proof.get("ref",""))):
        return False
    if proof.get("kind") in ("synthetic_unit_test","local_static_code_review"):
        return not proof.get("claims_live_provider_acceptance",False)
    if proof.get("kind")=="historical_issue_comment":
        return not proof.get("claims_current_provider_state",False)
    if proof.get("claims_live_provider_acceptance") is True:
        return proof.get("observed_at_utc") is not None and proof.get("scope_verified") is True
    return True


def reconcile(evidence=(), *, current_authentication_verified=False, founder_public_release=False):
    """Issue #1 is the evidence authority; input cannot auto-pass original cases."""
    rows=[]
    rejects=[]
    for i,p in enumerate(evidence):
        if not evidence_is_acceptable(p):
            rejects.append(i)
    for key,description in ORIGINAL.items():
        initial,refs,blocker=STATES[key]
        related=[x for i,x in enumerate(evidence) if i not in rejects and x.get("case_id")==key]
        # No automatic PASS: only a separately audited exact-case provider confirmation
        # can update the authoritative matrix. A screenshot of ONE path is not a full case.
        status=initial
        if key=="T20":
            status="WITHHELD" if not founder_public_release else "REQUIRES_SEPARATE_PROVIDER_EXECUTION"
        rows.append({
            "id":key,"original_definition":description,"status":status,
            "evidence_references":refs,
            "new_provenance_records_accepted":len(related),
            "source_of_truth":"GitHub Issue #1 and private original lifecycle_tests.csv",
            "provider_scope_current":False,
            "remaining_requirement":blocker})
    return {
        "source":"NON_PII_ORIGINAL_CASE_RECONCILIATION",
        "case_count":len(rows),
        "status_counts":{status:sum(x["status"]==status for x in rows)
                         for status in ("PARTIAL","NOT_RUN","WITHHELD","REQUIRES_SEPARATE_PROVIDER_EXECUTION")},
        "current_authenticated_brevo_inspection_verified":False,  # requires independent real provider audit
        "synthetic_tests_counted_as_provider_passes":0,
        "rejected_untrusted_evidence_records":rejects,
        "cases":rows,
        "note":"No authenticated provider case has been newly completed; external evidence requires independent audit."
    }
