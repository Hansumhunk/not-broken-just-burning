# Flamewalker+ live launch gate — November 4, 2026

## Release posture
- **Seven approved and published** founding-track lessons in Supabase. The other **28 remain editorial drafts** across five tracks. Content scope remains frozen to the seven-lesson founding release until later reviews.
- Free membership is live. Public Store continues to advertise "coming soon."
- Dedicated live Stripe checkout, portal and webhook functions exist in Supabase, but live prices, account activation, signatures, and customer purchase/entitlement cycle still require actual live-mode acceptance.
- The correct live Stripe account is connected and its recurring prices, webhook endpoint, and Customer Portal were read and verified. Remaining Stripe account verification item was escalated to Stripe Support; it is not yet marked cleared in the last observed Stripe account API state.
- This PR prepares a hidden client billing panel with recurring terms, consent, and management. The code flag remains **false**, and the server live billing launch mode remains independently controlled.

## Proposed narrow launch, not an approval
**Approved and completed:** Rickey explicitly approved the seven current Wounded Boy and Inherited Manhood lesson revisions for publication. An atomic SQL operation published exactly seven approved rows, retaining their reviewed content revisions; 28 other rows remain editorial drafts. Public sales remain closed. The paid offer must clearly describe exactly what is available on purchase day.

## Live Stripe account read-only verification — November 4, 2026

The correct **live** merchant account is now connected alongside the sandbox. Verified directly in live mode:
- Live **charges_enabled=true**, **payouts_enabled=true**, and **details_submitted=true**.
- One active live **Flamewalker+** product.
- Active recurring `flamewalker_plus_monthly` at **$14.99 USD monthly**, and `flamewalker_plus_annual` at **$149 USD yearly**. Both lookup keys, amounts and intervals match the server Checkout offers.
- One enabled live webhook endpoint pointing to deployed Supabase `stripe-live-webhook`; enabled events include checkout completion, subscription creation/updates/deletion/pause/resume, invoice paid, and invoice payment failure.
- Live Customer Portal has active default configuration with period-end cancellation, invoice history and payment-method updates.
- Stripe Tax settings report **active**.
- Stripe account requirements still list **one currently due business verification field**, although `disabled_reason` is null. Founder must review and satisfy this request in Stripe Dashboard; do not put personal identifying details in public GitHub.
- **NOT verified yet:** Supabase live secrets authenticate correctly, signed live event delivery, real canary payment, automatic member entitlement, refund end-to-end, tax nexus/registrations or legal seller identity.

**No live prices, billing settings, account data, or security secrets were mutated during this inspection.** Keep live checkout closed until remaining launch gates pass.

## Editorial sprint and server-side launch guard — November 4, 2026

- Founding seven reviewed structurally: 2,453 nonempty teaching blocks; 39 nonempty guided prompts; founder has now approved and published all seven in Supabase. No diagnostic claims were surfaced by the narrow keyword scan, but this is not formal clinical or publisher signoff.
- Corrected first three protected manuscripts: internal future-product notes removed from reader body, generic guided questions replaced with specific practical ones, Next Honest Action and Smaller Door rewritten to match the actual lesson text. Verified Supabase readback and zero empty blocks; revision timestamps updated.
- Earlier repairs to Lessons 5, 6, and 7 remained intact; Lesson 4 has a full Armor Audit. The secure review queue is indexed in `FOUNDING_7_REVIEW_QUEUE.md` without exposing private lesson bodies.
- Deployed `create-live-checkout-session` **version 7** in Supabase: still checks for at least **seven published lessons**, preserves separate canary authorization, and adds a hard **public checkout lock** `PUBLIC_LIVE_CHECKOUT_ENABLED=false` regardless of the `NBJB_LIVE_BILLING_MODE` secret. Verified the active deployed code. Only a distinct approved launch change may unlock public checkout.
- The database contains exactly **7 `published` and 28 `editorial_review` rows**. Public Checkout remains blocked independently on server and client, but a nominated canary account may be tested later. Live checkout/entitlement/webhook/cancellation lifecycle still requires controlled authorized testing.

## Hard gates before taking money
1. **Editorial:** Founder reads current manuscript revisions and exercises, verifies tone, attribution, safety and meaningful value. Explicitly approve selected manuscripts. Set only those approved rows to 'published'; preserve untouched drafts.
2. **Real-browser QA:** Authenticated reviewer inspects desktop/mobile reader, worksheet copy/clear, lesson progress and device voice. Verify no reflection text is unexpectedly uploaded or persisted.
3. **Entitlements:** Test a real Free user cannot retrieve premium body; a Paid user can retrieve only published body; editorial reviewer alone can read drafts. Successful redirect cannot itself grant access.
4. **Live Stripe:** Verify live merchant identity, payouts/verification, tax settings, price lookup keys (monthly 1499 USD cents, annual 14900 USD cents), webhook endpoint/secret, Customer Portal, cancellation and refund handling.
5. **Canary:** One authorized, separate non-sandbox account completes a real live transaction under server mode 'canary'. Inspect signed webhook receipt, entitlement grant, paid reader, portal cancellation, paid-through expiration, payment failures and retries. Obtain founder authorization before charging real money.
6. **Policies/merchant:** Founder confirms legal seller identity, support mailbox ownership and response process, auto-renewal disclosure, support/contact and actual day-one deliverables. Current published first-payment refund policy states **14 calendar days for monthly purchases and 30 for annual purchases** (plus an ordinarily seven-day renewal refund window); historical draft release notes contain an older, superseded seven-day first-purchase proposal.
7. **Security:** Review Supabase advisory warnings (compromised-password protection disabled and pg_net in public schema) and tighten where appropriate. Never move a production extension blindly. Keep all secrets server-side, and back up/version the deployed live Stripe function source before altering it.
8. **Separate launch PR:** Only after all above pass, change the client gate to true, enable server public billing mode, update static launch copy/links in Store, public Plus preview, Join and Terms, and ensure every displayed benefit is published and accessible. Verify GitHub Actions and deployment.

## Focused worksheet improvements — protected database, November 4
- The 'what-strength-looked-like' Strength Model Audit originally used six worksheet column labels as input prompts; these were replaced with **seven** source-faithful actionable questions, including the original manuscript's seventh 'chosen rule' step.
- The 'inherited-vs-chosen-manhood' Chosen Manhood Code originally used six chapter labels as prompts; these were replaced with **six** source-faithful fully worded questions for KEEP, REFORGE, RETIRE, BUILD, ACT and REVIEW.
- Both rows were read back successfully in Supabase; teaching blocks were unchanged and both remain 'editorial_review'. The revision timestamps changed, so saved reviewer checkmarks for those drafts must be revalidated. Both changes still require founder review.

## What does not block first release
- Remaining 28 drafts after a founder-approved seven-lesson launch.
- Studio voiceovers, video courses, app, community and merchandise.
- Future certification or other high-touch programs.

## Current code contract
The Store's 'member-live-billing' panel remains hidden when 'PUBLIC_CHECKOUT_UI_ENABLED=false'. If enabled in a future launch, paid accounts get a Stripe Portal button, free accounts get checkout options **only** when the server catalog returns at least seven 'published' lessons. Public checkout also requires a **separate deployment** switching the server's `PUBLIC_LIVE_CHECKOUT_ENABLED` constant to true **and** an appropriate `NBJB_LIVE_BILLING_MODE` setting; the current deployed constant is false. Plan identifiers are fixed and verified by Stripe server code, not supplied as arbitrary client prices.

## Last audit
- Prior PR #128 static test passed; manual browser check still outstanding.
- Seven lessons were published directly to protected Supabase after explicit founder approval; **this branch still does not enable paid checkout**. All 28 other lesson drafts remain protected.
- Three deployed dedicated live Stripe server functions are not yet source-controlled in this GitHub repository; preserve a verified source copy before production edits.

Launch success = genuine paid purchase + delivered approved lessons + reliable cancellation, not simply a visible payment button.
