"""Read-only browser checks for public SEO pages on localhost; no account actions."""
import json
import os
from playwright.sync_api import sync_playwright

PAGES = ("divorce-recovery.html", "masculine-restoration-placeholder-wound.html",
         "mens-mental-health.html", "mens-personal-development.html", "flamewalker-plus.html")
BASE = "http://127.0.0.1:8766/"
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ["CHROME_PATH"], args=["--no-sandbox"])
    for width, height in ((360, 800), (390, 844), (1280, 800)):
        for name in PAGES:
            context = browser.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce")
            page = context.new_page()
            response = page.goto(BASE + name, wait_until="domcontentloaded")
            assert response and response.ok, name
            page.evaluate("document.fonts.ready")
            assert page.locator("h1").first.is_visible(), name
            overflow = page.evaluate("document.documentElement.scrollWidth - innerWidth")
            assert overflow <= 2, (name,width,overflow)
            page.keyboard.press("Tab")
            focused = page.evaluate("document.activeElement.getAttribute('href')")
            assert focused == "#main-content", (name,width,focused)
            page.keyboard.press("Enter")
            assert page.evaluate("location.hash") == "#main-content", name
            if width < 600:
                toggle = page.locator(".nav-toggle")
                if toggle.is_visible():
                    toggle.click()
                    assert toggle.get_attribute("aria-expanded") == "true", name
                    page.keyboard.press("Escape")
                    assert toggle.get_attribute("aria-expanded") == "false", name
            nodes = page.locator('script[type="application/ld+json"]').all_text_contents()
            schemas = [json.loads(raw) for raw in nodes]
            if name != "flamewalker-plus.html":
                assert sum(s.get("@type") == "BreadcrumbList" for s in schemas) == 1, name
            else:
                assert sum(s.get("@type") == "ItemList" for s in schemas) == 1, name
            print(f"{name} {width}px: overflow={overflow}, keyboard skip link and navigation pass, {len(schemas)} rendered JSON-LD blocks parse")
            context.close()
    for name in PAGES[:-1]:
        context = browser.new_context(java_script_enabled=False, viewport={"width":390,"height":844})
        page = context.new_page()
        page.goto(BASE + name)
        assert page.locator("h1").first.is_visible(), name
        assert page.locator("main").evaluate("node => getComputedStyle(node).opacity") == "1", name
        assert page.locator("main .reveal").count() == 0, name
        print(f"{name}: main educational content works with JS disabled")
        context.close()
    browser.close()
