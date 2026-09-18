# NBJB Phase Two — Supabase Schema Notes

Status: **foundation implemented in the Phase Two Supabase project; live billing and member-UI connection remain intentionally disabled.**

Supabase project:

- Organization: `Not Broken Just Burning`
- Project: `NBJB Phase Two`
- Project ref: `plhbvtbvtxfzulsaxuim`
- Region: `us-east-1`
- API URL: `https://plhbvtbvtxfzulsaxuim.supabase.co`

No secret/service-role credential is stored in GitHub. A browser publishable credential exists in Supabase, but the member UI is not connected to it yet.

## Implemented migration

Database migration history currently contains:

- `phase_two_member_foundation`

GitHub source:

- `supabase/migrations/20260918010500_phase_two_member_foundation.sql`

The Supabase platform records its applied migration with its own migration-history timestamp. The SQL source in GitHub remains the reviewable source artifact for this foundation.

## Implemented tables

### Private authorization support

#### `private.user_roles`

Stores explicit elevated roles:

- `admin`
- `moderator`

This table:

- has RLS enabled
- has no browser policies
- grants no direct access to `anon` or `authenticated`
- is consulted through `private.is_admin()` for RLS decisions
- is never populated from user-editable profile or `user_metadata`

### Public low-sensitivity continuity

#### `public.profiles`

- display name
- short bio
- onboarding-completed state

#### `public.member_preferences`

- profile visibility
- recent-work-metadata display preference
- learning-reminder preference
- preferred landing page

No open-ended reflection/journal field exists.

#### `public.member_path_state`

Current Path stage and optional anchor.

Supported stage slugs:

- `fire-reclamation`
- `guardian`
- `sacred-mirror`
- `masculine-restoration`
- `voice-of-fire`
- `circle-of-the-flame`

#### `public.member_path_progress`

Per-stage state:

- `not_started`
- `in_progress`
- `practicing`

#### `public.member_continue_state`

Supports the Today / Continue dashboard:

- Next Honest Action
- Next Honest Action update time
- last tool slug
- continue kind
- continue slug
- last activity time

This table is explicitly documented as a **low-sensitivity continuity store**. It is not a reflection-body store.

#### `public.learning_progress`

Tracks learning continuity only:

- lesson / track / course / workshop / replay
- content slug
- 0–100 progress
- current unit slug
- started / last-accessed / completed timestamps

It does not store protected video URLs, private course bodies, or manuscripts.

## Entitlement tables

### `public.membership_entitlements`

One authoritative membership row per member.

Tier:

- `free_member`
- `paid_member`

State:

- `active`
- `trialing`
- `past_due`
- `canceled`
- `expired`
- `revoked`

The public access class remains implicit for signed-out visitors and does not require a database row.

### `public.product_entitlements`

Represents:

`product:<slug>`

Examples can include flagship courses, books, workbooks, or specialty programs.

Product ownership is independent from recurring membership.

### `public.event_entitlements`

Represents:

`event:<slug>`

Event/replay/ticket ownership is independent from recurring membership.

## RLS behavior

RLS is enabled on every table created by the foundation.

### Ordinary continuity tables

Authenticated members can operate only on rows where:

`user_id = auth.uid()`

An explicit `admin` role can access another member's row through the RLS admin path.

### Entitlement tables

Ordinary authenticated members:

- can read their own entitlement rows
- cannot promote themselves to `paid_member`
- cannot grant themselves a product
- cannot grant themselves an event

Explicit admins can manage entitlement rows.

Future billing/webhook code must use a trusted server context. Browser code is never the source of truth for entitlement mutation.

## New-user initialization

The `on_auth_user_created_nbjb` trigger creates:

- `profiles`
- `member_preferences`
- `member_path_state`
- `member_continue_state`
- active `free_member` membership entitlement

The trigger does not use user-provided metadata to make authorization decisions.

Path-progress rows are created lazily when a stage is touched.

## RLS verification performed

A rollback-only database test created two temporary Auth users:

- ordinary user A
- explicit admin user B

Verified results:

- both users received all expected new-account default rows
- ordinary user A could update their own profile
- ordinary user A could not see/update user B's profile
- ordinary user A remained `free_member` after attempting self-promotion
- ordinary user A could not self-grant a product
- ordinary user A could not self-grant an event
- admin user B could update user A's profile
- admin user B could change an entitlement
- admin user B could grant a product
- admin user B could grant an event

The transaction was rolled back, leaving no test users or test entitlements.

## Advisor results

### Security Advisor

Current informational finding:

- `private.user_roles` has RLS enabled but no policies.

This is intentional. The private role table is not exposed to browser roles and has no direct `anon` or `authenticated` table grants. RLS therefore denies browser access by default. Admin checks occur through the tightly scoped `private.is_admin()` helper.

### Performance Advisor

The four ownership indexes are currently reported as unused because the new project has no production member traffic yet:

- `member_path_progress_user_idx`
- `learning_progress_user_idx`
- `product_entitlements_user_idx`
- `event_entitlements_user_idx`

These indexes support ownership filtering / lookup patterns and should be reevaluated after realistic traffic exists rather than removed merely because a new empty database has not used them.

## Data intentionally absent from Supabase

This schema does **not** create cloud storage for:

- Forge reflection text
- Pattern Map body/evidence/inference
- Sacred Questions answers
- medical or therapy material
- legal evidence / active-case material
- private journals
- private source documents
- other sensitive reflection bodies

Those remain device-local by default.

## Credential rule

Frontend code may eventually receive only:

- project URL
- current publishable key (preferred)
- legacy anon key only when compatibility requires it

Never commit or expose:

- service-role keys
- secret keys
- database password
- JWT signing secret
- provider webhook signing secrets

## Billing status

**No live billing is connected.**

Before billing is connected:

- entitlement transition rules must be finalized
- webhook idempotency must be defined
- provider event verification must be implemented server-side
- rollback/revocation/refund behavior must be tested
- RLS and admin authorization tests must remain green
