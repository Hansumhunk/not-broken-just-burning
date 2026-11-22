"""007-D: exact shared image and metadata checks. Browser tests use localhost only."""
from argparse import ArgumentParser
from html.parser import HTMLParser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from io import BytesIO
from pathlib import Path
import re
import shutil
import subprocess
from threading import Thread

from PIL import Image, ImageFile
from social_share_image import SOCIAL_PATH, SOCIAL_URL, SOCIAL_SIZE, validate_social_image

ROOT = Path(__file__).resolve().parents[1]
OLD_PATH = "assets/social-share.png"
OLD_URL = "https://notbrokenjustburning.com/" + OLD_PATH

class Metadata(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.values = {}
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        if tag == "meta":
            a = dict(attrs)
            key = (a.get("property") or a.get("name") or "").lower()
            self.values.setdefault(key, []).append(a.get("content", ""))

def check_static():
    data = (ROOT / SOCIAL_PATH).read_bytes()
    assert validate_social_image(data) == SOCIAL_SIZE
    print(f"Verified full JPEG decode: {SOCIAL_SIZE}, RGB, {len(data)} bytes")
    for test in ("wrong-size", "wrong-mode", "truncated", "wrong-format"):
        buf = BytesIO()
        if test == "truncated":
            bad = data[:len(data)//2] + b"\xff\xd9"
        else:
            Image.new("L" if test == "wrong-mode" else "RGB",
                      (1199, 630) if test == "wrong-size" else SOCIAL_SIZE).save(
                          buf, format="PNG" if test == "wrong-format" else "JPEG")
            bad = buf.getvalue()
        try:
            validate_social_image(bad)
        except Exception as exc:
            print(f"Negative fixture {test}: rejected ({type(exc).__name__})")
        else:
            raise AssertionError(f"Accepted invalid fixture: {test}")
    # Historical exact original bytes are the reproduction fixture, not a public image source.
    old = (ROOT / OLD_PATH).read_bytes()
    ImageFile.LOAD_TRUNCATED_IMAGES = False
    for operation in ("verify", "load"):
        try:
            with Image.open(BytesIO(old)) as image:
                getattr(image, operation)()
        except Exception as exc:
            print(f"Original PNG {operation} failure reproduced: {type(exc).__name__}: {exc}")
        else:
            raise AssertionError(f"Original PNG unexpectedly passed {operation}")
    pages = []
    html = sorted(ROOT.rglob("*.html"))
    for path in html:
        if ".git" in path.parts:
            continue
        content = path.read_text(encoding="utf-8")
        assert OLD_PATH not in content, f"Legacy reference: {path.relative_to(ROOT)}"
        tags = Metadata(content).values
        if SOCIAL_URL not in tags.get("og:image", []) + tags.get("twitter:image", []):
            continue
        assert tags.get("og:image") == [SOCIAL_URL], path
        assert tags.get("twitter:image") == [SOCIAL_URL], path
        for key, val in (("og:image:width", "1200"), ("og:image:height", "630"),
                         ("og:image:type", "image/jpeg")):
            if key in tags:
                assert tags[key] == [val], (path, key, tags[key])
        pages.append(str(path.relative_to(ROOT)))
    for path in (ROOT / "js").rglob("*.js"):
        assert OLD_PATH not in path.read_text(encoding="utf-8"), path
    assert "index.html" in pages and "divorce-recovery.html" in pages
    assert len(pages) >= 99, f"Shared metadata coverage regressed: {len(pages)}"
    print(f"Static HTML: {len(html)} scanned, {len(pages)} shared image pages, {2*len(pages)} matching OG/Twitter tags; no legacy HTML or JS references")

def compare_base(base):
    def git(*args):
        return subprocess.check_output(["git", *args], cwd=ROOT)
    files = git("diff", "--name-only", base, "HEAD", "--", "*.html").decode().splitlines()
    assert len(files) == 99, f"Expected 99 affected HTML files; found {len(files)}"
    meta = re.compile(rb"<meta\b[^>]*>", re.I)
    image_key = re.compile(rb"\b(?:property|name)\s*=\s*[\"'](?:og:image(?::url|:secure_url)?|twitter:image(?::src)?)[\"']", re.I)
    type_key = re.compile(rb"\bproperty\s*=\s*[\"']og:image:type[\"']", re.I)
    for name in files:
        old = git("show", f"{base}:{name}")
        def replace(match):
            tag = match.group()
            if image_key.search(tag):
                tag = tag.replace(OLD_URL.encode(), SOCIAL_URL.encode())
            if type_key.search(tag):
                tag = tag.replace(b"image/png", b"image/jpeg")
            return tag
        expected = meta.sub(replace, old)
        assert expected != old and expected == (ROOT / name).read_bytes(), f"Non-image HTML change: {name}"
    print("99/99 modified HTML pages byte-equivalent to baseline after only approved image-tag substitutions")

def check_browser():
    from playwright.sync_api import sync_playwright
    binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    assert binary, "No local Chromium/Chrome installed"
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
    origin = f"http://127.0.0.1:{server.server_port}"
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=binary, args=["--no-sandbox"])
            ctx = browser.new_context()
            ctx.route("**/*", lambda route: route.continue_() if route.request.url.startswith(origin + "/") else route.abort())
            page = ctx.new_page()
            response = ctx.request.get(origin + "/" + SOCIAL_PATH)
            assert response.status == 200 and response.headers["content-type"].split(";")[0] == "image/jpeg"
            assert validate_social_image(response.body()) == SOCIAL_SIZE
            for route in ("index.html", "divorce-recovery.html", "resources.html", "join.html",
                          "story-shame.html", "lesson-boundaries-are-actions.html", "flamewalker-plus.html"):
                res = page.goto(origin + "/" + route, wait_until="domcontentloaded")
                assert res and res.status == 200, route
                assert page.locator('meta[property="og:image"]').get_attribute("content") == SOCIAL_URL, route
                assert page.locator('meta[name="twitter:image"]').get_attribute("content") == SOCIAL_URL, route
                assert page.locator("h1").count() >= 1, route
                schemas = page.locator('script[type="application/ld+json"]').all_text_contents()
                assert all(OLD_PATH not in schema for schema in schemas), route
                if route == "story-shame.html":
                    assert any(SOCIAL_URL in schema for schema in schemas), "Article JSON-LD missing corrected image"
                print("Browser metadata OK:", route)
            dims = page.evaluate("""async url => {const img = new Image(); img.src = url;
                await img.decode(); return [img.naturalWidth, img.naturalHeight]}""", origin + "/" + SOCIAL_PATH)
            assert dims == list(SOCIAL_SIZE), dims
            failed = page.evaluate("""async url => {const img = new Image(); img.src = url;
                try { await img.decode(); return false; } catch { return true; }}""", origin + "/" + OLD_PATH)
            assert failed, "Legacy PNG unexpectedly decoded in Chromium"
            print("Browser: new JPEG fully decoded, 1200 x 630; original PNG rejected; local HTTP 200 image/jpeg")
            ctx.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("--browser", action="store_true")
    parser.add_argument("--compare-base")
    args = parser.parse_args()
    check_static()
    if args.compare_base:
        compare_base(args.compare_base)
    if args.browser:
        check_browser()
