#!/usr/bin/env python3
"""One-shot non-paying Stripe SANDBOX form-readiness diagnostic.

Authenticates ONLY an existing allowlisted QA identity on the established HTTPS QA
preview, opens ONE sandbox session with the existing reservation logic, and inspects
card-input readiness without pressing Pay or creating a PaymentIntent. Never logs
PII, form values, card details, session IDs, tokens, signed URLs, or page text.
This is explicitly NOT genuine-payment or fulfillment acceptance.
"""
import json
import os
import re
import sys
import time
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, TimeoutError as BrowserTimeout
from commerce_qa_browser_acceptance import (
    QA_ORIGIN, login, smoke, test_host, stripe_frames, fill_across_frames, check
)
SLUG="boundary-builder-workbook"

def frames_snapshot(page):
    visible=0
    attr_counts={"cc-number":0,"cc-exp":0,"cc-csc":0,"cc-name":0,"email":0,"postal-code":0}
    address={"country_select":0,"address_line1":0,"state":0,"postal":0}
    pay_visible=pay_enabled=0
    pay_re=re.compile(r"^(?:Pay(?:\s+\$?14\.99(?:\s+USD)?)?|Complete purchase|Place order)$",re.I)
    for frame in stripe_frames(page):
        try:
            for name in frame.locator("input:visible").evaluate_all(
              "(els)=>els.map(e=>e.getAttribute('autocomplete')||'')"):
                visible+=1
                if name in attr_counts:attr_counts[name]+=1
            for key,selectors in {
              "country_select":["select[autocomplete='country']","select[name*='country' i]"],
              "address_line1":["input[autocomplete='address-line1']","input[name*='addressLine1' i]"],
              "state":["select[autocomplete='address-level1']","input[autocomplete='address-level1']"],
              "postal":["input[autocomplete='postal-code']"]
            }.items():
                address[key]+=int(any(frame.locator(x).count()>0 for x in selectors))
            for item in frame.get_by_role("button",name=pay_re).all()[:5]:
                if item.is_visible(timeout=250):
                    pay_visible+=1
                    if item.is_enabled(timeout=250):pay_enabled+=1
        except Exception:continue
    return {"stripe_frame_count":sum(1 for _ in stripe_frames(page)),
            "visible_input_count":visible,
            "known_autocomplete_counts":attr_counts,
            "address_field_presence":address,
            "allowed_pay_button_visible":pay_visible,
            "allowed_pay_button_enabled":pay_enabled}

def main():
    email=os.getenv("NBJB_QA_EXISTING_EMAIL","")
    password=os.getenv("NBJB_QA_EXISTING_PASSWORD","")
    check(bool(email and password),"BLOCKED_EXISTING_APPROVED_QA_CREDENTIALS")
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        context=browser.new_context(ignore_https_errors=True)
        page=context.new_page()
        try:
            smoke(page)
            login(page,email,password)
            page.goto(QA_ORIGIN+"/store.html",wait_until="domcontentloaded")
            page.wait_for_function("""slug => {
              const b=document.querySelector('[data-commerce-buy="'+slug+'"]');
              return !!b&&!b.disabled;
            }""",arg=SLUG,timeout=25000)
            page.locator("#commerce-terms input[type=checkbox]").check()
            page.locator('[data-commerce-buy="'+SLUG+'"]').click()
            try:
                page.wait_for_url(re.compile(r"^https://checkout\.stripe\.com/"),timeout=45000)
            except BrowserTimeout:
                raise AssertionError("SANDBOX_FORM_NOT_REACHED_NO_PAYMENT_ATTEMPT")
            print("DIAGNOSTIC_CHECKOUT_REDIRECT_REACHED",flush=True)
            test_host(page)
            try:
                page.wait_for_function("document.body && document.body.innerText.includes('14.99')",timeout=30000)
            except BrowserTimeout:
                raise AssertionError("STRIPE_EXPECTED_AMOUNT_NOT_RENDERED")
            check("14.99" in page.locator("body").inner_text(timeout=5000),"WRONG_SANDBOX_AMOUNT")
            print("DIAGNOSTIC_SANDBOX_STRIPE_HOST_AND_PRICE_VERIFIED",flush=True)
            for frame in stripe_frames(page):
                for el in (frame.get_by_role("radio",name=re.compile(r"^Card$",re.I)),
                           frame.get_by_role("button",name=re.compile(r"^Card$",re.I)),
                           frame.locator('[data-testid="card-accordion-item"]')):
                    try:
                        if el.count() and el.first.is_visible(timeout=400):
                            el.first.click(timeout=2500);break
                    except Exception:pass
            steps=[
              ("email",["input[type=email]","input[autocomplete=email]"],email,False),
              ("card",["input[autocomplete='cc-number']","input[name='cardNumber']","input[name='cardnumber']","#cardNumber","input[data-elements-stable-field-name='cardNumber']","input[aria-label='Card number' i]"],"4242424242424242",True),
              ("expiry",["input[autocomplete='cc-exp']","input[name='cardExpiry']","input[name='exp-date']","#cardExpiry","input[aria-label='Expiration date' i]"],"1228",True),
              ("cvc",["input[autocomplete='cc-csc']","input[name='cardCvc']","input[name='cvc']","#cardCvc"],"123",True),
              ("name",["input[autocomplete='cc-name']","input[name='billingName']","#billingName"],"NBJB QA Browser",False),
              ("postal",["input[autocomplete='postal-code']","input[name='billingPostalCode']","#billingPostalCode"],"33801",False)
            ]
            results={}
            for kind,selectors,value,required in steps:
                try:
                    results[kind]=bool(fill_across_frames(page,kind,selectors,value,required=required))
                except Exception as e:
                    results[kind]=False
                    print("DIAGNOSTIC_INPUT_FAILURE "+kind+" "+type(e).__name__,flush=True)
                    break
            time.sleep(2)
            test_host(page)
            snap=frames_snapshot(page)
            print("SANDBOX_NONPAYING_FORM_DIAGNOSTIC "+json.dumps({"input_fill_status":results,**snap},sort_keys=True),flush=True)
            print("NO_PAY_BUTTON_CLICKED_NO_PAYMENT_INTENT_NO_SETTLED_ORDER_CLAIM",flush=True)
        finally:
            context.close()
            browser.close()

if __name__=="__main__":
    try:main()
    except Exception as e:
        print("SANDBOX_NONPAYING_DIAGNOSTIC_BLOCKED "+type(e).__name__,file=sys.stderr)
        sys.exit(1)
