# Membership QA — November 18, 2026

## Verified release state
- PR #228 passed Validate static site and was merged as 87b593974ed9ee2df0da4a50225efaf01ad11cbc. Production Pages/browser readback remains a distinct check.
- Read-only Supabase metadata audit: 44 published premium lessons, split 7 / 8 / 14 / 5 / 5 / 5 across six tracks. All 44 unique slugs match both the catalog and reader navigation; no missing or extra slugs. This does not establish successful authenticated delivery or editorial review of all lessons.
- Protected lesson and webhook tables have RLS enabled, with no browser-role SELECT or UPDATE. Membership entitlements have RLS enabled, authenticated own-row/admin SELECT policy and no authenticated table UPDATE privilege. This is metadata/source inspection, not a penetration test.
- Webhook receipt aggregate: five live and six test processed; no failed/processing receipts returned. Two active Stripe-derived paid rows, both with future paid-through dates, and two free rows. Distinguish sandbox and live subscriptions; these counts are not independent customer revenue.

## Source review and follow-up
- Member shell hides content until session verification and hides/reloads after account change; reading position, practice history and My Work keys are scoped to user ID. Browser profile local storage is not encrypted or protected against someone with access to the browser itself.
- The explicitly consented guest tool-save handoff uses a tab-scoped pending draft and automatically saves after sign-in. Shared-device/account ownership needs real browser acceptance; do not assume device-local data provides isolation from a person with device access.
- PR #231 isolates cached entitlement state by current user and discards late responses; tests cover switching and stale requests, logout, catalog fallback and catalog-to-reader parity. No server authority changes.
- Dashboard reflects paid tier and 44 lessons; progress reads user-scoped deliberate practice marks, validates titles against the server catalog, and avoids automatic completion scores. Potential stale progress rendering if membership changes mid-request remains follow-up QA. Reader static fallback still labels many published lessons editorial review before catalog verification.
- Deployed live webhook v6 matches staged repository source. It verifies Stripe signatures, rejects test events/subscriptions, rejects unpaid checkout completion and checks paid-through date. It retrieves current Stripe subscription state on lifecycle/invoice events, separates sandbox identity, and handles scheduled cancellation.
- Webhook concern: unique-insert collision (23505) currently responds 200 even before processing is confirmed; already-processing receipts return 503 but an interrupted processing receipt has no bounded recovery lease. Fix the collision acknowledgement in a staged branch, design safe stale receipt recovery independently; no production webhook deployment as routine QA.
- Keep original November 16 browser results historical. Remaining: genuine external checkout-to-access, direct free server lesson-body denial, shared-browser account-switch tests, all-track mobile/keyboard and save/resume, cancellation December 2–4, and support/tax follow-up.

No payment, cancellation, user record, private manuscript, or production configuration was changed by this audit.
