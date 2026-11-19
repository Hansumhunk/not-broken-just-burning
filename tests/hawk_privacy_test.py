"""Privacy lifecycle regression with fictional data only; report baseline, enforce candidate."""
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from hawk_browser_test import MODULES, put, upload, wait_import, save_json

ROOT=Path(__file__).resolve().parents[1]
FIXTURES=ROOT/"tests"/"fixtures"/"hawk"
ENGINE=os.environ.get("HAWK_ENGINE","chromium")
BASELINE="bf3cd4ac0d7ed9ff93746b04c4608b8fb030af32"
MARK="FICTIONAL_PRIVACY_PROBE_001B"

def snapshot(page):
    return page.evaluate("""() => ({
      controls: [...document.querySelectorAll('input:not([type=file]),textarea,select')].map(e=>[e.id,e.value,!!e.checked]),
      count: document.querySelector('#overview-count,#count')?.textContent || '',
      privateText: (document.querySelector('main')?.textContent || '').includes('FICTIONAL_PRIVACY_PROBE_001B'),
      communicationOpen: !document.getElementById('workspace')?.hidden && !!document.getElementById('workspace')
    })""")

def fixture(slug):
    return json.loads((FIXTURES/(slug+".json")).read_text(encoding="utf-8"))

def seed(page, slug, name):
    if name=="DASHBOARD":
        page.locator("#allow-communication").check()
        page.locator("#allow-support").check()
        upload(page,fixture("workspace"))
        wait_import(page)
        expect(page.locator("#overview-count")).to_contain_text("9 of 9")
        page.locator("#toggle-actions").click()
        page.locator("#search").fill(MARK)
        return
    data=fixture(slug)
    upload(page,data)
    wait_import(page)
    if name=="COMMUNICATION":
        put(page,{"safety":"clear","channel":"permitted","need":"needed"})
        expect(page.locator("#original")).to_have_value(data["review"]["original"])
        expect(page.locator("#workspace")).to_be_visible()
        page.locator("#revised").fill(MARK)
        return
    expect(page.locator("#count")).to_contain_text(f'{len(data["entries"])} of {len(data["entries"])}')
    page.locator("#entry-form textarea").first.fill(MARK)
    page.locator("#search").fill(MARK)

def check(context, slug, name, url, strict, folder):
    p=context.new_page()
    p.on("dialog",lambda d:d.accept())
    failures=[]
    def inspect(label,baseline):
        now=snapshot(p)
        if now!=baseline:
            changed=[row[0] for row in now["controls"] if row not in baseline["controls"]]
            print("RETENTION",ENGINE,"candidate" if strict else "released-source",slug,label,
                  "controls",changed,"count",now["count"]!=baseline["count"],"gate",now["communicationOpen"]!=baseline["communicationOpen"],flush=True)
            if strict:
                failures.append((slug,label,changed))
        else:
            print("CLEAN",ENGINE,"candidate" if strict else "released-source",slug,label,flush=True)
    for action in ("reload","back","forward","persisted-lifecycle"):
        p.goto("about:blank")
        p.goto(url)
        baseline=snapshot(p)
        seed(p,slug,name)
        assert snapshot(p)!=baseline,(slug,"probe did not establish working state")
        if action=="reload":
            p.reload()
        elif action=="back":
            p.goto("about:blank")
            p.go_back()
        elif action=="forward":
            p.go_back()
            p.go_forward()
        else:
            # Supplement real navigation with deterministic BFCache lifecycle coverage.
            p.evaluate("""() => {
              window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
              window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
            }""")
        p.wait_for_load_state("load")
        p.wait_for_timeout(150)
        inspect(action,baseline)
    p.goto("about:blank")
    p.goto(url)
    if name=="DASHBOARD":
        p.locator("#allow-communication").check()
        p.locator("#allow-support").check()
        upload(p,fixture("workspace"))
        wait_import(p)
        expect(p.locator("#overview-count")).to_contain_text("9 of 9")
    else:
        data=fixture(slug)
        upload(p,data)
        wait_import(p)
        if name=="COMMUNICATION":
            expect(p.locator("#original")).to_have_value(data["review"]["original"])
            expect(p.locator("#workspace")).to_be_hidden()
            put(p,{"safety":"clear","channel":"permitted","need":"needed"})
            expect(p.locator("#workspace")).to_be_visible()
        out,_=save_json(p,"#export",folder,slug+"-privacy-reimport")
        assert out==data,slug
    p.close()
    return failures

def main():
    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as pw:
        folder=Path(tmp)
        args={"headless":True}
        if ENGINE=="chromium":
            args["ignore_default_args"]=["--disable-back-forward-cache"]
        browser=getattr(pw,ENGINE).launch(**args)
        context=browser.new_context(accept_downloads=True)
        errors=[]; network=[]
        context.on("page",lambda p:p.on("pageerror",lambda e:errors.append(str(e))))
        def block(route):
            network.append(route.request.url)
            route.abort()
        context.route(re.compile(r"^https?://"),block)
        mods=MODULES+[("dashboard","DASHBOARD",{})]
        for slug,name,_ in mods:
            source=folder/("released-"+slug+".html")
            source.write_bytes(subprocess.check_output(["git","show",BASELINE+":downloads/hawk-"+slug+"-offline.html"],cwd=ROOT))
            check(context,slug,name,source.as_uri(),False,folder)
        failures=[]
        for slug,name,_ in mods:
            source=ROOT/"downloads"/("hawk-"+slug+"-offline.html")
            failures.extend(check(context,slug,name,source.as_uri(),True,folder))
        assert not errors,errors
        assert not network,network
        assert not failures,failures
        browser.close()
        print("PASS",ENGINE,"all ten candidate privacy lifecycle and explicit reimport checks",flush=True)

if __name__=="__main__":
    main()
