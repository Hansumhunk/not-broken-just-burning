# Supabase Production Auth Configuration

Project: **NBJB Phase Two**  
Project ref: `plhbvtbvtxfzulsaxuim`

This file records the hosted Auth settings required for Flamewalker Free, which was released to production in PR #77 on October 5, 2026.

## Required hosted Auth URL configuration

In Supabase Dashboard:

**Authentication → URL Configuration**

Set:

- **Site URL:** `https://notbrokenjustburning.com`
- **Redirect URLs:** include `https://notbrokenjustburning.com/**`

The wildcard is intentionally limited to the owned production host so signup verification, magic-link sign-in, and password recovery can return to `member-auth.html` and its approved query parameters without allowing arbitrary external domains.

## Browser callback routes used by the site

- signup confirmation: `https://notbrokenjustburning.com/member-auth.html?next=member-onboarding.html`
- passwordless sign-in: `https://notbrokenjustburning.com/member-auth.html`
- password recovery: `https://notbrokenjustburning.com/member-auth.html?mode=recovery`

The homepage also contains a defensive bridge that forwards Supabase Auth payloads to `member-auth.html` if an upstream email-link issue falls back to the production site root.

## Release gate

`scripts/validate_supabase_runtime.py` must pass after a service recovery or production Auth configuration change, before member access is declared healthy.

The live CI check verifies:

1. the Supabase Auth endpoint is reachable with the committed publishable browser key,
2. email authentication is enabled,
3. signup is enabled,
4. the hosted Site URL resolves to `https://notbrokenjustburning.com`,
5. `member-auth.html` is accepted as a redirect target,
6. no service-role or secret key is present in the browser config.

The redirect probe uses an intentionally invalid verification token, so it creates or changes no user.

## Historical blocker and current recovery

Issue #78 documented a historical pre-release auth URL problem. Do not assume the earlier `http://localhost:3000` setting is still present without retesting.

On October 29, 2026, Supabase project `NBJB Phase Two` was reported `INACTIVE`. A restore request succeeded, and the immediate status changed to `COMING_UP`. This is not proof that production sign-in is already working.

Before treating the recovered site as ready:

1. Confirm Supabase reports `ACTIVE_HEALTHY`.
2. Recheck the Site URL and allowed redirect list against the production routes above.
3. Validate signup, email confirmation, login, password reset, logout, and onboarding through a real browser.
4. Review authorization and Security Advisor. Confirm private user reflections remain device-local unless intentionally and safely synchronized.
5. Preserve the free-only release boundary: paid checkout, cloud sync, and member community posting are not live.

See `RELEASE_AUDIT_2026-10-29.md` for the complete verification checklist.
