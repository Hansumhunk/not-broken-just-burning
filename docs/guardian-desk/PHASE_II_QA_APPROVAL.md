# Guardian Desk GD-002-A — single founder approval packet (PROPOSED; nothing approved)

**Status:** source-only implementation complete enough for a controlled review. **No database write, Auth identity creation, function deployment, customer-facing collection or public release is authorized yet.** The next authorization should be one consolidated decision covering governance, isolated QA and real human escalation.

## A — Data governance (approval needed)

Approve/revise the draft in `PHASE_II_SECURITY_REVIEW.md`: minimum text fields, what NOT to enter, AI disclosure, policy-owner review, actual retention/deletion rights, treatment of Auth deletion, legitimate legal holds with independent review, private audit access, and proposed 180-day resolved-case *review* / 90-day open-case review / 48-hour rate counter purge. These figures are only suggested review cadences, not enacted law or a retention guarantee. Approve the precise live privacy-notice update before public ticket collection. Test the `guardian_support_orphan_redacted` constraint and reviewed account-removal workflow before hosted acceptance.

## B — Targeted Commerce QA write permission (approval needed, no resource purchases)

**Target only:** Existing `NBJB Commerce QA` Supabase project **`fgpkejlmpfkxgpktgdzm`**. Latest direct read-only status at source-engineering time: `ACTIVE_HEALTHY`, PostgreSQL 17.12. Executive checkpoint observed **21 existing public application tables and 2 QA Auth users**. The source-only implementation makes no changes to this project.

**Proposed exact database objects from `PROPOSED_TICKET_SCHEMA.sql`:**
- `public.guardian_support_tickets` — minimal customer summaries, owner-scoped RLS, selected customer read columns, privileged writes only; owner-user deletion has redaction gate.
- `public.guardian_support_events` — private audit event history; deletion restricted by foreign key.
- `public.guardian_support_rate_windows` — privileged atomic 5-per-hour per-user rate counter.
- Indexes: `guardian_support_tickets_owner_created_idx`, `guardian_support_tickets_status_created_idx`, `guardian_support_tickets_open_dedupe_uq` (unique active owner/fingerprint), `guardian_support_events_ticket_created_idx`.
- Policy: `guardian_support_ticket_owner_read`; all browser mutations remain denied.
- Privileged RPC: `public.guardian_support_accept(uuid,text,text,text,text)`; EXECUTE **service_role only**, never anon/authenticated. Fixed `search_path`, validated input, atomic rate/ticket/audit transaction and no fabricated ticket ID.
- Comments, explicit grants and revokes included. No modifications of any existing commerce or member tables; three **foreign-key references** to existing `auth.users` are the only schema dependencies (ticket owner, rate counter owner). No Stripe tables/functions or existing provider webhook endpoints are touched.

**Backend resource proposed after separate scoped approval:** one new QA-only Edge Function `guardian-support-intake`, with `verify_jwt=true`, explicit QA ref/URL/HTTPS preview-origin/feature-flag checks, a server-only service role key and independent HMAC secret, as source in `edge/guardian-support-intake/index.ts`. Source import must be bundled/verified in intended Edge build; this exact code is **not deployed**. No public production route or member page modification. No new subscriptions, projects, DNS, hosting plans or payment configurations.

**Do not silently repurpose the two existing QA Auth accounts.** For true hosted cross-account acceptance, authorize **exactly two controlled synthetic test identities**, including approved authentication/confirmation path, before their use or creation. Under current directive, both user reuse and creation remain blocked; local fake identities cannot prove live RLS.

### Nonproduction isolation and rollback checklist

1. Read the exact current QA schema, existing functions/migrations, grants, RLS, table dependencies, maintenance jobs, live/QA webhook configuration and Auth trigger impacts immediately before proposed write. Resolve name collision/dependency conflicts before any DDL.
2. Confirm budget capacity and metered Edge/database consumption in the existing plan; **no reliable $0 incremental-cost assurance yet**. If added usage or backup incurs a charge, block and seek separately authorized alternative; no new plan or project.
3. Establish actual recoverable QA database backup or available snapshot with documented restore ownership and duration. A source export or the SQL `BEGIN` statement is **not** a substitute for restoration testing.
4. Require a schema diff showing only three new tables, four indexes, one policy and one RPC plus scoped grants/comments; no changes to existing commerce schemas/data. Run preflight read-only `information_schema`/pg catalogs for any collisions.
5. After express permission, run DDL inside isolated QA with transaction semantics; confirm the exact table and RPC privileges with `information_schema.column_privileges`, `pg_policies`, `has_function_privilege`, role-scoped tests and security advisors. Don't add blanket grants to make tests pass.
6. Deploy **QA-only** source if separately approved, verify flag-disabled 503 and wrong-project denial before enabling any authenticated intake; ensure no route uses production URL or live Stripe key.
7. Only with separate test-identity permission, test A own-case read, B cannot read A, anonymous denied, browser inserts/updates denied, internal columns/events inaccessible; verify 5-per-hour cap under concurrency, duplicate idempotency, insert+audit rollback, network timeout ambiguity, wrong-user forged owner, secrets rejection, emergency routing and disabling.
8. Maintain real test-evidence ledger with timestamps, sanitized case UUIDs, expected/actual outcomes, exact commit, source/environment and independently witnessed failures; never publish customer messages.
9. Before cleanup, stop test intake, export **metadata only** for verification and check other commerce QA activities. After explicit approval and confirmation **there are no live customer cases in QA**, purge only labelled synthetic support data. If clean full teardown required, in a reviewed transaction **drop only** the new function, new event table, new rate table and new ticket table, in dependency order, without `CASCADE` and only after checking snapshots and ownership. Never drop existing commerce objects or Auth users.
10. If isolation, backup, cost or safe cleanup cannot be guaranteed inside Commerce QA, **do not apply**; identify a local ephemeral disposable Postgres alternative that adds no cost and can exercise roles/RLS before hosted QA approval.

### Proposed QA acceptance SQL (read-only once objects exist)

```sql
select tablename, rowsecurity
from pg_tables where schemaname='public' and tablename like 'guardian_support_%';
select grantee,table_name,column_name,privilege_type
from information_schema.column_privileges
where table_schema='public' and table_name='guardian_support_tickets';
select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public' and tablename like 'guardian_support_%';
select has_function_privilege('anon',
 'public.guardian_support_accept(uuid,text,text,text,text)','EXECUTE') as anon_execute,
 has_function_privilege('authenticated',
 'public.guardian_support_accept(uuid,text,text,text,text)','EXECUTE') as member_execute,
 has_function_privilege('service_role',
 'public.guardian_support_accept(uuid,text,text,text,text)','EXECUTE') as service_execute;
```

Expected: no anonymous/member function execution; service-only EXECUTE; authenticated own-ticket SELECT columns only; zero browser INSERT/UPDATE/DELETE; RLS on all tables. **SQL metadata checks do not replace actual A/B wrong-user authentication tests.**

## C — Operational support accountability (approval needed)

Identify who actually reviews P0 security/privacy issues, P1 billing/paid-access incidents, ordinary P2 technical/member cases and P3 suggestions; how they receive private queues and how they record assignment, escalation and verified resolution. Executive Command (#274) only receives aggregate, small-cohort-suppressed counts plus evidence freshness. Until staffed, the customer-facing system must say the ticket is *saved, not yet assigned*, with no invented 24/7 coverage or response deadline. Keep existing `member-feedback.html`, `contact.html`, member self-service Stripe Portal, `refunds.html`, and support inbox unchanged.

## Exact requested founder authorization (one decision)

**Approve / revise / withhold all three:** (A) support privacy, retention, deletion/hold and disclosure proposal; (B) schema-only, additive Commerce QA trial after successful backup/isolation/no-cost preflight, followed by separately scoped QA function and two isolated test identities if explicitly permitted; (C) named human staffing and escalation model. This package does **not** ask to deploy production or enable privileged account/billing actions.

**Stop at boundary:** there is no preauthorization to run SQL, send test emails, create QA users, or launch public support on the strength of this packet alone.
