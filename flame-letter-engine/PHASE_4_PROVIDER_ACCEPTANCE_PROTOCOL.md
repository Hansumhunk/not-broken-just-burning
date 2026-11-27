# Phase IV — provider acceptance and verified emergency stop

STATUS: Prepared for authorization, never executed against Brevo. This document is NOT permission to change subscribers, automations, campaigns, forms or DNS.

## Original evidence and current access

The owner-only original provider_integration/lifecycle_tests.csv has been inspected and all T01–T20 exact descriptions transcribed into phase4_acceptance.py. Historical GitHub Issue #1 evidence: 7055834268 (Nov 20 DOI, one founder-only message, unsubscribe, blocklist and inactive workflows), 7055807880 (timestamped event chain) and 7055732869 (limited empty automation contacts). These are not current provider-wide queue reports.

There is no connected authenticated Brevo action, Cloud Browser session or private read-only token available to this execution. No new provider GET or mutation has occurred. A connected GitHub, Google Drive or Supabase account does not imply Brevo credentials or queue access. Never request plain-text API keys via GitHub or commit real marketing recipient identities.

## Authorized read-only inspection checklist

Using an authenticated owner-authorized existing Brevo session where one is genuinely available: inspect sender/reply and domain status, account sending ceiling, all current existing 31 campaign/template IDs and status, exact test and production list/segment isolation, historical DOI timestamp and exact consent version, blocklisted test recipient (NO resubscription), both inactive automations, all scheduled campaigns and all relevant waiting/active workflow contacts. Record only sanitized case references, timestamps, counts and provider object scopes. Check paginated/filtered views before claiming completeness.

## Emergency stop: the Brevo-side counterpart

The Phase III private runtime stop only blocks local staging/claiming; it cannot cancel a campaign inside Brevo.

1. Record UTC incident time, operator authorization and reason, then engage local stop. Quarantine unknown in-flight claims.
2. Authorized Brevo owner inspects scheduled/queued/running marketing campaigns (ALL pages/status filters) and all automations capable of contacting the affected audience.
3. ONLY under a specific incident or founder-approved shutdown authorization, use Brevo's campaign suspension/cancellation control when appropriate and record before/after status. Brevo documents a privileged PUT emailCampaigns/{campaignId}/status with suspended and cancel statuses. This PR intentionally contains no provider-write endpoint. A successful API status response alone does not prove all downstream queued mail stopped.
4. Keep both existing welcome automations inactive, inspect active and waiting contacts in Automations > Logs > Contacts in workflows. Where a workflow is unexpectedly active, an explicitly authorized operator must pause/deactivate it in provider UI.
5. If intake itself is in incident scope, separately authorize disabling the native TEST/PROD hosted form and test direct URL rejection; no production website alteration.
6. Independently inspect marketing event/delivery logs after shutdown, retain suppression status and check for duplicate/pending sends. Never resubscribe the previously blocklisted founder test contact.
7. Close incident only after authenticated post-stop evidence shows all intended provider campaign/automation/queue and form states; otherwise leave local stop active, log as PROVIDER_QUEUE_UNVERIFIED and escalate.
8. Resume ONLY following separate founder approval and fresh provider consent, quota, schedule and recipient-isolation acceptance.

No local or synthetic check can claim T18 or T19 provider PASS. provider_shutdown.py explicitly requires a full post-stop authenticated evidence set.

Brevo references:
https://developers.brevo.com/reference/update-campaign-status
https://developers.brevo.com/reference/get-email-campaigns
https://help.brevo.com/hc/en-us/articles/115000263710-What-are-automation-logs-workflow-logs-and-contacts-in-workflow
https://help.brevo.com/hc/en-us/articles/360001079439-Add-and-manage-users-on-your-Brevo-account

## Minimal founder-controlled test boundaries

- T01-T03 and T07: owner-authorized read-only account, sender/reply, final consent/footer and DOI timestamp/version inspection; if records absent do not guess.
- T04/T05: native negative consent/CAPTCHA path; separate form-test approval only where actual test submission changes a provider contact.
- T06-T08: historical positive DOI and repeated submission evidence retained; additional token or welcome reentry test requires separate identity/scope approval.
- T09-T11: six-step sequence and unsubscribe during active workflow would require an explicitly authorized isolated founder-owned NEW recipient (never the previously blocklisted test contact) and activation control. No authorization in this directive.
- T12-T14: bounce/complaint safe simulation or explicit NOT_RUN; do not manufacture complaints or send to unrelated mailboxes.
- T15: legal deletion versus suppression retention needs privacy/provider review.
- T16: Outlook additional rendering needed; prior Gmail evidence stands.
- T17: verify test exclusion from actual production segment read-only.
- T18: independent provider-wide queue and pending automation acceptance; local stop insufficient.
- T19: native hosted test form disable/direct link rejection requires separate provider mutation approval.
- T20: withheld production smoke test; requires distinct founder exact-head release.

No new public enrollment, campaign template, marketing schedule, contact import, Brevo form change or spend authorized. Founder's test contact remains marketing-blocklisted as of the last actual Nov 20 inspection.

## Separate release decisions

(A) Secure private runtime deployment and credential/host policy, (B) public newsletter opt-in, (C) welcome automation, (D) exact weekly audience/calendar and approved content hashes, (E) commercial marketing only after commerce release. Each decision cannot be inferred from another and must be authorized independently.
