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

## Open acceptance checks

- [ ] Test **Free** account denial of `member-premium-lesson.html?lesson=father-wound`; confirm no body leaks in network requests.
- [ ] Test existing **Paid** account can read all seven published lessons in the actual browser.
- [ ] Test **reviewer** alone may read remaining unpublished `being-needed-vs-chosen` manuscript; ordinary Paid/Free accounts may not.
- [ ] Complete desktop/mobile reader walkthrough: navigation, bookmark, worksheets, copy/save, resume, and no Read to Me playback. Confirm sensitive reflections are not uploaded without consent.
- [ ] Check Stripe Customer Portal access and the existing live subscription's scheduled cancellation presentation. Do not initiate another charge or cancel again merely for testing. Confirm paid access lasts until the correct expiration and returns to Free afterward.
- [ ] Confirm legal seller identity, terms, renewal disclosure, contact inbox workflow, refund commitments (first monthly payment 14 days; first annual payment 30 days), and any applicable taxes.
- [ ] Resolve Stripe Support escalation for Scalapay-related company VAT ID requirement; live charges/payouts work, but the requirement remains on the account as of last read, deadline shown November 6, 2026.
- [ ] Review Supabase security advisories: leaked-password protection disabled and pg_net in public schema. Do not move extensions blindly.
- [ ] Obtain **separate explicit approval** for the final public launch change to both client and server checkout gates; confirm live access and billing after activation.

## Scope

Initial launch includes exactly the seven published protected lessons, priced at $14.99/month or $149/year when subsequently activated. The other 28 drafts, studio audio, videos, courses, community and physical products are not launch requirements. Static checks are not a substitute for manual QA; no real customer billing changes are authorized by this checklist.
