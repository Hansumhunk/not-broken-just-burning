"""Synthetic, isolated browser acceptance for existing public tools; no provider actions."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from urllib.parse import urlsplit
import shutil
from itertools import product
from playwright.sync_api import sync_playwright, expect
import mimetypes
import re

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
# FE11/FE14: route the real production hostname to exact checked-out files,
# never to the network. Verify the live-host guard rather than localhost alone.
def release_checks(browser,tool,width,signal):
 path,script,group,result,output,clear,fallback,keys=tool
 origin="https://notbrokenjustburning.com"
 canonical=origin+"/"+path
 url=canonical+"?utm_source=facebook&utm_medium=social&utm_campaign=synthetic"
 ctx=browser.new_context(viewport={"width":width,"height":850},reduced_motion="reduce",is_mobile=False,has_touch=width<500)
 ctx.grant_permissions(["clipboard-read","clipboard-write"],origin=origin)
 if signal=="gpc":
  ctx.add_init_script("Object.defineProperty(Navigator.prototype,'globalPrivacyControl',{get:()=>true,configurable:true})")
 if signal=="dnt":
  ctx.add_init_script("Object.defineProperty(Navigator.prototype,'doNotTrack',{get:()=>'1',configurable:true})")
 if signal=="unknown-query":
  url=canonical+"?synthetic_private=never_send"
 page=ctx.new_page()
 requests=[]
 page.on("request",lambda q:requests.append((q.url,q.method,q.post_data)))
 def route(rt):
  u=urlsplit(rt.request.url)
  if u.scheme!="https" or u.hostname!="notbrokenjustburning.com": return rt.abort()
  f=(ROOT/u.path.lstrip("/")).resolve()
  if ROOT not in f.parents or not f.is_file(): return rt.fulfill(status=404,body="not found")
  return rt.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(f.name)[0] or "application/octet-stream")
 page.route("**/*",route)
 page.goto(url,wait_until="load")
 scope=page.locator("#"+group)
 run=scope.locator("[data-tool-run]")
 expect(run).to_be_enabled()
 assert page.evaluate("typeof window.posthog === 'undefined'")
 assert not any("posthog" in q[0] for q in requests)
 before=len(requests)
 prefix="bys" if group=="bys-form" else group.removesuffix("-form")
 heading=page.locator("#"+("bys-result-heading" if prefix=="bys" else prefix+"-heading"))
 status=page.locator("#"+prefix+"-status")
 field=page.locator("#"+output)
 copy=page.locator("#"+prefix+"-copy")
 share=page.locator("#"+prefix+"-share")
 share_status=page.locator("#"+prefix+"-share-status")
 run.click()
 expect(status).to_contain_text("Choose")
 assert status.get_attribute("role")=="status"
 for name,values in keys:
  radio=scope.locator('input[name="'+name+'"][value="'+values[0]+'"]')
  expect(radio).to_have_accessible_name(re.compile(r"\S"))
  radio.focus()
  page.keyboard.press("Space")
  if len(values)>1:
   page.keyboard.press("ArrowRight")
   expect(scope.locator('input[name="'+name+'"][value="'+values[1]+'"]')).to_be_checked()
 run.focus()
 page.keyboard.press("Enter")
 expect(heading).to_be_focused()
 expect(heading).to_have_accessible_name(re.compile(r"\S"))
 expect(field).to_have_accessible_name(re.compile(r"\S"))
 assert field.get_attribute("readonly") is not None
 if signal=="default":
  # Calculate actual rendered foreground/background pairs for primary controls,
  # result and option labels. Walk opaque/alpha ancestors; reject gradients
  # on sampled surfaces rather than misreport an unmeasured background.
  sample=page.evaluate("""({group,result,output,prefix})=>{
   const C=s=>{const a=s.match(/[\\d.]+/g).map(Number);return [a[0],a[1],a[2],a[3]??1]};
   const over=(f,b)=>{const a=f[3]+b[3]*(1-f[3]);return [0,1,2].map(i=>(f[i]*f[3]+b[i]*b[3]*(1-f[3]))/a).concat(a)};
   const L=c=>[.2126,.7152,.0722].reduce((sum,w,i)=>{const v=c[i]/255;return sum+w*(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)},0);
   const background=el=>{let c=[0,0,0,0];for(let e=el;e;e=e.parentElement){const s=getComputedStyle(e);if(s.backgroundImage!=='none'&&c[3]<.999)throw Error('unmeasured gradient on '+e.tagName);c=over(c,C(s.backgroundColor));if(c[3]>.999)return c}throw Error('no opaque background')};
   const targets=[...document.querySelectorAll('#'+group+' label,#'+group+' label strong,#'+group+' label small,#'+group+' legend,#'+group+' button,#'+result+' h3,#'+result+' p,#'+result+' label:not(.bys-visually-hidden),#'+result+' textarea,#'+result+' button,#'+prefix+'-share,#'+prefix+'-status')].filter(e=>e.getClientRects().length&&e.textContent.trim()||e.tagName==='TEXTAREA');
   const contrasts=targets.map(e=>{const s=getComputedStyle(e),b=background(e);let opacity=1;for(let q=e;q;q=q.parentElement)opacity*=Number(getComputedStyle(q).opacity);let f=C(s.color);f[3]*=opacity;const a=L(over(f,b)),z=L(b);return {name:e.id||e.textContent.trim().slice(0,35),ratio:(Math.max(a,z)+.05)/(Math.min(a,z)+.05)}});
   const hits=[...document.querySelectorAll('#'+group+' label,#'+group+' button,#'+result+' button,#'+prefix+'-share')].map(e=>{const b=e.getBoundingClientRect();return {name:e.id||e.textContent.trim().slice(0,35),w:b.width,h:b.height}});
   return {contrasts,hits}
  }""",{"group":group,"result":result,"output":output,"prefix":prefix})
  assert sample["contrasts"] and all(x["ratio"]>=4.5 for x in sample["contrasts"]),sample["contrasts"]
  assert all(x["w"]>=44 and x["h"]>=44 for x in sample["hits"]),sample["hits"]
  print("FE11",path,width,"min contrast",round(min(x["ratio"] for x in sample["contrasts"]),2),"min target",round(min(x["w"] for x in sample["hits"]),1),round(min(x["h"] for x in sample["hits"]),1),"samples",len(sample["contrasts"]))
  # Real browser clipboard permission, then controlled denial and manual fallback.
  copy.click()
  expect(status).to_contain_text("copied")
  assert page.evaluate("navigator.clipboard.readText()")==field.input_value()
  share.click()
  expect(share_status).to_contain_text("copied")
  assert page.evaluate("navigator.clipboard.readText()")==canonical
  page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('synthetic denial')}}})")
  copy.click()
  expect(status).to_contain_text("highlighted")
  expect(field).to_be_focused()
  assert field.evaluate("x=>x.selectionEnd-x.selectionStart===x.value.length")
  share.click()
  expect(share_status).to_contain_text(canonical)
  assert "utm_" not in share_status.inner_text()
 # An actual CTA activation, suppressed navigation only; no telemetry from tool.
 link=page.locator('main a[href="join.html"]').first
 link.evaluate("x=>x.addEventListener('click',e=>e.preventDefault(),{once:true})")
 link.click()
 page.wait_for_timeout(100)
 assert len(requests)==before,(path,signal,requests[before:])
 assert page.url==url
 assert page.evaluate("typeof window.posthog === 'undefined'")
 assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+2")
 assert not any("posthog" in q[0] for q in requests)
 ctx.close()
 print("FE14",path,width,signal,"PASS no analytics SDK or event requests")

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
     for signal in ("default","gpc","dnt","unknown-query"): release_checks(browser,tool,width,signal)
   browser.close()
 finally: server.shutdown()
if __name__=="__main__": main()
