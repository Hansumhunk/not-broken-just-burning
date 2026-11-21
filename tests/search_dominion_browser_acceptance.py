"""Isolated SD01–03 browser, responsive, accessibility, metadata and crawl acceptance."""
from contextlib import contextmanager
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET
from playwright.sync_api import sync_playwright
import os
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "test-results/search-dominion"
OUT.mkdir(parents=True, exist_ok=True)
AXE = Path(os.environ["SD_AXE_PATH"])
ORIGIN = "https://notbrokenjustburning.com"
GUIDES = {
 "guide-dad-days-without-kids.html": ("divorce-recovery.html", "What to Do When Your Kids Aren't With You After Divorce"),
 "guide-working-through-divorce.html": ("mens-personal-development.html", "How to Keep Working When Divorce Is Consuming Your Mind"),
 "guide-rebuilding-friendships-after-divorce.html": ("mens-mental-health.html", "How to Rebuild Friendships After Divorce"),
}
HUBS = {
 "divorce-recovery.html": ["guide-dad-days-without-kids.html","guide-working-through-divorce.html"],
 "mens-personal-development.html": ["guide-working-through-divorce.html"],
 "mens-mental-health.html": ["guide-rebuilding-friendships-after-divorce.html"],
}

class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a): pass

@contextmanager
def serve():
 srv=ThreadingHTTPServer(("127.0.0.1",0),Handler)
 thread=Thread(target=srv.serve_forever,daemon=True); thread.start()
 try: yield "http://127.0.0.1:"+str(srv.server_port)
 finally: srv.shutdown();srv.server_close();thread.join()

def check_sitemap():
 ns="{http://www.sitemaps.org/schemas/sitemap/0.9}"
 urls=[x.text for x in ET.parse(ROOT/"sitemap.xml").getroot().findall(f"{ns}url/{ns}loc")]
 assert len(urls)==len(set(urls))==101, ("count/uniqueness",len(urls))
 assert all(urls.count(ORIGIN+"/"+name)==1 for name in GUIDES)
 assert not any("join.html" in u or "members.html" in u or "first-seven-days.html" in u for u in urls)
 print("Sitemap: 101 unique canonical public URLs, three guides exactly once, no protected/unreleased routes")

def check_reflow(page,width,name):
 excess=page.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
 assert excess<=2,(name,width,excess)
 box=page.locator("article.story").bounding_box()
 assert box and box["x"]>=-2 and box["x"]+box["width"]<=width+2,(name,width,box)

def check_axe(page,name):
 page.add_script_tag(path=str(AXE))
 result=page.evaluate("""async () => await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})""")
 assert not result["violations"],(name,[(v["id"],[n["target"] for n in v["nodes"]]) for v in result["violations"]])
 print(name,"axe WCAG 2.0/2.1 A/AA: 0 violations")

def main():
 assert AXE.is_file()
 check_sitemap()
 with serve() as base,sync_playwright() as pw:
  chrome=shutil.which("google-chrome") or shutil.which("google-chrome-stable") or shutil.which("chromium")
  browser=pw.chromium.launch(executable_path=chrome) if chrome else pw.chromium.launch()
  for width in (320,390,1280):
   for name,(parent,h1) in GUIDES.items():
    ctx=browser.new_context(viewport={"width":width,"height":844},reduced_motion="reduce")
    page=ctx.new_page()
    failures=[]
    page.on("pageerror",lambda e: failures.append(str(e)))
    page.route("**/*",lambda r: r.continue_() if r.request.url.startswith(base+"/") else r.abort())
    response=page.goto(base+"/"+name,wait_until="domcontentloaded")
    assert response and response.status==200
    assert page.locator("main h1").count()==1 and page.locator("main h1").inner_text()==h1
    assert page.locator("article.story").is_visible()
    assert page.locator("article.story h2").count()>=5
    assert page.locator("article.story a[href^='https://']").count()>=4
    assert page.locator("main input,main textarea,main form,main iframe").count()==0
    assert "noindex" not in (page.locator('meta[name="robots"]').get_attribute("content") or "")
    assert page.locator('link[rel="canonical"]').get_attribute("href")==ORIGIN+"/"+name
    for key in ('meta[property="og:image"]','meta[name="twitter:image"]'):
     assert page.locator(key).get_attribute("content")==ORIGIN+"/assets/social-share-v2.jpg"
    assert page.locator('nav.article-nav a[href="'+parent+'"]').count()==1
    check_reflow(page,width,name)
    page.screenshot(path=str(OUT/(name.replace(".html","")+"-"+str(width)+".png")),full_page=True)
    page.keyboard.press("Tab")
    assert page.evaluate("document.activeElement.getAttribute('href')")=="#main-content",(name,width,"skip")
    page.keyboard.press("Enter")
    assert page.evaluate("location.hash")=="#main-content"
    if width==390:
     toggle=page.locator(".nav-toggle")
     if toggle.is_visible():
      toggle.click()
      assert toggle.get_attribute("aria-expanded")=="true"
      page.keyboard.press("Escape")
      assert toggle.get_attribute("aria-expanded")=="false"
     check_axe(page,name)
    if width==1280:
     page.evaluate("document.documentElement.style.fontSize='200%'")
     check_reflow(page,width,name+" 200%-font")
    assert not failures,(name,failures)
    print("Guide PASS",name,width,"px: reading, canonical, indexability, responsive navigation")
    ctx.close()
  for hub,children in HUBS.items():
   ctx=browser.new_context(viewport={"width":390,"height":844},reduced_motion="reduce")
   page=ctx.new_page()
   page.route("**/*",lambda r: r.continue_() if r.request.url.startswith(base+"/") else r.abort())
   assert page.goto(base+"/"+hub).status==200
   for name in children:
    link=page.locator('main a[href="'+name+'"]')
    assert link.count()==1,(hub,name)
    link.click()
    assert urlsplit(page.url).path=="/"+name,(hub,name,page.url)
    page.goto(base+"/"+hub)
   print("Hub navigation PASS",hub,len(children))
   ctx.close()
  for name in GUIDES:
   ctx=browser.new_context(viewport={"width":390,"height":844},java_script_enabled=False)
   page=ctx.new_page()
   page.route("**/*",lambda r: r.continue_() if r.request.url.startswith(base+"/") else r.abort())
   assert page.goto(base+"/"+name).status==200
   assert page.locator("article.story").is_visible() and page.locator("article.story h2").count()>=5
   print("JavaScript-disabled readable guide PASS",name)
   ctx.close()
  browser.close()
 print("Search Dominion candidate browser QA COMPLETE (local only, no visitor data or production changes)")

if __name__=="__main__": main()
