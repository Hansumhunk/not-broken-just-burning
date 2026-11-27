# GD-002-A — Commerce QA isolation, reversible schema acceptance and security gates

**SOURCE-ONLY PROPOSAL. NOT EXECUTED.** Issue #275 / draft PR #276 / Executive Command #274 · November 22, 2026.

## Read-only evidence (2026-11-22)
- **Target only:** Supabase **NBJB Commerce QA**, project ref `fgpkejlmpfkxgpktgdzm`, ACTIVE_HEALTHY, PostgreSQL 17.12.
- Current QA has **21 public application tables**, **five deployed active Edge Functions**, and **six recorded migrations**. It already contains commerce and member QA fixtures; **it is not empty or disposable**.
- Function slugs observed: `stripe-live-webhook`, `create-live-customer-portal-session`, `read-flamewalker-lesson`, `create-live-checkout-session`, `commerce`. No Guardian Desk Edge Function deployed in the inspected set.
- No support-ticket table in inspected public/private/support schema metadata. Reinspect immediately before any future QA write; no absence guarantee for unrelated or newly introduced resources.
- Security Advisor currently reports **12 INFO RLS-with-no-policy entries** for intentionally backend-facing/commerce tables (verify individually before changing) and **one WARN for leaked password protection disabled**. These are existing environment findings, **not caused or corrected by Guardian Desk**. Reference: [Advisor: RLS no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and [Auth password security](https://supabase.com/docs/guides/auth/password-security).
- **Production is a different project:** NBJB Phase Two `plhbvtbvtxfzulsaxuim`. All proposed calls must refuse this ref. No live or QA DDL/Data API writes under current authority.

## Exact change inventory if a future narrow QA grant is issued
**Database names:** `public.guardian_support_tickets`, `public.guardian_support_events`, `public.guardian_support_rate_windows`, `public.guardian_support_accept(uuid,text,text,text,text)`. Existing schemas/auth/membership/commerce are **not** modified.

**Function slug (later separate approval):** `guardian-support-intake` with platform `verify_jwt=true`, environment-locked to the exact Commerce QA project URL and ref, `NBJB_GUARDIAN_QA_ENABLED=false` until authorized tests, strong HMAC secret and approved origin. Source currently lives under `docs/` and **is not a deployed Supabase Functions folder**. A packaging/compile test must confirm relative imports, JWT mode and secret-key compatibility before deployment.

**No changes:** existing QA Auth users, Stripe/webhooks, subscriptions, purchases, products, event entitlements, email, public website, domain, marketing, CI, production or customer journals. Even existing QA identities cannot be used in authenticated tests without separate scoped permission. The earlier checkpoint reported two QA Auth identities; they are not created, accessed, or changed here.

## Prerequisites and approval gate (all required, not yet satisfied)
1. Founder approves exact proposed support-data policy, verified customer disclosures and named escalation/privacy reviewer. No new ticket storage before this.
2. Verify QA credentials and backups/snapshot/restore feasibility with a scoped administrator. Existing backup coverage, PITR and available quota are **not established** by read-only project metadata. No new project or paid add-on is proposed.
3. Capture a private *pre-change* schema inventory, grants/RLS/policies/function signatures, migration list, function deployment slugs and current commerce baseline. Keep no customer payloads in GitHub.
4. Explicit founder approval: **Commerce QA only** to apply this one schema proposal and execute synthetic tests, with precise rollback plan. Approval of this QA-only write must not imply permission to deploy the Edge Function, use QA Auth identities, merge, or deploy production.
5. Check current schema to prevent name conflicts; confirm no existing Guardian Desk tables, policies or RPC. Do not use `IF NOT EXISTS` to silently assimilate an unknown object.
6. Current Supabase CLI v3 defaults to local database operations. Inspect `supabase --help` and subcommand help; any hosted command requires deliberate target/consent. Do not infer flags from older examples. Prefer version-pinned tooling and reviewed one-off migration path. See [Supabase CLI v3 change](https://supabase.com/changelog/supabase-cli-v3).

## Controlled QA acceptance (later only)
A. **Preflight:** verify project ref both in read-only project metadata and exact environment guards; set kill switch false. Record pre-change object counts/hash and expected migration; confirm backups/rollback feasible and no spend over budget.
B. **Schema acceptance:** apply the reviewed **single-transaction** `PROPOSED_TICKET_SCHEMA.sql` only to authorized isolated QA; verify exactly three new tables, one new RPC, three RLS-enabled tables, minimal column-select grants, no `anon` access, no authenticated write privilege, and no public RPC EXECUTE. Run Security Advisor. Preserve original QA objects.
C. **Transactional tests:** synthetic-only tickets; own account read, wrong-account denial, forged owner field rejection, invalid session, only authenticated service-role RPC, original trace order, idempotent concurrent same-owner dedupe, five new tickets per hour, sixth rejected, duplicate retry not charged, a rejected SQL write causing rollback of rate counter and audit row, and distinct owner isolation.
D. **Security/retention tests:** no raw passwords/journals logged, strict streamed byte cap, unexpected field rejection, customer-only column allowlist, auditable staff role path (if built), legal hold/account deletion fail-closed and reviewed scrub, event FK purge restrictions, disabled-state zero writes, and rollback acceptance.
E. **Integration tests:** privileged server JWT authentication, correct Data API key mode and PostgREST error mapping. Supabase modern `sb_secret_` keys are **not JWTs** and should not be placed blindly in `Authorization: Bearer`; existing Edge code expects the legacy `SUPABASE_SERVICE_ROLE_KEY` JWT. Confirm exact authorized deployment credential style before launch. No service-role key in JS sent to browsers. See [Supabase Authorization headers](https://supabase.com/docs/guides/functions/auth-headers).
F. **Operational evidence:** actual QA test run IDs, provider timestamps, exact code+schema SHAs, direct query evidence for objects/permissions, return-code table, and shutoff/rollback verification. Record sanitized aggregates only in Executive Command #274.

### Read-only pre/post verification queries (not executed in this packet)
```sql
SELECT table_schema, table_name FROM information_schema.tables
WHERE table_schema IN ('public','private','support')
AND table_name LIKE 'guardian_support_%' ORDER BY 1,2;

SELECT schemaname, tablename, rowsecurity FROM pg_tables
WHERE schemaname='public' AND tablename LIKE 'guardian_support_%'
ORDER BY tablename;

SELECT grantee, table_name, column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema='public' AND table_name='guardian_support_tickets'
AND grantee IN ('anon','authenticated') ORDER BY 1,2,3;

SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname='public'
AND tablename LIKE 'guardian_support_%';

SELECT p.proname, p.prosecdef, p.proacl, pg_get_function_identity_arguments(p.oid)
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='guardian_support_accept';
```
To test **real permissions and cross-user isolation** later, invoke the Data API with independently authorized synthetic member credentials, not a SQL query run under a privileged owner and not a fabricated JWT; privileged test connections can bypass RLS and produce misleading results.

## Rollback and preservation controls — plan, not a command to execute now
1. Set `NBJB_GUARDIAN_QA_ENABLED=false` and verify new intake attempts cannot reach any DB write. Distinguish platform disable from handler kill switch.
2. In a separate authorized change, disable/remove only `guardian-support-intake` after confirming deployed revision. Never modify or delete the five existing QA functions.
3. Before database removal, verify any records are *synthetic authorized QA fixtures only*, preserve/handle relevant audit evidence and holds under approved policy. If non-synthetic content exists, **stop** and escalate—do not wipe it.
4. Check object provenance and dependencies; do **not** use `CASCADE` on PostgreSQL DROP. After founder-authorized cleanup, remove in dependency order inside one reviewed transaction:
```sql
-- WARNING: APPROVAL-GATED QA ROLLBACK TEMPLATE. NEVER RUN UNREVIEWED.
BEGIN;
DROP FUNCTION public.guardian_support_accept(uuid,text,text,text,text);
DROP TABLE public.guardian_support_events;
DROP TABLE public.guardian_support_rate_windows;
DROP TABLE public.guardian_support_tickets;
COMMIT;
```
5. Verify precisely the original 21 QA tables, existing function slugs, migrations, grants and commerce behavior remain intact; record checksums/evidence. A whole-database restore would overwrite unrelated commerce QA records and is **not** the default rollback.
6. If rollback fails or unexpected dependencies emerge, stop further changes, leave privileged intake disabled and route to authorized Infrastructure/Security before proceeding.

## Executive Command #274 aggregate-only integration
Guardian Desk does **not** create a new executive dashboard. A later private reporting adapter emits only:
`source=guardian_support_tickets`, `as_of` (UTC timestamp), `period_start`, `period_end`, `coverage` (QA/prod + completeness), `total`, `counts_by_category` (one mutually exclusive/exhaustive dimension), `open_count`, `resolved_count`, `verified_resolution_rate` only when denominator/review evidence exists, `source_revision`, `suppression_applied`.
No user IDs, ticket IDs, HMAC fingerprints, device identifiers, message bodies, payment references, private reflections or staff notes. Counts below five require **complementary suppression**; do not leak values by subtracting from totals or combining reporting windows. Zero verified production tickets means report **NOT OPERATIONAL / NO DATA**, not fabricated 0% resolution. Current core suppression helper is **source-only**, not a hosted reporting pipeline.

## Release disposition
**HOLD.** Current PR contains no hosted schema, Edge deployment or real ticket creation. Safe source-only engineering may continue, but QA and production require separate exact-scope approvals. No extra spending authorized.
