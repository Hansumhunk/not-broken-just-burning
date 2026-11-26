#!/usr/bin/env python3
"""Real QA post-refund access denial, NO Checkout, API refunds or new accounts.

This verifies an authentic test-mode Stripe full refund revoked both the
original owner's new private signed ZIP issuance and unrelated user access.
Prior paid bytes, TTL and reissue were verified in the pre-refund QA job.
"""
import os
import re
import sys
from playwright.sync_api import sync_playwright
from commerce_qa_browser_acceptance import (
    QA_ORIGIN, check, smoke, login, qa_request
)

def main():
    credentials=[
      (os.getenv("NBJB_QA_EXISTING_EMAIL",""),os.getenv("NBJB_QA_EXISTING_PASSWORD","")),
      (os.getenv("NBJB_QA_SECONDARY_EMAIL",""),os.getenv("NBJB_QA_SECONDARY_PASSWORD",""))
    ]
    check(all(all(v) for v in credentials),"BLOCKED_EXISTING_APPROVED_QA_CREDENTIALS")
    with sync_playwright() as p:
      browser=p.chromium.launch(headless=True)
      context=None
      seen=set()
      try:
        for email,password in credentials:
          context=browser.new_context(ignore_https_errors=True)
          page=context.new_page()
          smoke(page)
          uid=login(page,email,password)
          check(uid not in seen,"DUPLICATE_SYNTHETIC_ACCOUNT")
          seen.add(uid)
          page.goto(QA_ORIGIN+"/member-library.html",wait_until="domcontentloaded")
          page.wait_for_function("window.NBJBAuth?.user?.id && window.NBJBCommerce?.enabled",timeout=25000)
          for product in ("boundary-builder-workbook","forge-workbook"):
            result=qa_request(page,"download",slug=product)
            check(not result["ok"] and result.get("error")=="not_owned",
                  "POSTREFUND_SIGNED_PRIVATE_DOWNLOAD_ISSUANCE_NOT_DENIED")
          context.close()
          context=None
        check(len(seen)==2,"INSUFFICIENT_QA_ACCOUNT_SCOPE")
        print("REAL_QA_POST_REFUND_BUYER_AND_NONOWNER_PRIVATE_URL_ISSUANCE_DENIED",flush=True)
        print("NO_PAYMENT_NO_REFUND_NO_NEW_WEBHOOK_NO_LIVE_CHARGE",flush=True)
      finally:
        if context:context.close()
        browser.close()

if __name__=="__main__":
  try:main()
  except Exception as ex:
    reason=str(ex) if isinstance(ex,AssertionError) else type(ex).__name__
    safe=reason if re.fullmatch(r"[A-Z0-9_]{1,140}",reason) else "REDACTED_FAILURE"
    print("POSTREFUND_QA_BLOCKED_OR_FAILED "+safe,file=sys.stderr)
    sys.exit(1)
