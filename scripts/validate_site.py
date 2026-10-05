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
    # Privacy-conscious analytics marker: traffic measurement must remain cookieless,
    # pageview-focused, and free of replay or interaction autocapture.
    analytics_markers = (
        "cookieless_mode: 'always'",
        "person_profiles: 'identified_only'",
        "autocapture: false",
        "capture_pageview: true",
        "disable_session_recording: true",
        "capture_exceptions: false",
        "navigator.globalPrivacyControl",
        "navigator.doNotTrack",
    )
    for marker in analytics_markers:
        if marker not in main_js_text:
            errors.append(f"js/main.js: privacy-conscious analytics marker missing: {marker}")

    privacy_notice = (ROOT / "privacy.html").read_text(encoding="utf-8") if (ROOT / "privacy.html").exists() else ""
    if "Minimal cookieless analytics" not in privacy_notice or "PostHog" not in privacy_notice:
        errors.append("privacy.html: analytics disclosure must describe the active cookieless PostHog setup.")

    shared_support = "support.html" in main_js_text
    shared_privacy = "privacy.html" in main_js_text
    shared_canonical = SITE_ORIGIN in main_js_text and "rel = 'canonical'" in main_js_text
    shared_founder = 'founder.html' in main_js_text
    shared_join = 'join.html' in main_js_text

    sitemap_set = check_launch_files(errors, warnings)

    # Production-target guard: Flamewalker Free is an approved production surface.
    # Keep the allowlist narrow so unfinished Phase Two / paid-billing artifacts cannot
    # silently ride along with a future merge.
    production_target = (
        os.getenv("GITHUB_REF_NAME", "") == "main"
        or os.getenv("GITHUB_BASE_REF", "") == "main"
    )
    if production_target:
        approved_member_artifacts = {
            "member-auth.html",
            "member-community.html",
            "member-library.html",
            "member-media.html",
            "member-onboarding.html",
            "member-path.html",
            "member-profile.html",
            "member-progress.html",
            "member-settings.html",
            "member-start-here.html",
            "member-store.html",
            "member-tools.html",
            "member-work.html",
            "members.html",
            "css/member-dashboard.css",
            "css/member-expansion.css",
            "css/members.css",
            "js/member-auth.js",
            "js/member-bootstrap.js",
            "js/member-dashboard.js",
            "js/member-entitlements.js",
            "js/member-history-insights.js",
            "js/member-platform.js",
            "js/member-service.js",
            "js/member-start-here.js",
            "js/nbjb-auth.js",
            "js/nbjb-config.js",
            "js/tool-member-history.js",
            "FLAMEWALKER_ACCESS.md",
            "supabase/migrations/20260918010500_phase_two_member_foundation.sql",
            "supabase/migrations/20260921205000_tighten_entitlement_table_acl.sql",
        }

        discovered_member_artifacts = set()
        discovered_member_artifacts.update(path.name for path in ROOT.glob("member*.html"))
        discovered_member_artifacts.update(
            str(path.relative_to(ROOT)) for path in (ROOT / "css").glob("member*.css")
        )
        discovered_member_artifacts.update(
            str(path.relative_to(ROOT)) for path in (ROOT / "js").glob("member*.js")
        )
        discovered_member_artifacts.update(
            str(path.relative_to(ROOT)) for path in (ROOT / "js").glob("tool-member*.js")
        )
        for path in ("js/nbjb-auth.js", "js/nbjb-config.js", "FLAMEWALKER_ACCESS.md"):
            if (ROOT / path).exists():
                discovered_member_artifacts.add(path)

        supabase_root = ROOT / "supabase"
        if supabase_root.exists():
            discovered_member_artifacts.update(
                str(path.relative_to(ROOT))
                for path in supabase_root.rglob("*")
                if path.is_file()
            )

        unexpected = sorted(discovered_member_artifacts - approved_member_artifacts)
        if unexpected:
            errors.append(
                "main production target contains unapproved member/backend artifacts: "
                + ", ".join(unexpected)
            )

        # Flamewalker+ remains roadmap-only in this release. Browser billing controls,
        # billing client code, and Stripe Edge Function source must not reach main yet.
        paid_only_paths = {
            "js/member-billing.js",
            "STRIPE_INTEGRATION.md",
            "supabase/config.toml",
            "supabase/functions/create-checkout-session/index.ts",
            "supabase/functions/create-customer-portal-session/index.ts",
            "supabase/functions/stripe-webhook/index.ts",
            "supabase/migrations/20260922034418_stripe_billing_authority.sql",
            "supabase/migrations/20260922040840_index_stripe_webhook_user_id.sql",
        }
        present_paid_only = sorted(path for path in paid_only_paths if (ROOT / path).exists())
        if present_paid_only:
            errors.append(
                "Flamewalker+ billing artifacts must remain off main for the Free launch: "
                + ", ".join(present_paid_only)
            )

        store_text = (ROOT / "member-store.html").read_text(encoding="utf-8") if (ROOT / "member-store.html").exists() else ""
        if "data-billing-offer" in store_text or "data-billing-portal" in store_text:
            errors.append("member-store.html: paid checkout controls must remain disabled for Flamewalker Free.")

        join_text = (ROOT / "join.html").read_text(encoding="utf-8") if (ROOT / "join.html").exists() else ""
        if "member-auth.html" not in join_text or "Create Free Flamewalker Account" not in join_text:
            errors.append("join.html: Flamewalker Free launch CTA must point to member-auth.html.")

        required_free_runtime = {
            "member-auth.html",
            "member-start-here.html",
            "members.html",
            "js/member-bootstrap.js",
            "js/member-entitlements.js",
            "js/member-start-here.js",
            "js/nbjb-auth.js",
            "js/nbjb-config.js",
        }
        missing_free_runtime = sorted(path for path in required_free_runtime if not (ROOT / path).exists())
        if missing_free_runtime:
            errors.append(
                "Flamewalker Free production runtime is incomplete: " + ", ".join(missing_free_runtime)
            )

        config_text = (ROOT / "js" / "nbjb-config.js").read_text(encoding="utf-8") if (ROOT / "js" / "nbjb-config.js").exists() else ""
        secret_markers = ("service_role", "sb_secret_")
        if any(marker in config_text for marker in secret_markers):
            errors.append("js/nbjb-config.js: server secret/service-role credential must never ship to the browser.")

        auth_text = (ROOT / "js" / "nbjb-auth.js").read_text(encoding="utf-8") if (ROOT / "js" / "nbjb-auth.js").exists() else ""
        if "member-auth.html" not in auth_text or "signUp" not in auth_text or "resetPasswordForEmail" not in auth_text:
            errors.append("js/nbjb-auth.js: signup/confirmation/recovery launch wiring is incomplete.")

        member_auth_text = (ROOT / "js" / "member-auth.js").read_text(encoding="utf-8") if (ROOT / "js" / "member-auth.js").exists() else ""
        if "authFlowType" not in member_auth_text or "member-onboarding.html" not in member_auth_text or "recovery" not in member_auth_text:
            errors.append("js/member-auth.js: signup/recovery fallback routing is incomplete.")

        if "access_token" not in main_js_text or "member-auth.html" not in main_js_text or "type=signup" not in main_js_text:
            errors.append("js/main.js: Supabase Site URL fallback bridge is incomplete.")

        if "Supabase" not in privacy_notice or "Flamewalker account data" not in privacy_notice:
            errors.append("privacy.html: live Flamewalker account data and Supabase must be disclosed.")

        books_text = (ROOT / "books-projects.html").read_text(encoding="utf-8") if (ROOT / "books-projects.html").exists() else ""
        if not books_text:
            errors.append("books-projects.html: public publishing roadmap is missing.")
        else:
            required_statuses = ("Editorial Review", "In Development", "Coming Soon")
            if not all(status in books_text for status in required_statuses):
                errors.append("books-projects.html: publishing roadmap must preserve honest project-status labels.")
            prohibited_sales_markers = ("Buy Now", "Preorder Now", "data-billing-offer")
            if any(marker in books_text for marker in prohibited_sales_markers):
                errors.append("books-projects.html: unfinished publishing roadmap must not expose live sales controls.")
            if "Riding the Roller Coaster While Shuffling the Deck" not in books_text or "The Wounded Boy" not in books_text:
                errors.append("books-projects.html: known active book projects are missing from the roadmap.")

        start_here_text = (ROOT / "member-start-here.html").read_text(encoding="utf-8") if (ROOT / "member-start-here.html").exists() else ""
        start_here_js = (ROOT / "js" / "member-start-here.js").read_text(encoding="utf-8") if (ROOT / "js" / "member-start-here.js").exists() else ""
        bootstrap_text = (ROOT / "js" / "member-bootstrap.js").read_text(encoding="utf-8") if (ROOT / "js" / "member-bootstrap.js").exists() else ""
        library_text = (ROOT / "member-library.html").read_text(encoding="utf-8") if (ROOT / "member-library.html").exists() else ""
        media_text = (ROOT / "member-media.html").read_text(encoding="utf-8") if (ROOT / "member-media.html").exists() else ""
        dashboard_text = (ROOT / "members.html").read_text(encoding="utf-8") if (ROOT / "members.html").exists() else ""
        dashboard_js = (ROOT / "js" / "member-dashboard.js").read_text(encoding="utf-8") if (ROOT / "js" / "member-dashboard.js").exists() else ""

        if 'data-member-page="start-here"' not in start_here_text or 'src="js/member-bootstrap.js"' not in start_here_text:
            errors.append("member-start-here.html: lesson must remain inside the authenticated member bootstrap.")
        if 'name="robots" content="noindex,nofollow"' not in start_here_text:
            errors.append("member-start-here.html: member lesson must remain noindex,nofollow.")
        if "Facts. Feelings. Control." not in start_here_text or "Private by default:" not in start_here_text:
            errors.append("member-start-here.html: core grounded reflection or privacy boundary is missing.")
        if '"start-here": ["js/member-start-here.js"]' not in bootstrap_text:
            errors.append("js/member-bootstrap.js: Start Here behavior must load after member authentication.")
        if "recordToolEntry('Start Here'" not in start_here_js or "nextAction" not in start_here_js:
            errors.append("js/member-start-here.js: local My Work save and Next Honest Action wiring are incomplete.")
        if 'href="member-start-here.html"' not in library_text or "Available now" not in library_text:
            errors.append("member-library.html: Start Here must be a live Free Library entry.")
        if 'href="member-start-here.html"' not in media_text:
            errors.append("member-media.html: Watch & Learn must route members to the written Start Here lesson.")
        if 'href="member-start-here.html"' not in dashboard_text or "member-start-here.html" not in dashboard_js:
            errors.append("Flamewalker dashboard: first-run and Learning surfaces must route to Start Here.")

        member_css_text = (ROOT / "css" / "members.css").read_text(encoding="utf-8") if (ROOT / "css" / "members.css").exists() else ""
        community_text = (ROOT / "member-community.html").read_text(encoding="utf-8") if (ROOT / "member-community.html").exists() else ""
        future_surface_text = "\n".join((library_text, media_text, community_text, member_css_text))

        if "top: 10px" not in member_css_text or "overflow-x: auto" not in member_css_text:
            errors.append("css/members.css: member navigation must remain top-pinned and horizontally usable on mobile.")
        if "member-page-head h1" not in member_css_text or "body[data-member-page] .member-panel h2" not in member_css_text:
            errors.append("css/members.css: member-only heading scale overrides are missing.")
        if "content: 'COMING SOON'" not in member_css_text:
            errors.append("css/members.css: future locked member cards must visibly say Coming Soon.")

        obsolete_placeholder_labels = (
            "Paid access placeholder",
            "Sealed until release",
            "FUTURE LOCKED CONTENT",
            "Track coming later",
        )
        if any(label in future_surface_text for label in obsolete_placeholder_labels):
            errors.append("Flamewalker future surfaces contain obsolete placeholder/broken-state wording.")

        for page_name, page_text in (
            ("member-library.html", library_text),
            ("member-media.html", media_text),
            ("member-community.html", community_text),
        ):
            if re.search(r'<button[^>]*data-placeholder(?![^>]*disabled)[^>]*>', page_text):
                errors.append(f"{page_name}: placeholder controls must remain disabled until the feature is real.")

        if "Purchased Programs" not in library_text or "Coming Soon · Product / event entitlement" not in library_text:
            errors.append("member-library.html: Purchased Programs must remain explicitly labeled Coming Soon.")

    required_runtime_seo = {
        "application/ld+json": "runtime JSON-LD injector",
        "ProfilePage": "Founder ProfilePage schema",
        "'@type': 'Article'": "Article schema",
        "'@type': 'BreadcrumbList'": "breadcrumb schema",
        "content-byline": "visible article authorship signal",
    }
    for token, label in required_runtime_seo.items():
        if token not in main_js_text:
            errors.append(f"js/main.js: missing {label}.")

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
