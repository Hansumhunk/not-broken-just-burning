"""HAWK release smoke tests. All data fictional; no accounts, secrets or network.
Run: python -m pip install playwright==1.51.0 && python -m playwright install chromium
     python tests/hawk_browser_test.py
"""
import json
import os
import re
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
MODULES = [
    ("timeline", "TIMELINE", {"date": "2026-05-01", "source": "Direct observation", "summary": "FICTIONAL_TIMELINE"}),
    ("evidence-index", "EVIDENCE", {"title": "FICTIONAL_EVIDENCE", "origin": "Own copy", "summary": "Fictional record"}),
    ("documentation-checklist", "CHECKLIST", {"title": "FICTIONAL_TASK", "purpose": "Confirm fictional schedule", "route": "Own record", "next": "FICTIONAL_ACTION"}),
    ("communication-analyzer", "COMMUNICATION", {"safety": "clear", "channel": "permitted", "need": "needed", "purpose": "Fictional purpose", "original": "FICTIONAL_PRIVATE_DRAFT"}),
    ("court-preparation", "PREPARATION", {"plan": "Fictional appointment", "title": "FICTIONAL_PREPARATION", "context": "Fictional facts", "action": "Ask counsel"}),
    ("parenting-log", "PARENTING", {"child": "Child A", "title": "FICTIONAL_CARE", "date": "2026-05-01", "observation": "Fictional care", "followup": "Continue routine"}),
    ("financial-organizer", "FINANCIAL", {"period": "May", "title": "FICTIONAL_FINANCE", "amount": "10.20", "source": "Fictional receipt", "next": "Review"}),
    ("witness-observations", "WITNESS", {"alias": "Source A", "role": "Fictional observer", "title": "FICTIONAL_OBSERVATION", "observation": "Fictional account", "context": "Limited view", "handling": "Authorized copy", "next": "Ask qualified counsel"}),
    ("support-network", "SUPPORT", {"need": "FICTIONAL_PRIVATE_SUPPORT", "request": "Find resource", "boundary": "Respect consent"}),
]
def fmt(name):
    return "NBJB-HAWK-" + name

def path(slug):
    return (ROOT / "downloads" / ("hawk-" + slug + "-offline.html")).as_uri()

def put(page, values):
    for key, val in values.items():
        el = page.locator("#" + key)
        if el.evaluate("(el) => el.tagName") == "SELECT":
            try:
                el.select_option(value=val, timeout=1000)
            except Exception:
                el.select_option(label=val)
        else:
            el.fill(val)

def save_json(page, selector, folder, name):
    with page.expect_download() as event:
        page.locator(selector).click()
    download = event.value
    output = folder / (name + ".json")
    download.save_as(output)
    return json.loads(output.read_text(encoding="utf-8")), output

def upload(page, payload, selector="#file"):
    page.locator(selector).set_input_files({
        "name": "fictional.json", "mimeType": "application/json",
        "buffer": json.dumps(payload).encode("utf-8"),
    })

def status(page):
    return page.locator("#status-text" if page.locator("#status-text").count() else "#status")

def wait_import(page):
    expect(status(page)).to_contain_text(re.compile(r"opened locally|Saved text restored|Validated snapshot opened"), timeout=10000)

def ensure_mobile(page):
    for width in (360, 768, 1280):
        page.set_viewport_size({"width": width, "height": 850})
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), f"Horizontal overflow at {width}px"

def basic_accessibility(page):
    # Basic label/name and duplicate-ID checks; not a full WCAG or screen-reader audit.
    issues = page.evaluate("""() => {
      const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
      const missing=[...document.querySelectorAll('input:not([type=hidden]):not([hidden]),textarea,select')]
        .filter(e=>!e.labels?.length && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby'))
        .map(e=>e.id);
      return {duplicates:ids.filter((v,i)=>ids.indexOf(v)!==i),missing};
    }""")
    assert not issues["duplicates"] and not issues["missing"], issues
    # Run axe when supplied by CI; evaluate locally (test only), not a product dependency.
    axe_path = os.environ.get("HAWK_AXE_PATH")
    if axe_path:
        page.evaluate(Path(axe_path).read_text(encoding="utf-8"))
        violations = page.evaluate("""async () => {
            const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
            return result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
        }""")
        assert not violations, (page.url, violations)
    page.keyboard.press("Tab")
    assert page.evaluate("document.activeElement !== document.body"), "Keyboard focus did not enter controls"

def race_clear(page, data, comm=False):
    # Delay actual File.text so the clear happens while the read is outstanding.
    page.evaluate("""() => {
      const original = File.prototype.text;
      window.__hawkRead = null;
      File.prototype.text = function() {
        return new Promise(resolve => { window.__hawkRead = () => resolve(original.call(this)); });
      };
      window.__restoreFileText = () => { File.prototype.text = original; };
    }""")
    upload(page, data)
    page.wait_for_function("typeof window.__hawkRead === 'function'")
    page.locator("#clear").click()
    page.evaluate("window.__hawkRead();window.__restoreFileText()")
    # Await two turns so the fulfilled File.text and its continuations finish.
    page.wait_for_timeout(300)
    if comm:
        expect(page.locator("#original")).to_have_value("")
    else:
        expect(page.locator("#count")).to_contain_text("0 of 0")
    expect(status(page)).to_contain_text("Session cleared")

def race_forget(page, data, selector, forget, status_id):
    page.evaluate("""() => {
      const original=File.prototype.text;
      window.__hawkRead=null;
      File.prototype.text=function(){return new Promise(resolve=>{window.__hawkRead=()=>resolve(original.call(this));});};
      window.__restoreFileText=()=>{File.prototype.text=original;};
    }""")
    upload(page,data,selector)
    page.wait_for_function("typeof window.__hawkRead === 'function'")
    page.locator(forget).click()
    page.evaluate("window.__hawkRead();window.__restoreFileText()")
    page.wait_for_timeout(300)
    expect(page.locator(status_id)).to_contain_text("No ")


def choice_only_discard(context):
    # A changed select is unsubmitted work even if no text has been entered.
    # Support already guards choice-only drafts; include it as a control.
    for slug, name, _ in MODULES:
        if name == "COMMUNICATION":
            continue
        p = context.new_page()
        dialogs = []
        def handle(dialog):
            if dialog.type == "confirm":
                dialogs.append(dialog.message)
                if len(dialogs) == 1:
                    dialog.dismiss()
                else:
                    dialog.accept()
            else:
                dialog.accept()
        p.on("dialog", handle)
        p.goto(path(slug))
        select = p.locator("#entry-form select").first
        original = select.input_value()
        select.select_option(index=1)
        changed = select.input_value()
        assert changed != original, slug
        p.locator("#cancel").click()
        assert len(dialogs) == 1 and "unsubmitted" in dialogs[0], (slug, dialogs)
        expect(select).to_have_value(changed)
        p.locator("#cancel").click()
        assert len(dialogs) == 2, (slug, dialogs)
        expect(select).to_have_value(original)
        p.locator("#cancel").click()
        assert len(dialogs) == 2, (slug, "untouched reset should not prompt")
        p.close()
    print("PASS choice-only draft discard safeguards in all eight record editors")

def financial_edges(page, folder):
    page.goto(path("financial-organizer"))
    base = {"period": "Fictional May", "title": "Fictional receipt", "source": "Fictional source", "next": "Review"}
    def add(amount, **extra):
        put(page, {**base, "amount": amount, **extra})
        page.locator("#save").click()
    for amount in ("-1", "1.001"):
        add(amount)
        assert page.locator("#error").inner_text(), amount
        expect(page.locator("#count")).to_contain_text("0 of 0")
        page.locator("#cancel").click()
    add("0", status="Unknown")
    expect(page.locator("#error")).to_contain_text("Unknown amounts")
    page.locator("#cancel").click()
    for amount, extra in [("0.10", {}), ("0.20", {}), ("0.00", {}), ("0.30", {"currency":"EUR"}), ("0.40", {"status":"Estimated"}), ("", {"status":"Unknown"})]:
        add(amount, **extra)
        expect(page.locator("#error")).to_have_text("")
    expect(page.locator("#count")).to_contain_text("6 of 6")
    groups = page.locator("#totals .entry").all_text_contents()
    assert len(groups) == 4, groups
    assert any("USD 0.30" in g and "3 entry(s)" in g for g in groups), groups
    assert any("EUR 0.30" in g for g in groups), groups
    assert any("USD 0.40" in g and "Estimated" in g for g in groups), groups
    assert any("1 unknown amount(s)" in g for g in groups), groups
    page.locator("#currency-filter").select_option("EUR")
    expect(page.locator("#count")).to_contain_text("1 of 6")
    expect(page.locator("#totals")).to_contain_text("EUR 0.30")
    assert "USD" not in page.locator("#totals").inner_text()
    data, _ = save_json(page, "#export", folder, "financial-edges")
    assert len(data["entries"]) == 6
    malformed = json.loads(json.dumps(data))
    malformed["entries"][0]["amount"] = "1.001"
    upload(page, malformed)
    expect(status(page)).to_contain_text("Import not applied")
    reopened, _ = save_json(page, "#export", folder, "financial-after-rejected-import")
    assert reopened == data
    print("PASS financial: exact cent grouping, known zero/unknown, invalid amounts, filtered totals, atomic rejection")

def communication_edges(page):
    page.goto(path("communication-analyzer"))
    put(page, {"safety":"clear","channel":"restricted","need":"needed","purpose":"Fictional scheduling"})
    expect(page.locator("#workspace")).to_be_hidden()
    expect(page.locator("#export")).to_be_disabled()
    expect(page.locator("#gate")).to_contain_text("restricted")
    put(page, {"channel":"permitted","safety":"danger"})
    expect(page.locator("#workspace")).to_be_hidden()
    expect(page.locator("#gate")).to_contain_text("emergency services")
    put(page, {"safety":"clear","original":"Fictional scheduling question"})
    expect(page.locator("#workspace")).to_be_visible()
    expect(page.locator("#export")).to_be_enabled()
    print("PASS communication: restricted contact and immediate-danger blocks")


def main():
    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as pw:
        folder = Path(tmp)
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(accept_downloads=True, viewport={"width": 1280,"height": 850})
        # Block every HTTP(S) request even if a regression attempts one.
        network = []
        def block(route):
            network.append(route.request.url)
            route.abort()
        context.route(re.compile(r"^https?://"), block)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("dialog", lambda dialog: dialog.accept())
        exports = {}
        for slug, name, fields in MODULES:
            page.goto(path(slug))
            assert page.evaluate("document.querySelector('meta[http-equiv=Content-Security-Policy]').content.includes(\"connect-src 'none'\")")
            ensure_mobile(page)
            basic_accessibility(page)
            values = dict(fields)
            if name == "EVIDENCE":
                values["events"] = exports[fmt("TIMELINE")]["entries"][0]["id"]
            if name == "CHECKLIST":
                values["events"] = exports[fmt("TIMELINE")]["entries"][0]["id"]
                values["evidence"] = exports[fmt("EVIDENCE")]["entries"][0]["id"]
            put(page, values)
            if name != "COMMUNICATION":
                page.locator("#save").click()
                expect(page.locator("#error")).to_have_text("")
                expect(page.locator("#count")).to_contain_text("1 of 1")
            data, _ = save_json(page, "#export", folder, slug)
            assert data["format"] == fmt(name) and data["version"] == 1, slug
            exports[data["format"]] = data
            page.locator("#clear").click()
            upload(page, data)
            wait_import(page)
            if name == "COMMUNICATION":
                expect(page.locator("#original")).to_have_value("FICTIONAL_PRIVATE_DRAFT")
                expect(page.locator("#safety")).to_have_value("")
                expect(page.locator("#workspace")).to_be_hidden()
            else:
                expect(page.locator("#count")).to_contain_text("1 of 1")
                reopened, _ = save_json(page, "#export", folder, slug + "-roundtrip")
                assert reopened == data, slug
                # Real print rendering for every entry editor, with form excluded.
                page.emulate_media(media="print")
                expect(page.locator("#entry-form")).to_be_hidden()
                assert len(page.pdf()) > 1000
                page.emulate_media(media="screen")
            race_clear(page, data, name == "COMMUNICATION")
            if name == "EVIDENCE":
                race_forget(page, exports[fmt("TIMELINE")], "#timeline-file", "#forget-timeline", "#timeline-status")
            if name in ("CHECKLIST","PREPARATION","PARENTING","FINANCIAL","WITNESS"):
                race_forget(page, exports[fmt("TIMELINE")], "#events-file", "#forget-events", "#events-status")
            assert not errors, (slug, errors)
            assert not network, network
            print("PASS", slug, "desktop/mobile layout, labels, export/import, clear race")
        page.goto(path("dashboard"))
        ensure_mobile(page)
        basic_accessibility(page)
        for slug,name,_ in MODULES:
            if name=="COMMUNICATION":
                page.locator("#allow-communication").check()
            if name=="SUPPORT":
                page.locator("#allow-support").check()
            upload(page,exports[fmt(name)])
            wait_import(page)
        expect(page.locator("#overview-count")).to_contain_text("9 of 9")
        expect(page.locator("#ref-count")).to_contain_text("3 present")
        expect(page.locator("#action-details")).to_be_hidden()
        page.locator("#toggle-actions").click()
        expect(page.locator("#action-list")).to_contain_text("FICTIONAL_ACTION")
        assert "FICTIONAL_PRIVATE_DRAFT" not in page.locator("body").inner_text()
        assert "FICTIONAL_PRIVATE_SUPPORT" not in page.locator("body").inner_text()
        combined, _ = save_json(page, "#export-workspace", folder, "workspace")
        assert len(combined["modules"]) == 7 and fmt("COMMUNICATION") not in combined["modules"] and fmt("SUPPORT") not in combined["modules"]
        page.locator("#select-communication-analyzer").check()
        page.locator("#select-support-network").check()
        full, _ = save_json(page, "#export-workspace", folder, "workspace-all")
        assert full["modules"] == exports
        # Actual PDF print excludes on-screen private actions and links.
        page.locator("#toggle-links").click()
        page.emulate_media(media="print")
        expect(page.locator("#action-details")).not_to_be_visible()
        expect(page.locator("#links")).not_to_be_visible()
        assert len(page.pdf()) > 1000
        page.emulate_media(media="screen")
        page.locator("#clear").click()
        upload(page, full)
        expect(status(page)).to_contain_text("requires explicit")
        expect(page.locator("#overview-count")).to_contain_text("0 of 9")
        page.locator("#allow-communication").check()
        page.locator("#allow-support").check()
        upload(page, full)
        wait_import(page)
        expect(page.locator("#overview-count")).to_contain_text("9 of 9")
        # Every dashboard export reopens in its matching original editor.
        for slug,name,_ in MODULES:
            card = page.locator("#modules article").filter(has=page.get_by_role("heading", name={
                "TIMELINE":"Incident Timeline Builder","EVIDENCE":"Evidence Index","CHECKLIST":"Documentation Checklist",
                "COMMUNICATION":"Communication Analyzer","PREPARATION":"Court Preparation Organizer","PARENTING":"Parenting Log",
                "FINANCIAL":"Financial Organizer","WITNESS":"Witness Observation Organizer","SUPPORT":"Support Network Map"}[name], exact=True))
            data, output = save_json(page, "#modules article:nth-child("+str([m[1] for m in MODULES].index(name)+1)+") button:first-of-type", folder, slug+"-dashboard")
            assert data == exports[fmt(name)]
            editor = context.new_page()
            editor.on("pageerror", lambda error: errors.append(str(error)))
            editor.on("dialog", lambda dialog: dialog.accept())
            editor.goto(path(slug))
            editor.locator("#file").set_input_files(str(output))
            wait_import(editor)
            if name=="COMMUNICATION":
                expect(editor.locator("#original")).to_have_value("FICTIONAL_PRIVATE_DRAFT")
            else:
                expect(editor.locator("#count")).to_contain_text("1 of 1")
            editor.close()
        # An import in flight must not repopulate a deliberately cleared dashboard.
        page.evaluate("""() => {
          const original=File.prototype.text;
          window.__hawkRead=null;
          File.prototype.text=function(){return new Promise(resolve=>{window.__hawkRead=()=>resolve(original.call(this));});};
          window.__restoreFileText=()=>{File.prototype.text=original;};
        }""")
        page.locator("#allow-communication").check()
        page.locator("#allow-support").check()
        upload(page,full)
        page.wait_for_function("typeof window.__hawkRead === 'function'")
        page.locator("#clear").click()
        page.evaluate("window.__hawkRead();window.__restoreFileText()")
        page.wait_for_timeout(300)
        expect(page.locator("#overview-count")).to_contain_text("0 of 9")
        expect(status(page)).to_contain_text("Dashboard cleared")
        # Treat markup supplied in an imported text field strictly as literal data.
        hostile = json.loads(json.dumps(exports[fmt("CHECKLIST")]))
        hostile["entries"][0]["title"] = '<img src=x onerror="window.hawkInjected=true">'
        upload(page, hostile)
        wait_import(page)
        page.locator("#toggle-actions").click()
        expect(page.locator("#action-list")).to_contain_text('<img src=x onerror="window.hawkInjected=true">')
        assert page.locator("#action-list img").count()==0
        assert page.evaluate("window.hawkInjected !== true")
        page.locator("#clear").click()
        page.goto(path("documentation-checklist"))
        upload(page,hostile)
        wait_import(page)
        expect(page.locator("#list")).to_contain_text('<img src=x onerror="window.hawkInjected=true">')
        assert page.locator("#list img").count()==0
        assert page.evaluate("window.hawkInjected !== true")
        assert not errors, errors
        assert not network, network
        choice_only_discard(context)
        financial_edges(page, folder)
        communication_edges(page)
        assert not errors, errors
        assert not network, network
        browser.close()
        print("PASS dashboard: all nine browser-generated formats, privacy, workspace, PDF print, roundtrip to original editors")
        print("HAWK real Chromium smoke suite passed; fictional data only")
if __name__ == "__main__":
    main()
