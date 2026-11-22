# GD-002-A — Phase II source-only execution / security review
**November 22, 2026 · Issue #275 · Draft PR #276 · Executive Command #274**
**Release: BLOCKED · Hosted QA: NOT RUN · Production: UNCHANGED**

## Authority and baseline
Founder reference was `075a22ca8967d4b4c979d52d2b9a1ded6d4b488a`. The live PR had advanced to `27be6404c77a5f187472530b5cc51658bf7a3a77` before this continuation, containing `guardian-support-core.mjs`, `edge/guardian-support-intake/index.ts`, the proposed transactional SQL and a new first synthetic test file. The earlier 29 Python/SQLite tests and seven static checks did **not** accept these new files.

## Source defects found and corrected
| Finding | Impact if deployed unchanged | Source correction | Commit |
|---|---|---|---|
| Aggregate small-cell subtraction | A suppressed category could be exactly inferred from total minus published group | Require exhaustive nonoverlapping counts and complementary suppression of another category; minimum five cannot be lowered | `5942e7cf911af3c99ef2e340f245566b2eb149a0` |
| Identical retries consume 5/hour cap | Network retry can exhaust a member's quota without creating a new case; racing duplicates waste allowance | Owner-key advisory transaction lock, existing open-ticket lookup **before** rate-window increment, unique open fingerprint fallback | `7f91a67f9350bea54a1de79de145a9cbc49765b7` |
| Unbounded streamed request body | Client can omit/forge Content-Length; `req.text()` reads entire body before length check | Byte-bounded stream reader, strict JSON content type, invalid body rejection | `195d738878a1ef21a7d66a189a0888b83c8f37ec` |
| Account erasure metadata and audit notes | Orphaned records might retain identifying metadata; free-text audit notes might contain sensitive information | Extend orphan redaction constraint; restrict legal hold reference shape; allow coded audit events only | `8e8d73e263428883e9424cab6a36526359ca889a` |
| DDL source corruption during edit | Staged SQL briefly contained duplicate blocks and multiple COMMIT statements; not migration-safe | Restore from known-clean `7f91a67` baseline, reapply privacy changes, verify one transaction / exactly three tables / one RPC, and add a structural regression test | `8e8d73e263428883e9424cab6a36526359ca889a`, `6587656621e9ffa8f7f879224b16847327405d34` |

No malformed SQL was executed on any Supabase project.

## Independent synthetic execution evidence
Source snapshot `940b180e11d5cd5d447803eaff2f14a80ebcc4a8`:
- **44/44 targeted checks PASS**, zero failures, using fetched **actual GitHub source** executed in an isolated JavaScript environment after stripping TypeScript-only annotations. Tests used mocked Request/Response streams, upstream Supabase Auth/fetch responses, and mock WebCrypto HMAC.
- Check topics: valid and hostile input fields, basic secret patterns, safety routing, duplicate canonicalization, business routing, fail-closed QA environment, origin controls, absent/rejected/anonymous/Auth-unavailable sessions, server-derived owner ID, no DB write for sensitive or emergency input, strict byte cap and JSON media type, duplicate return, rate error, uncertain persistence, complementary suppression, SQL structural and privilege declarations, dedupe-before-limit ordering, legal erasure metadata and coded audit constraints.
- The branch contains **50 authored Node `node:test` assertions** in `docs/guardian-desk/tests/security.test.mjs`. A native Node test-runner job or GitHub Actions run was **not executed/observed** in this environment; the 44 V8 checks are a **distinct** tested subset, not a claim that the repository's 50 tests all ran.
- SQL checks were **source-level assertions only**; PostgreSQL query-planner behavior, advisory locks, concurrent transactions, rate-window rollback, RLS, PostgREST ACLs and real schema migration remain **NOT RUN**.
- The test HMAC was a deterministic synthetic stub. Actual WebCrypto HMAC determinism, key rotation and Supabase legacy service-role JWT vs modern secret-key behavior require runtime compatibility tests.
- No actual user JWT, Auth account, customer record, product, Stripe charge/refund, hosted support ticket, transactional email, production endpoint or public marketing workflow was used.

## Current source architecture and security boundaries
- `guardian-support-core.mjs`: deterministic allowlist/validation, no arbitrary tool invocation or clinical decision-making, HMAC canonical input, source-only aggregate suppression.
- `edge/guardian-support-intake/index.ts`: QA ref hard lock; disabled unless explicit flag; exact allowed origin; verifies bearer user via Supabase Auth; rejects client owner/admin/payment fields; sends server-derived UUID and HMAC to privileged RPC only. Not deployed or bundled for hosted Supabase.
- `PROPOSED_TICKET_SCHEMA.sql`: **unapplied** transaction with three public RLS tables, own-ticket SELECT allowlist, no direct customer ticket writes, coded audit, service-role-only RPC. New tickets capped at five/hour per verified user; duplicate retries do not consume quota in the proposal.
- Backend authorization must still prove service-role EXECUTE ACLs and real cross-account RLS. The RPC's `SECURITY DEFINER` makes the server boundary especially consequential; never expose the service key.
- Legal-hold retention is **not operational**. Current orphan-redaction CHECK intentionally blocks Auth deletion until scrub/purge is approved; timestamps and audit event linking also need policy review.
- Customer safety regex is only a screening mechanism, not complete crisis detection; do not advertise crisis-intervention functionality.

## Read-only Commerce QA discovery
**NBJB Commerce QA** `fgpkejlmpfkxgpktgdzm` is ACTIVE_HEALTHY, Postgres 17.12; **21 public tables, five active deployed Edge Functions, six recorded migrations**, all belonging to existing member/commerce QA infrastructure. No Guardian Desk ticket tables/Edge function in inspected metadata. Existing advisor notices: 12 RLS/no-policy INFO entries and Auth leaked-password-protection WARN; no unrelated QA security changes made. Full isolation plan: `COMMERCE_QA_ISOLATION_AND_ROLLBACK.md`.

## Founder decision package — still gated
1. Review/approve the customer data minimization, disclosure, record lifecycle, rights and legal-hold procedures in `RETENTION_DISCLOSURE_FOUNDER_PACKET.md`.
2. Authorize **separately** a narrow existing-Commerce-QA schema write and synthetic acceptance with verified backup/rollback, usage limits and no interference with already populated commerce QA.
3. Define actual staff/privacy escalation and ownership without promising a human response time or 24/7 staffing. Later privileged support actions, public Help deployment, production database and PR merge need distinct exact-head release approvals.

## Executive Command reporting contract
Only aggregate counts with source, source revision, UTC time, period/coverage, disjoint/exhaustive group categories and complementary suppression. No case IDs, HMACs, email addresses, journals, summary text, billing identities, operational secrets or small cohorts in public GitHub. Current QA/production ticket metrics are **NOT OPERATIONAL**, not a fabricated resolved count.

**Disposition:** Source-only QA candidate improved and inspectable. Production unchanged; approval and hosted acceptance blocked.


## Independent native CI acceptance — additive checkpoint, 2026-11-22

The earlier 44/44 V8 source execution remains historical. New automated tests on **GitHub's public-repository read-only runners**, using only synthetic data and disposable local Docker PostgreSQL 17.12, have independently executed the branch's code and SQL:

- **50/50 native Node 22 `node --experimental-strip-types --test` tests passed.**
- **23/23 real PostgreSQL 17.12 fixture checks passed**, including schema apply, column permissions, service-only RPC execution, own-vs-other-row RLS, eight concurrent same-account submissions deduplicating correctly, the five-new-tickets/hour cap, duplicate retry at quota, failed-audit transactional rollback and account erasure redaction constraints.
- Both jobs were **SUCCESS** in Actions run [45058064160](https://github.com/Hansumhunk/not-broken-just-burning/actions/runs/45058064160) for exact tested head `11c54168a18410419978da35978b494da0d47cc8`. The SQL was applied **only** to the disposable Docker fixture, never to Commerce QA or production.
- First CI attempt [45057882152](https://github.com/Hansumhunk/not-broken-just-burning/actions/runs/45057882152): PostgreSQL 23/23 PASS, Node 49/50; corrected a stale aggregate test fixture with complete category totals at commit `61296995e11a572d1758fda6d6085d8aaf6a5d5e`.
- Second attempt [45058004890](https://github.com/Hansumhunk/not-broken-just-burning/actions/runs/45058004890): Node 50/50 PASS; Docker's `pg_isready` raced with creation of the fixture database (test infrastructure startup, not a SQL logic failure). Corrected CI readiness to perform a real query against `guardian_fixture` at `11c54168a18410419978da35978b494da0d47cc8`.
- Erasure follow-up fix `eb117e5f7daffa0e2ac3c5dbd3133d693dd489b5` requires `CLOSED` status before zero-fingerprint orphan redaction, preventing two open tickets from colliding on the active-issue unique index; the real PostgreSQL fixture independently verified deleting an owner after scrubbing two cases.

**Verification scope is intentionally narrow:** Real PostgreSQL concurrency/RLS in a disposable container is stronger than static analysis, but it is still not Supabase's hosted Auth/Edge/Data API/security environment. Hosted JWT admission, provider key compatibility, actual QA backup/restore, retention execution, multi-region consumer rights, human escalation staffing and full GD01–GD30 release acceptance remain **BLOCKED / NOT RUN**.

A subsequent documentation-only update may move the draft PR head beyond the tested commit; distinguish last **code-tested SHA** `11c54168...` from the final documentation head. The existing test workflow reruns automatically for this document path.
