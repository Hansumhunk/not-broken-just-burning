"""Build a NO-PII Phase IV readiness evidence artifact. No network, no provider I/O."""
import json
from pathlib import Path
import sys
from phase4_acceptance import reconcile
from provider_shutdown import check_shutdown

def build():
    test_matrix = reconcile()
    # Historical test contact unsubscribed; do not perform new live checks.
    # This intentionally tests local halt alone; global provider acceptance remains UNKNOWN.
    shutdown = check_shutdown({"local_runtime_halted":True},stopped_at="2026-11-23T19:00:00Z")
    assert not shutdown["provider_shutdown_accepted"]
    assert test_matrix["case_count"] == 20
    assert sum(test_matrix["status_counts"].values()) == 20
    return {
        "report_schema":"phase4-readiness-v1",
        "source":"offline code/Issue #1 historical acceptance, not live Brevo",
        "provider_authenticated_in_this_run":False,
        "provider_requests_executed":0,
        "provider_mutations_executed":0,
        "production_sends_executed":0,
        "founder_editorial_approvals_inferred":0,
        "provider_case_passes_newly_verified":0,
        "live_provider_queue_clearance":False,
        "public_newsletter_release_authorized":False,
        "acceptance":test_matrix,
        "shutdown":shutdown,
        "next_authorization_boundary":
          "existing authenticated owner read-only Brevo session/private host setup, followed by distinct controlled-test and exact-head release approvals"
    }

def main(path):
    target=Path(path)
    if not target.parent.exists():
        raise RuntimeError("existing staging folder required")
    if target.exists() or target.is_symlink() or target.suffix!=".json":
        raise RuntimeError("refuse overwrite/non-json evidence target")
    target.write_text(json.dumps(build(),indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print("Phase IV report: original 20 cases preserved; live Brevo pass count 0; provider shutdown unverified")

if __name__=="__main__":
    if len(sys.argv)!=2:
        raise SystemExit("usage: python phase4_report.py <existing-staging>/phase4-readiness.json")
    main(sys.argv[1])
