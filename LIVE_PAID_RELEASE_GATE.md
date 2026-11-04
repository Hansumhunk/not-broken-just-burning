# Flamewalker+ live launch gate — November 4, 2026

## Release posture
- 35 protected drafts in six tracks; **0 published**. Content scope frozen until review.
- Free membership is live. Public Store continues to advertise "coming soon."
- Dedicated live Stripe checkout, portal and webhook functions exist in Supabase, but live prices, account activation, signatures, and customer purchase/entitlement cycle still require actual live-mode acceptance.
- The connected Stripe integration exposes only the "Not Broken Just Burning sandbox" test-mode account. The founder needs to connect/verify the **live merchant account** or run the internal live QA function from an authorized account.
- This PR prepares a hidden client billing panel with recurring terms, consent, and management. The code flag remains **false**, and the server live billing launch mode remains independently controlled.

## Proposed narrow launch, not an approval
Start by editorially approving **seven** coherent Wounded Boy and Inherited Manhood lessons and their worksheets, rather than holding release for all thirty-five. This is a release-scoping proposal only: Rickey must approve the actual revision of every published lesson. Unapproved and source-sensitive lessons stay private in editorial review. The paid offer must clearly describe exactly what is available on purchase day.

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
The Store's 'member-live-billing' panel remains hidden when 'PUBLIC_CHECKOUT_UI_ENABLED=false'. If enabled in a future launch, paid accounts get a Stripe Portal button, free accounts get checkout options **only** when the server catalog returns at least seven 'published' lessons. A separate server-side 'NBJB_LIVE_BILLING_MODE' check must also permit checkout. Plan identifiers are fixed and verified by Stripe server code, not supplied as arbitrary client prices.

## Last audit
- Prior PR #128 static test passed; manual browser check still outstanding.
- This branch has deliberately **not published content or enabled paid checkout**.
- Three deployed dedicated live Stripe server functions are not yet source-controlled in this GitHub repository; preserve a verified source copy before production edits.

Launch success = genuine paid purchase + delivered approved lessons + reliable cancellation, not simply a visible payment button.
