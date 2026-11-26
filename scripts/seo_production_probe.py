"""Read-only public production delivery checks. A failed or unverified check exits nonzero."""
import argparse
from html.parser import HTMLParser
import urllib.request
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET
import unittest
from social_share_image import SOCIAL_PATH, SOCIAL_URL, validate_social_image

ORIGIN = "https://notbrokenjustburning.com"
LIMIT = 1024 * 1024
HUBS = ("divorce-recovery.html", "masculine-restoration-placeholder-wound.html",
        "mens-mental-health.html", "mens-personal-development.html", "lessons.html")
GUIDES = ("guide-dad-days-without-kids.html", "guide-working-through-divorce.html",
          "guide-rebuilding-friendships-after-divorce.html")
FREE_ENTRY_ROUTES = ("first-seven-days.html", "before-you-send.html")
PUBLIC_ROUTES = HUBS + GUIDES + FREE_ENTRY_ROUTES
TARGETS = [("http://notbrokenjustburning.com/", ORIGIN + "/", "html"),
           ("https://www.notbrokenjustburning.com/", ORIGIN + "/", "html")]
TARGETS += [(ORIGIN + "/" + path, ORIGIN + "/" + path, kind) for path, kind in
            [("", "html"), ("robots.txt", "robots"), ("sitemap.xml", "xml"),
             ("css/style.css", "css"), ("js/main.js", "js"),
             (SOCIAL_PATH, "jpeg")] + [(p, "html") for p in PUBLIC_ROUTES]]


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.canonicals, self.robots, self.descriptions = [], [], []
        self.titles, self.h1 = [], 0
        self.og_images, self.twitter_images = [], []
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "link" and "canonical" in (a.get("rel") or "").lower().split():
            self.canonicals.append(a.get("href"))
        if tag == "meta":
            name = (a.get("name") or "").lower()
            content = a.get("content") or ""
            if name in ("robots", "googlebot", "bingbot"):
                self.robots.append(content)
            if name == "description":
                self.descriptions.append(content)
            if (a.get("property") or "").lower() == "og:image":
                self.og_images.append(content)
            if name == "twitter:image":
                self.twitter_images.append(content)
        if tag == "title":
            self.titles.append("")
            self.in_title = True
        if tag == "h1":
            self.h1 += 1

    def handle_data(self, data):
        if self.in_title:
            self.titles[-1] += data

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False


def sitemap_urls(data):
    root = ET.fromstring(data)
    ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    if root.tag != ns + "urlset":
        raise ValueError("Expected sitemap urlset")
    return [n.text or "" for n in root.findall(ns + "url/" + ns + "loc")]


def validate(data, kind, expected, status, final, content_type, xrobots=""):
    errors = []
    if status != 200:
        errors.append("non-200 HTTP response")
    if final != expected:
        errors.append("unexpected final URL: " + final)
    if not data or len(data) > LIMIT:
        return errors + ["empty or oversized response"]
    mime = content_type.split(";")[0].strip().lower()
    types = {"html": {"text/html"}, "robots": {"text/plain"},
             "xml": {"application/xml", "text/xml"}, "css": {"text/css"},
             "js": {"application/javascript", "text/javascript", "application/x-javascript"},
             "jpeg": {"image/jpeg"}}
    if mime not in types[kind]:
        errors.append("unexpected content-type: " + mime)
    if kind == "html":
        p = Metadata()
        p.feed(data.decode("utf-8", errors="replace"))
        p.close()
        if p.canonicals != [expected]:
            errors.append("expected exactly one matching rel=canonical")
        if len(p.titles) != 1 or not p.titles[0].strip():
            errors.append("expected exactly one nonempty title")
        if len(p.descriptions) != 1 or not p.descriptions[0].strip():
            errors.append("expected exactly one nonempty description")
        if p.h1 != 1:
            errors.append("expected exactly one H1")
        if p.og_images != [SOCIAL_URL] or p.twitter_images != [SOCIAL_URL]:
            errors.append("expected exact current Open Graph and Twitter shared image URLs")
        directives = ",".join(p.robots + [xrobots]).lower()
        import re
        if re.search(r"\b(noindex|none)\b", directives):
            errors.append("public page has a noindex/none directive")
    elif kind == "robots":
        lines = [x.split("#", 1)[0].strip() for x in data.decode("utf-8").splitlines()]
        if "Sitemap: " + ORIGIN + "/sitemap.xml" not in lines:
            errors.append("missing expected sitemap directive")
        if any(x.lower().replace(" ", "") == "disallow:/" for x in lines):
            errors.append("root Disallow directive requires review")
    elif kind == "xml":
        urls = sitemap_urls(data)
        if not urls or len(urls) != len(set(urls)):
            errors.append("empty sitemap or duplicate URLs")
        for url in urls:
            parts = urlsplit(url)
            if not url.startswith(ORIGIN + "/") or parts.query or parts.fragment:
                errors.append("noncanonical sitemap URL: " + url)
            path = parts.path.lower()
            if path.startswith("/member-") or path in ("/join.html", "/account.html", "/members.html"):
                errors.append("private/account route in public sitemap: " + path)
        for p in ("", *PUBLIC_ROUTES):
            if ORIGIN + "/" + p not in urls:
                errors.append("missing expected public route: /" + p)
        print(f"Sitemap: {len(urls)} URLs; {len(set(urls))} unique")
    elif kind == "jpeg":
        try:
            validate_social_image(data)
        except Exception as exc:
            errors.append(f"invalid social JPEG: {type(exc).__name__}: {exc}")
    return errors


def probe():
    failures = 0
    for url, expected, kind in TARGETS:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "NBJB-SEO-Release-Check/1.1",
                                                        "Accept-Encoding": "identity"})
            with urllib.request.urlopen(req, timeout=10) as res:
                data = res.read(LIMIT + 1)
                h = res.headers
                errors = validate(data, kind, expected, res.status, res.url,
                                  h.get("Content-Type", ""), h.get("X-Robots-Tag", ""))
                print(f"{url} | {res.status} | final={res.url} | cache={h.get('Cache-Control', 'not supplied')}")
                if errors:
                    failures += 1
                    print("FAIL: " + "; ".join(errors))
                else:
                    print("PASS")
        except Exception as exc:
            failures += 1
            print(f"{url} | UNVERIFIED/FAILED | {type(exc).__name__}: {str(exc)[:180]}")
    print(f"{len(TARGETS) - failures}/{len(TARGETS)} public delivery checks passed. No indexing or field-performance claims.")
    return int(failures > 0)


class ProbeTests(unittest.TestCase):
    url = ORIGIN + "/"
    good = f'<title>Test</title><meta name="description" content="Test"><link href="{url}" rel="canonical"><h1>Test</h1><meta property="og:image" content="{SOCIAL_URL}"><meta name="twitter:image" content="{SOCIAL_URL}">'

    def check(self, html, final=None, mime="text/html", robots=""):
        return validate(html.encode(), "html", self.url, 200, final or self.url, mime, robots)

    def test_valid(self):
        self.assertEqual([], self.check(self.good))

    def test_wrong_canonical_even_with_correct_other_href(self):
        self.assertTrue(self.check(self.good.replace('href=', 'data-href=') + f'<a href="{self.url}">Home</a>'))

    def test_duplicate_canonical(self):
        self.assertTrue(self.check(self.good + f'<link rel="canonical" href="{self.url}">'))

    def test_public_noindex(self):
        self.assertTrue(self.check(self.good + '<meta name="googlebot" content="noindex">'))
        self.assertTrue(self.check(self.good, robots="googlebot: noindex"))

    def test_wrong_redirect_or_mime(self):
        self.assertTrue(self.check(self.good, final=ORIGIN + "/join.html"))
        self.assertTrue(self.check(self.good, mime="text/plain"))

    def test_missing_heading(self):
        self.assertTrue(self.check(self.good.replace("<h1>Test</h1>", "")))

    def test_published_free_entry_routes_are_checked(self):
        """Keep new public free entrances in delivery checks, not member-only routes."""
        checked = {url for url, _, kind in TARGETS if kind == "html"}
        for page in FREE_ENTRY_ROUTES:
            with self.subTest(route=page):
                self.assertIn(ORIGIN + "/" + page, checked)

    def test_sitemap_private_duplicate(self):
        base = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        urls = [ORIGIN + "/" + p for p in ("", *PUBLIC_ROUTES)]
        xml = lambda us: (base + "".join(f"<url><loc>{u}</loc></url>" for u in us) + "</urlset>").encode()
        validate_xml = lambda us: validate(xml(us), "xml", ORIGIN + "/sitemap.xml", 200, ORIGIN + "/sitemap.xml", "application/xml")
        self.assertEqual([], validate_xml(urls))
        self.assertTrue(validate_xml(urls + [urls[0]]))
        for private in ("/member-premium-lesson.html", "/members.html", "/join.html", "/account.html"):
            with self.subTest(private=private):
                errors = validate_xml(urls + [ORIGIN + private])
                self.assertIn("private/account route in public sitemap: " + private, errors)

    def test_new_public_guides_are_probed(self):
        probed = {url for url, expected, kind in TARGETS if kind == "html" and url == expected}
        for guide in GUIDES:
            with self.subTest(guide=guide):
                self.assertIn(ORIGIN + "/" + guide, probed)

    def test_robots_missing_sitemap(self):
        self.assertTrue(validate(b"User-agent: *\nDisallow: /", "robots", ORIGIN + "/robots.txt", 200, ORIGIN + "/robots.txt", "text/plain"))

    def test_wrong_social_meta(self):
        self.assertTrue(self.check(self.good.replace(SOCIAL_URL, ORIGIN + "/wrong.jpg")))
    def test_social_asset_full_decode(self):
        from pathlib import Path
        data = (Path(__file__).resolve().parents[1] / SOCIAL_PATH).read_bytes()
        self.assertEqual([], validate(data, "jpeg", SOCIAL_URL, 200, SOCIAL_URL, "image/jpeg"))
        for malformed, mime in ((data[:len(data)//2], "image/jpeg"),
                                (data, "image/png"), (b"not an image", "image/jpeg")):
            self.assertTrue(validate(malformed, "jpeg", SOCIAL_URL, 200, SOCIAL_URL, mime))

    def test_network_failure_exits_nonzero(self):
        from unittest.mock import patch
        with patch("urllib.request.urlopen", side_effect=OSError("fictional offline")):
            self.assertEqual(1, probe())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        unittest.main(argv=[__file__])
    else:
        raise SystemExit(probe())
