# NBJB Membership Launch — Real-Browser Acceptance Check

**Prepared November 16, 2026.** This is a privacy-safe, founder-run acceptance check. The automated CI suite verifies source rules and safe mock membership expiration; it **cannot create a real login, verify an email, complete checkout, or inspect a paid lesson**.

## What has already been verified

- The configured production Supabase Auth endpoint responds; email signup is enabled; the site URL and member-auth callback are accepted. The latest GitHub `Validate static site` job passed those live smoke tests.
- Four existing authenticated accounts have four entitlement rows; there are no accounts missing an entitlement.
- Thirty-five guided premium lessons are published in the protected lesson table.
- Live Stripe lists one active $14.99/month subscription with a paid November 2 invoice and a December 2 scheduled cancellation.
- The other `paid_member` row is a **test-mode sandbox account**, supported by six matching test-mode webhook receipts. Do not count it as a second real paid subscriber or delete it.
- Live and test Stripe webhooks reject cross-mode events; designated sandbox account is excluded from live checkout. Database RLS and table ACL prevent ordinary authenticated members from editing entitlements; protected lesson bodies are server-retrieved.

## Browser check — no charges required

**Use a private/incognito window for the first two checks.** Never share passwords, verification emails, customer IDs, member notes or full payment information in GitHub comments or chat.

1. **Signed-out gate:** Open [Start Here](https://notbrokenjustburning.com/member-start-here.html) while signed out. The page should not show a saved work area or protected member content. It should direct you to [Account access](https://notbrokenjustburning.com/member-auth.html). If the view appears partly loaded, refresh and check that the account door remains required.
2. **Fresh Free signup:** Open [Join](https://notbrokenjustburning.com/join.html), select **Create Free Flamewalker Account**, then use a **separate email address you control** (not an existing or sandbox testing identity). If email confirmation is required, confirm through your inbox and follow the account link back. Do **not** subscribe or enter payment details. Successful acceptance: you can sign in, see your dashboard and can choose or skip onboarding. If you prefer not to create another account, use your existing ordinary **Free** account and mark *new signup verification untested*.
3. **Free lesson and paid boundary:** From the hub open **Start Here** and the free framework. Open the Lessons catalog and inspect an existing Flamewalker+ lesson card: the Free account must not receive the protected teaching body or premium editing/workbook features. Do not intentionally circumvent the protected endpoint.
4. **Returning sign-in/sign-out:** Sign out, reopen the member dashboard in the same browser, and confirm access is blocked until you sign in again. On sign-in, the free lesson should be reachable again; local drafts or optional reflections should follow the existing device-local policy.
5. **Existing genuine paid member, only if you already have one:** In its own browser session, open the Lessons catalog and read a sample from Track 2–6. Check content and worksheet/save functions, then open **Membership** to confirm the scheduled ending date and Stripe portal link (no change or charge required). **Do not use the designated sandbox editorial identity as evidence of actual paying-member access.**

**Stop condition:** If Free can retrieve protected paid lesson content, or a valid paid account cannot access an entitled published lesson, treat that as a launch blocker. Record the URL, rough local time, and a redacted error message, and investigate privately before scaling. Do **not** upload reflections, account passwords, confirmation links, or screenshots containing customer information.

## December 2–4: scheduled cancellation verification

The existing **NBJB Checkout Launch Watch** has been extended through **December 4, 2026**. It will check the live Stripe subscription status, related webhook receipts, and entitlement state without making a charge or changing membership. An account that legitimately finishes its paid term should no longer gain paid lesson access after the expiration; a sandbox/editorial QA exemption is not proof of a real-customer breach.

**Interpretation limits:** A green static/source/automated regression test does not prove a genuine human completed signup or checkout. A successful paid invoice does not prove that a new unrelated customer completed a purchase. A mock expiration test is not an end-to-end cancellation event. Track these as distinct acceptance gates.

## Automated release gates

- `node --test scripts/test_membership_lifecycle.js` — offline verified client-access states: paid, scheduled cancel, expired, future-dated, canceled, invalid-date, DB-error, signed-out, plus staged webhook/source guards.
- `python scripts/validate_supabase_runtime.py` — read-only live Auth settings and allowlisted callback checks, without creating an account.
- `node --test scripts/test_member_access_guard.js` — existing member shell/session tests.
- `node --test scripts/test_live_webhook_hardening.js` — existing live webhook payment/signature structural tests.

This checklist is for the founder's own QA, not a procedure for a production charge, subscription change, account takeover, or member-record review.
