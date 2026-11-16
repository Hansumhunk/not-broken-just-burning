# Flamewalker+ release and operating checklist — November 16, 2026

## CURRENT PRODUCTION STATUS — all 35 guided lessons published

- [x] **35 protected written lessons now have `status='published'`** in the production `flamewalker_premium_lessons` table: Tracks 1–6 = 7 + 8 + 5 + 5 + 5 + 5.
- [x] **Controlled release gate passed:** the 28 newly released manuscripts had unique slugs, nonempty teaching blocks, 7–8 guided prompts, Next Honest Action and Smaller Door; revisions matched the previously audited November 16 manuscripts before promotion. No manuscript bodies were placed in public GitHub.
- [x] **Existing entitlement model preserved:** protected lesson reads require current server-side paid membership; ordinary Free and guests do not receive manuscript bodies. Reviewer-only draft handling remains available for future manuscripts.
- [x] **Website release:** [PR #184](https://github.com/Hansumhunk/not-broken-just-burning/pull/184) merged with static site CI passing. [PR #185](https://github.com/Hansumhunk/not-broken-just-burning/pull/185) fixes all six paid track links, live copy and regression checks. Keep membership pricing and video pause unchanged.
- [ ] **Founder live browser acceptance still required:** visit one newly published lesson from Tracks 2–6 while signed in as a genuine active paid member; confirm full text, keyboard/mobile worksheet entries, explicit Save to My Work, and returning to the lesson. Repeat a sample from each of the other four new tracks.
- [ ] **Access isolation confirmation:** visit a newly published lesson with a separate genuine Free account and signed out, confirm no protected body is returned. Check paid-to-Free transition when legitimately expired or canceled, without artificially changing billing.
- [ ] **Final human editorial proofing:** founder should proof the released versions for audience fit, citations, safety, clarity and repetition; promptly revise or temporarily unpublish any lesson with a material issue. The founder's instruction to proceed with launch authorized the operating release; it does not replace a claim-by-claim expert proofread.
- [ ] **First external customer acceptance:** confirm real customer checkout → entitlement → library → Stripe portal/cancellation after an authorized purchase. Never fabricate a sale.
- [ ] **Support/tax follow-up:** confirm support inbox and applicable digital education tax treatment, keep records. No tax registration or Stripe settings changed with curriculum publication.
- [ ] **No videos:** all video publication and production stay paused by founder instruction.

> The sections below are dated historical release-stage snapshots, not the current lesson status.

---

# Flamewalker+ final launch checklist — November 15, 2026

## Approved future curriculum standard — Tracks 7–8 (November 16, 2026)

- [x] **Founder has LOCKED the new lesson depth policy.** Each of the 14 planned written lessons must contain **at least 3,000 substantive teaching words**; Standard target 3,000–3,500, Deep Dive 3,500–4,500, Flagship 4,500–5,500. Combined 14-lesson *writing target* **53,700 words**.
- [x] Fixed individual targets and practical editorial acceptance criteria: [Tracks 7–8 writing standard](FLAMEWALKER_TRACKS_7_8_EDITORIAL_STANDARD.md).
- [ ] **Develop manuscripts privately:** the 14 titles currently remain curriculum outlines, not finished lessons. Verify word count without headings or workbook questions; complete source, example, exercise, safety and quality reviews.
- [ ] **No public release without founder signoff and access testing.** This planned expansion is **not a blocker** for the currently published seven-lesson membership and does not authorize any new subscriber claim, payment change or video production.


## All 35 teaching depth verified — November 16, 2026

- [x] **35/35 lessons now exceed 2,500 teaching words** (paragraph text only, excluding headings and separate guided questions); range **2502–2929**, mean **2606**. Exact founding lesson versions and word counts: [all-35 depth audit](FLAMEWALKER_ALL_35_DEPTH_AUDIT_2026-11-16.md).
- [x] The five previously short live founding lessons were substantively deepened and updated in place; their slugs, status, exercises, pricing, entitlement requirements, and underlying member route remain unchanged. The remaining two founding lessons were already compliant.
- [x] **28 private lessons remain private and in editorial review**. No new video work or publication of unfinished manuscripts.
- [ ] **Cross-device acceptance**: complete paid/free/lapsed member read, worksheet, local save/resume, keyboard and mobile QA for the newly deepened founding content.
- [ ] **Founder editorial QA**: approve exact revision versions and check substance, original lesson continuity, repetition, sensitivity and readability before additional curriculum is released.


## Founding 28 teaching-depth threshold — November 15, 2026

- [x] **All 28 private Tracks 2–6 manuscripts meet a minimum of 2,500 teaching words** (paragraph content only, excluding headings and separate worksheet questions). Range: **2502–2648**, mean **2576**. Source-of-record versions and per-lesson counts: [minimum 2,500 audit](FOUNDING_28_MINIMUM_2500_AUDIT_2026-11-15.md).
- [x] **Content and privacy structure check:** 28/28 remain `editorial_review`; 7 founding lessons remain published. All private manuscripts have complete typed blocks, 7–8 guided questions, Next Honest Action, Smaller Door and safety guidance. No exact duplicated exercise questions; RLS enabled and no direct anon/auth SELECT grant.
- [ ] **Release is still gated** on founder approval of specific manuscript versions and manual mobile/desktop worksheet, resume and entitlement checks; no new manuscript publication or Stripe changes occurred in this depth pass.
- [x] **The seven existing founding lessons have now been revised where needed to meet 2,500 teaching words** (five revisions, two already compliant). See [all-35 depth audit](FLAMEWALKER_ALL_35_DEPTH_AUDIT_2026-11-16.md).


## Additional lesson-depth pass — November 15, 2026

- [x] **All 28 private manuscripts deepened:** added distinct case studies, counterexamples, decision frameworks, field studies and application guidance. Current private draft paragraph lengths: 1854–2528 words, mean 1998. Precise revision numbers recorded in [28-lesson deepening report](FOUNDING_28_DEEPENING_REPORT_2026-11-15.md).
- [x] **Lesson-order polish:** five shorter Placeholder Wound lessons now close with One action, Take this with you, and a safety note after the substantive teaching.
- [x] **Live data structure/access check:** 35 total; 7 published, 28 private `editorial_review`; all 28 have intact guided prompts, actions, Smaller Door, safety headings. Cross-library exact duplicate questions 0, exercise titles 35 unique; table RLS enabled with no direct anon/auth SELECT grant.
- [ ] **Founder signoff and manual cross-device testing still required** before releasing any of the 28 revised private lessons. This change is editorial only: no live checkout, membership entitlement or site navigation changes.


## Founding 28 manuscripts — substantive editorial pass, November 15, 2026

- [x] **25 shorter manuscript revisions saved privately in Supabase.** Expanded applied examples, differentiated decision tools, safer scenario framing, concrete practice and follow-through. Three longer original Placeholder Wound drafts already contained substantial guided teaching and were preserved.
- [x] **Five Safe Room manuscripts research-checked and qualified.** Added traceable DOI references to therapeutic alliance, philosophical epistemic injustice, and DARVO experimental vignette research; terms are used educationally, not as proof concerning any individual.
- [x] **20 reader-facing introductions polished** to remove internal 'draft/v0.1' language; two standalone foundation labels removed. Original source attribution remains in protected manuscript metadata.
- [x] **Read-only QA clean:** 28/28 private draft manuscripts have valid nonempty teaching blocks, 7–8 nonempty guided questions, a Next Honest Action, a Smaller Door, a safety boundary, and distinct exercise title. No exact repeated guided questions detected. Protected RLS remains enabled; anon/auth roles have no direct table SELECT permission. **7 published / 28 editorial_review**, unchanged.
- [x] **Non-sensitive revision manifest:** [Founding 28 editorial readiness report](FOUNDING_28_EDITORIAL_READINESS_2026-11-15.md). Protected manuscript bodies were not copied to GitHub.
- [ ] **Before publishing the remaining 28:** founder editorial signoff tied to the exact revised lesson versions, final private browser UX checks (including guided worksheet saving, mobile and keyboard), and controlled access/entitlement verification. Do not represent all 35 as currently available or bulk-promote 28 drafts from a structural test alone.


## Production sales release — November 15, 2026

- [x] **Founder's explicit launch instruction executed.** PR #166 merged to `main` at `473cb1d64040fa804aee38ccc310cf82a1c2886f`; GitHub Pages build and site validation both completed successfully. `js/member-billing.js` now has `PUBLIC_CHECKOUT_UI_ENABLED=true`. Member Store shows live monthly ($14.99) and annual ($149) offers only after authenticated entitlement/catalog checks; public syllabus and Join copy reflect seven **published** lessons and 28 private drafts.
- [x] **Production checkout backend deployed:** `create-live-checkout-session` Edge Function version 8 `ACTIVE`, `verify_jwt=true`; `PUBLIC_LIVE_CHECKOUT_ENABLED=true`. Existing restrictions remain: authenticated user, seven published manuscripts, specific recurring lookup keys and amounts, already-subscribed rejection, sandbox test-account exclusion, Stripe live-customer ownership mapping.
- [x] **Production webhook hardened:** `stripe-live-webhook` v6 `ACTIVE` with signature validation, paid Checkout gating, async-paid handling, and retryable processing receipt responses. Seven published manuscripts, 28 drafts, previously processed live subscription events and Stripe merchant KYC/currently_due=0 verified before launch.
- [x] **Monitoring:** a separate NBJB Checkout Launch Watch was enabled, daily for 14 initial-launch checks beginning November 16, without duplicating weekly operations review. No video assets were released.
- [ ] **First external customer acceptance:** Confirm a fresh free member can open live Checkout, complete a real authorized payment, receive verified paid access, and open live Billing Portal; verify member and webhook records using safe masked audit data. Do not manufacture a purchase or silently charge the founder to run the test.
- [ ] **Seller compliance follow-up:** Keep records for sales-tax and potential out-of-state obligations; Stripe Tax remains active with zero registrations and live Checkout does not automatically collect tax. Product still uses `txcd_10000000` until the actual subscription classification is confirmed. This outstanding item is a compliance follow-up, not a claim of tax exemption.
- [ ] **Customer support:** Verify actual deliverability of the published support address and timely handling of cancellation/refund inquiries; no email or live billing changes were made in this release.

**The prelaunch lock-off snapshots below are historical and superseded by this production release. Do not restore them without a deliberate rollback.**

## November 15, 2026 — Latest Stripe read-only account verification

- **Live account state at this read:** `business_type=company`, company structure `single_member_llc`, `charges_enabled=true`, `payouts_enabled=true`, `requirements.past_due=[]`, no disabled reason. This supersedes older November 5 and earlier November 15 `business_type=individual` snapshots below.
- **Latest live readback (after founder submission):** Stripe reports `company.owners_provided=true`, `company.executives_provided=true`, `requirements.currently_due=[]`, `requirements.past_due=[]`, and **zero `pending_verification` items**. Charges and payouts remain enabled, with no verification errors. This supersedes the earlier same-day two-items-pending snapshot. Monitor for any newly requested verification; no more personal information is currently due.
- **Caution:** An enabled charge/payout capability is not authorization to enable public checkout. Both existing checkout locks stay OFF; tax, support, member access, and founder launch authorization remain outstanding.
- **Change scope:** Read-only Stripe verification only. No payments, billing settings, credentials, checkout flags, products or live backend were modified.

## November 15, 2026 — Founder correction: LLC and EIN already obtained

- [x] **Business formation complete.** Florida LLC filing paid November 5, 2026; founder confirmed Not Broken Just Burning LLC was established and the federal EIN issued by November 10, 2026. Do **not** request another LLC filing or a second EIN.
- [x] Founder previously stated NBJB is a **single-member LLC with one sole owner**, using default disregarded-entity federal tax treatment (no S-corporation election reported). An EIN was issued. **Never commit, publish, or request its digits in chat.** Use official formation and IRS records securely inside Stripe to complete the appropriate fields.
- [x] **Stripe merchant KYC readback:** Stripe reports `business_type=company`, company structure `single_member_llc`, owner and executive declarations provided, `requirements.currently_due=[]`, `requirements.past_due=[]`, `requirements.pending_verification=[]`, with charges and payouts enabled. No current Stripe information request is outstanding. **Separate remaining gate:** confirm tax reporting/TIN treatment, payout ownership and seller disclosures before public sale. Do not expose identity documents or tax IDs.
- [ ] Preserve existing Stripe products, subscription, webhook setup, and historical payouts. No new Stripe account, business incorporation or tax ID application needed.

## November 15, 2026 — Connected live billing readback and release controls

- [x] **Earlier Nov 15 readback (superseded by the update below):** Stripe previously reported `business_type=individual`, charges/payouts enabled, and no currently- or past-due requirements. Do not use this historical read as the present account status.
- [x] Monthly $14.99 and annual $149 recurring prices are active and have expected lookup keys. A distinct $149 one-time annual-looking product remains active and must not be confused with the recurring subscription.
- [x] One completed live Checkout and active monthly subscription from the internal test flow. Its cancellation remains scheduled for December 2, 2026; no charge or cancellation changes during this readback.
- [x] Stripe payout: $13.96 status `paid`, with November 9 arrival date. This is not evidence of independent external customer demand.
- [x] Live Stripe webhook endpoint is enabled and configured to deliver subscription and invoice lifecycle events; five live and six sandbox event receipts are marked `processed`.
- [x] Supabase `ACTIVE_HEALTHY`; 7 published lessons, 28 editorial reviews, 2 paid and 2 free entitlements at query time.
- [x] Stripe portal configuration supports invoices, payment-method changes and cancel-at-period-end. **Sandbox Customer Portal opened successfully in founder browser Nov 15** with test subscription, invoice, payment method and scheduled cancellation shown. A distinct **live-paying-customer browser portal test** remains outstanding: designated sandbox account is intentionally blocked from live portal with `sandbox_test_account_not_eligible`.
- [x] PR #157 merged a source-controlled live webhook candidate with stronger unfinished-event retry and asynchronous-payment guards, and passed CI. **No production Edge Function was deployed.** Controlled event tests and Stripe endpoint event configuration remain necessary before production promotion.
- [x] Two independent new-sale locks remain enforced on site and deployed server: `PUBLIC_CHECKOUT_UI_ENABLED=false`, `PUBLIC_LIVE_CHECKOUT_ENABLED=false`.
- [x] Founder confirmed registered Not Broken Just Burning LLC and EIN. [ ] Verify Stripe's legal business/tax classification and align Terms, receipts, and support identity with existing LLC.
- [ ] **Tax treatment/registration decision outstanding:** Stripe Tax is active but has **zero registered jurisdictions** and live Checkout omits `automatic_tax`, so do not assume tax is collected. The recurring Flamewalker+ product currently uses `txcd_10000000` (General - Electronically Supplied Services). Stripe's catalog identifies the more specific candidate `txcd_20060358` (On demand Online Courses - written material content); **do not change tax code or tax settings until classification is validated for the actual membership offer**. Florida DOR's past advisements treat certain fully digital course/subscription sales differently from taxable tangible goods; other jurisdictions may vary. Determine actual taxable nexus, applicable states, registration obligations and appropriate product category before enabling a public tax flow.
- [ ] **Membership acceptance remaining:** existing paid/QA account opened *The Father Wound* protected lesson with its interactive workbook; six additional published lessons, free/guest denial of a **published** lesson, real live-paying-customer portal access, and cancellation/expiration transition still need validation. Sandbox billing portal passed; no new charge required.
- [ ] Confirm payment failure, refund/dispute reconciliation and signed webhook retries before public activation.
- [ ] Obtain separate explicit public-sale launch approval before changing either checkout lock.

No payments, subscriptions, payout configuration, member rights, live sale flags, or production backend were changed by the November 15 review.


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

- **Historical November 5 seller status, superseded November 15:** Stripe was read as `business_type=individual` with charges/payouts enabled. The founder has since confirmed the LLC was formed and its EIN issued by November 10. **Remaining:** align Stripe and public seller disclosures with the actual LLC and applicable tax classification, while preserving customer/payment history.
- **Historical planning note superseded:** A sole-proprietor/DBA was previously considered, but the founder has already formed Not Broken Just Burning LLC and obtained an EIN. There is **no instruction to register a second DBA or create another LLC**. Verify legal name and business/tax data against the official formation and IRS confirmation records.
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
- [x] **Founder confirmation:** Not Broken Just Burning LLC formed and EIN issued by November 10, 2026. [ ] Update or verify Stripe's legal entity/tax identity, Terms, and receipts consistently before sales; do not file another business formation.
- [ ] Verify taxability and any required registrations with a qualified tax professional, then test Stripe checkout tax treatment. Current configuration has no tax registrations and no `automatic_tax` in the deployed Checkout function; do not assume it collects required sales taxes.
- [ ] Confirm the NBJB support inbox can receive and respond to billing/cancellation/refund requests; verify the published 14-day first monthly, 30-day first annual and 7-day unintended renewal policy is operational.
- [ ] Check that the separate active one-time annual Stripe product is not confused with the recurring annual subscription in public sales links.
- [ ] Confirm the separately escalated Scalapay/Stripe Support case is closed, if still open. The **live Stripe Account API on November 5 showed no currently/past-due verification requirements and no deadline**; do not repeat the old November 6 warning as a current account requirement.
- [ ] Review Supabase security advisories: leaked-password protection disabled and pg_net in public schema. Do not move extensions blindly.
- [ ] Obtain **separate explicit approval** for the final public launch change to both client and server checkout gates; confirm live access and billing after activation.

## Scope

Initial launch includes exactly the seven published protected lessons, priced at $14.99/month or $149/year when subsequently activated. The other 28 drafts, studio audio, videos, courses, community and physical products are not launch requirements. Static checks are not a substitute for manual QA; no real customer billing changes are authorized by this checklist.
