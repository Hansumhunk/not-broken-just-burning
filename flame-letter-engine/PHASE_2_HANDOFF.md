# Eternal Flame Engine — Phase II acceptance and release handoff
Date: 2026-11-22. Development-only. **NO production dispatch or merge authorization.**

## Inventory recovered

Issue #1 records a private campaign/template archive with **31** distinct entries and 62 HTML/plain files: 6 welcome (D0/2/4/7/10/14), 12 weekly, 4 Free onboarding, 4 Plus onboarding, 5 product. Historical Brevo template identifiers #6–36 were reported in issue comment 7046942504; this phase did not reauthenticate them. The separate one-recipient marketing test campaign #1 is not one of those historical template identifiers.

The private archive content, original twelve weekly subjects, and exact original twenty-case matrix are **not accessible** in current connected source search. No fresh campaign duplicate/uniqueness pass can be claimed. The new local-only inventory_compare.py accepts a privately supplied 31-row metadata inventory, verifies the 6/12/4/4/5 breakdown, flags possible subject overlap and fails closed when any historical entry is missing. No private subjects, subscriber records or archive bytes were copied to public Git.

Four generated review drafts and their sources:
- boundaries-hurt — story-boundaries.html. Boundary grief versus validity. **REVIEW; historical weekly overlap unknown.**
- one-stone — story-one-stone.html. Urgency triage and a twenty-minute next action. **REVIEW; potential welcome/first-seven-days thematic overlap.**
- shame-action — story-shame.html. Behavior-specific accountability versus shame. **REVIEW; compare with existing Guardian/shame teaching.**
- survival-off-switch — story-survival-skill-off-switch.html. Deliberate start/stop rules for heightened vigilance. **REVIEW; meaningful distinct practical angle, but weekly archive comparison unavailable.**

Status: 4 review-ready draft pairs, **0 certified original against the private archive**, **0 editorially approved**, **0 scheduled**, 4 further topics still available. Nov 25 / Dec 2 / Dec 9 / Dec 16 are EDITORIAL PLANNING dates only.

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

Exact private test-case definitions remain inaccessible. Below is a conservative checkpoint from issue #1 comment 7055834268, not an authoritative reinterpretation of the original matrix.

| Case | Disposition | Scope |
| --- | --- | --- |
| T01 | HISTORICAL/PARTIAL | Current account/allowance unverified |
| T02 | HISTORICAL/PARTIAL | Sender/reply final configuration unverified |
| T03 | HISTORICAL/PARTIAL | Mailing address privately reconciled; final footer/privacy integration pending |
| T04 | NOT RUN | Refusal/negative consent test |
| T05 | PARTIAL | Positive CAPTCHA view; enforcement not verified |
| T06 | POSITIVE PASS | Founder-controlled DOI signup |
| T07 | POSITIVE PASS | Founder DOI confirmation |
| T08 | PARTIAL | One list contact after duplicate attempt; second DOI message generated |
| T09 | NOT RUN/HELD | Welcome automation inactive |
| T10 | PARTIAL GROUP EVIDENCE | Actual unsubscribe lifecycle, exact case mapping unavailable |
| T11 | PARTIAL GROUP EVIDENCE | Same limitation; individual pass not claimed |
| T12 | PARTIAL GROUP EVIDENCE | Same limitation; individual pass not claimed |
| T13 | PARTIAL GROUP EVIDENCE | Same limitation; individual pass not claimed |
| T14 | PARTIAL GROUP EVIDENCE | Same limitation; individual pass not claimed |
| T15 | PARTIAL GROUP EVIDENCE | Marketing blocklist/transactional separation shown, exact case mapping unavailable |
| T16 | PARTIAL | Gmail delivery/authentication; Outlook not tested |
| T17 | PARTIAL | Two workflows inactive; no global queue proof |
| T18 | PARTIAL | Workflow logs empty in selected historic filters only |
| T19 | PARTIAL | Zero active workflow contacts shown; attempted-send suppression not proven |
| T20 | WITHHELD | Distinct production authorization required |

Evidence: issue #1 comments 7054910860 (DOI), 7055412063 (single marketing report), 7055433265 (marketing/transactional permission difference), 7055807880 (six marketing event rows), 7055725248 and 7055732869 (automation isolation), 7055834268 (consolidation). New Python and Node tests are never counted as provider T01–T20 passes.

## Validation

Phase II GitHub Actions run #44987837572 passed: **39/39 Python tests and 17/17 Node tests**, four HTML/plain-text review candidates generated and review artifact uploaded. This was a non-production development branch run; no Brevo mutations or live send occurred.

## Integration order and founder decisions

PR #268 remains DRAFT stacked onto draft PR #230. PR #230 currently diverges from production main and overlaps index.html, join.html, privacy.html and resources.html. Main also carries a newer sitemap baseline. PR #254 First Seven Days is draft/nonmergeable at latest readback; PR #250 Front Door Optimization remains separately draft. Do not undo accepted SEO, Search Dominion's reported 101-URL sitemap, analytics, membership, privacy or commerce improvements.

A safe eventual release requires: (1) separately approved customer-experience baseline resolution, (2) conflict-safe exact-head PR #230 integration and static/browser CI, (3) PR #268 updated on its accepted parent and all ledger tests green, (4) authenticated provider and original matrix reconciliation plus approved address/consent/footer/retention, approved weekly inventory, real queue/suppression acceptance, and private server-only durable storage/dispatch adapter, (5) founder approvals separately for PUBLIC SIGNUP, WELCOME AUTOMATION, WEEKLY AUDIENCE/SCHEDULE, and PRODUCT MARKETING once commerce QA is accepted.

Current founder intervention: **none required for this development checkpoint**. Do not send, schedule, resubscribe, import, activate production workflows, change DNS/billing/entitlements/databases, spend, or merge.
