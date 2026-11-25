"""Synthetic, isolated browser acceptance for existing public tools; no provider actions."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from urllib.parse import urlsplit
import shutil
from itertools import product
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
TOOLS=[
 ("before-you-send.html","before-you-send.js","bys-form","bys-result","bys-template","bys-again","bys-fallback",[("purpose",["pause","facts","boundary","parenting"])]),
 ("fatherhood-stability-planner.html","frontier-engine-tools.js","fe-father-form","fe-father-result","fe-father-output","fe-father-clear","fe-father-fallback",[("moment",["morning","handoff","apart","bedtime"]),("need",["calm","connection","predictability"]),("minutes",["5","15","30"])]),
 ("identity-rebuild-compass.html","frontier-engine-tools.js","fe-identity-form","fe-identity-result","fe-identity-output","fe-identity-clear","fe-identity-fallback",[("value",["steadiness","integrity","connection","courage"]),("area",["self","work","relationships"]),("minutes",["5","15","30"])])]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
def state(page):
 return page.evaluate("() => ({local:{...localStorage},session:{...sessionStorage},cookie:document.cookie,url:location.href,length:history.length})")
def inspect(browser,base,tool,mode,width):
 path,script,group,result,output,clear,fallback,keys=tool
 ctx=browser.new_context(java_script_enabled=mode!="disabled",viewport={"width":width,"height":850},reduced_motion="reduce")
 page=ctx.new_page()
 req=[]
 page.on("request",lambda q:req.append((q.url,q.method,q.post_data,q.headers.get("referer",""))))
 def route(rt):
  u=rt.request.url
  if not u.startswith(base+"/"): return rt.abort()
  if urlsplit(u).path.endswith("/"+script):
   if mode=="blocked": return rt.abort()
   if mode=="http-failure": return rt.fulfill(status=503,body="unavailable")
   if mode=="init-failure": return rt.fulfill(status=200,content_type="application/javascript",body="throw new Error('synthetic pre-listener failure');\n"+(ROOT/"js"/script).read_text())
  return rt.continue_()
 page.route("**/*",route)
 url=base+"/"+path
 page.goto(url,wait_until="load")
 page.wait_for_timeout(150)
 scope=page.locator("#"+group)
 run=scope.locator("[data-tool-run]")
 radios=scope.locator("input[type=radio]")
 # Every control must be structurally incapable of native form submission.
 assert scope.locator("form").count()==0
 assert radios.evaluate_all("(xs)=>xs.every(x=>x.form===null)")
 assert run.evaluate("(x)=>x.form===null && x.type==='button'")
 assert page.locator("#"+fallback).is_visible()==(mode!="normal")
 before=state(page)
 start=len(req)
 if mode!="normal":
  assert run.is_disabled()
  assert radios.evaluate_all("(xs)=>xs.every(x=>x.matches(':disabled'))")
  # Even if an input is changed or an artificial click/Enter occurs, no form owner exists.
  radios.first.evaluate("(x)=>{x.checked=true; x.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));}")
  run.evaluate("(x)=>x.click()")
  page.keyboard.press("Enter")
  assert page.locator("#"+result).is_hidden()
 else:
  assert run.is_enabled()
  run.click()
  assert page.locator("#"+result).is_hidden()
  combos=list(product(*(v for _,v in keys)))
  for i,vals in enumerate(combos):
   for (name,_),val in zip(keys,vals): scope.locator('input[name="'+name+'"][value="'+val+'"]').check()
   if i==0:
    run.focus()
    page.keyboard.press("Enter")
   else: run.click()
   assert page.locator("#"+result).is_visible()
   assert len(page.locator("#"+output).input_value())>40
   assert page.evaluate("document.activeElement.tagName")== "H3"
   page.locator("#"+clear).click()
   assert page.locator("#"+result).is_hidden()
   assert radios.evaluate_all("(xs)=>xs.every(x=>!x.checked)")
  assert page.evaluate("document.documentElement.scrollWidth <= innerWidth+2")
  # Native radio keyboard operation, followed by a second Enter activation.
  for name,_ in keys:
   radio=scope.locator('input[name="'+name+'"]').first
   radio.focus()
   page.keyboard.press("Space")
  run.focus()
  page.keyboard.press("Enter")
  assert page.locator("#"+result).is_visible()
 page.wait_for_timeout(100)
 assert state(page)==before, (path,mode,"state changed")
 assert len(req)==start,(path,mode,"interaction initiated network",req[start:])
 page.reload(wait_until="load")
 assert page.url==url
 assert page.locator("#"+result).is_hidden()
 page.goto(base+"/first-seven-days.html",wait_until="load")
 page.go_back(wait_until="load")
 assert page.url==url
 page.go_forward(wait_until="load")
 assert page.url==base+"/first-seven-days.html"
 # No selected field name or value in request query, body or referrer.
 for u,method,body,referer in req:
  if u.startswith(base+"/"):
   assert not urlsplit(u).query and not body,(path,mode,u)
   assert not urlsplit(referer).query
 ctx.close()
 print("PASS",path,mode,width, "combinations",len(list(product(*(v for _,v in keys)))) if mode=="normal" else 0)
def main():
 server=ThreadingHTTPServer(("127.0.0.1",0),partial(Quiet,directory=str(ROOT)))
 Thread(target=server.serve_forever,daemon=True).start()
 base="http://127.0.0.1:"+str(server.server_port)
 try:
  with sync_playwright() as p:
   exe=shutil.which("google-chrome") or shutil.which("chromium")
   browser=p.chromium.launch(headless=True,executable_path=exe,args=["--no-sandbox"])
   for tool in TOOLS:
    if not (ROOT/tool[0]).exists(): continue
    for width in (1280,390):
     for mode in ("normal","disabled","blocked","http-failure","init-failure"): inspect(browser,base,tool,mode,width)
   browser.close()
 finally: server.shutdown()
if __name__=="__main__": main()
