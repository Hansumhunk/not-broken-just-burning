# Project Ignition III / Directive 002 — Eternal Flame Engine

**Phase I historical foundation:** Subsequent original archive recovery, exact T01–T20 reconciliation, durable ledger, deduplicated editorial inventory and 56-test acceptance are documented in [flame-letter-engine/PHASE_2_HANDOFF.md](flame-letter-engine/PHASE_2_HANDOFF.md). That newer handoff supersedes Phase I's inaccessible-private-archive and CI-pending notes.

Status: **DRAFT DEVELOPMENT ONLY**. This is a stacked engineering change based on draft PR #230.
No subscriber import, no Brevo API credentials, no send adapter, no live form release, no DNS, no merge/deployment, and no monetary spend.

## Evidence boundary (21 November 2026 baseline)

- Issue #1 and draft PR #230 are the existing owners. Do not duplicate the original campaign archive.
- Historical owner-controlled archive: 31 campaign templates (6 welcome, 12 weekly, 4 free, 4 Plus, 5 product), 62 HTML/plain pairs. These are **not** the seven generic shells in this public repository.
- Original T01–T20 acceptance matrix is held privately; no exact private matrix contents or contact details were copied into this public repository.
- Recovered Nov 20 provider evidence: hosted DOI positive path; one controlled marketing campaign delivered; real unsubscribe; email-marketing blocklist with transactional permission left subscribed. Existing two Brevo workflows inactive; no active entries shown in inspected views. The provider's whole outbound queue and attempted-send suppression enforcement are **unverified**.
- The repository remains public. Do not commit subscriber information, campaigns from private archives, sensitive source documents, credentials, paid content or internal subscriber/financial data here.
- Current Brevo state, daily quota, live campaigns and subscriber totals have **not** been independently read from an authenticated provider in this engineering change. Provider observations are historical.
- A fresh read-only Supabase public-table inventory shows no separate newsletter subscription or campaign-delivery tables in the exposed public schema. It does not establish Brevo subscriber totals and is not a reason to copy marketing records into member tables.
- PR #230 is source-divergent from main and overlaps other drafts in index/join/privacy/resources; this change does not touch those paths.

## What this branch actually builds

1. **Curated public-source editorial catalog**: eight subject-grounded, original teaching/question/tool/action sets, each attached to a confirmed public NBJB source URL.
2. **Offline candidate engine**: validates source paths, blocks noindex/private sources, finds four upcoming editorial planning slots, avoids known approved/published/suppressed topics, creates HTML and plain-text review drafts, hashes each version, writes candidate metadata, and alerts on shortage.
3. **Release-gate manifest**: all distribution flags remain false. Private provider-approved inventory and original campaign IDs are not fabricated.
4. **Pure dry-run eligibility guard**: enforces separate marketing consent, opt-out precedence, provider marketing eligibility, confirmed entitlements, welcome/weekly spacing, and a deterministic duplicate key *for simulation*. No actual mail is sent.
5. **GitHub Actions review workflow**: runs offline tests and stages review artifacts. Weekly schedule is inert in this unmerged branch (scheduled Actions only run from the default branch). Even if later approved for merge, the action has read-only repository permission, no email adapter, no API credentials, and no send command.

Commands (Node 22, only standard library):

    node --test scripts/test_flame_letter_editorial.mjs scripts/test_flame_letter_send_guard.mjs
    node scripts/flame_letter_editorial.mjs --as-of=2026-11-21 --weeks=4 --out=.flame-letter-staging

The output includes four draft HTML files, four plain-text files, four content-hash/metadata JSON files, a reviewable proposed draft-ledger manifest, and one report. The proposed-manifest.json is a review artifact; an editor must reconcile it with the private provider inventory and commit accepted pending-draft records to durable version control before later runs can avoid re-drafting them. Proposed Wednesdays are for editorial planning only. **They are not an authorized marketing schedule.**

The output deliberately retains a non-sendable draft banner, native unsubscribe placeholder and unresolved verified-business-address placeholder. It must never be pasted directly into a live scheduled campaign.

## System architecture and handoff

    Visitor
      -> Explicit voluntary newsletter offer (PR #230; OFF)
      -> Existing owned Brevo hosted form + DOI (historical positive test)
      -> Verified marketing permission, provider suppression and preferences
      -> Existing Brevo welcome workflow (INACTIVE)
      -> Existing 12 approved weekly edition assets (historical, private)
      -> Brevo authorized campaign schedule (NOT AUTHORIZED)
      -> Aggregate Brevo + existing NBJB growth reporting

    Public educational pages
      -> Curated editorial topic catalog
      -> Offline 4-week draft-only production + source checks
      -> Versioned draft artifacts, plain + HTML + sha256
      -> Human fact/voice/safety/link/footer review
      -> Founder explicit editorial approval
      -> Reconcile private provider inventory + release controls
      -> Approved weekly queue only AFTER separate audience/schedule approval
      -> Delivery + audit + exception alerts (PROVIDER INTEGRATION NOT YET BUILT)

### Explicit automation levels

- **Level A — Potential automatic sending**: only previously approved content, after verified provider consent/queue/suppression tests AND a separate founder authorization for exact schedule and audience. No Level A adapter exists in this change.
- **Level B — Autonomous draft preparation**: this development code creates review-only candidate editions. New material can never graduate to approved status through this engine.
- **Failure policy**: if four future approved editions are not available or the catalog is exhausted, report a gap and **hold**, never manufacture fake approval or send filler.

## Audience and permission matrix

| Audience | Necessary permissions | What must never be inferred |
| --- | --- | --- |
| Newsletter-only | Explicit marketing opt-in, DOI/verified address, Brevo marketable status | Account creation, contact email or site visit |
| Free Flamewalker | Verified free membership AND separate relevant communications permission | Free account equals a newsletter subscription |
| Flamewalker+ | Authoritative active paid entitlement AND appropriate consent/transactional category | A checkout attempt equals active paid access |
| Standalone product customer | Authoritative owned SKU; transactional messages only for their legitimate purchase, marketing only with separate consent | A product page visit or unrelated SKU grants ownership |
| All audiences | Suppression/complaint/bounce precedence, allowed frequency, unsubscribe | That transactional permission overrides marketing opt-out |

Private reflection entries, personal journals, medical/legal/court files and paid protected lessons never enter marketing segments. Essential purchase/account email must use an independently appropriate transactional route, not the marketing guard.

**Technical nuance:** the simulated SHA-based duplicate key is not an atomic queue, and a local JSON manifest is not a provider-authoritative send ledger. Actual idempotency requires a durable transactional claim with a unique constraint and safe recovery; actual enforcement requires fresh Brevo status immediately before every outbound send, plus queue inspection on shutdown. No such integration has been activated.

## Acceptance evidence: reconciled policy, not invented T-cases

The private source of the original T01–T20 numbering has not been accessible through this public repository. The issue #1 historical summary is authoritative for these limited dispositions:

| Original range | Recoverable disposition |
| --- | --- |
| T01–T03 | Historical or partial; sender/address/account details need final live reconciliation |
| T04 | Refusal/negative consent path not run |
| T05 | CAPTCHA positive use observed; enforcement negative case not run |
| T06–T07 | Positive-path hosted DOI **PASS** for the authorized founder-owned identity on Nov 20 |
| T08 | **PARTIAL**: re-submission kept one list contact but re-issued a DOI email |
| T09 | Welcome automation **NOT RUN** (workflow inactive) |
| T10–T15 | Portions of actual unsubscribe, marketing blocklist, and transactional separation demonstrated; **do not assume every individual subcase passed** |
| T16 | Gmail authentication/delivery partial; no Outlook coverage |
| T17–T19 | Workflow dashboard/log isolation partially evidenced; global queue zero and attempted suppression enforcement **not proven** |
| T20 | Explicit production release **WITHHELD** |

New development acceptance (not replacements for T01–T20):
- Source isolation, four-week draft generation, HTML/plain output and deterministic digest: unit tests written; CI result must be read on the exact commit.
- Failed or duplicate inputs, approval policy hold, lack of verified marketing consent, audience tier mismatch, overlapping welcomes and simulated idempotency: unit tests written; do not call these provider passes.
- Current hosted signup and queue state, real Brevo workflow timing, provider suppression under attempted send, actual sending quota and unsubscribe link rendering after substitution remain launch-level provider obligations.

## Minimum operational dashboard (reuse existing NBJB growth and operations reviews)

Observe only aggregate counts:
- **Editorial**: approved editions ahead, candidate count, pending review, scheduled approved sends, missing publication slots.
- **Enrollment**: new DOI-confirmed, active marketing recipients, new unsubscribe/blocklist totals; separately show free registrations and Plus entitlements.
- **Delivery**: sent/delivered, bounces, complaints, suppressed, sending quota, overlap prevention.
- **Exceptions**: duplicate attempt, unexpected audience growth, missing verified address/footer, failed approval validation, queue mismatch, depleted draft inventory, provider API failure, missing next edition.
- **Attribution**: anonymous website intent is not a confirmed subscriber. Paid conversions require authoritative entitlement/payment reconciliation.

Use existing weekly operations and member-growth automations, rather than creating duplicate executive reporting schedules.

## Required implementation steps before autonomy can be claimed

1. Recover and privately preserve the exact original T01–T20 matrix and 31-campaign identifiers/versions. Reconcile approval/version digests without copying private campaign content into public git.
2. Finish and accept PR #230 against current main with conflict-safe integration (PRs #250, #254 and accepted privacy/analytics fixes). Keep all public signup gates disabled pending exact-head founder approval.
3. In authenticated Brevo, verify final hosted form, footer, unsubscribe behavior, suppression enforcement, provider queue state, sender identity, consent/retention text, and service quota. Do not reuse the now-blocklisted founder contact for marketing testing without new explicit consent.
4. Introduce a **private, durable publication and recipient-event ledger** (not the public manifest) and audited provider adapter with retry ceilings, reconciliation, atomic deduplication, scheduled queue cancellation, and rollback. Verify isolated test identity and sandbox separation before test sends.
5. Make the approved weekly inventory count real (not historical); require four approved upcoming editions when launch begins. The eight-topic public catalog is a **starter** supply, not an infinite stock of independently approved editorial copy.
6. After review and approval, decide whether new public articles should automatically become suggested topic candidates; keep AI-generated content review mandatory.
7. Validate end-to-end behavior from a fresh subscriber's explicit opt-in through DOI, welcome Days 0/2/4/7/10/14, weekly spacing, suppression, and failed-send recovery. Do not change original workflow identifiers.

## One founder release decision package (four separate approvals)

- **Decision A: Development and editorial review.** Approve or request revisions to this exact stacked code candidate. Does **not** approve a public signup, email or GitHub merge.
- **Decision B: Public opt-in launch.** Approve the reconciled exact-head PR #230 form/privacy/consent/retention release ONLY after provider-specific acceptance; maintain campaigns inactive unless separately approved.
- **Decision C: Welcome and weekly distribution.** Separately authorize verified provider automation, exact campaign editions, frequency calendar, and exact eligible audience. Explicitly check that marketing blocklists continue to win.
- **Decision D: Commercial campaigns.** Separate opt-in/entitlement verification and commerce acceptance first. Keep the five product campaigns dormant until fulfillment acceptance.

## Emergency shutdown (post-release procedure; NOT executed)

1. Disable any public opt-in and approved trigger, then **deactivate** Brevo marketing automations (not just pause).
2. Cancel scheduled marketing sends; confirm active contacts, queued emails and pending jobs are zero across relevant provider scopes. If not verifiable, incident remains open.
3. Preserve consent, suppression and delivery evidence. Never silently reconsent an unsubscribed person.
4. Disable newsletter-only deployment gates and provider adapter, while maintaining essential authorized account/purchase transactional mail separately.
5. Document incident, verify cessation in provider logs, require a new explicit approval and controlled test before reopening.

## Autonomy assessment

- Editorial candidate production: **IMPLEMENTED (offline candidate; CI pending at authoring)**.
- Editorial quality/safety approvals: **MANUAL / REQUIRED**.
- Durable source/version tracking: **PARTIAL** (source and draft digests; not provider publication state).
- Live confirmed subscription and welcome workflow: **HISTORICAL POSITIVE DOI / PROVIDER WORKFLOWS INACTIVE**.
- Fully autonomous approved weekly delivery, retries, queue shutdown: **NOT IMPLEMENTED**.
- Subscriber reporting/alerting: **SPECIFIED ONLY**; reuse existing operations reports after provider linkage.
- End-to-end production autonomy: **NOT RELEASE READY**.

Owner action is deliberately consolidated: review this draft PR, then authorize a separate exact-head provider acceptance and release package when the remaining blockers have evidence.
