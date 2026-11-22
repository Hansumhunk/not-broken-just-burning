# Guardian Desk Phase II — proposed persistent ticket foundation

**State: SOURCE-ONLY PROPOSAL. Not applied to Production or Commerce QA. No live ticket intake.** This extends the already existing Guardian Desk workstream **#275 / draft PR #276** rather than introducing another support interface or another executive dashboard.

## Verified prerequisites

- Live website feedback is a **mailto/copy composer**, not a ticket. Preserve `member-feedback.html` and its scripts unchanged.
- Existing support/billing workflow: `MEMBER_SUPPORT_OPERATING_RUNBOOK.md`, `refunds.html`, `privacy.html`.
- Existing Supabase Auth and `private.user_roles` establish account and administrative patterns. Do not invent a second authentication system.
- Read-only snapshots of both **NBJB Phase Two** and **NBJB Commerce QA** found **no support-ticket table in inspected public schemas** on 2026-11-22. Do not presume other schemas or future branches remain unchanged.
- Stripe is payment source of truth; member entitlements determine site access. A missing response or disagreement becomes an escalated discrepancy, **not** automatic revocation.
- The founder's earlier synthetic SQLite prototype (29 passing local tests, per #275) remains the **only** executable Guardian Desk system. This file does not replace or rehost it.

## Proposed additive data contract

`guardian_support_tickets`: authenticated member-owner only, short bounded support summary, category, feature, priority, status, assigned department, duplicate fingerprint, customer-visible last/next steps and timestamps.

`guardian_support_events`: internal minimized audit events, **no customer direct read policy**.

`guardian_support_rate_windows`: reserved for atomic rate limiting in the trusted backend; a table alone does **not** enforce limits.

The SQL is staged as `PROPOSED_TICKET_SCHEMA.sql` **outside `supabase/migrations`** so no deployment system should automatically apply it. The Supabase CLI was not available to create a real migration locally. After a founder-approved isolated QA test and current schema re-check, generate a proper migration using the then-current Supabase CLI and review before committing it to deployable migration paths.

## Trust boundaries

1. Public anonymous visitor: approved KB answers + existing verified contact method; **no database ticket creation** in this first increment.
2. Authenticated member: read *only* column-allowlisted cases where `auth.uid() = owner_user_id`. No direct client insert, update, delete, or event-table access.
3. Trusted server: obtain the user from Supabase Auth's verified token, not client-supplied user ID or email. Validate body size/category; reject credentials and over-disclosure; classify urgency; rate-limit; derive owner ID server-side; insert ticket + event atomically; return actual persisted ticket ID only after confirmed write.
4. Staff: use current private authorization roles with properly authenticated backoffice access. No public GitHub customer cases or unverified 'a human is reviewing' statements.
5. Payment: authenticated **read-only** Stripe verification on a separately scoped server; never mutate charges, refunds, subscriptions, or payment methods in this operation.
6. Executive Command: aggregate approved counts with small-cohort suppression; no private case narratives or psychological advertising profiles.

## Non-production acceptance sequence

| Gate | Required evidence | Status now |
|---|---|---|
| Founder approves support data collection, retention and user-facing disclosures | Versioned policy/approval | **BLOCKED** |
| Current QA schema still lacks competing ticket infrastructure | Read-only table and function inspection | **PARTIAL: inspected 2026-11-22** |
| Apply proposed schema to separately authorized isolated QA | SQL success + rollback snapshot | **NOT RUN** |
| Read table ACL / RLS metadata | `anon` no privileges; `authenticated` only selected columns; own-row policy | **NOT RUN** |
| User A creates controlled synthetic ticket through verified backend | Persisted ID + audit event | **NOT RUN** |
| User B cannot read ticket A | 403 or empty row, no details leaked | **NOT RUN** |
| Forged client user ID cannot substitute for session owner | Server rejects mismatch | **NOT RUN** |
| Unverified session / excessive intake / credential-bearing payload | Denied + safe error + auditable internal event | **NOT RUN** |
| Server unavailability and disabled feature flag | No silent intake or fake ticket ID | **NOT RUN** |
| Refund or duplicate-charge message | Human escalation; no automatic Stripe write | **NOT RUN** |
| Retention/purge and account-deletion behavior | Reviewed policy + QA tests | **BLOCKED** |
| Executive Command aggregate with privacy suppression | Correct source/period/coverage | **NOT RUN** |
| GD01–GD30 and rollback/disable | Hosted QA acceptance record | **BLOCKED** |

**Read-only metadata checks after an authorized QA apply** (do not run the DDL against production):

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
and tablename like 'guardian_support_%'
order by tablename;

select grantee, privilege_type, table_name, column_name
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'guardian_support_tickets'
and grantee in ('anon','authenticated')
order by grantee, column_name;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
and tablename like 'guardian_support_%';
```

Passing a static SQL safety check is **not** equivalent to passing real RLS/account isolation or operational tests.

## Founder review decisions before hosted QA

- Approve a minimal ticket privacy/retention schedule and customer-facing disclosure update.
- Authorize *only* test-schema writes against the isolated QA target after backups and current dependency verification.
- Approve a staffing/escalation model that does not promise response times or immediate human coverage without evidence.
- Keep production release and all privileged customer actions behind separate exact-commit approvals.

No real personal information, private reflections, Stripe customer data, or marketing consent was collected during preparation of this proposal.


## GD-002-A continuation — source implementation and hardening (2026-11-22)

**The earlier section above describes the previous draft before this continuation.** Current authoritative proposed SQL is `PROPOSED_TICKET_SCHEMA.sql`; new source is `guardian-support-core.mjs`, `edge/guardian-support-intake/index.ts`, and `tests/security.test.mjs`. All remain **unapplied / unhosted**.

### Changed controls
- Removed automatic account→ticket→audit cascading loss. Ticket owner becomes NULL only after approved redaction; a CHECK forbids orphaned unsanitized content. Ticket→audit FK RESTRICT blocks silent event deletion. Both deletion/hold policy and actual workflow are still unapproved.
- Added HMAC-based active-owner duplicate uniqueness, server-only atomically enforced 5-per-hour intake gate, and database transaction joining rate decision, ticket insert, and minimal audit event.
- Added constrained topic-to-team *suggestion*, keeping actual assignment empty until verified staff action; unverified report text never generates P0/P1 claims.
- Proposed Edge handler independently verifies user JWT against existing Supabase Auth, derives owner server-side, rejects client ownership/priority fields, denies secrets, uses QA kill switch and exact project ref, emits a ticket ID only when the RPC provides a valid persisted ID.
- No browser write grants; no Auth users created; no live Stripe read or write integration; no new public Help page.

### Evidence and test scope
- Executed new **59/59 locally passing Node tests** from the isolated source package using `node --experimental-strip-types --test tests/*.test.mjs` (input/identity/safety, mocked Edge transport, SQL structural lint). The GitHub branch also stages `tests/security.test.mjs` as a reproducible source regression suite; **no GitHub Actions or hosted acceptance is claimed**.
- These tests mock Supabase Auth and PostgREST and lint SQL text; do **not** establish actual JWT enforcement, RLS, transactional behavior, deployed Edge function accessibility, 2-account separation, backup recovery or legal retention adequacy.
- Read-only Commerce QA direct project check: `ACTIVE_HEALTHY`, PostgreSQL 17.12, existing populated commerce QA. No hosted write performed. A verified $0 **incremental resource cost** assumption is not available until metering and backup preflight.
- Full risk and proposed disclosures: `PHASE_II_SECURITY_REVIEW.md`; **single** exact founder decision: `PHASE_II_QA_APPROVAL.md`.

### Important rollout limitation
The new Edge handler imports a shared pure helper module outside its function directory. That dependency must be bundled/validated for the intended supported runtime, not assumed to deploy directly. The future function must retain `verify_jwt=true`; no service-role key or HMAC secret is permitted in GitHub or browser code. The exact retention and customer rights workflow, staffing ownership, and isolated QA permission remain approval-blocked.
