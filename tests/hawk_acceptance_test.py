"""Final HAWK acceptance: fictional fixture roundtrips, cancellation, editing and alternate engines."""
import json
import os
import re
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from hawk_browser_test import MODULES, fmt, path, put, save_json, upload, wait_import, status, ensure_mobile, basic_accessibility

FIXTURES = Path(__file__).parent / "fixtures" / "hawk"
ENGINE = os.environ.get("HAWK_ENGINE", "chromium")

def read(slug):
    return json.loads((FIXTURES / (slug + ".json")).read_text(encoding="utf-8"))

def tab_reaches(page, selector):
    # Position at document start then use keyboard alone to reach the target.
    page.evaluate("document.activeElement.blur()")
    for _ in range(200):
        page.keyboard.press("Tab")
        if page.locator(selector).evaluate("(el) => document.activeElement === el"):
            return
    raise AssertionError("Tab could not reach " + selector)

def editor(context, slug, name, fields, folder):
    p = context.new_page()
    data = read(slug)
    events = []
    accept = [False]
    def dialog(d):
        events.append(d.message)
        if accept[0] or d.type != "confirm":
            d.accept()
        else:
            d.dismiss()
    p.on("dialog", dialog)
    p.goto(path(slug))
    ensure_mobile(p)
    basic_accessibility(p)
    if name == "COMMUNICATION":
        accept[0] = True
        upload(p, data)
        wait_import(p)
        expect(p.locator("#workspace")).to_be_hidden()
        expect(p.locator("#original")).to_have_value(data["review"]["original"])
        put(p, {k:data["review"][k] for k in ("safety","channel","need")})
        expect(p.locator("#workspace")).to_be_visible()
        p.locator("#review-original").click()
        p.locator("#review-revised").click()
        out,_ = save_json(p,"#export",folder,slug)
        assert out == data
        put(p, {"channel":"restricted"})
        expect(p.locator("#export")).to_be_disabled()
        p.reload()
        expect(p.locator("#original")).to_have_value("")
        p.close()
        print("PASS communication: fixture, reconfirmation, restriction, export, reload")
        return
    select = p.locator("#entry-form select").first
    original = select.input_value()
    select.select_option(index=1)
    changed = select.input_value()
    assert changed != original
    # Import into otherwise-empty session must prompt for unsubmitted selection.
    upload(p,data)
    for _ in range(100):
        if events:
            break
        p.wait_for_timeout(50)
    assert events and ("discard" in events[-1].lower() or "replace" in events[-1].lower()), (slug, events)
    expect(select).to_have_value(changed)
    expect(p.locator("#count")).to_contain_text("0 of 0")
    accept[0] = True
    upload(p,data)
    wait_import(p)
    n = len(data["entries"])
    expect(p.locator("#count")).to_contain_text(f"{n} of {n}")
    first = data["entries"][0]
    out,_ = save_json(p,"#export",folder,slug)
    assert out == data, slug
    # Keyboard reach and activate Edit; then cancel a changed form.
    edit = p.get_by_role("button", name="Edit "+first["id"], exact=True)
    edit.focus()
    p.keyboard.press("Enter")
    expect(p.locator("#editor-title")).to_be_focused()
    rev = "correction" if name in ("TIMELINE","EVIDENCE","CHECKLIST") else "revision"
    p.locator("#"+rev).fill("FICTIONAL change discarded")
    p.locator("#cancel").click()
    out,_ = save_json(p,"#export",folder,slug+"-cancelled")
    assert out == data
    edit.click()
    p.locator("#"+rev).fill("FICTIONAL verified edit")
    p.locator("#save").click()
    expect(p.locator("#error")).to_have_text("")
    edited,_ = save_json(p,"#export",folder,slug+"-edited")
    row = next(x for x in edited["entries"] if x["id"]==first["id"])
    assert row[rev]=="FICTIONAL verified edit" and row["createdAt"]==first["createdAt"]
    assert len(edited["entries"])==n
    # Cancel replacement of existing session; preserve current export byte semantics.
    accept[0] = False
    count = len(events)
    upload(p,data)
    for _ in range(100):
        if len(events)>count:
            break
        p.wait_for_timeout(50)
    assert len(events)>count, slug
    # Allow subsequent export/print confirmation, not the replacement.
    accept[0] = True
    unchanged,_ = save_json(p,"#export",folder,slug+"-keep")
    assert unchanged==edited
    upload(p,data)
    wait_import(p)
    restored,_ = save_json(p,"#export",folder,slug+"-restored")
    assert restored==data
    if name=="FINANCIAL":
        expect(p.locator("#totals")).to_contain_text("USD 20.00")
        expect(p.locator("#totals")).to_contain_text("USD 15.00")
        expect(p.locator("#totals")).to_contain_text("1 unknown amount(s)")
    p.emulate_media(media="print")
    expect(p.locator("#entry-form")).to_be_hidden()
    if ENGINE=="chromium":
        assert len(p.pdf())>1000
    p.emulate_media(media="screen")
    # Exercise print control without launching a physical printer.
    p.evaluate("window.__printed=false; window.print=()=>{window.__printed=true}")
    p.locator("#print").click()
    assert p.evaluate("window.__printed")
    p.reload()
    expect(p.locator("#count")).to_contain_text("0 of 0")
    tab_reaches(p,"#save")
    p.close()
    print("PASS",slug,"fixture, cancel import, edit ID, cancel replacement, export, print, reload, keyboard")

def dashboard(context,folder):
    p=context.new_page()
    p.on("dialog",lambda d:d.accept())
    p.goto(path("dashboard"))
    ensure_mobile(p)
    basic_accessibility(p)
    data=read("workspace")
    upload(p,data)
    expect(status(p)).to_contain_text("requires explicit")
    expect(p.locator("#overview-count")).to_contain_text("0 of 9")
    p.locator("#allow-communication").check()
    p.locator("#allow-support").check()
    upload(p,data)
    wait_import(p)
    expect(p.locator("#overview-count")).to_contain_text("9 of 9")
    expect(p.locator("#ref-count")).to_contain_text("0 not present")
    expect(p.locator("#ref-count")).to_contain_text("0 target not loaded")
    default,_=save_json(p,"#export-workspace",folder,"default-workspace")
    assert len(default["modules"])==7 and fmt("COMMUNICATION") not in default["modules"] and fmt("SUPPORT") not in default["modules"]
    p.locator("#select-communication-analyzer").check()
    p.locator("#select-support-network").check()
    full,_=save_json(p,"#export-workspace",folder,"full-workspace")
    assert full==data
    p.locator("#toggle-actions").click()
    expect(p.locator("#action-list")).to_contain_text("Ask for next pickup time")
    p.emulate_media(media="print")
    expect(p.locator("#action-details")).to_be_hidden()
    if ENGINE=="chromium":
        assert len(p.pdf())>1000
    p.emulate_media(media="screen")
    p.reload()
    expect(p.locator("#overview-count")).to_contain_text("0 of 9")
    p.close()
    print("PASS dashboard: fixture, explicit consent, exact workspace, print privacy, reload")

def main():
    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as pw:
        browser=getattr(pw,ENGINE).launch(headless=True)
        context=browser.new_context(accept_downloads=True,viewport={"width":1280,"height":850})
        errors=[]; network=[]
        context.on("page",lambda p:p.on("pageerror",lambda e:errors.append(str(e))))
        def block(route):
            network.append(route.request.url)
            route.abort()
        context.route(re.compile(r"^https?://"),block)
        for slug,name,fields in MODULES:
            editor(context,slug,name,fields,Path(tmp))
        dashboard(context,Path(tmp))
        assert not errors,errors
        assert not network,network
        browser.close()
        print("HAWK acceptance passed:",ENGINE,"fictional fixtures only")
if __name__=="__main__":
    main()
