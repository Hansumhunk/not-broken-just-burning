#!/usr/bin/env python3
# QA rerun checkpoint 2026-11-20: trigger new PR workflow queue to read founder-configured temporary QA-only Actions secrets.
"""Real Chromium-to-Stripe QA acceptance. Existing QA identities and existing product SKUs ONLY.

Smoke needs no identity. Provider mode requires a preexisting, confirmed QA account's
credentials from GitHub Actions secrets. No new user, project, bucket, price or endpoint.
Never record auth tokens, email, card details, signed URLs, or full Stripe checkout URLs.
"""
import argparse
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, TimeoutError as BrowserTimeout

QA_ORIGIN = "https://localhost:8443"
QA_REF = "fgpkejlmpfkxgpktgdzm"
QA_USER_IDS = frozenset({
    "de62d015-45f1-48b5-a14e-410e221631fe",
    "4a34b3f8-4c46-4e07-adf7-c5aae719a23f",
})
SPECS = (
    ("boundary-builder-workbook", 1499, "a61b151de255ca848838cac23fbbe94f44d92bfa3fa378877bbf6e7d64984fd0"),
    ("forge-workbook", 1999, "e1b6c43db71226f8801a16ca0df8e5e2e6ae9b3fb2552194342cb06ea8d9b1d9"),
)
NO_PII_OUTPUT = Path(os.environ.get("NBJB_QA_EVIDENCE_PATH", "/tmp/nbjb-provider-evidence.json"))

def check(ok, message):
    if not ok:
        raise AssertionError(message)

def qa_request(page, action, **payload):
    return page.evaluate(
        """async ({ action, payload }) => {
          try {
            const result = await window.NBJBCommerce.call(action,payload);
            return { ok:true, result };
          } catch (error) {
            return { ok:false, error:error?.message||"unknown" };
          }
        }""", {"action": action, "payload": payload}
    )

def login(page, email, password):
    check(bool(email and password), "BLOCKED_EXISTING_QA_IDENTITY_CREDENTIALS")
    page.goto(QA_ORIGIN + "/member-auth.html", wait_until="domcontentloaded")
    page.locator("#sign-in-email").fill(email)
    page.locator("#sign-in-password").fill(password)
    page.locator("#sign-in-form button[type=submit]").click()
    # The site's success handler intentionally navigates to members.html.
    # Wait for the landing page before inspecting its auth state; evaluating
    # on member-auth.html races a document teardown after successful sign-in.
    try:
        page.wait_for_url(re.compile(r"^https://localhost:8443/members\\.html(?:[?#].*)?$"), timeout=25000)
    except BrowserTimeout:
        raise AssertionError("BLOCKED_QA_SIGN_IN_DID_NOT_REACH_MEMBERS")
    page.wait_for_function("window.NBJBAuth?.user?.id", timeout=25000)
    account = page.evaluate("window.NBJBAuth.user.id")
    check(account in QA_USER_IDS, "BLOCKED_ACCOUNT_NOT_IN_TWO_EXISTING_APPROVED_QA_IDENTITIES")
    return account

def smoke(page):
    page.goto(QA_ORIGIN + "/store.html", wait_until="domcontentloaded")
    check(page.locator("main #boundary-builder-workbook").count()==1, "missing_boundary_listing")
    check(page.locator("main #forge-workbook").count()==1, "missing_forge_listing")
    browser_config = page.evaluate("""() => ({
      url:window.NBJBConfig?.supabaseUrl,
      ref:window.NBJBCommercePreview?.sandboxRef,
      qa:window.NBJBCommerce?.enabled,
      mode:window.NBJBCommerce?.mode
    })""")
    check(browser_config["url"] == "https://"+QA_REF+".supabase.co", "NON_QA_BACKEND_ABORT")
    check(browser_config["ref"] == QA_REF, "NON_QA_PREVIEW_ABORT")
    check(browser_config["qa"] and browser_config["mode"]=="sandbox", "QA_CLIENT_NOT_ENABLED")
    check(page.locator("[data-commerce-buy='masculine-restoration-guide']").is_disabled(), "future_product_enabled")
    check(page.locator("[data-commerce-buy='hawk-complete-toolkit']").is_disabled(), "future_product_enabled")
    return {"mode": "sandbox", "origin": QA_ORIGIN, "qa_ref": QA_REF, "catalog": "present"}

def fill_across_frames(page, probes, value, required=True):
    """Stripe's card fields may be in the top document or secure nested iframes."""
    until=time.monotonic()+22
    while time.monotonic()<until:
        for frame in page.frames:
            for selector in probes:
                try:
                    locator=frame.locator(selector).first
                    if locator.count() and locator.is_visible(timeout=250):
                        locator.fill(value,timeout=2500)
                        return True
                except Exception:
                    continue
        time.sleep(.25)
    if required:
        raise AssertionError("STRIPE_TEST_INPUT_NOT_FOUND")
    return False

def stripe_test_payment(page, email, cents):
    # Stripe Checkout URLs carry cs_test_ for real Stripe test-mode sessions.
    parsed=urlparse(page.url)
    check(parsed.scheme=="https" and parsed.hostname=="checkout.stripe.com", "CHECKOUT_NOT_STRIPE_HOST")
    check("cs_test_" in parsed.path, "ABORT_NON_TEST_CHECKOUT_SESSION")
    check(str(cents//100)+"."+f"{cents%100:02d}" in page.locator("body").inner_text(timeout=30000), "WRONG_STRIPE_SUBTOTAL_ABORT")
    # Use the authorized QA account email only, no new test recipient.
    fill_across_frames(page, ["input[type=email]", "input[autocomplete=email]"], email, required=False)
    fill_across_frames(page, ["input[autocomplete='cc-number']", "input[placeholder='1234 1234 1234 1234']", "input[name='cardnumber']", "#cardNumber"], "4242424242424242")
    fill_across_frames(page, ["input[autocomplete='cc-exp']", "input[placeholder='MM / YY']", "input[name='exp-date']", "#cardExpiry"], "1228")
    fill_across_frames(page, ["input[autocomplete='cc-csc']", "input[placeholder='CVC']", "input[name='cvc']", "#cardCvc"], "123")
    fill_across_frames(page, ["input[autocomplete='cc-name']", "input[name='billingName']", "input[placeholder='Full name']"], "NBJB QA Browser", required=False)
    fill_across_frames(page, ["input[autocomplete='postal-code']", "input[name='billingPostalCode']", "input[placeholder='ZIP']"], "33801", required=False)
    # Only the Stripe test-hosted session is allowed to receive our test card.
    buttons=page.get_by_role("button", name=re.compile(r"^(Pay|Complete purchase|Place order)",re.I))
    check(buttons.count()>0, "STRIPE_PAY_BUTTON_NOT_FOUND")
    buttons.first.click(timeout=12000)
    page.wait_for_url(re.compile(r"^https://localhost:8443/commerce-result\.html\?"),timeout=90000)
    check(urlparse(page.url).hostname=="localhost","UNEXPECTED_POST_PAYMENT_REDIRECT")

def wait_verified_order(page, order_id):
    deadline=time.monotonic()+100
    while time.monotonic()<deadline:
        result=qa_request(page,"status",order=order_id)
        if result["ok"] and result["result"].get("status")=="paid" and result["result"].get("owned") is True:
            return
        if result["ok"] and result["result"].get("status") in {"refunded","disputed","failed"}:
            raise AssertionError("ORDER_NOT_PAID_"+result["result"]["status"])
        time.sleep(2)
    raise AssertionError("BLOCKED_NO_SIGNED_WEBHOOK_ENTITLEMENT_WITHIN_100S")

def exact_private_download(page, slug, expected_sha):
    result=qa_request(page,"download",slug=slug)
    check(result["ok"],"SIGNED_DOWNLOAD_NOT_ISSUED_"+str(result.get("error")))
    data=result["result"]
    link=data.get("url","")
    u=urlparse(link)
    check(u.scheme=="https" and u.hostname==QA_REF+".supabase.co" and
          u.path.startswith("/storage/v1/object/sign/nbjb-private-products/"),
          "UNSAFE_STORAGE_URL")
    check(data.get("expiresIn")==60,"WRONG_EXPIRY")
    # Do not report or upload the bearer download URL.
    response=page.request.get(link,timeout=20000)
    check(response.ok, "PRIVATE_FILE_FETCH_FAILED")
    content=response.body()
    digest=hashlib.sha256(content).hexdigest()
    check(digest==expected_sha, "SYNTHETIC_PRODUCT_BYTE_HASH_MISMATCH")
    return {"download_sha256":digest, "bytes":len(content),"url_ttl_seconds":60}

def provider_purchase(page, email, slug, cents, sha):
    page.goto(QA_ORIGIN + "/store.html",wait_until="domcontentloaded")
    page.wait_for_function("""slug => { const button = document.querySelector('[data-commerce-buy="'+slug+'"]'); return !!button && !button.disabled; }""",arg=slug,timeout=25000)
    # Before buying, ownership of this SKU must be denied.
    deny=qa_request(page,"download",slug=slug)
    check(not deny["ok"] and deny["error"]=="not_owned","UNOWNED_DOWNLOAD_NOT_DENIED")
    page.locator("#commerce-terms input[type=checkbox]").check()
    order={}
    errors=[]
    def inspect_response(response):
        if response.url.endswith("/functions/v1/commerce") and response.request.method=="POST":
            try:
                body=response.json()
                if body.get("order"):order["id"]=body["order"]
                if body.get("error"):errors.append(body["error"])
            except Exception:pass
    page.on("response",inspect_response)
    button=page.locator('[data-commerce-buy="'+slug+'"]')
    button.click()
    try:
        page.wait_for_url(re.compile(r"^https://checkout\.stripe\.com/"),timeout=45000)
    except BrowserTimeout:
        # A disabled server gate is a precise provider blocker; don't create retries.
        raise AssertionError("NO_STRIPE_CHECKOUT_"+(errors[-1] if errors else "NO_REDIRECT"))
    check(bool(re.fullmatch(r"[a-f0-9-]{36}",order.get("id",""))),"MISSING_QA_ORDER_REFERENCE")
    stripe_test_payment(page,email,cents)
    wait_verified_order(page,order["id"])
    download=exact_private_download(page,slug,sha)
    # Verify SKU-specific grant, not subscription entitlement or cross-SKU permission.
    return {"sku":slug,"order_id":order["id"],"checkout":"cs_test_ verified in browser",
            "status":"paid","entitlement":"active_verified_through_authenticated_ledger",
            **download}

def check_other_account(browser, primary_id, slugs):
    email=os.getenv("NBJB_QA_SECONDARY_EMAIL","")
    password=os.getenv("NBJB_QA_SECONDARY_PASSWORD","")
    if not (email and password):
        return "BLOCKED_SECOND_APPROVED_ACCOUNT_CREDENTIALS"
    context=browser.new_context(ignore_https_errors=True)
    page=context.new_page()
    try:
        secondary=login(page,email,password)
        check(secondary!=primary_id,"SECONDARY_ACCOUNT_SAME_AS_BUYER")
        page.goto(QA_ORIGIN+"/member-library.html")
        for slug in slugs:
            attempt=qa_request(page,"download",slug=slug)
            check(not attempt["ok"] and attempt["error"]=="not_owned","CROSS_ACCOUNT_ACCESS_NOT_DENIED")
        return "verified_denied"
    finally:context.close()

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--mode",choices=["smoke","provider"],required=True)
    args=parser.parse_args()
    evidence={"kind":"REAL_PROVIDER_QA" if args.mode=="provider" else "LOCAL_QA_BROWSER_SMOKE",
              "project":QA_REF,"provider":"Stripe sandbox", "products":[]}
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        context=browser.new_context(ignore_https_errors=True)
        page=context.new_page()
        evidence["preview"]=smoke(page)
        print("PASS: Local HTTPS Chromium preview uses isolated QA ref; unreleased SKUs remain disabled",flush=True)
        if args.mode=="provider":
            email=os.getenv("NBJB_QA_EXISTING_EMAIL","")
            password=os.getenv("NBJB_QA_EXISTING_PASSWORD","")
            primary_id=login(page,email,password)
            for slug,cents,sha in SPECS:
                result=provider_purchase(page,email,slug,cents,sha)
                evidence["products"].append(result)
                print("PASS: "+slug+": real Stripe cs_test_, paid ledger, authorized private file hash",flush=True)
            evidence["cross_account"]=check_other_account(browser,primary_id,[x[0] for x in SPECS])
            if evidence["cross_account"]!="verified_denied":
                print("BLOCKED: cross-account check requires second existing QA account credential",flush=True)
        context.close()
        browser.close()
    NO_PII_OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    NO_PII_OUTPUT.write_text(json.dumps(evidence,indent=2)+"\n")
    print("EVIDENCE: "+str(NO_PII_OUTPUT),flush=True)

if __name__=="__main__":
    try:main()
    except Exception as exc:
        print("PROVIDER_QA_BLOCKED_OR_FAILED: "+str(exc).splitlines()[0][:180],file=sys.stderr)
        sys.exit(1)
