# NBJB Phase Two — Supabase Backend Foundation Plan

Status: planned foundation for Phase Two. This branch is intentionally separate from `main` and from live billing.

## Source requirements

This plan is derived from:

- `ACCESS_MODEL.md`
- `MEMBERS.md`
- Issue #3 — real Flamewalker accounts and backend
- Issue #18 — member UI / adapter boundary
- Issue #36 — Free + Paid membership and product entitlements
- the current development-only member HTML/CSS/JS architecture

The existing front-end contract remains:

`member UI → member service/adapter → device-local prototype now / authenticated backend later`

The backend must add account continuity and authorization without turning sensitive reflection content into server data by default.

## Non-negotiable privacy boundary

> **Your account can remember your journey without needing to read your journal.**

This foundation deliberately does **not** create cloud tables for:

- Forge reflection bodies
- Pattern Map evidence / inference bodies
- Sacred Questions answers
- therapy or medical material
- legal evidence or active-case material
- private journals or source documents
- other highly sensitive reflection content

Those remain device-local by default unless a later feature is separately designed, consented to, secured, and documented.

The first backend stores only low-sensitivity continuity and authorization data.

## Access vocabulary

The authorization model preserves these classes:

- `public` — unauthenticated/public site access; not represented by an account entitlement row
- `free_member` — authenticated Flamewalker starter tier
- `paid_member` — authenticated recurring depth tier
- `product:<slug>` — separately owned product
- `event:<slug>` — separately owned event / replay / ticket entitlement

A single `is_member` boolean is not sufficient.

## Planned schemas

### public

User-facing account continuity and entitlement tables live in `public` with explicit grants and Row Level Security.

Tables:

1. `profiles`
   - one row per Auth user
   - display name
   - short profile description
   - onboarding completion
   - timestamps

2. `member_preferences`
   - low-sensitivity member preferences only
   - profile visibility
   - dashboard display preferences
   - learning reminder preference
   - no open-ended journal/reflection JSON field

3. `member_path_state`
   - current Flamewalker Path focus

4. `member_path_progress`
   - one row per user + Path stage
   - `not_started`, `in_progress`, or `practicing`

5. `member_continue_state`
   - Next Honest Action
   - last tool slug
   - continue target kind + slug
   - last activity time
   - bounded low-sensitivity continuity only

6. `learning_progress`
   - lesson / track / course / workshop / replay progress
   - progress percentage
   - current unit
   - last access / completion timestamps
   - contains no protected content body or video URL

7. `membership_entitlements`
   - current `free_member` or `paid_member` tier
   - entitlement status
   - valid-from / valid-until
   - source/provider references for future billing integration
   - authenticated users may read their own row but may not promote themselves

8. `product_entitlements`
   - `product:<slug>` ownership
   - status / grant / expiry
   - authenticated users may read their own rows but may not grant themselves products

9. `event_entitlements`
   - `event:<slug>` ownership
   - status / grant / expiry
   - authenticated users may read their own rows but may not grant themselves events

### private

`private` contains authorization-support data that is not exposed through the browser Data API.

- `user_roles`
  - admin / moderator roles
  - no browser CRUD
  - used only by trusted database/backend operations

- `is_admin()`
  - non-exposed security-definer helper used by RLS
  - checks the authenticated user's ID against `private.user_roles`
  - no authorization decision uses user-editable `user_metadata`

## Row Level Security model

RLS is enabled immediately on every user-facing table.

For ordinary continuity tables:

- member can SELECT only rows where `user_id = auth.uid()`
- member can INSERT only rows where `user_id = auth.uid()`
- member can UPDATE only rows where `user_id = auth.uid()`
- member can DELETE only rows where `user_id = auth.uid()`
- an explicit `admin` role may access other users' rows

For entitlement tables:

- member can SELECT only their own entitlement rows
- member cannot create, update, or delete their own entitlement state
- explicit admins may manage entitlement rows
- future billing/webhook code will write entitlements from a trusted server context

The first admin must be assigned through trusted database/backend administration, never from a client-editable profile field.

## New-user defaults

A tested Auth trigger will initialize a new account with:

- `profiles` row
- `member_preferences` row
- `member_path_state` row
- `member_continue_state` row
- `membership_entitlements` = `free_member` + `active`

Path-progress rows are created only when a stage is touched; missing rows are interpreted by the adapter as `not_started`.

The trigger contains no user-provided authorization data.

## API exposure

Supabase changed new-project defaults in 2026 so new public tables are not necessarily exposed automatically through the Data API. Migrations therefore use **explicit GRANT statements**.

Expected browser access:

- `authenticated`: appropriate CRUD on own low-sensitivity continuity tables
- `authenticated`: SELECT-only on own entitlement tables
- `anon`: no member-table access
- `service_role` / secret server credentials: trusted server use only, never browser code or GitHub

The browser integration will use the project URL plus a Supabase **publishable key** (or legacy anon key only when compatibility requires it). No service-role/secret key belongs in the repository.

## Billing boundary

Live billing is intentionally out of scope for this foundation.

Before Stripe or another provider is allowed to mutate entitlements:

1. schema migration must apply cleanly
2. RLS must pass owner-vs-other-user tests
3. self-promotion to Paid must fail
4. self-granting a product/event must fail
5. admin access must be explicitly tested
6. Security Advisor must be reviewed
7. unauthorized account edge cases must be tested
8. entitlement transitions and idempotent webhook behavior must be specified

## Migration workflow

The database is migration-first.

- No undocumented Dashboard table changes
- Every DDL change is represented in `supabase/migrations/`
- Supabase project migration history and GitHub migration SQL must stay aligned
- Production changes are not made from browser UI by hand and then forgotten
- Security / performance advisors run after schema changes

## Phase sequence

### Phase A — plan and schema
- lock tables, enums, RLS rules, grants, trigger behavior
- document privacy exclusions
- commit migration source and schema notes

### Phase B — create Supabase project
- organization: **Not Broken Just Burning**
- use a U.S. East region for the initial project
- create no billing integration
- retrieve project URL + publishable key only after schema/security validation

### Phase C — apply and verify
- apply the migration
- confirm migration history
- inspect tables
- run Security Advisor + Performance Advisor
- verify RLS enabled and policy inventory
- run authenticated owner/cross-user tests before connecting the live member UI

### Phase D — adapter integration
- replace prototype-only local entitlement authority with Supabase-backed authorization
- keep sensitive tool/reflection bodies local by default
- connect auth / profile / low-sensitivity continuity incrementally
- keep `main` public V1 isolated until Phase Two release QA is complete

## Definition of done for this foundation

- Supabase project exists
- schema represented by migration(s) in GitHub
- RLS enabled from first migration
- ordinary users are isolated to their own rows
- entitlement self-escalation is impossible through browser credentials
- explicit admin role path exists
- no sensitive reflection-content tables exist
- no service-role/secret key is committed
- no live billing is connected
- GitHub documentation and Issue #3 reflect the implemented state


## Stripe / Billing integration

See `STRIPE_INTEGRATION.md`. Stripe-hosted Checkout and Customer Portal are the preferred payment surfaces. Stripe webhooks are payment truth; Supabase entitlement rows remain access truth. Browser code must never self-promote a member or grant purchased content.
