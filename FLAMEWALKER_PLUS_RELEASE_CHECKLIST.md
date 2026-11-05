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

## Existing paid-customer management gate — verified November 5

- Read-only comparison confirms the **existing live Stripe subscription** remains active, with a scheduled cancellation at **2026-12-02 23:03:33 UTC**, and its **same** server-side Supabase paid entitlement is active, marked for cancellation, and expires at the exact same time.
- Stripe's active default billing portal configuration permits self-service cancellation at the end of the period, invoice history and payment method updates. No portal session was created and no billing mutation occurred during this verification.
- **Concrete UI blocker found:** the disabled new-sales flag also prevented already-paying members from seeing the Manage Billing entry. This PR exposes only the management view for a server-recorded Stripe billing customer while leaving all new checkout buttons and sales disabled. Expired paid-access status is now interpreted consistently with the server's validity dates; former Stripe customers can still manage billing without being classified as paid learners.
- The paid portal's deployed server function independently requires authenticated access and a billing record for the authenticated user. The sandbox editorial reviewer is excluded by server policy.
- **Remaining:** an existing paid account still needs one real-browser click of Manage Billing to confirm the resulting Stripe portal session; **do not cancel or buy again** merely to test it.

## Seller identity and tax configuration — November 5 read-only verification

- **Founder decision confirmed November 5:** Launch NBJB initially as a **Florida sole proprietorship owned by Rickey Partin Jr.**, using the registered fictitious name (DBA) **Not Broken Just Burning**. Plan to form a separate LLC after initial revenue validates the offering and supports formation/maintenance costs. **Decision complete; DBA registration not yet filed or verified.** Stripe live account is verified as `business_type=individual`; charges and payouts are enabled with zero currently or past-due account requirements. Public terms and refund pages do not presently identify a formally confirmed legal seller; update legal seller disclosures, Stripe details and receipts after registration, before public sales. A DBA does not create a separate entity or personal liability shield, and any future transfer of the business to an LLC requires a deliberate banking, billing, contractual and registration transition.
- **Florida naming requirement:** A Florida individual conducting business under a name other than their legal name generally must register a fictitious name (DBA); a new LLC under its own legal name has a different formation route. Florida's official source says the DBA registration fee is $50 and requires qualifying prior newspaper publication. [Florida Division of Corporations](https://dos.fl.gov/sunbiz/start-business/efile/fl-fictitious-name-registration/). **Selected route:** individual/DBA first, separate LLC later. Advertise the name as required before filing, obtain Sunbiz fictitious name registration and retain confirmation, then ensure Stripe, receipts, terms and support identity agree. Do not mark this registration complete merely because the structure was chosen.
- **Tax readiness is not established:** Live Stripe Tax Settings report `status=active` and default code `txcd_10000000` (general electronically supplied services). Live Stripe Tax Registrations API returned **zero registered jurisdictions**. The deployed `create-live-checkout-session` function currently omits `automatic_tax: { enabled: true }`. Stripe says collecting tax via Stripe Tax requires an appropriate active registration; turning on tax calculation alone is not a substitute for determining actual obligations. [Stripe tax guidance](https://github.com/stripe/ai/blob/main/providers/grok/plugin/skills/stripe-best-practices/references/tax.md). Determine whether NBJB's membership is taxable in applicable states before changing registrations or checkout behavior. Do **not** register to collect tax blindly.
- **Product catalog:** The intended recurring plans exist at $14.99/month and $149/year. An **additional active one-time annual product** has a description referencing a year of membership. Verify public purchase links do not present it as automatically renewing, and do not remove or modify it during technical QA.
- Existing subscription billing, account access and checkout flags were **not changed** by these read-only verifications.

## Open acceptance checks

- [x] Founder confirmed signed-out guest and ordinary **Free** account denial on unpublished draft `the-love-bargain` in a live browser.
- [ ] Independently test **Free** account denial of published `member-premium-lesson.html?lesson=father-wound`, including no protected content in the response/network.
- [ ] Test existing **Paid** account can read all seven published lessons in the actual browser.
- [ ] Test **reviewer** alone may read remaining unpublished `being-needed-vs-chosen` manuscript; ordinary Paid/Free accounts may not.
- [x] Founder confirmed one mobile five-point reader/workbook acceptance pass (responsive layout, typing, answer persistence during navigation, explicit save and opening full My Work document, tappable navigation). Broader desktop/browser and privacy regression still open.
- [ ] Complete alternate-device/desktop keyboard, screen-reader, no-audio and private-reflection privacy acceptance; check saved works are not automatically uploaded.
- [x] Verified the live subscription's scheduled December 2 cancellation exactly matches its active Supabase entitlement, and Stripe Customer Portal configuration supports cancel-at-period-end, invoices and card updates.
- [ ] Confirm the existing paying user can open Stripe Customer Portal from the newly exposed **Manage Billing** option. No new purchase or cancellation is necessary. Recheck paid-to-Free transition after the scheduled expiration.
- [x] **Founder structure decision:** Florida individual sole proprietorship with the NBJB fictitious name (DBA) initially; LLC after initial revenue, subject to a later business/financial decision.
- [ ] **DBA filing and merchant disclosures:** fulfill Florida's prior newspaper advertisement requirement; register `Not Broken Just Burning` with Sunbiz (state filing $50 plus publication); retain confirmation; align Stripe, receipts, Terms, refund policy, support identity and any applicable local licensing before public sales. Filing is **not yet confirmed**.
- [ ] Verify taxability and any required registrations with a qualified tax professional, then test Stripe checkout tax treatment. Current configuration has no tax registrations and no `automatic_tax` in the deployed Checkout function; do not assume it collects required sales taxes.
- [ ] Confirm the NBJB support inbox can receive and respond to billing/cancellation/refund requests; verify the published 14-day first monthly, 30-day first annual and 7-day unintended renewal policy is operational.
- [ ] Check that the separate active one-time annual Stripe product is not confused with the recurring annual subscription in public sales links.
- [ ] Confirm the separately escalated Scalapay/Stripe Support case is closed, if still open. The **live Stripe Account API on November 5 showed no currently/past-due verification requirements and no deadline**; do not repeat the old November 6 warning as a current account requirement.
- [ ] Review Supabase security advisories: leaked-password protection disabled and pg_net in public schema. Do not move extensions blindly.
- [ ] Obtain **separate explicit approval** for the final public launch change to both client and server checkout gates; confirm live access and billing after activation.

## Scope

Initial launch includes exactly the seven published protected lessons, priced at $14.99/month or $149/year when subsequently activated. The other 28 drafts, studio audio, videos, courses, community and physical products are not launch requirements. Static checks are not a substitute for manual QA; no real customer billing changes are authorized by this checklist.
