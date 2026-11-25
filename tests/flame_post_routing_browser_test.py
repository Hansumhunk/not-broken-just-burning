"""Flame Post source and Chromium routing QA; no provider calls or emails."""
from collections import Counter
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
import re
import shutil
import subprocess
from urllib.parse import unquote, parse_qs
from playwright.sync_api import sync_playwright
from first_flame_member_browser_test import ROOT, AUTH_FIXTURE, local_server, identity, ready

DOMAIN = "notbrokenjustburning.com"
LEGACY = "notbrokenjustburning" + "@gmail.com"
RESTRICTED = "founder" + "@" + DOMAIN
PUBLIC = {s + "@" + DOMAIN for s in ("contact","support","billing","partnerships","privacy","newsletter")}
EMAIL_RE = re.compile(r"[\w.+-]+@" + re.escape(DOMAIN) + r"\b", re.I)
TEXT_SUFFIX = {".html",".js",".mjs",".ts",".css",".svg",".json",".xml",".txt",".md",".sql",".yaml",".yml"}
EXPECTED = {
    "contact.html": {"contact","support","billing","partnerships","privacy","newsletter"},
    "founder.html": {"contact","partnerships"},
    "join.html": {"contact","partnerships","support"},
    "member-auth.html": {"support"},
    "member-settings.html": {"privacy"},
    "member-store.html": {"billing"},
    "members.html": {"support","billing"},
    "privacy.html": {"privacy"},
    "refunds.html": {"billing","support"},
    "support.html": {"support","billing"},
    "terms.html": {"contact","billing","support"},
}
class Anchors(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links=[]
    def handle_starttag(self, tag, attrs):
        h=dict(attrs).get("href") or ""
        if tag.lower()=="a" and h.lower().startswith("mailto:"):
            self.links.append(h)

def check_url(h):
    assert h.lower().startswith("mailto:"), "not mailto"
    address, _, query = h[7:].partition("?")
    address=unquote(address, errors="strict").lower()
    if address.endswith("@" + DOMAIN):
        assert address in PUBLIC, "unapproved NBJB destination"
    assert address != LEGACY, "legacy recipient"
    assert re.fullmatch(r"[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+",address), "invalid email recipient"
    assert not re.search(r"%(?![0-9a-fA-F]{2})",h), "malformed percent sequence"
    for pair in query.split("&"):
        key, _, value=pair.partition("=")
        unquote(value,errors="strict")
        if key.lower()=="subject":
            assert "+" not in value, "literal plus in encoded subject"
            assert not re.search(r"[\r\n]",unquote(value)), "newline in subject"
    return address

def scope(p):
    if p.as_posix() in {'README.md','BRAND.md','ENGAGEMENT.md'}:
        return 'public-guidance'
    if p.as_posix() == 'scripts/flame_spirit_products.mjs':
        return 'external-identity'
    if len(p.parts)==1 and (p.suffix==".html" or p.name in {"robots.txt","sitemap.xml","CNAME"}):
        return "website"
    if p.parts[0] in {"js","css","assets"} and p.suffix in TEXT_SUFFIX:
        return "website"
    if p.parts[:2]==("supabase","functions") and p.suffix in TEXT_SUFFIX:
        return "server"
    if p.parts[0] in {"launch-backend-staging","docs"} and p.suffix in TEXT_SUFFIX:
        return "staged-docs"
    return "history-test-config"

def scan():
    files=[Path(x) for x in subprocess.check_output(["git","ls-files","-z"],cwd=ROOT).decode().split("\0") if x]
    counts=Counter(); literal=Counter(); errors=[]; browser_pages={}
    for p in files:
        if p.suffix not in TEXT_SUFFIX and p.name!="CNAME": continue
        kind=scope(p)
        text=(ROOT/p).read_text(encoding="utf-8",errors="strict")
        counts[kind]+=1
        normalized=unquote(unescape(text),errors="replace").lower().replace(r"\u0040","@").replace(r"\x40","@")
        legacy=LEGACY in normalized
        restricted=RESTRICTED in normalized
        unknown=sorted(set(EMAIL_RE.findall(normalized))-PUBLIC)
        if kind in {"website","public-guidance","external-identity"} and (legacy or restricted or unknown):
            errors.append(f"{p}: legacy={legacy} restricted={restricted} unapproved={len(unknown)}")
        elif kind not in {"website","public-guidance","external-identity"} and (legacy or restricted or unknown):
            print(f"REVIEW separate scope {kind}: {p} legacy={legacy} restricted={restricted} unapproved={len(unknown)}")
        if kind!="website" or p.suffix!=".html": continue
        a=Anchors();a.feed(text)
        if a.links:
            browser_pages[p.as_posix()]=a.links
            literal["all"]+=len(a.links)
        roles=set()
        for h in a.links:
            try:
                address=check_url(h)
                if address in PUBLIC:
                    roles.add(address.split("@")[0]);literal["nbjb"]+=1
                else: print(f"REVIEW external mailto on {p}")
            except (AssertionError,ValueError,UnicodeError) as exc:
                errors.append(f"{p}: {exc}")
        if p.as_posix() in EXPECTED and not EXPECTED[p.as_posix()].issubset(roles):
            errors.append(f"{p}: missing expected routing role")
    print("SCAN_COUNTS",dict(counts),"LITERAL_MAILTO",dict(literal))
    print("BROWSER_SOURCE_PAGES", sorted(browser_pages))
    for error in errors: print("ROUTING_DEFECT",error)
    return browser_pages, errors

CAPTURE = """() => { window.__fpClicks = [];
document.addEventListener('click', event => {
const a=event.target.closest('a[href]');
if(a && a.getAttribute('href').toLowerCase().startsWith('mailto:')){
event.preventDefault(); event.stopImmediatePropagation();
window.__fpClicks.push(a.getAttribute('href'));
}}, true); }"""

def routing_context(browser, origin, mobile):
    # Same isolated synthetic Auth fixture as existing member QA; add ONLY
    # the catalog readiness read required to reveal the free-member billing link.
    # All other function invocations fail and all non-loopback network is blocked.
    needle = "client: { from: mkQuery },"
    replacement = """client: { from: mkQuery, functions: { invoke: async (name, options) => {
      if (name !== 'read-flamewalker-lesson' || options?.body?.action !== 'catalog') {
        throw new Error('Unexpected function call in isolated routing QA');
      }
      return { data: { lessons: Array.from({length: 7}, (_, i) => ({slug: 'fixture-' + i, status: 'published'})) }, error: null };
    } } },"""
    assert AUTH_FIXTURE.count(needle)==1, "synthetic fixture contract changed"
    fixture=AUTH_FIXTURE.replace(needle,replacement)
    options=dict(viewport={"width":390,"height":844} if mobile else {"width":1280,"height":900},
                 reduced_motion="reduce")
    if mobile:
        options.update(is_mobile=True,has_touch=True,device_scale_factor=2)
    context=browser.new_context(**options)
    context.route("**/*",lambda r: r.continue_() if r.request.url.startswith(origin+"/") else r.abort())
    context.add_init_script(script=fixture)
    return context, context.new_page()

def browser_check(browser, origin, pages, mobile):
    context, page=routing_context(browser,origin,mobile)
    page.set_default_timeout(6000)
    mode="mobile" if mobile else "desktop"
    n=0; hidden=0
    try:
        identity(page,origin,"flame-post-fixture")
        for path, links in sorted(pages.items()):
            if path=="member-auth.html":
                page.evaluate("sessionStorage.removeItem('qa-fixture-user')")
            if path.startswith("member-") and path!="member-auth.html" or path=="members.html":
                ready(page,origin,path)
            else:
                response=page.goto(origin+"/"+path,wait_until="domcontentloaded")
                assert response and response.status==200,path
            if path=="member-auth.html":
                page.locator("#signed-out-state").wait_for(state="visible")
            if path=="member-store.html":
                page.locator("#member-billing-purchase").wait_for(state="visible")
            page.evaluate(CAPTURE)
            anchors=page.locator("a[href^='mailto:' i]").all()
            actual=[a.get_attribute("href") for a in anchors]
            assert Counter(actual)==Counter(links), f"{mode} {path} DOM vs source mailto mismatch"
            for a in anchors:
                href=a.get_attribute("href")
                check_url(href)
                if a.is_visible():
                    a.scroll_into_view_if_needed()
                    a.click()
                    assert page.evaluate("window.__fpClicks.at(-1)")==href, f"{mode} {path} click mismatch"
                    n+=1
                else:
                    # Hidden state is not interactive acceptance; separately counted.
                    hidden+=1
                    print(f"HIDDEN {mode} {path}")
            print(f"PASS {mode} {path}: {len(anchors)} DOM links")
            if path=="member-auth.html":
                page.evaluate("sessionStorage.setItem('qa-fixture-user','flame-post-fixture')")
        ready(page,origin,"member-feedback.html")
        page.locator("#feedback-topic").select_option("Broken link or button")
        page.locator("#feedback-page").select_option("Dashboard")
        page.locator("#feedback-device").select_option("Phone" if mobile else "Computer")
        page.locator("#feedback-message").fill("Synthetic fixture only: contact route check.")
        page.locator("#feedback-private-check").check()
        seen=[]
        session=context.new_cdp_session(page)
        session.send("Page.enable")
        session.on("Page.frameRequestedNavigation", lambda event: seen.append(event.get("url","")))
        page.locator("#feedback-open-email").click()
        for _ in range(30):
            if any(h.startswith("mailto:") for h in seen): break
            page.wait_for_timeout(100)
        captured=[h for h in seen if h.startswith("mailto:")]
        assert captured, "feedback external-protocol navigation not captured"
        href=captured[-1]
        assert check_url(href)=="support@"+DOMAIN
        q=parse_qs(href.partition("?")[2],strict_parsing=True)
        assert q["subject"]==["NBJB member feedback — Broken link or button"]
        assert "Synthetic fixture only: contact route check." in q["body"][0]
        assert "NBJB has not received it yet" in page.locator("#feedback-outcome").inner_text()
        assert "Synthetic fixture only" in page.locator("#feedback-prepared").input_value()
        print(f"PASS {mode} feedback composer recipient/subject/body; headless protocol capture, NO message sent")
        print(f"BROWSER_COUNTS {mode} clicked={n} hidden={hidden} feedback=1")
        assert hidden==0, "unexercised contact interaction; inspect logged path"
    finally:
        context.close()

if __name__=="__main__":
    pages, errors=scan()
    binary=shutil.which("google-chrome") or shutil.which("google-chrome-stable") or shutil.which("chromium")
    assert binary, "Chromium required"
    with local_server() as origin, sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=binary,args=["--no-sandbox"])
        try:
            browser_check(browser,origin,pages,False)
            browser_check(browser,origin,pages,True)
        finally:
            browser.close()
    assert not errors, "website routing defects: see ROUTING_DEFECT lines"
    print("FLAME_POST_SOURCE_BROWSER_PASS; external mail-client launch and live delivery NOT tested.")
