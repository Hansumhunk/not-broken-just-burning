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
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, TimeoutError as BrowserTimeout

QA_ORIGIN = "https://localhost:8443"
QA_REF = "fgpkejlmpfkxgpktgdzm"
QA_USER_IDS = frozenset({
    "de62d015-45f1-48b5-a14e-410e221631fe",
    "4a34b3f8-4c46-4e07-adf7-c5aae719a23f",
})
SPECS = (
    ("boundary-builder-workbook", 1499, "c3031e9de5d66ba0d4185efceff67321a669b472fd264728ff911b06c372c123"),
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
        page.wait_for_url(re.compile(r"^https://localhost:8443/members\.html(?:[?#].*)?$"), timeout=25000)
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
    # Validate actual DOM content of the isolated local Chromium storefront preview.
    boundary = page.locator("main #boundary-builder-workbook")
    check("Completed v1.4" in (boundary.locator(".eyebrow").text_content() or ""), "BOUNDARY_VERSION_NOT_V1_4")
    check("43-page reading PDF and 42-page print edition in one ZIP" in (boundary.text_content() or ""), "BOUNDARY_PAGE_COUNTS_MISMATCH")
    check("$14.99 USD" in (boundary.text_content() or ""), "BOUNDARY_PRICE_MISMATCH")
    check("Completed v1.3" in (page.locator("main #forge-workbook .eyebrow").text_content() or ""), "FORGE_VERSION_REGRESSED")
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

def test_host(page):
    u=urlparse(page.url)
    check(u.scheme=="https" and u.hostname=="checkout.stripe.com"
          and re.search(r"/cs_test_[A-Za-z0-9]+",u.path), "ABORT_NON_TEST_CHECKOUT_SESSION")

def stripe_frames(page):
    for frame in page.frames:
        u=urlparse(frame.url)
        if u.scheme=="https" and (u.hostname=="stripe.com" or (u.hostname or "").endswith(".stripe.com")):
            yield frame

def controls_diagnostic(page, field):
    # Counts only: no input values, text, HTML, URLs, email, or arbitrary attribute strings.
    known=("cc-number","cc-exp","cc-csc","cc-name","email","postal-code")
    counts={k:0 for k in known}
    visible=0
    for frame in stripe_frames(page):
        try:
            data=frame.locator("input:visible").evaluate_all("(els) => els.map(e => e.getAttribute('autocomplete') || '')")
            visible+=len(data)
            for a in data:
                if a in counts: counts[a]+=1
        except Exception:
            pass
    print("STRIPE_CONTROL_DIAGNOSTIC "+json.dumps({"missing":field,"stripe_frames":sum(1 for _ in stripe_frames(page)),"visible_inputs":visible,"known_autocomplete_counts":counts}),flush=True)

def fill_across_frames(page, field, probes, value, required=True):
    until=time.monotonic()+(25 if required else 4)
    while time.monotonic()<until:
        test_host(page)
        for frame in stripe_frames(page):
            for selector in probes:
                try:
                    for locator in frame.locator(selector).all()[:8]:
                        if locator.is_visible(timeout=250) and locator.is_enabled(timeout=250):
                            locator.fill(value,timeout=2500)
                            return True
                except Exception:
                    continue
        time.sleep(.25)
    if required:
        controls_diagnostic(page,field)
        raise AssertionError("STRIPE_TEST_INPUT_NOT_FOUND_"+field)
    return False

def fill_synthetic_billing_address(page):
    """Checkout displayed country/address inputs that the previous harness left blank.

    Only preexisting Stripe test-hosted fields, approved US synthetic test address;
    no real customer data, no shipping, no saved-card or Link integration.
    """
    test_host(page)
    fields={"country":False,"line1":False,"city":False,"state":False,"postal":False}
    for frame in stripe_frames(page):
        for selector in ("select[autocomplete='country']","select[name*='country' i]"):
            try:
                element=frame.locator(selector).first
                if element.count() and element.is_visible(timeout=300) and element.is_enabled(timeout=300):
                    element.select_option(value="US",timeout=2000)
                    fields["country"]=True
                    break
            except Exception:
                pass
    fields["line1"]=fill_across_frames(page,"billing_line1",[
        "input[autocomplete='address-line1']","input[name*='addressLine1' i]",
        "input[placeholder*='Street address' i]","input[placeholder*='Address line 1' i]","input[aria-label*='Address line 1' i]"
    ],"123 Test Avenue",required=False)
    fields["city"]=fill_across_frames(page,"billing_city",[
        "input[autocomplete='address-level2']","input[name*='city' i]",
        "input[aria-label='City' i]"
    ],"San Francisco",required=False)
    for frame in stripe_frames(page):
        try:
            options=frame.locator("select[autocomplete='address-level1']").first
            if options.count() and options.is_visible(timeout=250) and options.is_enabled(timeout=250):
                options.select_option(value="CA",timeout=2000)
                fields["state"]=True
                break
        except Exception:
            pass
    if not fields["state"]:
        fields["state"]=fill_across_frames(page,"billing_state",[
          "input[autocomplete='address-level1']","input[name*='state' i]","input[aria-label='State' i]"
        ],"CA",required=False)
    # Stripe occasionally renders State/Region as a custom accessible picker,
    # not a native address-level1 input/select. Select the explicit CA option
    # rather than treating a visible/enabled Pay button as proof of address validity.
    if not fields["state"]:
        state_name=re.compile(r"(state|province|region)",re.I)
        for frame in stripe_frames(page):
            if fields["state"]:break
            candidates=[
                frame.get_by_role("combobox",name=state_name),
                frame.get_by_role("button",name=state_name),
                frame.locator("select[name*='state' i]"),
                frame.locator("select[name*='region' i]"),
            ]
            for group in candidates:
                if fields["state"]:break
                try:
                    for control in group.all()[:5]:
                        if not control.is_visible(timeout=250) or not control.is_enabled(timeout=250):
                            continue
                        tag=control.evaluate("el=>el.tagName.toLowerCase()")
                        if tag=="select":
                            try:control.select_option(value="CA",timeout=2000)
                            except Exception:control.select_option(label="California",timeout=2000)
                            fields["state"]=True
                            break
                        if tag=="input":
                            control.fill("California",timeout=2000)
                        else:
                            control.click(timeout=2000)
                        for option in (
                            frame.get_by_role("option",name=re.compile(r"^California$",re.I)),
                            frame.get_by_text(re.compile(r"^California$",re.I),exact=True)
                        ):
                            if option.count() and option.first.is_visible(timeout=400):
                                option.first.click(timeout=2000)
                                fields["state"]=True
                                break
                        if fields["state"]:break
                except Exception:
                    continue
    fields["postal"]=fill_across_frames(page,"billing_postal",[
        "input[autocomplete='postal-code']","input[name*='postal' i]",
        "input[placeholder*='ZIP' i]","input[aria-label*='Postal code' i]"
    ],"94103",required=False)
    test_host(page)
    print("SANDBOX_TEST_BILLING_ADDRESS_FIELD_STATUS "+json.dumps(fields,sort_keys=True),flush=True)
    return fields

def stripe_test_payment(page, email, cents):
    test_host(page)
    expected=str(cents//100)+"."+f"{cents%100:02d}"
    # Actual non-paying Checkout probe confirmed that Stripe's form is ready
    # after its async amount hydration; inner_text() by itself does NOT wait.
    # Never attempt to fill or press Pay against a partly-rendered Checkout.
    try:
        page.wait_for_function("amount => document.body && document.body.innerText.includes(amount)",arg=expected,timeout=30000)
    except BrowserTimeout:
        raise AssertionError("STRIPE_PRICE_RENDER_TIMEOUT_NO_PAYMENT_CLICK")
    test_host(page)
    check(expected in page.locator("body").inner_text(timeout=5000), "WRONG_STRIPE_SUBTOTAL_ABORT")
    print("SANDBOX_CHECKOUT_AMOUNT_RENDERED_CARD_FORM_STAGE",flush=True)
    # Checkout may default to Link/wallet rather than the card accordion.
    # Select only the exact Card choice, never Link, saved cards or other methods.
    for frame in stripe_frames(page):
        for loc in (frame.get_by_role("radio",name=re.compile(r"^Card$",re.I)),
                    frame.get_by_role("button",name=re.compile(r"^Card$",re.I)),
                    frame.locator('[data-testid="card-accordion-item"]')):
            try:
                if loc.count() and loc.first.is_visible(timeout=500):
                    loc.first.click(timeout=3000)
                    break
            except Exception:
                continue
    fill_across_frames(page,"email",["input[type=email]","input[autocomplete=email]","#email"],email,required=False)
    fill_across_frames(page,"card_number",["input[autocomplete='cc-number']","input[name='cardNumber']","input[name='cardnumber']","#cardNumber","input[data-elements-stable-field-name='cardNumber']","input[aria-label='Card number' i]","input[placeholder='1234 1234 1234 1234']"],"4242424242424242")
    fill_across_frames(page,"expiry",["input[autocomplete='cc-exp']","input[name='cardExpiry']","input[name='exp-date']","#cardExpiry","input[data-elements-stable-field-name='cardExpiry']","input[aria-label='Expiration date' i]","input[placeholder='MM / YY']"],"1228")
    fill_across_frames(page,"cvc",["input[autocomplete='cc-csc']","input[name='cardCvc']","input[name='cvc']","#cardCvc","input[data-elements-stable-field-name='cardCvc']","input[placeholder='CVC']"],"123")
    fill_across_frames(page,"name",["input[autocomplete='cc-name']","input[name='billingName']","#billingName","input[placeholder='Full name']"],"NBJB QA Browser",required=False)
    # Previous genuine sandbox Pay click was accepted by Chromium but left
    # Checkout OPEN/UNPAID with NO PaymentIntent. An independently observed
    # country/address section was not completed by that prior harness.
    fill_synthetic_billing_address(page)
    test_host(page)
    check(expected in page.locator("body").inner_text(timeout=10000),"WRONG_STRIPE_SUBTOTAL_ABORT")
    # Stripe may enable the final button asynchronously after address/card validation.
    # Accept only a narrowly allowlisted one-time checkout label, on the verified test URL.
    # Do not select saved cards, Link, subscriptions, wallets or arbitrary submit buttons.
    allowed=re.compile(r"^(?:Pay(?:\s+\$?14\.99(?:\s+USD)?)?|Complete purchase|Place order)$",re.I)
    until=time.monotonic()+30
    counts={"visible":0,"enabled":0}
    while time.monotonic()<until:
        test_host(page)
        visible=[]
        for frame in stripe_frames(page):
            for b in frame.get_by_role("button",name=allowed).all():
                if b.is_visible(timeout=250):
                    visible.append(b)
        enabled=[b for b in visible if b.is_enabled(timeout=250)]
        counts={"visible":len(visible),"enabled":len(enabled)}
        if len(visible)==1 and len(enabled)==1:
            test_host(page)
            check(expected in page.locator("body").inner_text(timeout=10000),"WRONG_STRIPE_SUBTOTAL_ABORT")
            print("SANDBOX_EXACT_ONE_ENABLED_PAY_BUTTON_VERIFIED",flush=True)
            enabled[0].click(timeout=12000)
            print("SANDBOX_TEST_PAY_CLICK_RETURNED_RECONCILE_PROVIDER_NOT_A_PASS",flush=True)
            break
        time.sleep(.5)
    else:
        print("STRIPE_PAY_CONTROL_DIAGNOSTIC "+json.dumps(counts),flush=True)
        controls_diagnostic(page,"pay_button")
        raise AssertionError("STRIPE_PAY_BUTTON_NOT_UNIQUE_OR_ENABLED")
    try:
        page.wait_for_url(re.compile(r"^https://localhost:8443/commerce-result\.html\?"),timeout=90000)
    except BrowserTimeout:
        # A redirect timeout is not evidence of a failed or successful payment.
        # Only coarse destination class; never log URLs, session IDs, field values or page text.
        host=urlparse(page.url).hostname
        destination="stripe_checkout" if host=="checkout.stripe.com" else "qa_localhost" if host=="localhost" else "other"
        print("QA_POST_SUBMISSION_DESTINATION "+destination,flush=True)
        raise AssertionError("POST_PAYMENT_REDIRECT_TIMEOUT_RECONCILE_PROVIDER")
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
    check(digest==expected_sha, "APPROVED_CUSTOMER_ARCHIVE_HASH_MISMATCH")
    time.sleep(70)
    expired=page.request.get(link,timeout=20000)
    check(expired.status in (400,401,403,404),"EXPIRED_URL_NOT_REJECTED")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_function("window.NBJBAuth?.user?.id && window.NBJBCommerce?.enabled",timeout=25000)
    recovered=qa_request(page,"download",slug=slug)
    check(recovered["ok"],"RECOVERY_DOWNLOAD_NOT_ISSUED")
    fresh=recovered["result"].get("url","")
    v=urlparse(fresh)
    check(v.scheme=="https" and v.hostname==QA_REF+".supabase.co" and v.path.startswith("/storage/v1/object/sign/nbjb-private-products/") and fresh!=link,"UNSAFE_RECOVERY_URL")
    response=page.request.get(fresh,timeout=20000)
    check(response.ok and hashlib.sha256(response.body()).hexdigest()==expected_sha,"RECOVERY_HASH_MISMATCH")
    return {"download_sha256":digest,"bytes":len(content),"url_ttl_seconds":60,"expired_url_denied":True,"reload_recovery_verified":True}

def provider_purchase(page, email, slug, cents, sha):
    page.goto(QA_ORIGIN + "/store.html",wait_until="domcontentloaded")
    page.wait_for_function("""slug => { const button = document.querySelector('[data-commerce-buy="'+slug+'"]'); return !!button && !button.disabled; }""",arg=slug,timeout=25000)
    # Before buying, ownership of this SKU must be denied.
    deny=qa_request(page,"download",slug=slug)
    check(not deny["ok"] and deny["error"]=="not_owned","UNOWNED_DOWNLOAD_NOT_DENIED")
    page.locator("#commerce-terms input[type=checkbox]").check()
    errors=[]
    def inspect_response(response):
        if response.url.endswith("/functions/v1/commerce") and response.request.method=="POST":
            try:
                body=response.json()
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
    # The server places its authenticated order UUID in Stripe's success return URL.
    # Read it after Stripe redirects; avoid a race reading the checkout response as the page navigates.
    stripe_test_payment(page,email,cents)
    order_id=parse_qs(urlparse(page.url).query).get("order",[""])[0]
    check(bool(re.fullmatch(r"[a-f0-9-]{36}",order_id)),"MISSING_QA_ORDER_REFERENCE")
    wait_verified_order(page,order_id)
    download=exact_private_download(page,slug,sha)
    # Verify SKU-specific grant, not subscription entitlement or cross-SKU permission.
    return {"sku":slug,"checkout":"cs_test_ verified in browser",
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
            # Require the second approved identity and existing unowned denial before any payment.
            check(check_other_account(browser,primary_id,[x[0] for x in SPECS])=="verified_denied","BLOCKED_SECOND_APPROVED_QA_IDENTITY")
            for slug,cents,sha in SPECS:
                result=provider_purchase(page,email,slug,cents,sha)
                evidence["products"].append(result)
                print("PASS: "+slug+": real Stripe cs_test_, paid ledger, authorized private file hash",flush=True)
            evidence["cross_account"]=check_other_account(browser,primary_id,[x[0] for x in SPECS])
            if evidence["cross_account"]!="verified_denied":
                raise AssertionError("BLOCKED_CROSS_ACCOUNT_ACCEPTANCE")
        context.close()
        browser.close()
    NO_PII_OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    NO_PII_OUTPUT.write_text(json.dumps(evidence,indent=2)+"\n")
    print("EVIDENCE: "+str(NO_PII_OUTPUT),flush=True)

if __name__=="__main__":
    try:main()
    except Exception as exc:
        # Playwright exceptions may contain sensitive locators, URLs, or values.
        reason=str(exc) if isinstance(exc,AssertionError) else type(exc).__name__
        safe=reason if re.fullmatch(r"[A-Za-z0-9_]{1,150}",reason) else "REDACTED_FAILURE"
        print("PROVIDER_QA_BLOCKED_OR_FAILED: "+safe,file=sys.stderr)
        sys.exit(1)
