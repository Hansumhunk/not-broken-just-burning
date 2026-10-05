# Flamewalker Access Model

Status: Flamewalker Free launch candidate.

## Public ladder

1. **Open NBJB** — public website and selected tools, no account required.
2. **Flamewalker** — free authenticated account.
3. **Flamewalker+** — planned paid membership, not purchasable in this release.
4. **Separate product/event entitlements** — future books, programs, workshops, physical goods, or live experiences when explicitly sold separately.

## Flamewalker Free

The free account is intended to provide:

- authenticated member dashboard
- Path focus and practice state
- Next Honest Action
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
