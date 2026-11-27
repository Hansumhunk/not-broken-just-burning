# Guardian Desk — founder privacy, retention and disclosure decision packet
**Directive GD-002-A** · 2026-11-22 · **PROPOSED ONLY; no live collection or policy update**

## Decision objective
Approve a proportionate support-data policy **before** any hosted ticket submission. This draft is a business decision framework for legal/privacy review, not a statement that a specific statute applies to NBJB or that any retention period is mandatory. Do **not** silently change `privacy.html`, live terms, or any customer records under this source-only directive.

### Data collected and purpose
- Authenticated member's verified Supabase user reference (never self-entered owner ID).
- One short category, optional non-sensitive feature slug, user-entered issue summary (10–1200 characters), timestamps, status, suggested department and non-sensitive next action.
- HMAC fingerprint for same-account duplicate identification; no unhashed source text in the fingerprint, and no public disclosure of the key or value.
- Bounded per-account rate counter and limited coded audit events for service integrity.
- Ticket content **not** to be used for marketing consent, emotional profiling, advertising, selling data, therapy, or product recommendations.
- Do **not** ingest private Forge/Pattern Map/journal content, medical records, legal case files, passwords, OTPs, card data, attachments or external contacts. Programmatic filters are a best-effort barrier, not a guarantee that free text is free of personal data.
- Public visitors use existing verified contact channels; the first proposed database intake is authenticated-only.

### Internal proposed schedule (requires approval; not enacted)
| Record | Proposed routine handling | Review owner |
|---|---|---|
| Closed ordinary support tickets | Review for erasure within **180 days after verified closure**; earlier when no longer needed | Customer Experience + privacy owner |
| Open tickets | Necessity review at least **every 90 days**; flag dormant requests rather than indefinite open retention | Customer Experience |
| General feedback without unresolved matter | **90 days after closure** maximum proposed target | Customer Experience |
| Internal coded audit events | Align with necessary ticket life; require reviewed purge of dependent events before ticket deletion | Security/privacy owner |
| Rate-limit counters | Purge **after 48 hours** (once abuse investigation needs reviewed); no raw message bodies | Infrastructure |
| Failed/abandoned requests | Do not persist the submitted text; record error count/code only | Infrastructure |
| Privacy/security/payment/legal incidents | Retain only under separately documented statutory/business need or valid hold; **do not automatically apply 180 days** | Designated human / counsel |
| Stripe payment, tax and financial records | Remain governed by separate provider/accounting retention; **support deletion does not delete those records** | Revenue Forge + qualified reviewer |
| Device-local private reflections | Never collected or accessed by Guardian Desk | Customer privacy boundary |

These periods are **proposals**, not representations of GDPR, Florida, or other legal minimums. The controller must document purpose, legal basis where required, transfer/storage map, access, erasure procedure and review triggers. Determine regional applicability and any statutory deadlines with qualified review before publishing.

### Data subject and account-deletion process
1. Accept requests through the real existing account/support channel, verify identity proportionately through existing Auth or authorized review; never ask for passwords or OTPs.
2. Locate only in-scope Guardian Desk records with privileged, auditable access; distinguish ticket text, account metadata, Stripe receipts, and device-local reflections.
3. If no valid exception applies, **purge** ticket and related coded events according to policy, or scrub the ticket *before* deleting Auth identity: every affected ticket must first be `CLOSED` (removing it from the active-case unique-fingerprint index), summary must become `[REDACTED]`, fingerprint the 64-zero sentinel, and `feature_slug`, `last_verified_action`, `next_action`, `assigned_team` and `legal_hold_reference` must all be NULL. Also review/delete linked event rows and report extracts that could reidentify the individual.
4. The proposed database intentionally has `ON DELETE SET NULL` plus an orphan-redaction CHECK. An Auth deletion **fails** if linked tickets have not been scrubbed; this is a protection against silent retention of personal text, not a working erasure service. The restricted audit FK is `ON DELETE RESTRICT` and also requires explicit handling.
5. Where lawful preservation is genuinely required, authorized human/counsel documents the exact legal basis, scope, who may access, start/end/review dates and evidence integrity. Move lawful retained evidence into a **separately reviewed restricted hold workflow** before normal account deletion; such a hold vault is **not implemented** by this PR. Do not automatically use ordinary tickets as a perpetual legal-hold archive.
6. Confirm request outcome factually; do not claim erasure if operations were not verified. Maintain only the minimum evidence needed to show the request was processed.

### Role and access controls
- `anon`: no ticket reads or writes. Public questions through static approved guidance only.
- `authenticated`: SELECT allowlist of **own** ticket fields using RLS (`auth.uid() = owner_user_id`); no ticket INSERT/UPDATE/DELETE or audit/rate table access.
- Trusted Edge process: validates user bearer token with Supabase Auth, enforces body cap/secret rejection and calls only a service-role-only transactional RPC. Secret stays server-side. Rejections and uncertain persistence must never produce a fictitious ticket ID.
- Human staff: separately authenticated/private role, least privilege, auditable resolutions; no public GitHub customer cases.
- Executive Command #274: only trustworthy aggregates, with complementary small-cell suppression and known date/source/coverage. No identifiers, HMACs, transcripts, private snippets, or cohort profiling.
- Emergency language: direct customer to appropriate safety services; not a verified emergency dispatch, not psychotherapy.

### Exact proposed customer-facing disclosures (not yet published)
**Help entry:** “Guardian Desk provides automated NBJB website and account guidance using approved information. It is not a live human, licensed therapist, legal adviser or emergency service. A person may review certain unresolved cases when a real review process is available; no response time is guaranteed.”

**Before submission:** “Submitting a request sends the short issue summary you provide to NBJB support storage for troubleshooting and follow-up. Do not include passwords, recovery codes, full card numbers, medical or legal records, private journal entries, or sensitive information about other people. Support requests do not subscribe you to marketing. [Link to the approved privacy and retention notice.]”

**Success after confirmed database receipt only:** “Ticket [verified ID] was saved. Its current status is [verified status]. It is not yet assigned to a human. No response time is promised.”

**Existing duplicate:** “Your earlier request with the same details remains on file as ticket [verified ID]. A new ticket was not created.”

**Uncertain persistence or outage:** “We could not confirm your request was received, so no ticket confirmation is issued. A server timeout may have occurred after receipt. You may retry once safely or contact NBJB at its existing published email. Do not send sensitive information.”

**Data rights:** “Request a review, access or deletion of eligible support data through the published contact route. Some information may need to be retained where an applicable legal obligation or valid claim requires it; any restriction is reviewed, not assumed.”

**Safety:** “NBJB is not an emergency or crisis-response service. If you are in immediate danger in the U.S., call 911. If you are experiencing suicidal thoughts or crisis, call or text 988. Outside the U.S., contact local emergency/crisis resources.”

### Threats and decisions requiring founder/legal sign-off
1. Adopt, shorten, or revise proposed retention intervals, including whether and how backups are handled.
2. Approve the exact privacy notice update **before** collection and identify the person who will administer deletion/rights requests.
3. Choose real escalation staffing: if no staffing exists, describe email-based follow-up, never “human currently reviewing.”
4. Establish verified legal-hold review/secure segregation rather than blocking account deletion indefinitely.
5. Confirm how GDPR territorial scope, any state consumer-privacy law, payment record duties and other applicable rules affect this particular business. Do not represent broad legal mandates without qualified review.
6. Keep releases gated: no new hosted data collection until the separately scoped QA acceptance and an exact-head public release approval.

### External authority references used for principles (not a universal legal opinion)
- European Data Protection Board, [Data protection basics / storage limitation](https://www.edpb.europa.eu/sme/learn-the-basics/data-protection-basics_en) — purpose-related retention and deletion processes.
- European Data Protection Board, [Right to erasure FAQ](https://www.edpb.europa.eu/contact/frequently-asked-questions_en) — rights and possible exceptions.
- US Federal Trade Commission, [Protecting Personal Information: A Guide for Business](https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business) — minimise, secure and dispose of information when no longer needed.
- NBJB: `privacy.html`, `refunds.html`, `MEMBER_SUPPORT_OPERATING_RUNBOOK.md`. These remain authoritative for currently published customer behavior until formally changed.

**GD-002-B disposition: APPROVED AS WORKING QA DESIGN PRINCIPLES ONLY (2026-11-22).** Data minimization, privacy disclosures, erasure and legal-hold principles are accepted for planning and synthetic non-production qualification. **Proposed retention periods are not enacted customer-facing policy.** No real customer support collection, privacy notice publication, staffed escalation or production release is approved. The Commerce QA schema trial remains blocked until a recoverable backup can be independently verified. No customer data was collected while preparing this document.
