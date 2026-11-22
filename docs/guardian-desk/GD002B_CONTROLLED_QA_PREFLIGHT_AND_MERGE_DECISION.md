# Guardian Desk GD-002-B — Controlled non-production qualification and source-only merge decision

**Founder authority:** GD-002-B, 2026-11-22. **Status: conditional schema-only Commerce QA trial is NOT released because mandatory recoverable-backup proof is missing.** Source merge not authorized by this document. Existing issue **#275**, draft PR **#276**, Executive Command **#274** remain the only tracking records.

## 1. What the founder approved, precisely

- **Data governance:** existing minimal-input/privacy/erasure/legal-hold principles are accepted as **working QA engineering rules**. Suggested review intervals (90/180 days, 48-hour counters) are *not* enacted as customer-facing terms or automatic deletion jobs. No real ticket content may be collected, no published terms amended.
- **Non-production database:** read-only Commerce QA preflight is permitted; additive **schema-only** trial is **conditional** on independently verified isolation, recoverable backup, no additional spending, exact additive diff and safe rollback. This is not blanket authorization to execute SQL.
- **Human operations:** design-level escalation and human oversight accepted, **no actual staffing established**, no response time/24×7 assertion, human assignment or privileged support action.
- **Source release:** the existing draft PR #276 may be reconciled against current main; any merge needs **one separate founder exact-head source-only approval**. No authorization to merge other PRs or turn on public features.
- **Explicit prohibitions:** no Edge deployment, reuse/create of Auth identities, live customer tickets, payment/Stripe changes, marketing, production SQL, customer emails, new spending, PR merge or founder-performed manual browser acceptance.

## 2. Independent read-only Commerce QA inspection

**Exact connected target:** `NBJB Commerce QA` (`fgpkejlmpfkxgpktgdzm`), PostgreSQL **17.12**, project **ACTIVE_HEALTHY**, distinct from production `NBJB Phase Two` (`plhbvtbvtxfzulsaxuim`). Existing QA project should not be treated as disposable.

Metadata and read-only catalog results on 2026-11-22:

- **21** pre-existing public application tables, all RLS-enabled; existing commerce/member fixtures include products, orders, receipts, entitlement and webhook history. This inventory is *metadata only*; customer rows were not exported.
- **5** existing deployed Edge Functions: `commerce`, `stripe-live-webhook`, `create-live-customer-portal-session`, `read-flamewalker-lesson`, and `create-live-checkout-session`. No Guardian Desk Edge deployment.
- **6** pre-existing database migrations; 0 Supabase database branches reported. No support/Guardian tables or RPC found in inspected `public`, `private`, `support` metadata.
- Read-only SQL catalog queries independently confirmed **0** `guardian_support_%` relations, **0** `guardian_support_%` procedures, **0** prospective-name index/table collisions. `public` is the only one of `public/private/support` schemas present.
- Existing `auth.users` signup trigger `membership_qa_on_auth_signup`; commerce and entitlement triggers also exist. Proposed Guardian Desk SQL references `auth.users` through FKs; it does not create a new Auth user or run that signup trigger.
- Security Advisor baseline: **12 RLS/no-policy INFO notices** and **1 Auth leaked-password-protection WARN** (pre-existing, unrelated to Guardian Desk). No separate fix authorized.
- **Organization subscription verified as `free`/`tier_free`** via Supabase organization metadata. Existing project health and absence of naming conflicts do **not** prove a recoverable backup or restore process.

### Conditional safety gate result: **NO-GO for hosted schema trial**

Supabase's current [Database Backups documentation](https://supabase.com/docs/guides/platform/backups) says automatic daily backups are provided to Pro/Team/Enterprise projects and recommends manual `supabase db dump` exports for Free-tier projects. No backup-enumeration/restore verification action is available in this connector; we did not obtain a reproducible, restorable backup of the populated Commerce QA project or verify a restoration drill. Neither `BEGIN`/rollback semantics nor a schema-only diff is a substitute for recovery from accidental damage.

**Therefore the founder's recoverable-backup prerequisite is NOT satisfied. No `apply_migration`, `execute_sql` DDL, Edge deployment, Auth account/test reuse, or other hosted write was performed.** This is a real qualification blocker, not a new request for manual browser QA.

**Lowest-cost resolution path:** identify/authorize a verified no-cost logical backup and a restricted restoration rehearsal *outside* the populated QA environment, with strong credential handling and storage controls. Only when the artifact can be authenticated and restored, and exact schema/no-cost/isolation checks pass, may a **schema-only** trial proceed under this directive. Never create a paid plan/branch, store DB credentials in GitHub, or overwrite commerce QA. If a verifiable no-cost recoverable backup is not possible, remain in disposable Docker PostgreSQL acceptance without hosted writes. A separate human designation and future customer policy/public release review still apply.

## 3. Proposed schema-only change boundary

The reviewed **unapplied** `PROPOSED_TICKET_SCHEMA.sql` would add exactly:
- Tables: `guardian_support_tickets`, `guardian_support_events`, `guardian_support_rate_windows` (all under `public` with RLS).
- One privileged `guardian_support_accept(uuid,text,text,text,text)` RPC, executable by `service_role` only; fixed search path and transactional inserts/rate counter/audit.
- Four new indexes and one owner SELECT RLS policy, column-level grants to authenticated members and no browser mutation access.
- References to existing `auth.users` only, no changes to existing tables/functions/users or payments.

**Separation of approvals:** even after qualifying schema-only QA, no `guardian-support-intake` Edge deployment, test identity use/creation, staff queue, support data collection, publication, cancellation or Stripe mutations may be inferred from this permission.

The authorized rollback plan remains `COMMERCE_QA_ISOLATION_AND_ROLLBACK.md`; its template is destructive and **approval-gated**. Real backup and restoration test evidence are required in addition to additive object-drop ability.

## 4. Source-only PR #276 vs current production main

GitHub compared current `main` at **`66428c4145cae34e4c2bdfec6e8969174a98882f`** (latest observed merge of previously approved Front Door PR #250) against `feature/guardian-desk-001-audit-20261122` at baseline **`59da8c75fa40f9172cae69daed5b4f2cbd2aa496`**:

- Main advanced **53 commits** since the common base, while Guardian Desk is **38 commits** ahead of that base. Branch reports `mergeable=true` but has not itself integrated those releases; do not reset, force-push, replace `main`, or assume past mergeability will remain true forever.
- The GitHub compare reports **15 added paths** entirely under `docs/guardian-desk/**` plus **one** new source QA GitHub Actions workflow under `.github/workflows/guardian-desk-source-qa.yml` (14 Guardian files + one workflow). **Zero edits/deletions of existing `main` files.** No public Help UI or production deployment manifests/SQL migrations changed.
- The new workflow triggers on Guardian Desk `pull_request` changes only; it runs Node tests and an ephemeral Docker Postgres, with GitHub repository access read-only and no hosted service credentials or Supabase network calls. Existing accepted commerce, Auth and site work is outside the diff.
- Prior independent acceptance on code/doc head `59da8c75fa40f9172cae69daed5b4f2cbd2aa496`: [run #45058145640](https://github.com/Hansumhunk/not-broken-just-burning/actions/runs/45058145640) **50/50 native Node tests PASS**, **23/23 PostgreSQL 17.12 fixture PASS**, both jobs SUCCESS. This says nothing about a hosted Edge/deployed DB.
- **Merge reconciliation requirement:** repeat the comparison and verify PR mergeability and automated CI **at the final exact source-only HEAD against then-current main**; a documentation-only continuation commit does not change backend logic, but still requires a fresh exact-head check. Public GitHub source visibility is not the same as activating a production Help endpoint; do not call a source merge a public feature launch.

### Recommendation for one exact-head decision

**Source-only merge:** **CONDITIONALLY ELIGIBLE FOR FOUNDER APPROVAL**, independently of the blocked hosted-schema test, once the final PR head has a clean merge simulation and the two narrow CI jobs succeed against updated main. Approval must explicitly identify its exact head and restrict the operation to merging **PR #276 only** with code/docs remaining inert and unhosted. **No merge executed.**

**Hosted Commerce QA schema trial:** **NO-GO pending verified recoverable backup** and remaining preflight isolation/cost proofs. User authorization cannot be interpreted to waive this condition. More disposable fixture testing is permitted without touching hosted Supabase.

**Public production release:** **NO-GO**; remains independently prohibited.

## 5. Executive Command handoff

Post only the material source qualification outcome and the binary backup blocker to Issue #274. The Guardian Desk subsystem is still **NOT HOSTED / NOT OPERATIONAL**; no real support tickets, response times, or verified resolution counts are measurable. Continue small-cohort suppression and avoid customer or support content in GitHub.

**No founder manual browser testing is requested.** All possible inspection in this phase was connector read-only or source-only; the pending action is a verifiable backup capability/authorization, not another front-end test.
