#!/usr/bin/env python3
"""Validate NBJB's static site, navigation, internal links, SEO, and launch wiring.

Uses only the Python standard library so it can run locally or in GitHub Actions.
The validator checks structure and technical consistency, not the truth of editorial content.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
import os
from urllib.parse import unquote, urlsplit
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = sorted(ROOT.glob("*.html"))
MAIN_JS = ROOT / "js" / "main.js"
CNAME = ROOT / "CNAME"
ROBOTS = ROOT / "robots.txt"
SITEMAP = ROOT / "sitemap.xml"
SOCIAL_IMAGE = ROOT / "assets" / "social-share.png"
SITE_ORIGIN = "https://notbrokenjustburning.com"
OLD_PAGES_ORIGIN = "https://hansumhunk.github.io/not-broken-just-burning"
CORE_NAV = {
    "path.html",
    "forge.html",
    "fire.html",
    "movement.html",
    "resources.html",
}
RUNTIME_NAV = {"founder.html", "join.html"}
SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


@dataclass
class LinkRef:
    tag: str
    attr: str
    reference: str
    target_blank: bool = False
    rel: str = ""


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[LinkRef] = []
        self.ids: list[str] = []
        self.title_parts: list[str] = []
        self.in_title = False
        self.has_description = False
        self.description = ""
        self.has_main = False
        self.html_lang = ""
        self.noindex = False
        self.h1_count = 0
        self.canonical_urls: list[str] = []
        self.og: dict[str, list[str]] = defaultdict(list)
        self.twitter_card = ""
        self.twitter_image = ""
        self.site_nav_links: list[str] = []
        self.in_site_nav = False
        self.images_missing_alt = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = {key: value or "" for key, value in attrs}
        classes = set(data.get("class", "").split())

        if tag == "html":
            self.html_lang = data.get("lang", "").strip()
        if tag == "title":
            self.in_title = True
        if tag == "main":
            self.has_main = True
        if tag == "h1":
            self.h1_count += 1
        if tag == "nav" and "site-nav" in classes:
            self.in_site_nav = True

        if "id" in data and data["id"]:
            self.ids.append(data["id"])

        if tag == "meta":
            name = data.get("name", "").lower().strip()
            prop = data.get("property", "").lower().strip()
            content = data.get("content", "").strip()
            if name == "description" and content:
                self.has_description = True
                self.description = content
            if name == "robots" and "noindex" in content.lower():
                self.noindex = True
            if name == "twitter:card" and content:
                self.twitter_card = content
            if name == "twitter:image" and content:
                self.twitter_image = content
            if prop.startswith("og:") and content:
                self.og[prop].append(content)

        if tag == "link" and data.get("href"):
            rel_tokens = set(data.get("rel", "").lower().split())
            if "canonical" in rel_tokens:
                self.canonical_urls.append(data["href"])

        if tag == "a" and data.get("href"):
            ref = data["href"]
            self.links.append(
                LinkRef(
                    tag="a",
                    attr="href",
                    reference=ref,
                    target_blank=data.get("target", "").lower() == "_blank",
                    rel=data.get("rel", "").lower(),
                )
            )
            if self.in_site_nav:
                self.site_nav_links.append(urlsplit(ref).path)

        if tag == "link" and data.get("href"):
            self.links.append(LinkRef(tag="link", attr="href", reference=data["href"]))
        if tag == "script" and data.get("src"):
            self.links.append(LinkRef(tag="script", attr="src", reference=data["src"]))
        if tag in {"img", "source"} and data.get("src"):
            self.links.append(LinkRef(tag=tag, attr="src", reference=data["src"]))
        if tag == "img" and "alt" not in data:
            self.images_missing_alt += 1

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False
        if tag == "nav" and self.in_site_nav:
            self.in_site_nav = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)


def is_external(reference: str) -> bool:
    lower = reference.lower().strip()
    return lower.startswith(
        ("http://", "https://", "mailto:", "tel:", "sms:", "data:", "javascript:")
    )


def local_target(page: Path, reference: str) -> Path | None:
    if not reference or is_external(reference):
        return None
    split = urlsplit(reference)
    path = unquote(split.path)
    if not path:
        return page.resolve() if split.fragment else None
    if path.startswith("/"):
        target = ROOT / path.lstrip("/")
    else:
        target = page.parent / path
    if path.endswith("/"):
        target = target / "index.html"
    return target.resolve()


def expected_page_url(page: Path) -> str:
    return SITE_ORIGIN + ("/" if page.name == "index.html" else f"/{page.name}")


PAGE_CACHE: dict[Path, PageParser] = {}


def parse_page(page: Path) -> PageParser:
    resolved = page.resolve()
    if resolved not in PAGE_CACHE:
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))
        PAGE_CACHE[resolved] = parser
    return PAGE_CACHE[resolved]


def sitemap_urls(errors: list[str]) -> list[str]:
    if not SITEMAP.exists():
        errors.append("sitemap.xml: missing.")
        return []
    try:
        root = ET.parse(SITEMAP).getroot()
    except ET.ParseError as exc:
        errors.append(f"sitemap.xml: invalid XML: {exc}")
        return []

    urls = [
        (node.text or "").strip()
        for node in root.findall(".//sm:loc", SITEMAP_NS)
        if (node.text or "").strip()
    ]
    duplicates = sorted(url for url, count in Counter(urls).items() if count > 1)
    if duplicates:
        errors.append(f"sitemap.xml: duplicate URL(s): {', '.join(duplicates)}")
    return urls


def check_launch_files(errors: list[str], warnings: list[str]) -> set[str]:
    if not CNAME.exists():
        errors.append("CNAME: missing custom-domain file.")
    elif CNAME.read_text(encoding="utf-8").strip() != "notbrokenjustburning.com":
        errors.append("CNAME: must contain exactly notbrokenjustburning.com.")

    if not ROBOTS.exists():
        errors.append("robots.txt: missing.")
    else:
        robots_text = ROBOTS.read_text(encoding="utf-8")
        if f"Sitemap: {SITE_ORIGIN}/sitemap.xml" not in robots_text:
            errors.append("robots.txt: sitemap must use the custom domain.")
        if OLD_PAGES_ORIGIN in robots_text:
            errors.append("robots.txt: still references the temporary GitHub Pages URL.")

    urls = sitemap_urls(errors)
    url_set = set(urls)

    if urls:
        if OLD_PAGES_ORIGIN in SITEMAP.read_text(encoding="utf-8"):
            errors.append("sitemap.xml: still references the temporary GitHub Pages URL.")
        if f"{SITE_ORIGIN}/" not in url_set:
            errors.append("sitemap.xml: missing custom-domain homepage URL.")

        for page in HTML_FILES:
            parser = parse_page(page)
            expected = expected_page_url(page)
            if page.name == "404.html" or parser.noindex:
                if expected in url_set:
                    errors.append(f"sitemap.xml: {page.name} is noindex/special and should not be listed.")
                continue
            if expected not in url_set:
                errors.append(f"sitemap.xml: missing {page.name}.")

    if not SOCIAL_IMAGE.exists():
        warnings.append("assets/social-share.png: missing raster social-sharing image.")

    return url_set


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    if not HTML_FILES:
        print("No HTML files found.")
        return 1

    main_js_text = MAIN_JS.read_text(encoding="utf-8") if MAIN_JS.exists() else ""
    shared_support = "support.html" in main_js_text
    shared_privacy = "privacy.html" in main_js_text
    shared_canonical = SITE_ORIGIN in main_js_text and "rel = 'canonical'" in main_js_text
    shared_founder = 'founder.html' in main_js_text
    shared_join = 'join.html' in main_js_text

    sitemap_set = check_launch_files(errors, warnings)

    # Production-target guard: Phase Two/member workspace files may exist on development,
    # but must never be merged into the public static site on main.
    production_target = (
        os.getenv("GITHUB_REF_NAME", "") == "main"
        or os.getenv("GITHUB_BASE_REF", "") == "main"
    )
    if production_target:
        prohibited = []
        prohibited.extend(path.name for path in ROOT.glob("member*.html"))
        prohibited.extend(str(path.relative_to(ROOT)) for path in (ROOT / "css").glob("member*.css"))
        prohibited.extend(str(path.relative_to(ROOT)) for path in (ROOT / "js").glob("member*.js"))
        prohibited.extend(str(path.relative_to(ROOT)) for path in (ROOT / "js").glob("tool-member*.js"))

        known_phase_two_only = {
            "ACCESS_MODEL.md",
            "MEMBERS.md",
            "MASCULINE_RESTORATION.md",
            "YOUTUBE.md",
            "path-masculine-restoration-steadiness.html",
            "css/masculine-restoration.css",
            "js/masculine-restoration.js",
        }
        prohibited.extend(
            path for path in sorted(known_phase_two_only)
            if (ROOT / path).exists()
        )

        if prohibited:
            errors.append(
                "main production target contains Phase Two/member workspace artifacts: "
                + ", ".join(sorted(set(prohibited)))
            )

    # Regression guard for the long-form reveal bug: tall reveal containers must be
    # eligible as soon as any part intersects, with a no-observer/reduced-motion fallback.
    if "threshold: 0" not in main_js_text:
        errors.append("js/main.js: reveal observer must use threshold: 0 for long-form content.")
    if "prefersReducedMotion || !('IntersectionObserver' in window)" not in main_js_text:
        errors.append("js/main.js: reveal logic is missing its reduced-motion/no-observer fallback.")

    titles: dict[str, list[str]] = defaultdict(list)
    descriptions: dict[str, list[str]] = defaultdict(list)
    incoming: Counter[str] = Counter()
    public_pages: set[str] = set()

    for page in HTML_FILES:
        parser = parse_page(page)
        text = page.read_text(encoding="utf-8")
        rel = page.relative_to(ROOT)
        title = "".join(parser.title_parts).strip()
        uses_main_js = 'src="js/main.js"' in text or "src='js/main.js'" in text
        expected_url = expected_page_url(page)

        if not parser.noindex and page.name != "404.html":
            public_pages.add(page.name)

        if not parser.html_lang:
            errors.append(f"{rel}: missing <html lang=...>.")
        if not title:
            errors.append(f"{rel}: missing non-empty <title>.")
        else:
            titles[title].append(page.name)
            if len(title) < 20:
                warnings.append(f"{rel}: title is unusually short ({len(title)} chars).")
            elif len(title) > 72:
                warnings.append(f"{rel}: title is long for search/social display ({len(title)} chars).")

        if not parser.has_description:
            errors.append(f"{rel}: missing meta description.")
        else:
            descriptions[parser.description].append(page.name)
            if len(parser.description) < 70:
                warnings.append(f"{rel}: meta description is short ({len(parser.description)} chars).")
            elif len(parser.description) > 180:
                warnings.append(f"{rel}: meta description is long ({len(parser.description)} chars).")

        if not parser.has_main:
            errors.append(f"{rel}: missing <main> landmark.")
        if parser.h1_count == 0 and page.name != "404.html":
            errors.append(f"{rel}: missing <h1>.")
        elif parser.h1_count > 1:
            warnings.append(f"{rel}: contains {parser.h1_count} <h1> elements; review heading hierarchy.")
        if parser.images_missing_alt:
            errors.append(f"{rel}: {parser.images_missing_alt} image(s) missing alt attributes.")

        if page.name != "404.html":
            if not parser.noindex:
                if len(parser.canonical_urls) != 1:
                    errors.append(f"{rel}: public page must have exactly one static canonical URL.")
                elif parser.canonical_urls[0] != expected_url:
                    errors.append(
                        f"{rel}: canonical must be {expected_url}, found {parser.canonical_urls[0]}."
                    )

                og_titles = parser.og.get("og:title", [])
                og_descriptions = parser.og.get("og:description", [])
                og_urls = parser.og.get("og:url", [])
                if len(og_titles) != 1:
                    errors.append(f"{rel}: public page must have exactly one static og:title.")
                if len(og_descriptions) != 1:
                    errors.append(f"{rel}: public page must have exactly one static og:description.")
                if len(og_urls) != 1:
                    errors.append(f"{rel}: public page must have exactly one static og:url.")
                elif og_urls[0] != expected_url:
                    errors.append(f"{rel}: og:url must be {expected_url}, found {og_urls[0]}.")

                expected_social = f"{SITE_ORIGIN}/assets/social-share.png"
                og_images = parser.og.get("og:image", [])
                if not og_images:
                    errors.append(f"{rel}: missing static og:image on public page.")
                elif og_images[0] != expected_social:
                    errors.append(f"{rel}: og:image must use {expected_social}, found {og_images[0]}.")
                if parser.twitter_card != "summary_large_image":
                    errors.append(f"{rel}: public page must use twitter:card=summary_large_image.")
                if parser.twitter_image != expected_social:
                    errors.append(f"{rel}: twitter:image must use {expected_social}.")

        duplicate_ids = sorted({value for value in parser.ids if parser.ids.count(value) > 1})
        if duplicate_ids:
            errors.append(f"{rel}: duplicate id(s): {', '.join(duplicate_ids)}")

        if page.name != "404.html":
            if "support.html" not in text and not (uses_main_js and shared_support):
                errors.append(f"{rel}: missing route to support.html.")
            if "privacy.html" not in text and not (uses_main_js and shared_privacy):
                errors.append(f"{rel}: missing route to privacy.html.")

            nav_links = {Path(link).name for link in parser.site_nav_links if link}
            missing_core = sorted(CORE_NAV - nav_links)
            if missing_core:
                errors.append(f"{rel}: primary navigation missing: {', '.join(missing_core)}")
            if "founder.html" not in nav_links and not (uses_main_js and shared_founder):
                errors.append(f"{rel}: primary navigation missing Founder route.")
            if "join.html" not in nav_links and not (uses_main_js and shared_join):
                errors.append(f"{rel}: primary navigation missing Join route.")

        for link in parser.links:
            reference = link.reference.strip()
            if link.target_blank and not {"noopener", "noreferrer"}.issubset(set(link.rel.split())):
                warnings.append(
                    f"{rel}: external/new-tab link should use rel=\"noopener noreferrer\": {reference}"
                )
            if reference.lower().startswith("http://") and not reference.startswith("http://localhost"):
                warnings.append(f"{rel}: non-HTTPS external reference: {reference}")

            target = local_target(page, reference)
            if target is None:
                continue
            try:
                target.relative_to(ROOT.resolve())
            except ValueError:
                errors.append(f"{rel}: {link.attr} escapes repository root: {reference}")
                continue
            if not target.exists():
                errors.append(f"{rel}: broken local {link.attr}: {reference}")
                continue

            split = urlsplit(reference)
            if split.fragment and target.suffix.lower() == ".html":
                target_parser = parse_page(target)
                if split.fragment not in target_parser.ids:
                    errors.append(f"{rel}: broken fragment #{split.fragment} in {reference}")

            if (
                link.tag == "a"
                and target.suffix.lower() == ".html"
                and target.name != page.name
                and target.exists()
            ):
                incoming[target.name] += 1

        if OLD_PAGES_ORIGIN in text:
            errors.append(f"{rel}: still references the temporary GitHub Pages URL.")

    for title, pages in titles.items():
        if len(pages) > 1:
            warnings.append(f"Duplicate title across {', '.join(sorted(pages))}: {title}")
    for description, pages in descriptions.items():
        if len(pages) > 1:
            warnings.append(
                f"Duplicate meta description across {', '.join(sorted(pages))}: {description[:80]}..."
            )

    for page_name in sorted(public_pages):
        if page_name == "index.html":
            continue
        if incoming[page_name] == 0:
            warnings.append(f"{page_name}: no incoming internal HTML links detected (possible orphan page).")

    print(
        f"Validated {len(HTML_FILES)} HTML pages, navigation, fragments, internal-link graph, SEO metadata, and launch-critical files."
    )
    for warning in sorted(set(warnings)):
        print(f"WARNING: {warning}")
    if errors:
        print("\nValidation failed:")
        for error in sorted(set(errors)):
            print(f"- {error}")
        return 1

    print("Validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
