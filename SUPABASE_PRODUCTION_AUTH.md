# Supabase Production Auth Configuration

Project: **NBJB Phase Two**  
Project ref: `plhbvtbvtxfzulsaxuim`

This file records the hosted Auth settings required before Flamewalker Free may merge to production.

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

`scripts/validate_supabase_runtime.py` must pass before merging Flamewalker Free to `main`.

The live CI check verifies:

1. the Supabase Auth endpoint is reachable with the committed publishable browser key,
2. email authentication is enabled,
3. signup is enabled,
4. the hosted Site URL resolves to `https://notbrokenjustburning.com`,
5. `member-auth.html` is accepted as a redirect target,
6. no service-role or secret key is present in the browser config.

The redirect probe uses an intentionally invalid verification token, so it creates or changes no user.

## Current known blocker

As of the Flamewalker Free release candidate, the live hosted Auth Site URL still resolves to:

`http://localhost:3000`

Do not merge the free account entry point to production until CI confirms the production Auth URL configuration.
