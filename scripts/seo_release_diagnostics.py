"""Controlled local browser release diagnosis; never writes production or member data."""
import json
import os
import statistics
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path(os.environ["SEO_DIAGNOSTICS_DIR"])
OUT.mkdir(parents=True,exist_ok=True)
BASES={"prior":"http://127.0.0.1:8765/","current":"http://127.0.0.1:8766/"}
ROWS=[]
INIT="""() => {
 window.__paint={lcp:null,cls:0};
 new PerformanceObserver(list=>{for(const e of list.getEntries()) window.__paint.lcp={ms:e.startTime,element:e.element?.tagName,text:(e.element?.textContent||'').trim().slice(0,100)};}).observe({type:'largest-contentful-paint',buffered:true});
 new PerformanceObserver(list=>{for(const e of list.getEntries()) if(!e.hadRecentInput) window.__paint.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
}"""
def run(browser,variant,mode,width,rep):
    context=browser.new_context(viewport={"width":width,"height":900 if width>600 else 844},reduced_motion="reduce")
    page=context.new_page()
    page.add_init_script("("+INIT+")()")
    failures=[]
    page.on("requestfailed",lambda req: failures.append({"url":req.url,"failure":req.failure}))
    if mode=="block-fonts":
        page.route("https://fonts.googleapis.com/**",lambda route:route.abort())
        page.route("https://fonts.gstatic.com/**",lambda route:route.abort())
    if mode=="delay-font-css":
        def delay(route):
            time.sleep(3)
            route.continue_()
        page.route("https://fonts.googleapis.com/**",delay)
    if mode=="prior-js":
        page.route("**/js/main.js",lambda route:route.fulfill(response=route.fetch(url=BASES["prior"]+"js/main.js")))
    res=page.goto(BASES[variant]+"divorce-recovery.html",wait_until="load",timeout=45000)
    assert res and res.ok
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(700)
    data=page.evaluate("""() => {
      const h=document.querySelector('h1'), box=h.getBoundingClientRect();
      return {paint:window.__paint, fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        resources:performance.getEntriesByType('resource').filter(x=>/fonts\\.googleapis|fonts\\.gstatic|main\\.js|\\.css/.test(x.name)).map(x=>({url:x.name,duration:Math.round(x.duration),start:Math.round(x.startTime),end:Math.round(x.responseEnd)})),
        fontStatus:document.fonts.status, faces:[...document.fonts].map(x=>({family:x.family,status:x.status})), heading:{width:box.width,height:box.height,font:getComputedStyle(h).fontFamily}, overflow:document.documentElement.scrollWidth-innerWidth,
        nav:performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd};
    }""")
    assert data["overflow"]<=2
    assert data["paint"]["lcp"] is not None,(variant,mode,width,rep)
    if rep==1:
        page.screenshot(path=str(OUT/f"{variant}-{mode}-{width}.png"),full_page=False)
    row={"variant":variant,"mode":mode,"width":width,"rep":rep,**data,"failures":failures}
    ROWS.append(row)
    print(f"{variant} {mode} {width} rep={rep}: LCP={data['paint']['lcp']['ms']:.0f} FCP={data['fcp']:.0f} CLS={data['paint']['cls']:.3f}; H1={data['heading']['height']:.1f}px; font CSS ms={[x['duration'] for x in data['resources'] if 'fonts.googleapis' in x['url']]}; failed={len(failures)}",flush=True)
    context.close()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ["CHROME_PATH"],args=["--no-sandbox","--disable-dev-shm-usage"])
    for width in (1280,390):
        for rep in range(1,4):
            for variant in (("prior","current") if rep%2 else ("current","prior")):
                run(browser,variant,"normal",width,rep)
            run(browser,"current","block-fonts",width,rep)
        for mode in ("delay-font-css","prior-js"):
            run(browser,"current",mode,width,1)
    browser.close()
(OUT/"diagnostics.json").write_text(json.dumps(ROWS,indent=2))
print("MEDIANS: direct local Chromium timing, no Lighthouse simulated throttling; not field data.")
for width in (1280,390):
    for variant,mode in (("prior","normal"),("current","normal"),("current","block-fonts"),("current","delay-font-css"),("current","prior-js")):
        rows=[x for x in ROWS if (x["width"],x["variant"],x["mode"])==(width,variant,mode)]
        print(f"{width} {variant} {mode}: n={len(rows)} LCP median={statistics.median(x['paint']['lcp']['ms'] for x in rows):.0f} ms FCP median={statistics.median(x['fcp'] for x in rows):.0f} ms; CLS max={max(x['paint']['cls'] for x in rows):.3f}")
