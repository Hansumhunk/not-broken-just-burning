#!/usr/bin/env python3
"""Read-only REAL QA delivery acceptance for ONE already-paid Stripe test order.

Uses only the two existing allowlisted synthetic QA identities. NO purchase, Pay
click, Stripe mutation, new account, webhook replay, refund or live access.
No email, auth token, checkout ID, signed URL, PII or customer PDF in logs.
"""
import hashlib
import json
import os
import re
import sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from commerce_qa_browser_acceptance import (
    QA_ORIGIN, QA_REF, SPECS, check, login, smoke, qa_request, exact_private_download
)

SLUG="boundary-builder-workbook"
HASH="c3031e9de5d66ba0d4185efceff67321a669b472fd264728ff911b06c372c123"
SIZE=739982
FORGE="forge-workbook"

def nonowner_check(page,slug):
    response=qa_request(page,"download",slug=slug)
    check(not response["ok"] and response.get("error")=="not_owned",
          "CROSS_IDENTITY_OR_SKU_ISSUANCE_NOT_DENIED")
    return True

def main():
    check(len(SPECS)==1 and SPECS[0][0]==SLUG and SPECS[0][1]==1499 and SPECS[0][2]==HASH,
          "APPROVED_QA_BOUNDARY_EDITION_DRIFT")
    credentials=[
        (os.getenv("NBJB_QA_EXISTING_EMAIL",""),os.getenv("NBJB_QA_EXISTING_PASSWORD","")),
        (os.getenv("NBJB_QA_SECONDARY_EMAIL",""),os.getenv("NBJB_QA_SECONDARY_PASSWORD",""))
    ]
    check(all(all(pair) for pair in credentials),"BLOCKED_EXISTING_APPROVED_QA_IDENTITIES")
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        contexts=[]
        try:
            records=[]
            for email,password in credentials:
                context=browser.new_context(ignore_https_errors=True)
                contexts.append(context)
                page=context.new_page()
                smoke(page)
                identity=login(page,email,password)
                page.goto(QA_ORIGIN+"/member-library.html",wait_until="domcontentloaded")
                page.wait_for_function("window.NBJBAuth?.user?.id && window.NBJBCommerce?.enabled",timeout=25000)
                check(page.evaluate("window.NBJBAuth.user.id")==identity,"QA_LOGIN_IDENTITY_CHANGED")
                nonowner_check(page,FORGE)
                response=qa_request(page,"download",slug=SLUG)
                if response["ok"]:
                    # Do not print bearer URL. The owner must get a new signed link.
                    uri=urlparse(response["result"].get("url",""))
                    check(uri.scheme=="https" and uri.hostname==QA_REF+".supabase.co" and
                          uri.path.startswith("/storage/v1/object/sign/nbjb-private-products/"),
                          "UNSAFE_SIGNED_PRIVATE_DELIVERY_URL")
                    records.append({"owned":True,"page":page,"id":identity})
                else:
                    check(response.get("error")=="not_owned","UNEXPECTED_NONOWNER_FAILURE")
                    records.append({"owned":False,"page":page,"id":identity})
            check(records[0]["id"]!=records[1]["id"],"QA_IDENTITY_NOT_DISTINCT")
            owners=[x for x in records if x["owned"]]
            nonowners=[x for x in records if not x["owned"]]
            check(len(owners)==1 and len(nonowners)==1,"NOT_EXACTLY_ONE_VERIFIED_QA_PRODUCT_OWNER")
            print("REAL_QA_SINGULAR_OWNER_AND_UNOWNED_ACCOUNT_DENIAL_VERIFIED",flush=True)
            # Need exact returned bytes, link expiry, recovery and scope; this waits
            # 70 seconds for the genuine 60-second signed bearer URL to expire.
            payload=exact_private_download(owners[0]["page"],SLUG,HASH)
            check(payload.get("download_sha256")==HASH and payload.get("bytes")==SIZE and
                  payload.get("expired_url_denied") and payload.get("reload_recovery_verified"),
                  "OWNER_DELIVERY_HASH_OR_EXPIRY_MISMATCH")
            check(nonowner_check(nonowners[0]["page"],SLUG),
                  "UNOWNED_ACCESS_DENIAL_REGRESSION")
            check(nonowner_check(owners[0]["page"],FORGE),
                  "UNPURCHASED_FORGE_ACCESS_NOT_DENIED")
            print("REAL_QA_PRIVATE_BOUNDARY_V1_4_ZIP_SHA256_BYTES_60S_EXPIRY_REISSUE_AND_ISOLATION_PASS",flush=True)
            # Static-only aggregate summary, no owner IDs, tokens or URLs.
            report={"environment":"stripe_sandbox_qa","real_paid_order_required":True,
                    "approved_product":"boundary-builder-workbook",
                    "owner_count":1,"unowned_account_denied":True,"wrong_sku_denied":True,
                    "bytes":SIZE,"sha256":HASH,"signed_url_ttl_seconds":60,
                    "expired_url_denied":True,"account_recovery_reissue_pass":True,
                    "test_card_clicked":False,"live_charge":False}
            out=os.getenv("NBJB_QA_POSTPAID_EVIDENCE_PATH","/tmp/nbjb-postpaid-delivery.json")
            with open(out,"w") as file:
                json.dump(report,file,indent=2)
                file.write("\n")
            print("POSTPAID_DELIVERY_QA_EVIDENCE_READY_NO_PII",flush=True)
        finally:
            for context in contexts:context.close()
            browser.close()

if __name__=="__main__":
    try:main()
    except Exception as exc:
        reason=str(exc) if isinstance(exc,AssertionError) else type(exc).__name__
        safe=reason if re.fullmatch(r"[A-Z0-9_]{1,140}",reason) else "REDACTED_FAILURE"
        print("POSTPAID_DELIVERY_QA_BLOCKED_OR_FAILED "+safe,file=sys.stderr)
        sys.exit(1)
