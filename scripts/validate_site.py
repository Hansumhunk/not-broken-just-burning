#!/usr/bin/env python3
"""Validate NBJB's static HTML and launch-critical files.

Uses only the Python standard library so it can run locally or in GitHub Actions.
The validator checks structure and launch wiring, not the truth of editorial content.
"""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = sorted(ROOT.glob("*.html"))
MAIN_JS = ROOT / "js" / "main.js"
CNAME = ROOT / "CNAME"
ROBOTS = ROOT / "robots.txt"
SITEMAP = ROOT / "sitemap.xml"
SITE_ORIGIN = "https://notbrokenjustburning.com"
OLD_PAGES_ORIGIN = "https://hansumhunk.github.io/not-broken-just-burning"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[tuple[str, str]] = []
        self.ids: list[str] = []
        self.title_parts: list[str] = []
        self.in_title = False
        self.has_description = False
        self.has_main = False
        self.html_lang = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = {key: value or "" for key, value in attrs}
        if tag == "html":
            self.html_lang = data.get("lang", "").strip()
        if tag == "title":
            self.in_title = True
        if tag == "main":
            self.has_main = True
        if "id" in data and data["id"]:
            self.ids.append(data["id"])
        if tag == "meta" and data.get("name", "").lower() == "description" and data.get("content", "").strip():
            self.has_description = True
        if tag == "a" and data.get("href"):
            self.links.append(("href", data["href"]))
        if tag == "link" and data.get("href"):
            self.links.append(("href", data["href"]))
        if tag == "script" and data.get("src"):
            self.links.append(("src", data["src"]))
        if tag in {"img", "source"} and data.get("src"):
            self.links.append(("src", data["src"]))

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)


def is_external(reference: str) -> bool:
    lower = reference.lower().strip()
    return lower.startswith(("http://", "https://", "mailto:", "tel:", "sms:", "data:", "javascript:"))


def local_target(page: Path, reference: str) -> Path | None:
    if not reference or reference.startswith("#") or is_external(reference):
        return None
    split = urlsplit(reference)
    path = unquote(split.path)
    if not path:
        return None
    if path.startswith("/"):
        target = ROOT / path.lstrip("/")
    else:
        target = page.parent / path
    if path.endswith("/"):
        target = target / "index.html"
    return target.resolve()


def check_launch_files(errors: list[str]) -> None:
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

    if not SITEMAP.exists():
        errors.append("sitemap.xml: missing.")
    else:
        sitemap_text = SITEMAP.read_text(encoding="utf-8")
        if OLD_PAGES_ORIGIN in sitemap_text:
            errors.append("sitemap.xml: still references the temporary GitHub Pages URL.")
        if f"<loc>{SITE_ORIGIN}/</loc>" not in sitemap_text:
            errors.append("sitemap.xml: missing custom-domain homepage URL.")

        for page in HTML_FILES:
            if page.name == "404.html":
                continue
            expected = f"{SITE_ORIGIN}/" if page.name == "index.html" else f"{SITE_ORIGIN}/{page.name}"
            if f"<loc>{expected}</loc>" not in sitemap_text:
                errors.append(f"sitemap.xml: missing {page.name}.")


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    if not HTML_FILES:
        print("No HTML files found.")
        return 1

    main_js_text = MAIN_JS.read_text(encoding="utf-8") if MAIN_JS.exists() else ""
    shared_support = "support.html" in main_js_text
    shared_privacy = "privacy.html" in main_js_text
    shared_canonical = SITE_ORIGIN in main_js_text and 'rel = \'canonical\'' in main_js_text

    check_launch_files(errors)

    for page in HTML_FILES:
        parser = PageParser()
        text = page.read_text(encoding="utf-8")
        parser.feed(text)

        rel = page.relative_to(ROOT)
        title = "".join(parser.title_parts).strip()
        uses_main_js = 'src="js/main.js"' in text or "src='js/main.js'" in text

        if not parser.html_lang:
            errors.append(f"{rel}: missing <html lang=...>.")
        if not title:
            errors.append(f"{rel}: missing non-empty <title>.")
        if not parser.has_description:
            errors.append(f"{rel}: missing meta description.")
        if not parser.has_main:
            errors.append(f"{rel}: missing <main> landmark.")

        if page.name != "404.html":
            has_static_canonical = 'rel="canonical"' in text or "rel='canonical'" in text
            if not has_static_canonical and not (uses_main_js and shared_canonical):
                errors.append(f"{rel}: missing custom-domain canonical URL or shared fallback.")

        duplicate_ids = sorted({value for value in parser.ids if parser.ids.count(value) > 1})
        if duplicate_ids:
            errors.append(f"{rel}: duplicate id(s): {', '.join(duplicate_ids)}")

        # Safety/privacy can be present directly or injected by the shared engagement layer.
        if page.name != "404.html":
            if "support.html" not in text and not (uses_main_js and shared_support):
                errors.append(f"{rel}: missing route to support.html.")
            if "privacy.html" not in text and not (uses_main_js and shared_privacy):
                errors.append(f"{rel}: missing route to privacy.html.")

        for kind, reference in parser.links:
            target = local_target(page, reference)
            if target is None:
                continue
            try:
                target.relative_to(ROOT.resolve())
            except ValueError:
                errors.append(f"{rel}: {kind} escapes repository root: {reference}")
                continue
            if not target.exists():
                errors.append(f"{rel}: broken local {kind}: {reference}")

        if "target=\"_blank\"" in text and "rel=\"noopener noreferrer\"" not in text:
            warnings.append(f"{rel}: review external _blank links for rel=\"noopener noreferrer\".")

        if OLD_PAGES_ORIGIN in text:
            errors.append(f"{rel}: still references the temporary GitHub Pages URL.")

    print(f"Validated {len(HTML_FILES)} HTML pages plus launch-critical domain files.")
    for warning in warnings:
        print(f"WARNING: {warning}")
    if errors:
        print("\nValidation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
