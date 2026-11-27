#!/usr/bin/env python3
"""Exact candidate companion functions, isolated Chromium DOM/Blob tests.
Only synthetic content/bytes. No production network, user accounts or storage.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
READER=(ROOT/"js/member-premium-lesson.js").read_text()
APPEND=READER[READER.index("  function appendText("):READER.index("  function prettyHeading(")]
PANEL=READER[READER.index("  function installFortressCompanion("):READER.index("  function renderLesson(")]
SLUG="when-protection-becomes-a-prison"
EDITION="Fortress Project v1.1 (Directive 002)"
SIZE=182857
FIXTURE={"slug":SLUG,"content":{"sourceEdition":EDITION,"workbook":{"slug":"fortress-audit","title":"Synthetic workbook","blocks":[{"type":"heading","text":"Synthetic section"},{"type":"paragraph","text":"Synthetic diagram description"},{"type":"paragraph","text":"<script>window.__unsafe=true</script>"}]},"comprehension":[{"question":"Synthetic question?","answer":"Synthetic answer."}]}}

def prepare(browser,width,mode="ok",available=True,data=FIXTURE):
    ctx=browser.new_context(viewport={"width":width,"height":820},accept_downloads=True)
    page=ctx.new_page()
    network=[]
    page.on("request",lambda req:network.append(req.url))
    def intercept(route):
        if route.request.url=="https://isolated.invalid/":
            route.fulfill(status=200,content_type="text/html",body="<html><main><section id='reference'></section><section id='premium-exercise'>Existing optional practice</section></main></html>")
        else: route.abort()
    page.route("**/*",intercept)
    page.goto("https://isolated.invalid/")
    baseline=len(network)
    script="""
const fortressSlug=%s, fortressEdition=%s, slug=fortressSlug,userId='synthetic-user';
const el=id=>document.getElementById(id);
const trace=[];window.__trace=trace;
let pending, onAuth;
const reply=()=>({data:new Blob([new Uint8Array(%d)],{type:'application/octet-stream'})});
const auth={user:{id:userId},onChange:fn=>{onAuth=fn;fn({user:auth.user})},client:{functions:{
 invoke:async(name,opts)=>{trace.push({name,body:opts.body});
   if(%s==='deny')return {error:{context:{status:403}}};
   if(%s==='pending')return await new Promise(resolve=>pending=resolve);
   return reply();
 }}}};
window.__signout=()=>{auth.user=null;onAuth({user:null});};
window.__finish=()=>pending?.(reply());
"""%(json.dumps(SLUG),json.dumps(EDITION),SIZE,json.dumps(mode),json.dumps(mode))
    page.add_script_tag(content=script+APPEND+PANEL+"\ninstallFortressCompanion("+json.dumps(data)+","+json.dumps(available)+");\n"+
        "appendText(el('reference'),'p','[1] Synthetic https://doi.org/10.0000/example');"+
        "appendText(el('reference'),'p','[2] Synthetic https://example.invalid/not-allowed');")
    return ctx,page,network,baseline

def run(browser,width):
    ctx,page,network,base=prepare(browser,width)
    panel=page.locator("#premium-fortress-companion")
    expect(panel).to_be_visible()
    button=panel.get_by_role("button",name="Download blank workbook (PDF)")
    expect(button).to_be_enabled()
    details=panel.get_by_text("Read the accessible workbook text",exact=True)
    details.focus()
    page.keyboard.press("Enter")
    expect(panel.get_by_text("Synthetic diagram description",exact=True)).to_be_visible()
    expect(panel.get_by_text("<script>window.__unsafe=true</script>",exact=True)).to_be_visible()
    assert page.evaluate("typeof window.__unsafe === 'undefined'")
    checks=panel.get_by_text("Optional understanding checks (unscored)",exact=True)
    checks.click()
    panel.get_by_text("Synthetic question?",exact=True).click()
    expect(panel.get_by_text("Synthetic answer.",exact=True)).to_be_visible()
    assert page.locator("#reference a").count()==1
    assert page.locator("#reference a").get_attribute("referrerpolicy")=="no-referrer"
    assert page.locator("#reference a").get_attribute("rel")=="noopener noreferrer"
    assert panel.locator("input,textarea,form").count()==0
    with page.expect_download() as dl:
        button.focus()
        page.keyboard.press("Enter")
    download=dl.value
    assert download.suggested_filename=="The-Fortress-Audit.pdf"
    assert download.path().stat().st_size==SIZE
    assert page.evaluate("window.__trace")==[{"name":"read-flamewalker-lesson","body":{"slug":SLUG,"action":"workbook"}}]
    assert len(network)==base,network
    expect(panel.get_by_role("status")).to_contain_text("Download requested")
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    expect(panel).to_be_hidden()
    ctx.close()

    ctx,page,network,base=prepare(browser,width,mode="deny")
    panel=page.locator("#premium-fortress-companion")
    panel.get_by_role("button").click()
    expect(panel.get_by_role("status")).to_contain_text("Workbook download unavailable")
    expect(panel.get_by_role("button")).to_be_enabled()
    assert len(network)==base
    ctx.close()

    ctx,page,network,base=prepare(browser,width,mode="pending")
    panel=page.locator("#premium-fortress-companion")
    panel.get_by_role("button").click()
    expect(panel.get_by_role("button")).to_be_disabled()
    page.evaluate("window.__signout();window.__finish()")
    expect(panel).to_be_hidden()
    assert panel.locator("a[download]").count()==0
    assert len(network)==base
    ctx.close()

    ctx,page,network,base=prepare(browser,width,available=False)
    panel=page.locator("#premium-fortress-companion")
    expect(panel).to_be_visible()
    assert panel.get_by_role("button").count()==0
    assert page.evaluate("window.__trace.length")==0
    ctx.close()

    wrong=json.loads(json.dumps(FIXTURE));wrong["content"]["sourceEdition"]="unapproved"
    ctx,page,network,base=prepare(browser,width,data=wrong)
    assert page.locator("#premium-fortress-companion").count()==0
    assert page.evaluate("window.__trace.length")==0
    ctx.close()
    print("PASS companion: keyboard/text alternative/links/blob/denial/session race/missing delivery/wrong edition",width,flush=True)

if __name__=="__main__":
    import os, shutil
    chrome=os.environ.get("CHROME_PATH") or shutil.which("google-chrome") or shutil.which("chromium")
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=chrome,headless=True,args=["--no-sandbox"])
        for width in (1280,390):run(browser,width)
        browser.close()
