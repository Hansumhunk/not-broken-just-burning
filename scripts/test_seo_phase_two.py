"""Branch-local SEO source checks. These are not Google rich-result or field tests."""
import json
import re
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://notbrokenjustburning.com"
HUBS = ("divorce-recovery.html", "masculine-restoration-placeholder-wound.html", "mens-mental-health.html", "mens-personal-development.html")

class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.ids, self.links, self.schemas, self.reveals = set(), [], {}, 0
        self.active = None
        self.buffer = ""
        self.canonical = None
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.add(a["id"])
        if "reveal" in a.get("class", "").split():
            self.reveals += 1
        if tag == "a" and a.get("href"):
            self.links.append(a["href"])
        if tag == "link" and a.get("rel") == "canonical":
            self.canonical = a.get("href")
        if tag == "script" and a.get("type") == "application/ld+json" and a.get("data-schema"):
            self.active, self.buffer = a["data-schema"], ""
    def handle_data(self, data):
        if self.active:
            self.buffer += data
    def handle_endtag(self, tag):
        if tag == "script" and self.active:
            if self.active in self.schemas:
                raise AssertionError(f"Duplicate schema {self.active}")
            self.schemas[self.active] = json.loads(self.buffer)
            self.active = None

def read(name):
    return Page((ROOT / name).read_text(encoding="utf-8"))

class SEO(unittest.TestCase):
    def test_public_hubs_visible_and_breadcrumbs(self):
        for name in HUBS:
            with self.subTest(page=name):
                page = read(name)
                self.assertEqual(page.canonical, ORIGIN + "/" + name)
                self.assertEqual(page.reveals, 0)
                schema = page.schemas["breadcrumbs"]
                self.assertEqual(schema["@type"], "BreadcrumbList")
                items = schema["itemListElement"]
                self.assertEqual([i["position"] for i in items], list(range(1, len(items)+1)))
                self.assertEqual(items[-1]["item"], page.canonical)
                for item in items[:-1]:
                    if item["item"] != ORIGIN + "/":
                        self.assertIn(urlsplit(item["item"]).path.lstrip("/"), page.links)
    def test_public_learning_resource_list_matches_actual_syllabus(self):
        page = read("flamewalker-plus.html")
        html = (ROOT / "flamewalker-plus.html").read_text()
        schema = page.schemas["learning-resource-list"]
        self.assertEqual(schema["@type"], "ItemList")
        items = schema["itemListElement"]
        self.assertEqual(len(items), 6)
        self.assertEqual([i["position"] for i in items], list(range(1,7)))
        for obj in items:
            course = obj["item"]
            self.assertEqual(course["@type"], "LearningResource")
            self.assertEqual(course["learningResourceType"], "Self-guided written learning track")
            self.assertFalse(course["isAccessibleForFree"])
            self.assertNotIn("offers", course)
            self.assertNotIn("aggregateRating", course)
            self.assertEqual(course["publisher"]["name"], "Not Broken Just Burning")
            part = urlsplit(course["url"])
            self.assertEqual(part.path, "/flamewalker-plus.html")
            self.assertIn(part.fragment, page.ids)
            self.assertIn(course["name"], html)
            self.assertLessEqual(len(course["description"]), 60)
    def test_sitemap_and_private_exclusions(self):
        root = ET.parse(ROOT / "sitemap.xml")
        urls = [x.text for x in root.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
        self.assertEqual(len(urls), len(set(urls)))
        for name in HUBS:
            self.assertIn(ORIGIN + "/" + name, urls)
        for url in urls:
            self.assertTrue(url.startswith(ORIGIN + "/"))
            self.assertFalse(re.search(r"/(?:members?[^/]*|join)\.html$", url))
        self.assertIn("Sitemap: " + ORIGIN + "/sitemap.xml", (ROOT / "robots.txt").read_text())
    def test_existing_shared_schema_contract(self):
        js = (ROOT / "js/main.js").read_text()
        for kind in ("Organization", "WebSite", "Article", "ProfilePage"):
            self.assertIn("'@type': '" + kind + "'", js)
        self.assertIn('script[data-schema=', js)
    def test_hub_has_all_eight_routes(self):
        page = read("mens-personal-development.html")
        routes = ("divorce-recovery.html", "masculine-restoration-placeholder-wound.html", "path-masculine-restoration-steadiness.html", "lesson-children-not-relationship-glue.html", "path-masculine-restoration.html", "lesson-boundaries-are-actions.html", "lesson-clarity-before-certainty.html", "mens-mental-health.html")
        for dest in routes + ("join.html", "flamewalker-plus.html", "resources.html", "support.html"):
            self.assertIn(dest, page.links)
        self.assertNotIn("flame-letter.html", page.links)
        self.assertNotIn("store.html", page.links)
    def test_published_guide_contextual_paths_and_sitemap(self):
        """Existing educational hubs must reach released guides, never draft pages."""
        expected = {
            "mens-personal-development.html": (
                "guide-dad-days-without-kids.html",
                "guide-rebuilding-friendships-after-divorce.html",
            ),
            "mens-mental-health.html": ("guide-working-through-divorce.html",),
        }
        urls = {
            node.text for node in ET.parse(ROOT / "sitemap.xml").findall(
                ".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc"
            )
        }
        for source, destinations in expected.items():
            page = read(source)
            for dest in destinations:
                with self.subTest(source=source, destination=dest):
                    self.assertEqual(page.links.count(dest), 1)
                    self.assertIn(ORIGIN + "/" + dest, urls)
                    target = read(dest)
                    self.assertEqual(target.canonical, ORIGIN + "/" + dest)
                    html = (ROOT / dest).read_text(encoding="utf-8")
                    self.assertNotRegex(
                        html, r'<meta[^>]+name=["\']robots["\'][^>]+noindex'
                    )

if __name__ == "__main__":
    unittest.main(verbosity=2)
