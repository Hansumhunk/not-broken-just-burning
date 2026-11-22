#!/usr/bin/env python3
"""Offline, no-login browser acceptance for the existing Front Door candidate."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        return

def verify(browser, port, width, height, label):
    origin = f"http://127.0.0.1:{port}"
    context = browser.new_context(viewport={"width":width,"height":height},device_scale_factor=1)
    page = context.new_page()
    page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(origin + "/") else route.abort())
    def visit(path):
        response = page.goto(origin + "/" + path, wait_until="domcontentloaded")
        assert response and response.status == 200, f"{label}: {path} not loaded"
        assert page.locator("html").get_attribute("lang") == "en", f"{label}: language missing"
        assert page.locator("main").count() == 1, f"{label}: missing main landmark"
        assert page.locator("h1").count() == 1, f"{label}: missing unique H1"
        overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        assert overflow <= 2, f"{label}: horizontal overflow {overflow}px on {path}"
    visit("index.html")
    assert page.locator('a[href="#start-here"]').count() == 1
    section = page.locator("#start-here")
    assert section.is_visible(), f"{label}: missing free guidance"
    assert section.locator(".nbjb-start-card").count() == 6
    assert all(a.inner_text().strip() for a in section.locator("a").all()), f"{label}: unlabeled guidance link"
    assert page.locator("#first-seven-days").count() == 1
    intro = page.locator("#first-seven-days").inner_text().lower()
    assert "in development" not in intro and "not available" not in intro, f"{label}: outdated development notice"
    assert "no account" in intro and "no" in intro and "payment" in intro, f"{label}: unclear no-pay/no-signup value"
    entry = page.locator('#first-seven-days a[href="first-seven-days.html"]')
    assert entry.count() == 1 and entry.is_visible(), f"{label}: public lesson link absent"
    entry.focus()
    page.keyboard.press("Enter")
    page.wait_for_url("**/first-seven-days.html")
    assert "The First Seven Days" in page.locator("h1").inner_text(), f"{label}: free lesson not reached"
    visit("join.html")
    assert page.locator('a[href="member-auth.html"]').count() >= 1
    assert page.locator('a[href="index.html#start-here"]').count() == 1
    assert "no credit card" in page.locator("body").inner_text().lower()
    page.locator('a[href="index.html#start-here"]').click()
    page.wait_for_url("**/index.html#start-here")
    assert page.locator("#start-here").is_visible(), f"{label}: guest pathway broken"
    print(f"PASS FRONT DOOR {label}: public day-seven route, 6 guided choices, join/guest navigation, keyboard Enter, heading/landmark, no overflow")
    context.close()

def main():
    handler = partial(QuietHandler, directory=str(ROOT))
    server=ThreadingHTTPServer(("127.0.0.1",0),handler)
    thread=Thread(target=server.serve_forever,daemon=True); thread.start()
    try:
        with sync_playwright() as p:
            executable_path = os.environ.get("CHROME_PATH") or None
            browser=p.chromium.launch(headless=True,executable_path=executable_path,args=["--no-sandbox"])
            try:
                for width,height,label in ((1280,800,"desktop"),(390,844,"mobile"),(320,720,"small-mobile")):
                    verify(browser,server.server_port,width,height,label)
            finally:
                browser.close()
    finally:
        server.shutdown();server.server_close()

if __name__ == "__main__":
    main()
