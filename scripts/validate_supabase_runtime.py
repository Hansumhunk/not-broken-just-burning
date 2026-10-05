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
from urllib.request import Request, urlopen

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

    print("Supabase Auth endpoint: reachable")
    print("Supabase email auth: enabled")
    print("Supabase signup: enabled")
    print("Browser key type: publishable")
    print("Secret browser credential check: passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
