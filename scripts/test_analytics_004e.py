"""004-E: real SDK asset, intercepted synthetic browser transport; never send to PostHog."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import parse_qs, urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ["ANALYTICS_BASE_SHA"]
KEY = "phc_nbjb_isolated_fixture_not_a_real_project"
SDK = Path(os.environ["ANALYTICS_SDK_FILE"]).read_bytes()
ORIGIN = "https://notbrokenjustburning.com"
CANARY = "FAKECLICKIDENTIFIER_004E"
SECRET = "FAKE_PRIVATE_VALUE_004E"
SENTINEL = "$posthog_cookieless"
EVENTS = {"$pageview", "$pageleave", "nbjb_free_membership_cta_clicked", "nbjb_membership_checkout_requested"}
ALLOWED = {"token", "$cookieless_mode", "$current_url", "$pathname", "$referrer", "$referring_domain",
 "$initial_current_url", "$initial_referrer", "$initial_referring_domain", "$host", "$browser",
 "$browser_version", "$os", "$device_type", "$screen_height", "$screen_width", "$viewport_height",
 "$viewport_width", "$session_id", "$device_id", "$lib", "$lib_version", "$time", "$timezone",
 "$insert_id", "$process_person_profile", "distinct_id", "utm_source", "utm_medium", "utm_campaign",
 "utm_content", "utm_term", "plan", "placement", "$prev_pageview_pathname", "$prev_pageview_duration"}

def fixture_source(src):
    src, count = re.subn(r"phc_[A-Za-z0-9]+", KEY, src)
    assert count == 1, "Unexpected project token count; abort before browser"
    return src

def decode(raw):
    if not raw:
        raise AssertionError("Missing capture body")
    if raw.startswith(b"\x1f\x8b"):
        raw = gzip.decompress(raw)
    try:
        obj = json.loads(raw)
    except (ValueError, UnicodeError):
        data = parse_qs(raw.decode()).get("data", [])
        if not data:
            raise AssertionError("Unsupported SDK transport encoding")
        try:
            obj = json.loads(data[0])
        except ValueError:
            obj = json.loads(base64.b64decode(data[0]))
    if isinstance(obj, dict) and isinstance(obj.get("batch"), list):
        return obj["batch"]
    return obj if isinstance(obj, list) else [obj]

def isolated(browser, src, path, *, gpc=False, dnt=False, foreign=False, interactive=False, expect=True):
    ctx = browser.new_context(service_workers="block",
        user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
    ctx.add_init_script("Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>%s});"
        "Object.defineProperty(navigator,'doNotTrack',{get:()=>%s});" % (str(gpc).lower(), "'1'" if dnt else "'0'"))
    requests, payloads, errors = [], [], []
    html = '<!doctype html><html><head><title>Isolated fixture</title></head><body><a data-growth-cta="home_hero" href="#exercise">Start</a><script src="/js/main.js"></script></body></html>'
    # Every request is fulfilled or aborted in-process. Synthetic token is a second safety barrier.
    def route_request(route):
        req = route.request
        u = urlsplit(req.url)
        requests.append((u.hostname, u.path, req.method))
        if u.hostname in ("notbrokenjustburning.com","www.notbrokenjustburning.com","fixture.invalid"):
            if u.path == "/js/main.js":
                route.fulfill(status=200, content_type="application/javascript", body=src)
            elif req.resource_type == "document":
                route.fulfill(status=200, content_type="text/html", body=html)
            else:
                route.fulfill(status=200, body="")
        elif u.hostname == "us-assets.i.posthog.com" and u.path == "/static/array.js":
            route.fulfill(status=200, content_type="application/javascript", body=SDK)
        elif u.hostname in ("us-assets.i.posthog.com","us.i.posthog.com"):
            if req.method == "OPTIONS":
                route.fulfill(status=204, headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,GET,OPTIONS","Access-Control-Allow-Headers":"*"})
            elif u.path.endswith("/e/") or u.path in ("/e","/batch/","/capture/"):
                try:
                    payloads.extend(decode(req.post_data_buffer))
                except Exception as exc:
                    errors.append(str(exc))
                route.fulfill(status=200, content_type="application/json", body='{"status":"Ok"}', headers={"Access-Control-Allow-Origin":"*"})
            elif "config" in u.path and u.path.endswith(".js"):
                route.fulfill(status=404, body="")
            elif ("flags" in u.path or "decide" in u.path):
                route.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin":"*"},
                    body=json.dumps({"featureFlags":{},"featureFlagPayloads":{},"sessionRecording":False,"autocapture_opt_out":True,"supportedCompression":["gzip-js"]}))
            else:
                route.fulfill(status=404, body="")
        else:
            route.abort()
    ctx.route("**/*", route_request)
    page=ctx.new_page()
    page.goto(("https://fixture.invalid" if foreign else ORIGIN)+path, wait_until="load")
    if expect:
        page.wait_for_function("window.posthog && window.posthog.__loaded === true", timeout=15000)
        version=page.evaluate("window.posthog.get_property('$lib_version') || window.posthog.version || 'unknown'")
        if interactive:
            page.evaluate("""() => { const p=window.posthog;
                p.capture('nbjb_free_membership_cta_clicked', {placement:'home_hero', email:'FAKE_PRIVATE_VALUE_004E', fbclid:'FAKECLICKIDENTIFIER_004E', access_token:'FAKE_PRIVATE_VALUE_004E'});
                p.capture('forbidden_fixture_event', {email:'FAKE_PRIVATE_VALUE_004E'});
                }""")
        # Allow actual SDK request batching to flush; no forced production capture.
        for _ in range(30):
            page.wait_for_timeout(400)
            if any(p.get("event")=="$pageview" for p in payloads) and (not interactive or any(p.get("event")=="nbjb_free_membership_cta_clicked" for p in payloads)):
                break
        storage=page.evaluate("() => ({local:Object.keys(localStorage),session:Object.keys(sessionStorage),cookie:document.cookie})")
    else:
        page.wait_for_timeout(900)
        version,storage=None,None
    ctx.close()
    assert not errors, errors
    return requests,payloads,storage,version

def assert_payloads(payloads, expected_path):
    pageviews = [p for p in payloads if p.get("event") == "$pageview"]
    assert len(pageviews)==1, f"Expected one automatic pageview, got {len(pageviews)}"
    for e in payloads:
        p=e["properties"]
        assert e["event"] in EVENTS
        assert p["token"]==KEY and p["$cookieless_mode"] is True and p["distinct_id"]==SENTINEL
        assert p["$process_person_profile"] is False
        assert set(p) <= ALLOWED, set(p)-ALLOWED
        assert "$set" not in e and "$set_once" not in e
        assert p.get("$session_id") is None and p.get("$device_id") is None
        for k in ("$current_url","$initial_current_url","$referrer","$initial_referrer"):
            if p.get(k):
                assert not urlsplit(p[k]).query and not urlsplit(p[k]).fragment
        assert CANARY not in json.dumps(e) and SECRET not in json.dumps(e)
    assert pageviews[0]["properties"]["$pathname"]==expected_path
    return pageviews[0]["properties"]

def main():
    old=fixture_source(subprocess.check_output(["git","show",BASE+":js/main.js"], text=True))
    new=fixture_source((ROOT/"js/main.js").read_text())
    print("SDK SHA256",hashlib.sha256(SDK).hexdigest(), flush=True)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel="chrome", headless=True, args=["--disable-background-networking"])
        req,old_events,_,version=isolated(browser,old,"/")
        old_views=[e for e in old_events if e.get("event")=="$pageview"]
        assert not old_views or all(not e["properties"].get("token") or e["properties"].get("$cookieless_mode") is not True for e in old_views), "Baseline did not reproduce invalid transport; investigate"
        print("BASELINE SDK",version,"pageview requests",len(old_views),"missing valid protocol metadata",flush=True)
        old_req,_,_,_=isolated(browser,old,"/join.html?fbclid="+CANARY,expect=False)
        assert not any(h and "posthog.com" in h for h,_,_ in old_req), "Baseline social URL not excluded"
        cases=[("/",None),("/resources.html",None),
               ("/join.html?utm_source=facebook&utm_medium=organic_social&utm_campaign=flamewalker_first10&utm_content=boundaries_paid_nov20&fbclid="+CANARY+"#exercise","facebook"),
               ("/?utm_source=chatgpt.com&utm_campaign=flamewalker_first10","chatgpt.com")]
        for path,source in cases:
            req,events,storage,version=isolated(browser,new,path,interactive=path=="/")
            p=assert_payloads(events,urlsplit(path).path)
            if source:
                assert p.get("utm_source")==source and p.get("utm_campaign")=="flamewalker_first10",p.keys()
            if path=="/":
                assert len([e for e in events if e["event"]=="nbjb_free_membership_cta_clicked"])==1
            assert not any(k.startswith(("ph_","posthog")) for k in storage["local"]+storage["session"])
            assert "ph_" not in storage["cookie"] and "posthog" not in storage["cookie"]
            print("PASS eligible",urlsplit(path).path,source or "clean","sdk",version,flush=True)
        for path,opts in [("/",{"gpc":True}),("/",{"dnt":True}),("/",{"foreign":True}),
                     ("/member-auth.html",{}),("/member-workshop.html",{}),("/members.html",{}),
                     ("/resources.html?access_token="+SECRET,{}),("/resources.html?unknown="+SECRET,{}),
                     ("/resources.html#access_token="+SECRET,{}),("/member-store.html?checkout=bad",{})]:
            req,events,_,_=isolated(browser,new,path,expect=False,**opts)
            assert not events and not any(h and "posthog.com" in h for h,_,_ in req), "Forbidden analytics request: "+urlsplit(path).path
            print("PASS excluded",urlsplit(path).path,opts,flush=True)
        browser.close()
    print("All intercepted browser regression checks passed; no production traffic.")
if __name__=="__main__":
    main()
