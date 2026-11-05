# Flamewalker+ final launch checklist — November 4, 2026

## Verified

- [x] Seven approved founding lessons published in Supabase; remaining 28 editorial drafts unchanged.
- [x] Reader API requires authenticated paid entitlement or nominated internal editorial review; premium source table has no browser SELECT grant.
- [x] One live and one sandbox Stripe subscription map to two corresponding Supabase paid entitlements.
- [x] Live Stripe Checkout completion, invoice payment, subscription creation and subsequent updates are recorded in Supabase with **processed** webhook receipts.
- [x] The active live subscription has a scheduled future cancellation under Stripe flexible billing (future `cancel_at`), correctly represented as scheduled cancellation in Supabase. No billing mutation is required.
- [x] Public billing client remains off (`PUBLIC_CHECKOUT_UI_ENABLED=false`); the Store purchase panel remains hidden; deployed live Checkout server independently enforces `PUBLIC_LIVE_CHECKOUT_ENABLED=false`, launch mode and seven-published-lesson check.
- [x] Read to Me remains disabled; written reading and exercises preserved. Website copy accurately reflects seven published / 28 drafts.
- [x] CI regression checks passed after integrating prelaunch checkout source and typography fixes.

## November 5 verification update

- **Founder-confirmed completed:** The 28 draft lessons in Tracks 2–6 have completed visual review, one five-point mobile exercise/workbook test passed, and guest plus ordinary free-member accounts were denied a protected **draft** lesson in live browser tests. Account recovery, basic sign-out, and saved-work restoration after re-login were previously completed. These do not substitute for paid-only, cancellation, raw HTTP denial, content safety or publication-signoff tests.
- **Live Stripe account read (November 5):** Account is `business_type=individual`; `charges_enabled=true` and `payouts_enabled=true`; `requirements.currently_due=[]`, `requirements.past_due=[]`, and `current_deadline=null`. One live monthly test subscription is active with a future scheduled `cancel_at`. No new charge or cancel operation was initiated in this verification. A separately escalated Scalapay/support item may still exist; the earlier November 6 requirement should **not** be reported as currently due without new Stripe support evidence.
- **Security:** Production member-data privileges were tightened on six tables (migration `20261105200137_revoke_unsafe_member_table_privileges`, PR #150); unsafe broad authenticated `TRUNCATE`, `TRIGGER`, and `REFERENCES` grants now absent. Server-backed session verification was added and tested (PR #151). See `PLATFORM_QA_GATE_2026-11-05.md` for the authoritative acceptance matrix.

## Open acceptance checks

- [x] Founder confirmed signed-out guest and ordinary **Free** account denial on unpublished draft `the-love-bargain` in a live browser.
- [ ] Independently test **Free** account denial of published `member-premium-lesson.html?lesson=father-wound`, including no protected content in the response/network.
- [ ] Test existing **Paid** account can read all seven published lessons in the actual browser.
- [ ] Test **reviewer** alone may read remaining unpublished `being-needed-vs-chosen` manuscript; ordinary Paid/Free accounts may not.
- [x] Founder confirmed one mobile five-point reader/workbook acceptance pass (responsive layout, typing, answer persistence during navigation, explicit save and opening full My Work document, tappable navigation). Broader desktop/browser and privacy regression still open.
- [ ] Complete alternate-device/desktop keyboard, screen-reader, no-audio and private-reflection privacy acceptance; check saved works are not automatically uploaded.
- [ ] Check Stripe Customer Portal access and the existing live subscription's scheduled cancellation presentation. Do not initiate another charge or cancel again merely for testing. Confirm paid access lasts until the correct expiration and returns to Free afterward.
- [ ] Confirm legal seller identity, terms, renewal disclosure, contact inbox workflow, refund commitments (first monthly payment 14 days; first annual payment 30 days), and any applicable taxes.
- [ ] Confirm the separately escalated Scalapay/Stripe Support case is closed, if still open. The **live Stripe Account API on November 5 showed no currently/past-due verification requirements and no deadline**; do not repeat the old November 6 warning as a current account requirement.
- [ ] Review Supabase security advisories: leaked-password protection disabled and pg_net in public schema. Do not move extensions blindly.
- [ ] Obtain **separate explicit approval** for the final public launch change to both client and server checkout gates; confirm live access and billing after activation.

## Scope

Initial launch includes exactly the seven published protected lessons, priced at $14.99/month or $149/year when subsequently activated. The other 28 drafts, studio audio, videos, courses, community and physical products are not launch requirements. Static checks are not a substitute for manual QA; no real customer billing changes are authorized by this checklist.
