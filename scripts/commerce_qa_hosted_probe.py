#!/usr/bin/env python3
"""Credential-free real HTTP negative-case acceptance against existing QA function.

No Stripe charges, no Auth sign-ins and no database mutations. Tests routing,
signature-required protection, JWT enforcement and production-origin denial.
This is NOT proof of a signed webhook or successful Checkout.
"""
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

QA="https://fgpkejlmpfkxgpktgdzm.supabase.co/functions/v1/commerce"
ORIGIN="https://localhost:8443"
PUBLIC_KEY="sb_publishable_Ayqf6-ZoFGIDscFq6RWfcw_eQ5p_etR"
def call(path,method,body=None,extra=None):
    data=None if body is None else json.dumps(body).encode()
    headers={"Content-Type":"application/json","apikey":PUBLIC_KEY}
    if extra:headers.update(extra)
    request=Request(QA+path,data=data,method=method,headers=headers)
    try:
        with urlopen(request,timeout=15) as resp: status=resp.status; content=resp.read(4000)
    except HTTPError as exc: status=exc.code;content=exc.read(4000)
    except URLError as exc:raise RuntimeError("QA_HOSTED_REACHABILITY_FAILED") from exc
    try: payload=json.loads(content) if content else {}
    except json.JSONDecodeError:payload={}
    return status,payload.get("error")

def expect(name,observed,status,error):
    if observed!=(status,error):
        raise AssertionError(name+": expected "+str((status,error))+" got "+str(observed))
    print("PASS: "+name+" => "+str(status)+" "+(error or ""),flush=True)

def main():
    expect("unsigned webhook refused",call("/webhook","POST",{}),400,"signature_required")
    expect("forged webhook signature refused",call("/webhook","POST",{},{"stripe-signature":"t=1,v1=invalid"}),400,"invalid_signature_or_environment")
    expect("checkout without authenticated user refused",call("","POST",{"action":"checkout","slug":"boundary-builder-workbook","termsVersion":"draft-v1","acceptTerms":True},{"Origin":ORIGIN}),401,"unauthorized")
    expect("catalog without QA user refused",call("","POST",{"action":"catalog"},{"Origin":ORIGIN}),401,"unauthorized")
    expect("production origin refused on QA",call("","POST",{"action":"catalog"},{"Origin":"https://notbrokenjustburning.com"}),403,"not_allowed")
    print("QA_HOSTED_SECURITY_CONTRACT_PASSED. No payment, order, entitlement or webhook event was created.",flush=True)
if __name__=="__main__":
    try:main()
    except Exception as e:
        print("QA_HOSTED_PROBE_FAILED: "+str(e)[:170],file=sys.stderr)
        sys.exit(1)
