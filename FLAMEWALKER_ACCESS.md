# Flamewalker Access Model

Status: Flamewalker Free launch candidate.

## Public ladder

1. **Open NBJB** — public educational pages, articles, and introductions to the tools without an account.
2. **Flamewalker** — free authenticated account.
3. **Flamewalker+** — planned paid membership, not purchasable in this release.
4. **Separate product/event entitlements** — future books, programs, workshops, physical goods, or live experiences when explicitly sold separately.

## Flamewalker Free

The free account is intended to provide:

- authenticated member dashboard
- Path focus and practice state
- Next Honest Action
- all six working reflection tools in the authenticated `member-workshop.html` Toolbox
- explicit Save to My Work controls tied to the authenticated account on this device
- starter exercises and selected learning
- basic progress and continuity
- Free Library
- member profile/settings surfaces
- privacy-safe return point across the member experience

Private reflection bodies and deliberately saved My Work remain device-local by default in this release unless a feature explicitly states otherwise.

## Flamewalker+

Planned price: **$14.99/month or $149/year**.

Planned deeper layer includes core Path curriculum, Masculine Restoration depth, Pattern Lens, Flame Reviews, richer progress/follow-up continuity, recurring video learning, worksheets/exercises, selected mini-courses, member releases, and preferred pricing on eligible separate physical/live products.

**Flamewalker+ checkout is intentionally disabled in the Free launch.** Billing opens only after purchase, cancellation, failure, webhook idempotency, and entitlement-transition QA are complete.

## Backend authority

Supabase Auth is the identity/session provider. New authenticated users are initialized with an active `free_member` entitlement by the database trigger. Membership/product/event entitlement tables are server-authoritative and browser read-only for ordinary members. RLS restricts users to their own rows.

No service-role or secret server credential belongs in browser JavaScript or public source.

## Launch privacy boundary

Account creation does not silently upload Forge entries, Pattern Maps, Sacred Questions, medical/legal material, or private journal/reflection bodies.

The production privacy notice must describe current account data, third-party providers, analytics, and the temporary manual account-removal path until self-service deletion is shipped.

## Member-only reflection workspace (November 2026)

Public pages for the Forge, Flame Check-In, Pattern Map, Boundary Builder, One Stone and Six Sacred Questions explain the exercises and link to the signed-in Free Flamewalker Toolbox. All six working forms live at `member-workshop.html#<tool-id>`. Supabase Auth runs before `member-service.js` and `tool-member-history.js` are initialized by `member-bootstrap.js`, so the member archive is never saved under a guest session in the working interface. The Dashboard's Continue link and Toolbox cards target this same workspace. The account identifies whose device-local records are displayed, but this is not cloud sync. The site's Flamewalker+ purchase controls remain disabled.
