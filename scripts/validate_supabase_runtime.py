#!/usr/bin/env python3
"""Smoke-test the live Supabase services used by Flamewalker Free.

Uses only the public browser configuration committed in js/nbjb-config.js.
No secret/service-role credential is needed or permitted.
"""

from __future__ import annotations

import json
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler, urlopen

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "js" / "nbjb-config.js"
EXPECTED_ORIGIN = "https://notbrokenjustburning.com"


def fail(message: str) -> int:
    print(f"Supabase runtime smoke test failed: {message}")
    return 1


def extract(pattern: str, text: str, label: str) -> str:
    match = re.search(pattern, text)
    if not match:
        raise ValueError(f"could not read {label} from js/nbjb-config.js")
    return match.group(1)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def get_json(url: str, publishable_key: str) -> tuple[int, dict, dict[str, str]]:
    request = Request(
        url,
        headers={
            "apikey": publishable_key,
            "Origin": EXPECTED_ORIGIN,
            "Accept": "application/json",
            "User-Agent": "NBJB-Flamewalker-Free-CI/1.0",
        },
        method="GET",
    )
    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw or "{}"), dict(response.headers.items())
    except HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{url} returned HTTP {exc.code}: {raw[:500]}") from exc
    except URLError as exc:
        raise RuntimeError(f"{url} could not be reached: {exc.reason}") from exc


def probe_redirect(url: str, publishable_key: str) -> tuple[int, str]:
    request = Request(
        url,
        headers={
            "apikey": publishable_key,
            "Accept": "application/json",
            "User-Agent": "NBJB-Flamewalker-Free-CI/1.0",
        },
        method="GET",
    )
    opener = build_opener(NoRedirect())
    try:
        response = opener.open(request, timeout=20)
        return response.status, response.headers.get("Location", "")
    except HTTPError as exc:
        if exc.code in (301, 302, 303, 307, 308):
            return exc.code, exc.headers.get("Location", "")
        raw = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{url} returned HTTP {exc.code}: {raw[:500]}") from exc
    except URLError as exc:
        raise RuntimeError(f"{url} could not be reached: {exc.reason}") from exc


def assert_redirect_origin(location: str, expected_origin: str, label: str) -> None:
    if not location:
        raise RuntimeError(f"{label} did not return a redirect Location header")
    parsed = urlsplit(location)
    actual_origin = f"{parsed.scheme}://{parsed.netloc}"
    if actual_origin != expected_origin:
        raise RuntimeError(f"{label} points to {actual_origin}, expected {expected_origin}")


def main() -> int:
    if not CONFIG.exists():
        return fail("js/nbjb-config.js is missing")

    text = CONFIG.read_text(encoding="utf-8")
    try:
        base_url = extract(r"supabaseUrl:\s*['\"]([^'\"]+)['\"]", text, "Supabase URL").rstrip("/")
        publishable_key = extract(
            r"supabasePublishableKey:\s*['\"]([^'\"]+)['\"]",
            text,
            "Supabase publishable key",
        )
    except ValueError as exc:
        return fail(str(exc))

    if not base_url.startswith("https://") or ".supabase.co" not in base_url:
        return fail(f"unexpected Supabase project URL: {base_url}")
    if not publishable_key.startswith("sb_publishable_"):
        return fail("browser config must use a modern sb_publishable_ key")
    if "service_role" in text or "sb_secret_" in text:
        return fail("server-side secret marker found in browser configuration")

    try:
        status, settings, headers = get_json(f"{base_url}/auth/v1/settings", publishable_key)
    except (RuntimeError, json.JSONDecodeError) as exc:
        return fail(str(exc))

    if status != 200:
        return fail(f"Auth settings endpoint returned HTTP {status}")

    external = settings.get("external") or {}
    if external.get("email") is not True:
        return fail("Supabase email authentication is not enabled")
    if settings.get("disable_signup") is True:
        return fail("Supabase signup is disabled")

    allow_origin = headers.get("Access-Control-Allow-Origin") or headers.get("access-control-allow-origin")
    if allow_origin not in (None, "*", EXPECTED_ORIGIN):
        return fail(f"unexpected Auth CORS origin response: {allow_origin}")

    # Use an intentionally invalid verification token. This creates or changes no user,
    # but Auth still resolves its configured error redirect. That lets CI verify both
    # the project's Site URL and the allowed production callback path.
    invalid_token = "nbjb-ci-intentionally-invalid-token"
    default_verify = f"{base_url}/auth/v1/verify?token={invalid_token}&type=signup"
    callback = f"{EXPECTED_ORIGIN}/member-auth.html"
    callback_verify = (
        f"{base_url}/auth/v1/verify?token={invalid_token}&type=signup"
        f"&redirect_to={quote(callback, safe='')}"
    )
    try:
        default_status, default_location = probe_redirect(default_verify, publishable_key)
        callback_status, callback_location = probe_redirect(callback_verify, publishable_key)
        if default_status not in (301, 302, 303, 307, 308):
            return fail(f"Site URL probe returned HTTP {default_status}, expected a redirect")
        if callback_status not in (301, 302, 303, 307, 308):
            return fail(f"callback allow-list probe returned HTTP {callback_status}, expected a redirect")
        assert_redirect_origin(default_location, EXPECTED_ORIGIN, "Supabase Site URL")
        if not callback_location.startswith(callback):
            return fail(
                "member-auth.html is not being honored as an Auth redirect; "
                f"received {callback_location}"
            )
    except RuntimeError as exc:
        return fail(str(exc))

    print("Supabase Auth endpoint: reachable")
    print("Supabase email auth: enabled")
    print("Supabase signup: enabled")
    print("Supabase Site URL: production origin confirmed")
    print("Supabase member-auth redirect: accepted")
    print("Browser key type: publishable")
    print("Secret browser credential check: passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
