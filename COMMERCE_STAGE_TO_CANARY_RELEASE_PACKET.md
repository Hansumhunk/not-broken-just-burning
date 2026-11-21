# Revenue Forge — controlled stage-to-canary release packet

**Directive:** Project Ignition II, 004-E — founder instruction of 2026-11-20 ET.
**Status:** PREPARATION ONLY; no approval for production deployment, checkout enablement, paid canary, live Stripe mutation, product-price creation, DNS, membership billing change, or PR merge.
**Owner:** Revenue Forge; independent review by PR #249.
**Candidate:** PR #265, to be rebound to exact, fresh current-main and re-reviewed immediately before any release.
**Scope:** ONLY Boundary Builder v1.3 and The Forge v1.3. No launch of MR, H.A.W.K., or 30 Days.

## Founder decision and safety boundary

The founder elected to **stop the repeated automated Stripe sandbox card-entry UI test** and move into staged production release preparation, then request **separate authorization for one real-money canary per product before general public sales**.

This is a process change, **not** evidence of a passed sandbox paid->fulfillment acceptance test. The current QA payment/delivery, actual signed event, refund and second-account tests remain unverified; do not mark them PASS in PR #249 or change `sandboxEndToEndPassed` or `browserAcceptancePassed` to true.

The previous auto-triggered `qa-genuine-provider-checkout` PR workflow job is explicitly **SKIPPED**. Existing isolated non-payment browser smoke and hosted security checks remain enabled. The original test is preserved for an independently approved future QA change; temporary QA account secrets must be removed after any remaining justified use, with QA credentials rotated if shared/reused.

## Read-only source/provider verification as of 2026-11-20 ET

| Control | Observed | Required for launch |
| --- | --- | --- |
| Live Stripe merchant | Existing live NBJB Stripe account `acct_1UIHnYGyOSBYVfGl`; separate test account `acct_1UIHnhGxoOD2zUCj` | Keep strict `livemode` and verified exact live account; don't modify Flamewalker+ |
| Supabase | Production `plhbvtbvtxfzulsaxuim` ACTIVE_HEALTHY; QA `fgpkejlmpfkxgpktgdzm` separate | No QA identity/payment records in production |
| Current production schema | `product_entitlements` exists; `commerce_products` and `commerce_orders` absent; separate private commerce bucket not established | Review/apply dedicated non-destructive staged production migration ONLY after exact-head approval and backup/rollback validation |
| Current production functions | Existing `stripe-live-webhook` and `create-live-checkout-session` for membership; no dedicated `commerce-live` | Preserve all membership functions; add distinct commerce-only function later |
| Commerce PR #265 | Draft, source-only; current base predates Search Dominion PR #266 merged to main | Reconcile new current-main including 101 sitemap URLs; no conflicting homepage/SEO edits |
| Live checkout source guard | `LIVE_RUNTIME_REVIEWED=false`; `js/commerce-release.js` has `enabled:false` | Preserve until post-canary explicit release |
| Current release review | `productionCheckoutEnabled:false`, all approval booleans false | Never misrepresent skipped sandbox QA as passed |
| Live policy and prices | Standalone terms marked DRAFT; no approved dedicated live one-time Price IDs | Obtain founder tax/terms/price approvals, then provision exact SKUs under separately authorized live account |

Provider/state checks are read-only and reflect the observation date, not standing authorization.

## Immutable Wave One customer artifacts (PRIVATE; do not commit to Git)

| Wave | Slug | SKU | Price before applicable tax | ZIP | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| 1 | `boundary-builder-workbook` | `NBJB-BB-001` | $14.99 USD | `NBJB-BB-001_v1.3_customer.zip` | `8de5f26a6abd19b69d86b7d44d9125c07702b3f5a2fbfcf4adcee204ec2c68b9` |
| 1 | `forge-workbook` | `NBJB-FG-002` | $19.99 USD | `NBJB-FG-002_v1.3_customer.zip` | `7cf406c893fa1029c7cb7c84178696cbc902ce205e4edf461eae90057acaa7fd` |

Source: immutable `launch-backend-staging/commerce/inventory-release-candidate-v1.3.json`. Validate private source archive, each ZIP hash/length and two inner PDFs again immediately before the eventual upload; never substitute the QA synthetic PDFs or expose protected ZIPs through Pages/public storage. Preserve v1.0 history and purchase-specific immutable version paths.

## Ordered execution — maximum preparation without live charges

### A. Source integration and safeguards (authorized preparation)
1. Preserve source PR #265 draft. Update against current main (Search Dominion release `ac8d5da6bb214d4ea7be9d9109cf5f2c6cbcf932` at the time of decision) using reviewed conflict-free integration; never clobber sitemap, First Seven Days, Front Door, membership or homepage.
2. Re-run static, commerce source, disposable PostgreSQL, isolated Supabase QA security and authorization negative controls. Browser smoke is okay; do not automatically attempt the Stripe sandbox card-field automation.
3. Verify production migration guard aborts if baseline schema changes or commerce was previously installed. New commerce registry rows must start INACTIVE. Private bucket no anonymous listing/read; server-only signed 60-second downloads; authenticated own-SKU entitlement check. Verify refunds revoke new download issuance and payment state is provider-reconciled.
4. Review customer-facing Wave One product descriptions, full price disclosure, ZIP/PDF content, print/mobile accessibility, cancellation, refund, tax, support/contact, data retention/erasure and relevant geographic limits. Keep draft terms visibly not effective.

### B. Founder approval package for checkout-disabled deployment (NOT granted by this document)
Provide one immutable exact-head approval request identifying:
- Exact GitHub commit/paths, passing release checks, current main divergence and deployment method.
- Production SQL migration with advisor results, pre-apply snapshot/backup confirmation and tested rollback-compatible fix-forward procedure; do not delete a financial ledger or orders on rollback.
- Dedicated `commerce-live` function code and verified config, signed Stripe webhook destination plan; no reuse/alteration of subscription webhook or its secret.
- Correct Wave One private ZIPs and private upload/verification plan, one version per SKU.
- Tax treatment and actual Stripe tax registration decision for digital files; founder-reviewed terms/refunds and retention/account-erasure plan.
- Optional separate LIVE one-time Stripe products/prices with exact amounts and tax behavior, created only after specific approval and with storefront unavailable.
- Proof that production checkout remains denied at all layers: inactive registry, source guard false, JS release false, and backend checkout disabled; no live payment permitted.
- Exact deployment rollback switch, operational recipient for purchase problems and support response.
- No additional spending or subscriptions.

### C. Controlled production canary (REQUIRES DIFFERENT, EXPLICIT AUTHORIZATION)
After A/B and actual successful checkout-disabled deployment, obtain explicit permission for each REAL-MONEY canary (founder-owned test purchaser, exact SKU, total/tax, refund handling and budget).

Permit only that single authenticated canary test account to reach the dedicated live Checkout route (not general public buyers). Do not unblock general purchase buttons. Verify the exact live Stripe account, genuine `cs_live_` payment, webhook signature and receipt, canonical order and *one* entitled SKU, downloaded private ZIP SHA-256, reload/relogin and non-owner/SKU download denial. Exercise an approved full refund and prove new link denial (already downloaded files cannot be recalled). Confirm no Flamewalker+ subscription state changes. If failure: immediately close checkout, audit/resolve or refund real charge under founder-approved procedure, keep authenticated download for existing valid paid orders.

### D. General product activation (separate go/no-go)
Independent PR #249 attests canary plus appropriate live refund/replay/identity checks, all policy/price files and source gates approved. Founder approves exact product and exact head. First activate Boundary Builder; monitor real order/delivery; then separately activate The Forge. Never assert revenue or completed fulfillment until actual order receipts and download evidence exist.

## Explicit blockers still open

- Genuine sandbox E2E remains **skipped, not passed**; alternative real-money canary requires deliberate tightly constrained release method.
- Tax code, registration/nexus treatment, live one-time prices and purchase terms/refund policy still need founder/qualified review.
- Customer data retention/erasure implementation design needs acceptance before a production schema change.
- Production commerce tables, private storage, live commerce worker and webhook destination are not deployed.
- Independent live signing, entitlement, refund and actual signed download evidence does not yet exist.
- Current PR #265 must be reconciled against latest `main`; explicit exact-head approval is not recorded.

**Release posture:** production and live checkout OFF; no live charges; member subscription infrastructure unchanged. Execution continues toward a single founder approval package rather than repeating the paused UI test.
