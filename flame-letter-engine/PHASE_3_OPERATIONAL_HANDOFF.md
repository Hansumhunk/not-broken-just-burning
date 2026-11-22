# Project Ignition III / Directive 002-D — Phase III operational engineering handoff

Date: November 22, 2026. Target: draft stacked PR #268, based on draft parent PR #230. Authorization: DEVELOPMENT AND SYNTHETIC TESTS ONLY. Provider sending, campaign scheduling and production DB migrations are outside this report.

## What was recovered, not recreated

Phase II baseline: exact head ddf8542c13edccf27ea691dcbe60c98a6dc5865d; 39 Python + 17 Node tests; draft-only four-week generator, 31-item source reconciliation, local SQLite ledger, disabled manifest and GET-only Brevo adapter. Original private Drive archives include 31 HTML/plain campaign pairs (6 welcome, 12 weekly, 4 Free, 4 Plus, 5 product) and original T01-T20 matrix. No private archival bodies, contacts or founder records were committed publicly. Historical issue #1 founder Brevo evidence is preserved and not repeated.

## Phase III code changes and their scopes

1. ledger_schema.sqlite.sql — runtime control, append-only incident operations audit and immutable **separate campaign approval** binding. Local SQLite only.
2. publication_ledger.py — simulated campaign queue staging and claim both consult emergency halt **inside SQLite write transactions**; the old immutable edition, bounded retry, unverified outcome quarantine and duplicate claim logic remain.
3. private_runtime.py — owner-only private filesystem boundary (directory mode 0700, DB/backups mode 0600), HMAC role-scoped signed capabilities with <=1-hour validity, distinct editor, content approver, campaign approver, dispatcher, incident admin and data custodian authorities. All private server/API authentication, staff enrollment and MFA are external and NOT implemented here.
4. private_runtime.py — always-stop-on-start/restart, explicit reset of OFFLINE SIMULATION ONLY, locally durable emergency stop, quarantine of ambiguous inflight attempts, event audit, verified SQLite backup, digest-checked restore to an entirely NEW halted rehearsal copy and minimum 90-day archive retention before aged backup-only cleanup. Does not invoke Brevo or infer provider-wide queue cancellation.
5. provider_gate.py — pure synthetic policy preview with independent content and campaign approval references, exact campaign/audience/window, five-minute provider snapshot freshness, double opt-in/consent version+time, blacklisting, unsubscribes, bounce/complaint, welcome overlap and 48-hour gap, weekly 7-day interval, segment-completeness proof, sender authentication, remaining quota and protected reserve, scheduled duplicate check, queue visibility and shutdown proof. Returns aggregated hold codes only. The return always says live_provider_acceptance=false and dispatch_authorized=false.
6. brevo_readonly.py — read-only metadata for account, campaigns excluding HTML, specific campaign global aggregate stats, lists, scheduled campaign metadata, sender state and single authorized test contact's marketing blacklist boolean. No mailboxes, identities, bodies, recipient exports or mutation methods returned. Scheduled campaign list is NOT a guarantee of global automation queue drain.
7. review_staged.py — automatic four-draft HTML/plain SHA-256 parity and source/required section/footer/accessibility checks. Outputs an approval-review-report.json to a read-only GitHub Actions artifact after source generation. No automatic editorial acceptance.
8. EDITORIAL_APPROVAL_PHASE3.md — proposed exact-hash approval dossiers for four already deduplicated editions. Six overlapping earlier ideas remain suppressed.
9. test_private_runtime.py (20), test_provider_gate.py (20), expanded test_brevo_readonly.py (12), test_editorial_review.py (5) alongside the original 22 ledger and 7 inventory tests: **86 Python tests**. Prior Node protection suite: 17 tests. Total targeted checks: **103**.

Technical limitations: These are development and isolated recovery tests, NOT independent security audit, authorized live CRM verification, provider idempotent dispatch, cryptographic anti-replay across processes, operational incident response, staff IAM/MFA or live backup restore. The code deliberately offers no POST to Brevo, no subscriber list import, no sending method or service-role database migration.

## Reuse assessment of existing NBJB Supabase

Read-only connected project metadata: NBJB Phase Two, project plhbvtbvtxfzulsaxuim, status ACTIVE_HEALTHY, Postgres 17.6, region us-east-1. Its public tables include member progress, preferences and separate entitlements (RLS enabled), but **no distinct newsletter sender/campaign ledger table appeared in the inspected public schema**. Other non-public schemas and external Brevo records were not exhaustively inspected. Avoid reusing public membership tables for marketing consent: account signup does not authorize newsletters and Brevo remains marketing consent/suppression authority.

Reuse is technically conceivable *later* in a private, non-exposed schema after an approved migration, role grant review and RLS/privacy validation. This Phase III package deliberately remains isolated SQLite and has made **zero Supabase schema, data, permission or entitlement changes**, created no new project and incurred no charges. The existing GitHub Actions runner can conduct offline QA; it is not a secure permanent publication database and should not receive marketing keys.

## Brevo status — authenticated access not available in this run

Plugin discovery found no native Brevo connector/action. No existing private Brevo API session, credentials or Work Cloud Browser session were available to the engineering runtime. We did NOT inspect actual account state on Nov 22.

Verified historical Nov 20 founder-only positive events: own form/DOI, delivered/opened one marketing message, unsubscribe, Email campaigns Blocklisted, transactional separately Subscribed; two automations inactive, their filtered logs empty. These historical facts do not certify account quota today, exact 31 current campaign IDs, global outbound queue zero, attempted-send suppression, automatic welcome timing or direct-link form shutdown.

Official Brevo GET endpoint contracts checked in contemporary reference docs, including list campaign metadata and excludeHtmlContent, sender readback and list details. The adapter is GET-only; a private deployment and authenticated read access need later operator access, not a password in GitHub.

## Original T01–T20 disposition — unchanged from Phase II, improved synthetic coverage only

| ID | Provider acceptance carried forward | Phase III engineering/synthetic coverage |
| --- | --- | --- |
| T01 | HISTORICAL/PARTIAL | Local budget reserved; actual account allowance pending |
| T02 | HISTORICAL/PARTIAL | GET-only sender metadata prepared; real domain/reply status pending |
| T03 | HISTORICAL/PARTIAL | Footer placeholders and privacy references checked; final substitution pending |
| T04 | NOT RUN | Synthetic missing marketing consent rejected |
| T05 | PARTIAL | Human CAPTCHA/accessibility provider negative case pending |
| T06 | POSITIVE PATH/PARTIAL ORIGINAL CASE | Synthetic unconfirmed subscribers excluded |
| T07 | POSITIVE PATH/PARTIAL ORIGINAL CASE | Synthetic consent timestamp/version checks; actual provider record pending |
| T08 | PARTIAL | Duplicate SQL claim, duplicate queue preview and signed approval binding; real duplicate DOI/re-entry pending |
| T09 | NOT RUN / HELD | Welcome concurrency/frequency preview only; no automation run |
| T10 | PARTIAL | Synthetic unsubscribe blocks candidate; original active automation suppression pending |
| T11 | NOT RUN | Synthetic automation/broadcast suppression, no provider test |
| T12 | NOT RUN | Synthetic hard bounce holds |
| T13 | NOT RUN | Synthetic soft bounce holds |
| T14 | NOT RUN | Synthetic complaint holds |
| T15 | PARTIAL | Provider blocklist previously observed, privacy deletion case not run |
| T16 | PARTIAL | Both HTML/plain checked offline; Outlook live rendering pending |
| T17 | PARTIAL | Local audience-binding and full-segment negative tests |
| T18 | PARTIAL | Local emergency-stop and ambiguous inflight quarantine; provider queue proof pending |
| T19 | NOT RUN | No real hosted form shutdown attempt |
| T20 | WITHHELD | Public release smoke test explicitly unauthorized |

**DO NOT count any Phase III unit test as a new provider T-case PASS.**

## Editorial readiness

Four reviewed-for-structure candidates, all **human approval pending**: boundary grief, survival-habit stop conditions, seeking perspective without surrendering judgment, and early reciprocity requests. Historical comparison previously identified and held six redundant topics. Source links verified against available public HTML; HTML/plain-text and content hashes checked in build. Exact proposed editorial dates: November 25, December 2, December 9 and December 16, 2026. They are **not scheduled distribution dates**. Footer verified mailing address, native provider unsubscribe substitution and real send identity remain unverified/placeholder.

The dedicated EDITORIAL_APPROVAL_PHASE3.md lists the four exact SHA-256 digests. A request to change editorial copy requires a new hash and a new complete review; an editorial approval alone does not authorize provider sending.

## Release dependency and authority

- Parent draft PR #230 must be reconciled against the *then-current* main without reversing accepted analytics, SEO, privacy, free-member, commerce and the 101-URL sitemap baseline.
- Draft PR #254 First Seven Days and draft PR #250 Front Door have separate owners/approvals. No newsletter patch to shared index/join/privacy/resources files was made in this phase.
- PR #268 remains stacked on PR #230, both draft/unmerged. Offline Monday draft schedule on a non-default branch is inert; after any eventual authorized merge it remains content-staging only, without send code.
- Before private deployment: approved host identity provider/role policy, secret management, backing store, security review, restore/rotation procedure, operational budget and provider read-only queue/consent acceptance are required. None are declared complete merely because local tests pass.
- Release decisions remain separate: (A) public email opt-in, (B) welcome automation, (C) weekly audience/calendar content approval, (D) product announcements after commerce QA. No approval inferred or requested prematurely.

## Emergency handling

Local emergency stop is authoritative for the **local simulated queue only**; it marks uncertain inflight operations RECONCILE_REQUIRED. It cannot cancel already scheduled or pending Brevo sends, which require independent authenticated provider-side shutdown, operator verification and incident evidence. Restore rehearsals do not overwrite an existing DB or reactivate a queue. Retention cleanup purges only verified old local backup copies, never consent, account, suppression or immutable audit information.

**Current founder action: none required to retain this non-production milestone.** The next genuine approval boundary is a private operational host/provider connection and later exact-head content+public release approvals. No spending, DNS, production DB or customer-experience changes authorized.
