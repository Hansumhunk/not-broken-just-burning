#!/usr/bin/env python3
"""Chromium UI acceptance with synthetic auth/rows ONLY; no external requests."""
from pathlib import Path
from tempfile import TemporaryDirectory
import json
import os
import re
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
TABLES = ["profiles", "member_preferences", "member_continue_state", "member_path_state",
          "member_path_progress", "learning_progress", "membership_entitlements",
          "product_entitlements", "event_entitlements"]
FIXTURE = """
() => {
  window.qa = {requests:[], delay:false, release:null, wrongOwner:false};
  const user = {id:'synthetic-a',email:'a@example.invalid'};
  const auth = {user, refresh: async () => ({user:auth.user}),
    client: {from(table) {
      let owner, columns, ordering=[];
      return {
        select(value) { columns=value; return this; },
        eq(k,v) { if(k!=='user_id') throw Error('unscoped'); owner=v; return this; },
        order(k) { ordering.push(k); return this; },
        async range(start,end) {
          qa.requests.push({table,owner,columns,start,end,ordering});
          if(qa.delay) await new Promise(resolve=>{qa.release=resolve;});
          const id = qa.wrongOwner?'synthetic-b':owner;
          const prefix = {user_id:id, display_name:'QA profile',stage_slug:'fixture-stage',
            content_kind:'lesson',content_slug:'fixture-lesson',product_slug:'fixture-product',
            event_slug:'fixture-event',provider_customer_ref:'DO_NOT_EXPORT',access_token:'DO_NOT_EXPORT'};
          const count=table==='learning_progress'?201:1;
          const data=Array.from({length:Math.max(0,Math.min(count-start,end-start+1))},
            (_,n)=>({...prefix,content_slug:'fixture-lesson-'+(start+n)}));
          return {data,error:null};
        }
      };
    }}
  };
  window.NBJBAuth=auth;
}
"""
with sync_playwright() as p:
    chrome = os.environ.get("CHROME_PATH")
    if not chrome:
        raise RuntimeError("CHROME_PATH must point to the runner's installed Chrome")
    browser = p.chromium.launch(executable_path=chrome, args=["--no-sandbox"])
    context = browser.new_context(accept_downloads=True, viewport={"width": 390, "height": 844})
    context.route("**/*", lambda route: route.abort()) # no provider, CDN or analytics requests
    page = context.new_page()
    downloads = []
    page.on("download", lambda download: downloads.append(download))
    page.on("dialog", lambda dialog: dialog.accept())
    page.set_content('<body data-member-access="granted"><button id="download-account-data">Download</button><p id="account-export-status"></p></body>')
    page.evaluate(FIXTURE)
    page.add_script_tag(path=str(ROOT / "js/member-account-export.js"))
    with TemporaryDirectory() as directory:
        with page.expect_download(timeout=10000) as download:
            page.locator("#download-account-data").click()
        file = Path(directory) / "synthetic-export.json"
        download.value.save_as(file)
        data = json.loads(file.read_text())
        assert data["account"]["id"] == "synthetic-a"
        assert set(data["records"]) == set(TABLES)
        assert len(data["records"]["learning_progress"]) == 201
        assert "DO_NOT_EXPORT" not in json.dumps(data)
        requests = page.evaluate("qa.requests")
        assert len(requests) == 10 # nine tables, learning needs two pages
        assert all(x["owner"] == "synthetic-a" and x["columns"].startswith("user_id,") and "*" not in x["columns"] for x in requests)
    expect(page.locator("#account-export-status")).to_contain_text("Account export downloaded")
    print("Chromium synthetic export: 9 datasets, paginated 201 rows, local download, allowlist PASS")
    page.evaluate("qa.delay=true; qa.release=null")
    page.locator("#download-account-data").click()
    page.wait_for_function("typeof qa.release === 'function'")
    page.evaluate("NBJBAuth.user={id:'synthetic-b',email:'b@example.invalid'}; qa.delay=false; qa.release()")
    expect(page.locator("#account-export-status")).to_contain_text("No partial file was downloaded")
    assert len(downloads) == 1
    print("Chromium synthetic account switch during query: blocked, no extra download PASS")
    page.evaluate("qa.wrongOwner=true; NBJBAuth.user={id:'synthetic-a',email:'a@example.invalid'}")
    page.locator("#download-account-data").click()
    expect(page.locator("#account-export-status")).to_contain_text("No partial file was downloaded")
    assert len(downloads) == 1
    page.evaluate("qa.wrongOwner=false; NBJBAuth.user=null; delete document.body.dataset.memberAccess")
    denied = page.evaluate("NBJBAccountExport.collectAccountExport().then(()=>false,()=>true)")
    assert denied
    print("Chromium synthetic wrong-owner and signed-out export: denied PASS")
    settings=(ROOT/"member-settings.html").read_text()
    assert re.search(r'href="mailto:[^"]*Account%20Deletion%20Request"', settings)
    assert "does not immediately delete data or stop renewal" in settings
    print("Deletion request mailto and non-destructive copy: PASS (no email sent)")
    context.close()
    browser.close()
