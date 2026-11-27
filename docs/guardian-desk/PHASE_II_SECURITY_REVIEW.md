# Guardian Desk Phase II — security and data-governance review (founder approval pending)

**Source-only engineering** | GD-002-A | 2026-11-22 | Issue #275 / draft PR #276.

## Material correction to first schema

The earlier draft used `ON DELETE CASCADE` from Auth users to tickets and from tickets to audit events. That could silently destroy support evidence. This revision instead:

- Allows `owner_user_id` to be set NULL on Auth deletion, **but a database CHECK blocks an orphan unless the ticket summary is explicitly '[REDACTED]', its HMAC fingerprint replaced with 64 zeroes, and any legal hold reference cleared**. This intentionally fails closed until an account-deletion workflow has actually scrubbed or lawfully segregated records.
- Uses `ON DELETE RESTRICT` from audit events to tickets. Support history cannot vanish from a single ticket DELETE; approved purge must address events explicitly.
- Leaves rate counters, which have no ticket history, on Auth-delete cascade.
- Excludes customer-facing grants for assignment, dedupe fingerprints, retention review, hold references and audit events.
- Revokes PUBLIC/anon/authenticated table writes and RPC EXECUTE. The service-only, `SECURITY DEFINER`, fixed-search-path RPC is still privileged and requires a verified-server identity boundary.
- Adds a partial unique fingerprint for **active same-owner** cases and a transactional per-account hourly cap. HMAC must be keyed by a private server secret, not ordinary SHA of personal text.
- Writes rate count, ticket and created audit event in one Postgres function transaction; no ticket ID returned before commit confirmation.

**Important unresolved consequence:** without an approved account-deletion scrub/hold workflow, linked ticket records may intentionally block deleting an Auth user. A customer-rights processing workflow is a release prerequisite; do not imply that setting the owner NULL alone anonymizes free-text summaries. No legal-hold vault exists yet.

## Required confidential account-deletion sequence (design, not an implemented operation)

1. Authenticate the request using existing account access and verify the scope of data-subject request.
2. Find only authorized ticket records privately and determine whether they contain a verified unresolved payment claim, dispute, legal obligation or hold.
3. If eligible for erasure, remove unnecessary attachments (none in Phase II), minimize/scrub the summary, zero the fingerprint, clear owner-dependent metadata and complete a reviewed event/ticket purge as policy permits.
4. If legitimate evidence preservation applies, escalate to a named authorized human with documented basis, restricted access and a review/end condition. Separate permitted evidence from ordinary ticket operations before deleting the Auth identity.
5. Perform the account deletion only after linked records satisfy database constraints; log a privacy-safe completion confirmation in a protected location.
6. Verify personal data no longer appears in member-accessible support records, routine exports or aggregate drill-downs. Do not put case content in GitHub.

## Proposed retention schedule for counsel/founder review

These are **starting policy options**, not enacted retention periods or universal legal requirements.

| Data category | Proposed default | Exception/decision |
|---|---|---|
| General resolved tickets | Review for deletion 180 days after closure | Reduce for low-value requests; extend only for documented necessity |
| Open tickets | Review at least every 90 days; retain while actively necessary | Do not let forgotten open statuses become indefinite retention |
| Minimal audit events | Align with justified parent ticket review | Separate longer statutory record needs only if documented |
| Per-owner rate windows | Purge after 48 hours, once fraud/abuse needs assessed | These are counters, not customer correspondence |
| Failed/abandoned intake | Do not store content; operational error metrics only | Avoid raw request/body logs |
| Billing disputes, security incidents, legal holds | A case-specific documented policy and authority | Restrict records, periodic review, no indefinite automatic hold |
| Device-local private reflections | **Never collected by Guardian Desk** | No support use of journals or educational responses |

Before publication, assess applicable privacy/consumer law, actual payment-record retention duties, account deletion rights, subpoena preservation and incident-response responsibilities with qualified review. Publish actual retention and deletion rights in the NBJB privacy notice. Avoid a blanket promise to delete everything immediately or preserve everything forever.

## Trusted intake contract

Source candidate: `guardian-support-core.mjs` and `edge/guardian-support-intake/index.ts` (not deployed). New function requires `verify_jwt=true` if later deployed. It calls Supabase Auth's user endpoint with the provided user JWT, rejects anonymous/nonverified identity, then supplies only that verified UUID to a service-role-only RPC. An unrecognized browser owner_id, role, priority, or refund field causes failure. The browser never gets service-role credentials.

The Edge implementation uses an explicit QA-only environment gate, exact allowed-origin check, input length bound, dangerous-secret rejection, keyed HMAC, no customer-content logging, emergency routing, and a no-success-on-uncertain-persistence response. A network failure **may have committed** the transaction, so the client must describe the outcome as *unconfirmed*, not as guaranteed absent; duplicate fingerprint handling makes a later controlled retry safer.

Caveats requiring hosted validation: Supabase platform JWT admission, user token verification behavior, RPC EXECUTE privilege, RLS/column grants, concurrent uniqueness/rate locking, backup semantics, PostgREST status mapping and secret rotation. Static inspection and synthetic mocks cannot prove any of those.

## Customer-facing disclosures (proposed copy)

- **AI disclosure:** “Guardian Desk is automated NBJB support. It provides information from approved NBJB resources. It is not a licensed therapist, emergency service or a live human agent.”
- **Before submission:** “Do not share passwords, card details, private journals, recovery codes, medical records or sensitive third-party information. We store the issue summary you choose to submit if the request is successfully received.”
- **Success:** “Your support ticket [ID] was saved. It has not yet been assigned to a human; no response time is guaranteed. You can continue using the existing contact inbox.”
- **Failure/uncertain:** “We could not confirm that your request was received. No ticket confirmation has been issued. Please use NBJB's existing contact inbox if assistance is needed.”
- **Safety:** “If anyone is in immediate danger in the United States, call 911; for suicide or crisis assistance call or text 988. NBJB is not an emergency response service.”
- **Cancellation:** Self-service Stripe Customer Portal remains the direct cancellation path; no forced feedback.
- **Privacy:** proposed updated notice must describe support text storage, case access, retention/deletion, escalation and AI assistance before collecting customer tickets.

No 24/7 staffed promise, auto-refund, auto-cancellation, or psychotherapeutic claim.

## Departmental handoff

The intake classifier records `suggested_team`, not `assigned_team`. A real assignment exists only after a confirmed authorized staff action. Suggested mappings: account/login or technical → Guardian Infrastructure; membership/navigation → Customer Experience; billing/products → Revenue Forge; lessons → Education; privacy → authorized Executive Command escalation. P0/P1 requires actual verified facts, not emotional wording alone. Executive reporting receives privacy-suppressed aggregate counts with timestamp, coverage and known limitations, coordinated through issue #274.

**Release hold:** the initial deterministic safety classifier is a conservative prototype and needs a reviewed adversarial safety matrix, including false positives and unrecognized crisis phrasing. It is not a clinical assessment capability.
