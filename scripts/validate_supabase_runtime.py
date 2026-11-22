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


def probe_premium_guest(base_url: str, publishable_key: str) -> None:
    """A public client without a valid user JWT must not get a private lesson."""
    for label, authorization in (("missing JWT", None), ("invalid JWT", "Bearer nbjb-ci-invalid-token")):
        headers = {"apikey": publishable_key, "Content-Type": "application/json", "Accept": "application/json",
                   "Origin": EXPECTED_ORIGIN, "User-Agent": "NBJB-Membership-QA-CI/1.0"}
        if authorization:
            headers["Authorization"] = authorization
        req = Request(f"{base_url}/functions/v1/read-flamewalker-lesson",
                      data=json.dumps({"slug": "father-wound"}).encode(), headers=headers, method="POST")
        try:
            with urlopen(req, timeout=20) as response:
                # Never dump a potentially protected response body into CI logs.
                raise RuntimeError(f"premium guest denial ({label}) unexpectedly returned HTTP {response.status}")
        except HTTPError as exc:
            if exc.code not in (401, 403):
                raise RuntimeError(f"premium guest denial ({label}) returned HTTP {exc.code}, expected 401/403") from exc
            raw = exc.read(65536)
            # The body of an unauthorized response must never contain a lesson payload.
            try:
                payload = json.loads(raw)
            except (json.JSONDecodeError, UnicodeDecodeError):
                payload = {}
            if isinstance(payload, dict) and ("lesson" in payload or "content" in payload):
                raise RuntimeError("premium denial returned a protected payload")
            print(f"Premium endpoint — {label}: denied HTTP {exc.code}")
        except URLError as exc:
            raise RuntimeError(f"premium guest denial ({label}) was unreachable") from exc


def probe_unsigned_webhook(base_url: str, publishable_key: str) -> None:
    """Prove the live webhook rejects unsigned requests without writing a receipt."""
    req = Request(f"{base_url}/functions/v1/stripe-live-webhook", data=b"{}",
                  headers={"apikey":publishable_key, "Content-Type":"application/json",
                           "User-Agent":"NBJB-Membership-QA-CI/1.0"}, method="POST")
    try:
        with urlopen(req, timeout=20) as response:
            raise RuntimeError(f"unsigned live webhook unexpectedly returned HTTP {response.status}")
    except HTTPError as exc:
        if exc.code != 400:
            raise RuntimeError(f"unsigned live webhook returned HTTP {exc.code}, expected 400") from exc
        try:
            data = json.loads(exc.read(65536))
        except (json.JSONDecodeError, UnicodeDecodeError) as err:
            raise RuntimeError("unsigned live webhook returned an unexpected body") from err
        if not isinstance(data, dict) or data.get("error") != "missing_signature":
            raise RuntimeError("unsigned live webhook did not report missing_signature")
        print("Live Stripe webhook — unsigned request denied HTTP 400")
    except URLError as exc:
        raise RuntimeError("unsigned live webhook was unreachable") from exc


def probe_net_schema_visibility(base_url: str, publishable_key: str) -> None:
    """Read-only zero-row schema reachability diagnostic. Never request headers or payload rows."""
    for table in ("http_request_queue", "_http_response"):
        req = Request(f"{base_url}/rest/v1/{table}?select=id&limit=0",
                      headers={"apikey": publishable_key, "Accept-Profile": "net",
                               "Accept": "application/json", "User-Agent": "NBJB-Production-Assurance-CI/1.0"},
                      method="GET")
        try:
            with urlopen(req, timeout=15) as response:
                # Do not read or print any returned body, even on success.
                print(f"pg_net public API diagnostic {table}: HTTP {response.status}; REVIEW schema reachability")
        except HTTPError as exc:
            if exc.code in (401, 403, 406):
                print(f"pg_net public API diagnostic {table}: HTTP {exc.code}; denied/not exposed")
            else:
                print(f"pg_net public API diagnostic {table}: HTTP {exc.code}; inconclusive")
        except (URLError, TimeoutError):
            print(f"pg_net public API diagnostic {table}: unavailable; inspect Dashboard configuration")


def probe_deployed_membership_assets() -> None:
    """Read-only CDN diagnostics. PR CI can precede Pages deployment."""
    cases = (
        ("member-lessons.html", "awaiting catalog verification"),
        ("js/member-entitlements.js", "requestVersion"),
        ("js/member-learning-progress.js", "practiceRenderVersion"),
        ("js/member-bootstrap.js", "member-qa-20261118"),
        ("member-progress.html", "qa=member-qa-20261118"),
        ("js/member-entitlements.js?v=member-qa-20261118", "requestVersion"),
        ("js/member-learning-progress.js?v=member-qa-20261118", "practiceRenderVersion"),
        ("js/tool-member-history.js?v=member-qa-20261118", "pending.ownerId"),
        ("css/member-premium-lesson.css", "Mobile workbook: readable entry fields"),
        ("css/members.css", "Member controls: explicit keyboard focus"),
        ("js/member-service.js", "nbjb.plus.last-learning.v1."),
        ("js/member-platform.js", "Copy private local member data to the clipboard"),
        ("js/member-auth.js", "recoveryRequestPending"),
        ("contact.html", "member-support-title"),
        ("refunds.html", "optional-exit-feedback"),
        ("member-store.html", "refunds.html#refund-request"),
        ("js/main.js", "safeAnalyticsSurface"),
        ("js/member-billing.js", "NBJBTrackCheckoutIntent"),
        ("privacy.html", "Private member workspaces and account access/recovery pages are excluded"),
    )
    for path, marker in cases:
        try:
            separator = "&" if "?" in path else "?"
            req = Request(f"{EXPECTED_ORIGIN}/{path}{separator}nbjb_qa=20261118",
                          headers={"Cache-Control":"no-cache", "User-Agent":"NBJB-Membership-QA-CI/1.0"})
            with urlopen(req, timeout=15) as response:
                body = response.read(2000000).decode("utf-8", errors="replace")
                outcome = "marker served" if marker in body else "marker not yet served"
                print(f"Production asset {path}: HTTP {response.status}; {outcome}")
        except (URLError, TimeoutError):
            print(f"Production asset {path}: readback unavailable; independent verification pending")


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
        default_parsed = urlsplit(default_location)
        default_origin = f"{default_parsed.scheme}://{default_parsed.netloc}"
        site_ok = default_origin == EXPECTED_ORIGIN
        callback_ok = callback_location.startswith(callback)
        if not site_ok or not callback_ok:
            return fail(
                "Auth URL configuration mismatch: "
                f"site_url resolves to {default_origin or default_location}; "
                f"member-auth redirect resolves to {callback_location or '(none)'}"
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
    try:
        probe_premium_guest(base_url, publishable_key)
        probe_unsigned_webhook(base_url, publishable_key)
    except RuntimeError as exc:
        return fail(str(exc))
    probe_net_schema_visibility(base_url, publishable_key)
    probe_deployed_membership_assets()
    return 0


if __name__ == "__main__":
    sys.exit(main())
