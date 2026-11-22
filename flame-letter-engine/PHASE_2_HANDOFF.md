# Eternal Flame Engine — Phase II acceptance and release handoff
Date: 2026-11-22. Development-only. **NO production dispatch or merge authorization.**

## Inventory recovered

Issue #1 records a private campaign/template archive with **31** distinct entries and 62 HTML/plain files: 6 welcome (D0/2/4/7/10/14), 12 weekly, 4 Free onboarding, 4 Plus onboarding, 5 product. Historical Brevo template identifiers #6–36 were reported in issue comment 7046942504; this phase did not reauthenticate them. The separate one-recipient marketing test campaign #1 is not one of those historical template identifiers.

The two original owner-only ZIP archives were RECOVERED through connected Drive and inspected locally on Nov 22. Both outer ZIPs and both nested archives passed integrity checks. The original 31-row release inventory, twelve weekly plain-text bodies, six welcome bodies, 20-case lifecycle matrix and original provider/import registers were reopened. The nested source ZIP SHA-256 matched its own archive audit (d975cfa652116ec4ca3e353028bd27f4e8f496c427a0252d9fdabe37f990f8c2); 31 HTML/plain pairs and 62 native unsubscribe markers were checked. The old import queue is a pre-provider baseline (all 31 NOT_IMPORTED), not proof of current Brevo status; later Nov 20 founder provider evidence takes precedence within its scope. No private subjects, contact addresses, ZIP contents, or identifiers were copied into public Git. The inventory_compare.py tool now permits local future comparison without export.

Private source comparison identified significant collisions: one-stone repeats welcome message 03's One Stone mountain exercise; shame-action duplicates weekly edition 09's accountability/identity and repair lesson. The remaining initial catalog ideas on timeline/clarity, restraint and fatherhood also substantially revisit earlier weekly or welcome themes. These six topic IDs are now HELD in the disabled manifest, not deleted from history.

Replenishment candidates after deduplication:
- boundaries-hurt — story-boundaries.html: boundary grief following an appropriate limit, distinct from weekly 03's boundary-versus-control mechanics.
- survival-off-switch — story-survival-skill-off-switch.html: explicit start/stop condition for protective habits, distinct implementation focus from weekly 12's keep/adapt/release integration review.
- healthy-validation — story-healthy-validation.html: obtain perspective without outsourcing judgment, distinct from weekly 10's brotherhood theme.
- reciprocity-early — story-reciprocity-before-exhaustion.html: express a concrete unmet need early without using a relationship scoreboard, distinct from weekly 04's trust-consistency teaching.

Four source-backed, review-only candidates are expected in the updated artifact; they remain **NOT EDITORIALLY APPROVED**. Two other distinct topics remain available for later review: over-responsibility and bounded documentation. No actual Brevo campaign approval or scheduling. Nov 25 / Dec 2 / Dec 9 / Dec 16 are EDITORIAL PLANNING dates only.

## Durable local ledger implemented

Code files:
- flame-letter-engine/ledger_schema.sqlite.sql
- flame-letter-engine/publication_ledger.py
- flame-letter-engine/test_publication_ledger.py (22 local SQLite lifecycle/negative/concurrency tests)
- flame-letter-engine/inventory_compare.py and test_inventory_compare.py (7 tests)

The schema records immutable source/content SHA-256, source link, editorial review and approval evidence, one unique campaign binding, audience segment reference, UTC dispatch window, capped attempt number, claim token hash, retry proof, provider receipt and append-only event audit. No subscriber IDs/emails, contacts, consent mirrors, sensitive reflections, private paid content or API secrets are persisted.

State transitions: draft → review → approved → queued → inflight → sent → delivered; also failed, suppressed, cancelled and reconcile_required. A crashed/unknown inflight claim is quarantined, **never automatically resent**. An inspected provider confirmation of non-send and explicit action are required before retry. SQLite BEGIN IMMEDIATE and unique constraints protect simulated single-process/multi-connection claims. The code is deliberately non-sending and rejects release_enabled=true.

These tests validate the local ledger, **not production exactly-once delivery**, which must be guaranteed through provider-side reconciliation, private server authentication/authorization and a deliberate deployment.

## Brevo read-only adapter implemented

Code:
- flame-letter-engine/brevo_readonly.py
- flame-letter-engine/test_brevo_readonly.py (10 tests)

The adapter uses allowlisted GET-only operations against /v3/account, /v3/emailCampaigns, /v3/emailCampaigns/{id}, /v3/contacts/lists, /v3/contacts/lists/{id}, and /v3/contacts/{numeric_test_id}. Campaign HTML, recipients, contact email, raw provider logs and tracking URLs are excluded from returned projections. The only contact-level projection is an owner-authorized test contact's marketing blocklist boolean; transactional permission is deliberately not inferred from it. Authentication is disabled by default and can only be configured in a separately authorized private environment. It cannot produce a valid dispatch authorization snapshot from aggregate reads.

Official Brevo references:
https://developers.brevo.com/reference/get-email-campaigns
https://developers.brevo.com/reference/get-email-campaign
https://developers.brevo.com/reference/get-contact-info
https://help.brevo.com/hc/en-us/articles/40158285046930-About-API-key-permissions

**No authenticated read-only Brevo session/key was available in this run.** The current provider queue, quota, exact approved inventory, suppression under future attempted send and welcome timing were not inspected or claimed passing.

## Original T01–T20 historical disposition map

The exact original T01–T20 case definitions were recovered from the owner-only provider integration archive. That CSV is a pre-test baseline (all provider cases initially NOT_RUN). The following case-level disposition incorporates later dated Nov 20 founder screenshots and issue #1 acceptance notes without promoting a partial positive-path observation to a full original-case pass.

| Case | Disposition | Scope |
| --- | --- | --- |
| T01 | HISTORICAL/PARTIAL | Current account/allowance unverified |
| T02 | HISTORICAL/PARTIAL | Sender/reply final configuration unverified |
| T03 | HISTORICAL/PARTIAL | Mailing address privately reconciled; final footer/privacy integration pending |
| T04 | NOT RUN | Refusal/negative consent test |
| T05 | PARTIAL | Positive CAPTCHA view; enforcement not verified |
| T06 | PARTIAL/POSITIVE PATH | Pre-confirmation list held zero; full marketing exclusion case not fully reproduced |
| T07 | PARTIAL/POSITIVE PATH | DOI confirmed once; exact recorded consent version and timestamp acceptance not fully inspected |
| T08 | PARTIAL | One list contact after duplicate attempt; second DOI message generated |
| T09 | NOT RUN/HELD | Welcome automation inactive |
| T10 | PARTIAL | Marketing campaign unsubscribe propagated to blocklist; stopping an active automation before its next send NOT RUN |
| T11 | NOT RUN | Unsubscribe from active automation preventing the next broadcast |
| T12 | NOT RUN | Hard bounce safe simulation / provider confirmation |
| T13 | NOT RUN | Soft bounce safe simulation / provider confirmation |
| T14 | NOT RUN | Complaint safe simulation / provider confirmation |
| T15 | PARTIAL | Marketing suppression/blocklist observed; deletion and lawful suppression retention NOT RUN |
| T16 | PARTIAL | Gmail delivery/authentication; Outlook not tested |
| T17 | PARTIAL | Founder-only test list used, but production recipient-exclusion check not independently established |
| T18 | PARTIAL | Both workflows inactive and filtered logs empty; global pending queue zero NOT VERIFIED |
| T19 | NOT RUN | Hosted form shutdown and direct-link enrollment rejection not tested |
| T20 | WITHHELD | Distinct production authorization required |

Evidence: issue #1 comments 7054910860 (DOI), 7055412063 (single marketing report), 7055433265 (marketing/transactional permission difference), 7055807880 (six marketing event rows), 7055725248 and 7055732869 (automation isolation), 7055834268 (consolidation). New Python and Node tests are never counted as provider T01–T20 passes.

## Validation

Initial Phase II GitHub Actions run #44987837572 passed: **39/39 Python tests and 17/17 Node tests**. A further run after editorial deduplication #44988112890 succeeded with four review-only edition drafts. The tests are code-level only; no Brevo mutation or live send occurred.

## Integration order and founder decisions

PR #268 remains DRAFT stacked onto draft PR #230. PR #230 currently diverges from production main and overlaps index.html, join.html, privacy.html and resources.html. Main also carries a newer sitemap baseline. PR #254 First Seven Days is draft/nonmergeable at latest readback; PR #250 Front Door Optimization remains separately draft. Do not undo accepted SEO, Search Dominion's reported 101-URL sitemap, analytics, membership, privacy or commerce improvements.

A safe eventual release requires: (1) separately approved customer-experience baseline resolution, (2) conflict-safe exact-head PR #230 integration and static/browser CI, (3) PR #268 updated on its accepted parent and all ledger tests green, (4) authenticated current provider queue/permissions acceptance plus approved address/consent/footer/retention and four separately approved weekly editions, real queue/suppression acceptance, and private server-only durable storage/dispatch adapter, (5) founder approvals separately for PUBLIC SIGNUP, WELCOME AUTOMATION, WEEKLY AUDIENCE/SCHEDULE, and PRODUCT MARKETING once commerce QA is accepted.

Current founder intervention: **none required for this development checkpoint**. Do not send, schedule, resubscribe, import, activate production workflows, change DNS/billing/entitlements/databases, spend, or merge.
