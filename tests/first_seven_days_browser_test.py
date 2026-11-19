"""Review-only regression suite for the static First Seven Days candidate."""
from contextlib import contextmanager
from pathlib import Path
from threading import Thread
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
import os
import re
import shutil
import sys
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from xml.etree import ElementTree as ET
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "test-results" / "first-seven-days"
ARTIFACTS.mkdir(parents=True, exist_ok=True)
AXE = Path(os.environ["FSD_AXE_PATH"])
DAY_TITLES = ["Understand the chaos", "Separate facts, emotions and assumptions",
    "Identify what you can control", "Establish healthy boundaries",
    "Regain emotional command", "Rebuild your identity", "Establish your next mission"]
RESOURCES = ["check-in.html", "lesson-clarity-before-certainty.html", "six-sacred-questions.html",
    "lesson-boundaries-are-actions.html", "path-masculine-restoration-steadiness.html",
    "lesson-other-person-not-your-measure.html", "story-one-stone.html"]

PUBLIC_ORIGIN = "https://notbrokenjustburning.com"
PUBLIC_ROUTES = RESOURCES + ["support.html", "path.html", "join.html", "flamewalker-plus.html", "members.html",
    "index.html", "forge.html", "fire.html", "movement.html", "resources.html", "founder.html", "contact.html", "terms.html", "privacy.html"]

def probe_production_resources():
    """Read only existing public/static entry URLs, never a signed-in session."""
    def check(path):
        destination = PUBLIC_ORIGIN + "/" + path
        req = Request(destination, headers={"User-Agent": "NBJB-First-Seven-Days-release-preflight/1.0", "Accept-Encoding": "identity"})
        with urlopen(req, timeout=12) as response:
            body = response.read(1024 * 1024).decode("utf-8", errors="replace")
            final = response.geturl()
            assert response.status == 200 and response.headers.get_content_type() == "text/html", (path, response.status)
            assert final == destination or (path == "index.html" and final == PUBLIC_ORIGIN + "/"), (path, final)
            assert re.search(r"<title[^>]*>\\s*[^<]+", body, re.I), path
            assert re.search(r"<h1(?:\\s|>)", body, re.I), path
            print("Production existing route PASS:", path, response.status, final)
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(check, PUBLIC_ROUTES))
    print(f"Existing production resource destinations PASS ({len(PUBLIC_ROUTES)}/{len(PUBLIC_ROUTES)}); not candidate deployment or authenticated access")

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)
    def log_message(self, *a):
        pass

@contextmanager
def server():
    srv = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=srv.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{srv.server_port}"
    finally:
        srv.shutdown()
        srv.server_close()
        thread.join()

def check_content(page):
    assert page.locator("main h1").count() == 1
    assert page.locator("main article.fsd-day").count() == 7
    assert page.locator("form, input, textarea, iframe").count() == 0
    assert page.locator('meta[name="robots"]').get_attribute("content") == "index,follow"
    assert page.locator('link[rel="canonical"]').get_attribute("href") == PUBLIC_ORIGIN + "/first-seven-days.html"
    urls = [el.text for el in ET.parse(ROOT / "sitemap.xml").getroot().findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    assert urls.count(PUBLIC_ORIGIN + "/first-seven-days.html") == 1
    assert len(urls) == len(set(urls))
    assert page.locator("#welcome").is_visible() and page.locator("#complete").is_visible()
    for i, (title, resource) in enumerate(zip(DAY_TITLES, RESOURCES), 1):
        section = page.locator(f"#day-{i}")
        assert section.is_visible()
        assert section.locator("h2").inner_text() == title
        assert section.locator(".eyebrow").text_content().strip() == f"Day {i} of 7"
        for selector in [".fsd-outcome", ".fsd-quick", ".fsd-objective", ".fsd-resource"]:
            assert section.locator(selector).count() == 1
            assert section.locator(selector).is_visible()
        assert section.locator(f'.fsd-resource a[href="{resource}"]').count() == 1
        assert section.locator("h3", has_text="Reflect").count() == 1
        assert section.locator("h3", has_text="One achievable action").count() == 1
        assert section.locator('.fsd-safety a[href="support.html"]').is_visible()
        assert section.locator("nav a").count() == 3
    assert page.locator('#complete a[href="flamewalker-plus.html"]').count() >= 1
    assert page.locator('#complete a[href="path.html"]').count() >= 1
    assert page.locator('#complete a[href="join.html"]').count() >= 1

def check_reflow(page, width):
    page.set_viewport_size({"width": width, "height": 900})
    info = page.evaluate("() => ({viewport:document.documentElement.clientWidth, scroll:document.documentElement.scrollWidth})")
    assert info["scroll"] <= info["viewport"] + 1, (width, info)
    for selector in ["main", "#journey", "#day-4", "#complete"]:
        box = page.locator(selector).bounding_box()
        assert box and box["x"] >= -1 and box["x"] + box["width"] <= width + 1, (width, selector, box)

def audit_accessibility(page, name):
    page.add_script_tag(path=str(AXE))
    results = page.evaluate("""async () => await axe.run(document, {
        runOnly: {type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}
    })""")
    violations = results["violations"]
    assert not violations, (name, [(x["id"], [n["target"] for n in x["nodes"]]) for x in violations])
    print(f"{name}: axe WCAG 2.0/2.1 A/AA, 0 violations")

def main():
    with server() as origin, sync_playwright() as pw:
        url = origin + "/first-seven-days.html"
        installed_chrome = shutil.which("google-chrome") or shutil.which("google-chrome-stable") or shutil.which("chromium")
        browser = pw.chromium.launch(executable_path=installed_chrome) if installed_chrome else pw.chromium.launch()
        # Block third-party requests; this page must not request any.
        context = browser.new_context(viewport={"width":1440,"height":900}, reduced_motion="reduce")
        page = context.new_page()
        requests, errors = [], []
        page.on("request", lambda r: requests.append(r.url))
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(origin + "/") else route.abort())
        page.add_init_script("""(() => {
            window.__fsdStorageCalls=[];
            for (const name of ['getItem','setItem','removeItem','clear']) {
                const original=Storage.prototype[name];
                Storage.prototype[name]=function(...args){window.__fsdStorageCalls.push(name);return original.apply(this,args);};
            }
        })()""")
        assert page.goto(url).status == 200
        # Always retain representative screenshots even if a later assertion fails.
        page.screenshot(path=str(ARTIFACTS / "desktop.png"))
        page.set_viewport_size({"width":390,"height":844})
        page.screenshot(path=str(ARTIFACTS / "mobile.png"))
        page.set_viewport_size({"width":1440,"height":900})
        check_content(page)
        assert page.locator("#fsd-status").inner_text() == "0 of 7 days marked practiced."
        # Keyboard skip link and native anchor navigation.
        page.keyboard.press("Tab")
        assert page.evaluate("document.activeElement.className") == "skip-link"
        page.keyboard.press("Enter")
        assert page.evaluate("location.hash") == "#main-content"
        page.locator('a[href="#day-1"]').first.click()
        assert page.evaluate("location.hash") == "#day-1"
        page.locator('#day-1 nav a[href="#day-2"]').click()
        assert page.evaluate("location.hash") == "#day-2"
        page.locator('#day-2 nav a[href="#day-1"]').click()
        assert page.evaluate("location.hash") == "#day-1"
        # Every mark is voluntary, independent, reversible; anchors do not clear marks.
        for i in range(1,8):
            button = page.locator(f'[data-day-mark="{i}"]')
            button.click()
            assert button.get_attribute("aria-pressed") == "true"
            assert page.locator("#fsd-status").inner_text() == f"{i} of 7 days marked practiced."
            assert page.locator(f'[data-index-mark="{i}"]').is_visible()
            assert page.locator(f'[data-local-mark="{i}"]').is_visible()
        page.locator('[data-day-mark="4"]').click()
        assert page.locator("#fsd-status").inner_text() == "6 of 7 days marked practiced."
        assert page.locator('[data-index-mark="4"]').is_hidden()
        assert page.locator('[data-local-mark="4"]').is_hidden()
        page.locator('[data-day-mark="4"]').click()
        page.locator("#fsd-clear").click()
        assert page.locator("#fsd-status").inner_text() == "0 of 7 days marked practiced."
        assert page.locator("#fsd-clear").is_disabled()
        assert page.locator('[aria-pressed="true"]').count() == 0
        page.locator('[data-day-mark="1"]').click()
        assert page.evaluate("window.__fsdStorageCalls") == []
        assert page.evaluate("Object.keys(localStorage)") == []
        assert page.evaluate("Object.keys(sessionStorage)") == []
        page.reload()
        assert page.locator("#fsd-status").inner_text() == "0 of 7 days marked practiced."
        assert page.evaluate("window.__fsdStorageCalls").count("setItem") == 0
        # All same-document fragments and referenced local resources exist.
        base = ROOT.resolve()
        for href in page.locator("a[href]").evaluate_all("(a) => a.map(x=>x.getAttribute('href'))"):
            parts = urlsplit(href)
            if href.startswith("#"):
                assert page.locator(href).count() == 1, href
            elif not parts.scheme:
                target = (ROOT / parts.path).resolve()
                assert target.is_relative_to(base) and target.is_file(), href
        for resource in RESOURCES + ["support.html", "path.html", "join.html", "flamewalker-plus.html", "members.html"]:
            assert context.request.get(origin + "/" + resource).status == 200, resource
        # Verify exact page layout at desktop, typical mobile, narrow 320px reflow.
        check_reflow(page,1440)
        page.goto(url)
        page.screenshot(path=str(ARTIFACTS / "desktop.png"))
        page.locator("#day-4").scroll_into_view_if_needed()
        page.evaluate("document.getElementById('day-4').scrollIntoView()")
        page.screenshot(path=str(ARTIFACTS / "desktop-day4.png"))
        audit_accessibility(page,"desktop")
        check_reflow(page,390)
        page.goto(url)
        assert page.locator(".fsd-site-header").bounding_box()["height"] < 260
        assert page.locator('a.fsd-primary[href="#day-1"]').first.bounding_box()["y"] < 710
        page.screenshot(path=str(ARTIFACTS / "mobile.png"))
        page.evaluate("document.getElementById('day-5').scrollIntoView()")
        page.screenshot(path=str(ARTIFACTS / "mobile-day5.png"))
        audit_accessibility(page,"mobile")
        check_reflow(page,320)
        # Text sizing stress test at 200%, in addition to narrow reflow.
        page.evaluate("document.documentElement.style.fontSize = '200%'")
        check_reflow(page,1280)
        page.evaluate("document.documentElement.style.fontSize = ''")
        # 320 CSS px is the equivalent reflow width at 400% on a 1280px viewport.
        assert page.evaluate("getComputedStyle(document.documentElement).scrollBehavior") == "auto"
        assert not errors, errors
        assert not [r for r in requests if not r.startswith(origin + "/")], requests
        print("Enabled JS: desktop/mobile/narrow reflow, keyboard, day marks, link validation, no storage writes or external requests PASS")
        # JS disabled: all content and nav remain usable.
        nojs = browser.new_context(java_script_enabled=False, viewport={"width":390,"height":844})
        plain = nojs.new_page()
        assert plain.goto(url + "#day-4").status == 200
        check_content(plain)
        assert plain.locator('[data-progress]').is_hidden()
        assert plain.locator(".fsd-no-js").is_visible()
        assert plain.locator('#day-4 nav a[href="#day-5"]').is_visible()
        plain.locator('#day-4 nav a[href="#day-5"]').click()
        assert plain.url.endswith("#day-5")
        plain.screenshot(path=str(ARTIFACTS / "mobile-no-js.png"))
        # Mobile touch-emulation, separate from physical device acceptance.
        touch = browser.new_context(**pw.devices["Pixel 7"], reduced_motion="reduce")
        tp = touch.new_page()
        assert tp.goto(url).status == 200
        tp.locator('a.fsd-primary[href="#day-1"]').first.tap()
        assert tp.url.endswith("#day-1")
        tp.locator('[data-day-mark="1"]').tap()
        assert tp.locator('[data-day-mark="1"]').get_attribute("aria-pressed") == "true"
        tp.locator('#day-1 nav a[href="#day-2"]').tap()
        assert tp.url.endswith("#day-2")
        tp.screenshot(path=str(ARTIFACTS / "mobile-touch-day2.png"))
        touch.close()
        print("Mobile touch emulation PASS; physical device approval remains separate")
        # Print: true paginated PDF, text extract confirms every teaching heading,
        # seven exercises/short versions and closing content.
        page.set_viewport_size({"width":1440,"height":900})
        page.goto(url)
        page.emulate_media(media="print")
        assert page.locator(".fsd-index").is_hidden()
        assert page.locator("#day-7").is_visible()
        pdf = ARTIFACTS / "first-seven-days-print.pdf"
        page.pdf(path=str(pdf), format="Letter", prefer_css_page_size=True, print_background=False)
        doc = PdfReader(pdf)
        text = re.sub(r"\s+", " ", " ".join(p.extract_text() or "" for p in doc.pages)).lower()
        for title in DAY_TITLES:
            assert title.lower() in text, title
        for label in ["completion objective:", "two-minute option:", "optional nbjb resource:"]:
            assert text.count(label) == 7, (label, text.count(label))
        assert "what you carry forward" in text
        assert 8 <= len(doc.pages) <= 30, len(doc.pages)
        assert len((doc.pages[-1].extract_text() or "").split()) >= 75, "Sparse closing print page"
        print(f"No-JS/mobile navigation PASS; printable PDF content PASS ({len(doc.pages)} pages)")
        browser.close()
    print("First Seven Days staged browser acceptance PASS")

if __name__ == "__main__":
    if "--production-resources" in sys.argv:
        probe_production_resources()
    else:
        main()
