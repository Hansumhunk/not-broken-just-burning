"""Real Chromium member pages with SYNTHETIC Auth/entitlement fixtures only.

Never contacts Supabase, Stripe, Brevo or PostHog. This is browser-level UI,
not real provider registration, verification, paid access or RLS proof.
"""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import shutil

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "test-results" / "first-flame"
OUT.mkdir(parents=True, exist_ok=True)

# An explicit local-only provider fixture: no real Auth tokens, PII, requests
# to live Supabase, or external browser network.
AUTH_FIXTURE = r"""
(() => {
  const realSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    if (window.__qaBlockStorage) throw new Error('Synthetic quota limit');
    if (key.startsWith('nbjb.member.v2.')) window.__qaMemberWrites = (window.__qaMemberWrites || 0) + 1;
    return realSet.call(this, key, value);
  };
  const user = () => {
    const id = sessionStorage.getItem('qa-fixture-user');
    return id ? { id, email: id + '@example.invalid' } : null;
  };
  const mkQuery = (name) => {
    const query = {
      select() { return query; },
      eq() { return query; },
      single() {
        return Promise.resolve({
          data: { tier: 'free_member', status: 'active',
            valid_from: '2026-01-01T00:00:00Z', valid_until: null,
            provider: null, cancel_at_period_end: false },
          error: null
        });
      },
      then(resolve, reject) {
        return Promise.resolve({ data: [], error: null }).then(resolve, reject);
      }
    };
    return query;
  };
  window.NBJBAuth = {
    ready: Promise.resolve(),
    get user() { return user(); },
    get session() { return user() ? { user: user() } : null; },
    refresh: async () => ({ user: user(), session: user() ? { user: user() } : null }),
    onChange(callback) {
      callback({ user: user(), session: user() ? { user: user() } : null });
      return () => {};
    },
    client: { from: mkQuery },
    signUp: async () => ({data: {user: {id: 'synthetic-unverified'},session: null}, error: null}),
    signIn: async () => ({error: {message: 'Invalid login credentials'}}),
    sendMagicLink: async () => ({error: null}),
    sendRecovery: async () => ({error: null}),
    signOut: async () => {
      sessionStorage.removeItem('qa-fixture-user');
      return { error: null };
    }
  };
})();
"""

class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

@contextmanager
def local_server():
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(SilentHandler, directory=str(ROOT))
    )
    worker = Thread(target=server.serve_forever, daemon=True)
    worker.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        worker.join()

def setup_context(browser, origin, mobile=False):
    kwargs = dict(viewport={"width": 390, "height": 844} if mobile
                  else {"width": 1280, "height": 900},
                  reduced_motion="reduce")
    if mobile:
        kwargs["is_mobile"] = True
        kwargs["has_touch"] = True
        kwargs["device_scale_factor"] = 2
    context = browser.new_context(**kwargs)
    context.route("**/*", lambda r:
        r.continue_() if r.request.url.startswith(origin + "/") else r.abort())
    context.add_init_script(script=AUTH_FIXTURE)
    page = context.new_page()
    page.set_default_timeout(10000)
    return context, page

def identity(page, origin, user_id):
    page.goto(origin + "/member-auth.html", wait_until="domcontentloaded")
    page.evaluate("(id) => sessionStorage.setItem('qa-fixture-user', id)", user_id)

def ready(page, origin, path):
    response = page.goto(origin + "/" + path, wait_until="domcontentloaded")
    assert response and response.status == 200, path
    page.locator('body[data-member-access="granted"]').wait_for()
    assert page.locator("main").is_visible(), path

def check_guest(browser, origin):
    context, page = setup_context(browser, origin)
    try:
        page.goto(origin + "/member-onboarding.html", wait_until="domcontentloaded")
        page.wait_for_url("**/member-auth.html?next=member-onboarding.html")
        assert page.locator("#sign-up-form").count() == 1
        assert page.locator("#sign-up-email").get_attribute("required") is not None
        assert page.locator("#sign-up-password").get_attribute("minlength") == "8"
        assert page.locator("#sign-up-form").evaluate("(form) => form.checkValidity()") is False
        assert page.locator("#sign-in-form").count() == 1
        assert page.locator("#magic-link-form").count() == 1
        assert page.locator("#recovery-form").count() == 1
        assert page.locator("main").is_visible()
        page.locator("#sign-up-email").fill("fixture@example.invalid")
        page.locator("#sign-up-password").fill("synthetic-password-12")
        page.locator("#sign-up-form button[type=submit]").click()
        status = page.locator("#auth-status")
        assert "if one was sent" in status.inner_text().lower()
        assert "account created" not in status.inner_text().lower()
        page.locator("#sign-in-email").fill("fixture@example.invalid")
        page.locator("#sign-in-password").fill("wrong-synthetic-password")
        page.locator("#sign-in-form button[type=submit]").click()
        assert "invalid login credentials" in status.inner_text().lower()
        assert page.locator("#signed-out-state").is_visible()
        print("PASS guest redirect, form validation, neutral unverified response and failed-login UI; NO provider calls")
    finally:
        context.close()

def check_onboarding(browser, origin, mobile=False):
    context, page = setup_context(browser, origin, mobile=mobile)
    mode = "mobile" if mobile else "desktop"
    try:
        identity(page, origin, "fixture-alpha")
        ready(page, origin, "member-onboarding.html")
        page.locator("#onboarding-focus").select_option("Fire Reclamation")
        page.locator(".nbjb-optional-setup summary").click()
        page.locator("#onboarding-name").fill("QA Flamewalker")
        page.locator("#onboarding-action").fill("Write one calm question")
        page.locator('[data-onboarding-value][value="Honor"]').check()
        # QUOTA DENIAL MUST NOT DISCARD INPUT, SUPPRESS THE ERROR OR REDIRECT.
        page.evaluate("window.__qaBlockStorage = true")
        page.locator("#complete-onboarding").focus()
        page.keyboard.press("Enter")  # keyboard-operable error path
        page.locator("#onboarding-save-status").wait_for(state="visible")
        assert "could not save" in page.locator("#onboarding-save-status").inner_text().lower()
        assert page.url.endswith("/member-onboarding.html"), page.url
        page.evaluate("window.__qaBlockStorage = false")
        page.locator("#complete-onboarding").click()
        page.wait_for_url("**/member-start-here.html")
        page.locator('body[data-member-access="granted"]').wait_for()
        assert page.locator("h1").count() >= 1
        # Persisted focus, profile and action; no forced disclosure or purchase.
        stored = page.evaluate("""() => JSON.parse(localStorage.getItem(
          'nbjb.member.v2.fixture-alpha'))""")
        assert stored["journey"]["focus"] == "Fire Reclamation"
        assert stored["journey"]["progress"]["Fire Reclamation"] == "in-progress"
        assert stored["journey"]["nextAction"] == "Write one calm question"
        assert stored["journey"]["values"] == ["Honor"]
        assert stored["profile"]["displayName"] == "QA Flamewalker"
        # Real free lesson explicit save (no automatic completion).
        page.locator("#start-here-facts").fill("A meeting is scheduled.")
        page.locator("#start-here-feelings").fill("I feel uncertain.")
        page.locator("#start-here-control").fill("Prepare one question.")
        # Reject a reflection write: neither My Work nor the Dashboard action
        # may change, and no false success message may appear.
        page.evaluate("window.__qaBlockStorage = true")
        page.locator("#start-here-form button[type=submit]").click()
        assert "could not save" in page.locator("#start-here-status").inner_text().lower()
        assert page.evaluate("""() => {
          const d = JSON.parse(localStorage.getItem('nbjb.member.v2.fixture-alpha'));
          return d.journey.nextAction === 'Write one calm question' && d.activity.entries.length === 0;
        }""")
        page.evaluate("window.__qaBlockStorage = false")
        writes_before = page.evaluate("window.__qaMemberWrites || 0")
        page.locator("#start-here-form button[type=submit]").click()
        assert "saved to my work" in page.locator("#start-here-status").inner_text().lower()
        assert page.evaluate("window.__qaMemberWrites || 0") - writes_before == 1, "Start Here action and reflection must save in one write"
        saved_after = page.evaluate("""() => JSON.parse(localStorage.getItem('nbjb.member.v2.fixture-alpha'))""")
        assert len(saved_after["activity"]["entries"]) == 1
        assert saved_after["activity"]["entries"][0]["data"]["facts"] == "A meeting is scheduled."
        assert saved_after["journey"]["nextAction"] == "Prepare one question."
        ready(page, origin, "members.html")
        assert "Fire Reclamation" in page.locator('[data-dashboard-focus-name]').inner_text()
        assert "Prepare one question." in page.locator('[data-dashboard-action-state]').inner_text()
        page.reload(wait_until="domcontentloaded")
        page.locator('body[data-member-access="granted"]').wait_for()
        assert "Prepare one question." in page.locator('[data-dashboard-action-state]').inner_text()
        assert "QA Flamewalker" in page.locator("body").inner_text()
        if mobile:
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2")
        else:
            page.screenshot(path=str(OUT / "synthetic-return-dashboard.png"), full_page=True)
        print("PASS", mode, "synthetic authenticated browser onboarding, storage error, free lesson, explicit save, dashboard return/refresh")

        # Actual sign-out button and same-browser return, but provider responses
        # are synthetic and do not establish real Supabase token revocation.
        page.locator(".member-nav-more summary").click()
        page.locator(".member-sign-out").click()
        page.wait_for_url("**/member-auth.html")
        page.goto(origin + "/members.html", wait_until="domcontentloaded")
        page.wait_for_url("**/member-auth.html?next=members.html")
        identity(page, origin, "fixture-alpha")
        ready(page, origin, "members.html")
        assert "Prepare one question." in page.locator('[data-dashboard-action-state]').inner_text()
        print("PASS", mode, "synthetic sign-out, guest redirect, returning-device restoration")

        # Same-browser account switch: no prior user's private local data visible.
        page.evaluate("sessionStorage.setItem('qa-fixture-user','fixture-beta')")
        page.reload(wait_until="domcontentloaded")
        page.locator('body[data-member-access="granted"]').wait_for()
        assert "QA Flamewalker" not in page.locator("body").inner_text()
        assert "Prepare one question." not in page.locator('[data-dashboard-action-state]').inner_text()
        assert page.evaluate("localStorage.getItem('nbjb.member.v2.fixture-beta')") is None
        # The first user's local record is retained but not loaded into second view.
        assert page.evaluate("localStorage.getItem('nbjb.member.v2.fixture-alpha')") is not None
        print("PASS", mode, "synthetic two-identity browser storage isolation")
    finally:
        context.close()

def check_skip(browser, origin):
    context, page = setup_context(browser, origin)
    try:
        identity(page, origin, "fixture-skip")
        ready(page, origin, "member-onboarding.html")
        page.get_by_role("link", name="Skip Setup & Begin Lesson").click()
        page.wait_for_url("**/member-start-here.html")
        page.locator('body[data-member-access="granted"]').wait_for()
        assert page.locator("#start-here-form").count() == 1
        assert page.evaluate("localStorage.getItem('nbjb.member.v2.fixture-skip')") is None
        print("PASS optional onboarding skip, no implicit personal progress record")
    finally:
        context.close()

if __name__ == "__main__":
    binary = shutil.which("google-chrome") or shutil.which("google-chrome-stable") or shutil.which("chromium")
    assert binary, "Chromium/Google Chrome required"
    with local_server() as origin, sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=binary, args=["--no-sandbox"])
        try:
            check_guest(browser, origin)
            check_skip(browser, origin)
            check_onboarding(browser, origin, mobile=False)
            check_onboarding(browser, origin, mobile=True)
        finally:
            browser.close()
    print("First Flame Chromium synthetic acceptance completed; real Supabase/email/RLS integration NOT tested.")
