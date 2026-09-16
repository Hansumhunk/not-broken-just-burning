#!/usr/bin/env python3
"""Validate NBJB's static HTML, internal navigation, SEO wiring, and launch-critical files.

Uses only the Python standard library so it can run locally or in GitHub Actions.
The validator checks structure and wiring, not the truth of editorial content.
"""
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re
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
        self.links=[]; self.ids=[]; self.title_parts=[]; self.in_title=False
        self.has_description=False; self.has_main=False; self.html_lang=""; self.noindex=False
        self.h1_count=0; self.images_missing_alt=[]; self.meta={}; self.canonical=""
    def handle_starttag(self, tag, attrs):
        data={k:(v or "") for k,v in attrs}
        if tag=="html": self.html_lang=data.get("lang","").strip()
        if tag=="title": self.in_title=True
        if tag=="main": self.has_main=True
        if tag=="h1": self.h1_count += 1
        if "id" in data and data["id"]: self.ids.append(data["id"])
        if tag=="meta":
            key=(data.get("name") or data.get("property") or "").lower().strip()
            content=data.get("content","").strip()
            if key: self.meta[key]=content
            if key=="description" and content: self.has_description=True
            if key=="robots" and "noindex" in content.lower(): self.noindex=True
        if tag=="a" and data.get("href"): self.links.append(("href",data["href"]))
        if tag=="link" and data.get("href"):
            self.links.append(("href",data["href"]))
            if "canonical" in data.get("rel","").lower(): self.canonical=data["href"]
        if tag=="script" and data.get("src"): self.links.append(("src",data["src"]))
        if tag in {"img","source"} and data.get("src"):
            self.links.append(("src",data["src"]))
            if tag=="img" and "alt" not in data: self.images_missing_alt.append(data["src"])
    def handle_endtag(self, tag):
        if tag=="title": self.in_title=False
    def handle_data(self,data):
        if self.in_title: self.title_parts.append(data)

def is_external(ref):
    return ref.lower().strip().startswith(("http://","https://","mailto:","tel:","sms:","data:","javascript:"))

def local_target(page, ref):
    if not ref or ref.startswith("#") or is_external(ref): return None
    path=unquote(urlsplit(ref).path)
    if not path: return None
    target=(ROOT/path.lstrip("/")) if path.startswith("/") else (page.parent/path)
    if path.endswith("/"): target=target/"index.html"
    return target.resolve()

def parse_page(page):
    p=PageParser(); p.feed(page.read_text(encoding="utf-8")); return p

def check_launch_files(errors):
    if not CNAME.exists(): errors.append("CNAME: missing custom-domain file.")
    elif CNAME.read_text(encoding="utf-8").strip()!="notbrokenjustburning.com": errors.append("CNAME: must contain exactly notbrokenjustburning.com.")
    if not ROBOTS.exists(): errors.append("robots.txt: missing.")
    else:
        text=ROBOTS.read_text(encoding="utf-8")
        if f"Sitemap: {SITE_ORIGIN}/sitemap.xml" not in text: errors.append("robots.txt: sitemap must use the custom domain.")
        if OLD_PAGES_ORIGIN in text: errors.append("robots.txt: still references temporary Pages URL.")
    if not SITEMAP.exists(): errors.append("sitemap.xml: missing."); return
    text=SITEMAP.read_text(encoding="utf-8")
    if OLD_PAGES_ORIGIN in text: errors.append("sitemap.xml: still references temporary Pages URL.")
    locs=re.findall(r"<loc>(.*?)</loc>",text)
    dupes=sorted({x for x in locs if locs.count(x)>1})
    if dupes: errors.append("sitemap.xml: duplicate URL(s): "+", ".join(dupes))
    if f"{SITE_ORIGIN}/" not in locs: errors.append("sitemap.xml: missing custom-domain homepage URL.")
    for page in HTML_FILES:
        p=parse_page(page)
        if page.name=="404.html" or p.noindex: continue
        expected=f"{SITE_ORIGIN}/" if page.name=="index.html" else f"{SITE_ORIGIN}/{page.name}"
        if expected not in locs: errors.append(f"sitemap.xml: missing {page.name}.")

def main():
    errors=[]; warnings=[]
    if not HTML_FILES: print("No HTML files found."); return 1
    parsed={p:parse_page(p) for p in HTML_FILES}
    main_js=MAIN_JS.read_text(encoding="utf-8") if MAIN_JS.exists() else ""
    shared_support="support.html" in main_js; shared_privacy="privacy.html" in main_js
    shared_canonical=SITE_ORIGIN in main_js and "canonical" in main_js
    check_launch_files(errors)
    for page,p in parsed.items():
        rel=page.relative_to(ROOT); text=page.read_text(encoding="utf-8"); title="".join(p.title_parts).strip()
        uses_main_js='src="js/main.js"' in text or "src='js/main.js'" in text
        if not p.html_lang: errors.append(f"{rel}: missing <html lang>.")
        if not title: errors.append(f"{rel}: missing non-empty <title>.")
        if not p.has_description: errors.append(f"{rel}: missing meta description.")
        if not p.has_main: errors.append(f"{rel}: missing <main> landmark.")
        if page.name!="404.html" and p.h1_count!=1: warnings.append(f"{rel}: expected one H1; found {p.h1_count}.")
        if p.images_missing_alt: errors.append(f"{rel}: image(s) missing alt attribute: {', '.join(p.images_missing_alt)}")
        if page.name!="404.html":
            if not p.canonical and not (uses_main_js and shared_canonical): errors.append(f"{rel}: missing custom-domain canonical URL or shared fallback.")
            if p.canonical and not p.canonical.startswith(SITE_ORIGIN): errors.append(f"{rel}: canonical is not on custom domain: {p.canonical}")
            for key in ("og:title","og:description","og:url"):
                if not p.meta.get(key): warnings.append(f"{rel}: missing {key} metadata.")
            if p.meta.get("og:url") and not p.meta["og:url"].startswith(SITE_ORIGIN): errors.append(f"{rel}: og:url is not on custom domain.")
        dupes=sorted({x for x in p.ids if p.ids.count(x)>1})
        if dupes: errors.append(f"{rel}: duplicate id(s): {', '.join(dupes)}")
        if page.name!="404.html":
            if "support.html" not in text and not (uses_main_js and shared_support): errors.append(f"{rel}: missing route to support.html.")
            if "privacy.html" not in text and not (uses_main_js and shared_privacy): errors.append(f"{rel}: missing route to privacy.html.")
        for kind,ref in p.links:
            target=local_target(page,ref)
            if target is not None:
                try: target.relative_to(ROOT.resolve())
                except ValueError: errors.append(f"{rel}: {kind} escapes repository root: {ref}"); continue
                if not target.exists(): errors.append(f"{rel}: broken local {kind}: {ref}"); continue
            split=urlsplit(ref)
            if kind=="href" and split.fragment and not is_external(ref):
                target_page=page if not split.path else local_target(page,ref)
                if target_page and target_page.suffix==".html" and target_page.exists():
                    target_parser=parsed.get(target_page,parse_page(target_page))
                    if unquote(split.fragment) not in target_parser.ids: errors.append(f"{rel}: broken anchor: {ref}")
        if 'target="_blank"' in text and 'rel="noopener noreferrer"' not in text: warnings.append(f"{rel}: review external _blank links for rel=\"noopener noreferrer\".")
        if OLD_PAGES_ORIGIN in text: errors.append(f"{rel}: still references temporary GitHub Pages URL.")
    print(f"Validated {len(HTML_FILES)} HTML pages plus internal anchors, SEO metadata, sitemap, and launch wiring.")
    for w in warnings: print(f"WARNING: {w}")
    if errors:
        print("\nValidation failed:")
        for e in errors: print(f"- {e}")
        return 1
    print("Validation passed."); return 0
if __name__=="__main__": sys.exit(main())
