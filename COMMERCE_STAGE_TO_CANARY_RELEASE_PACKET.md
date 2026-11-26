# 🔥 Boundary Builder v1.4 — controlling release-readiness reconciliation (2026-11-24 ET)
<!-- 2026-11-24 CONTROLLING STATUS / SUPERSEDES THE HISTORICAL 2026-11-20 SNAPSHOT BELOW -->

> **PREPARATION ONLY / NO-GO FOR LIVE.** This is a factual, read-only release review and staged change plan, not approval to deploy, merge, create a live payment, upload a production ZIP, revise live Stripe settings, switch the backend runtime lock, or serve a public checkout. The earlier 2026-11-20 packet remains below as **historical context only** wherever it describes Boundary Builder v1.3 or missing infrastructure. This section controls those conflicts.

## Founder decision & explicit risk disposition
- Founder elected to **defer the actual sandbox purchase test** and proceed directly to preparing the release decision package. Do not request repetitive local QA sign-in. Do not call the unexecuted purchase flow successful.
- A $14.99 standalone charge, signed Stripe webhook, canonical ownership, buyer-only download, expiry/recovery, cross-account denial and refund/dispute/replay have **not** been proven end to end for the commercial v1.4 file. A later real-money canary could provide first payment evidence **only after its own exact account/identity/SKU/charge/rollback authorization and controls**, with the public store closed. No such canary is authorized by the deferral.
- **No public LIVE activation** until the remaining gates are resolved and separately approved. A testing waiver cannot waive safe fulfillment, honest consumer disclosure, security, tax duties, or other launch requirements.

## Current source-of-truth — verified 2026-11-24
| Control | Latest observed position | Release implication |
| --- | --- | --- |
| Commercial asset | Boundary Builder **v1.4**, customer ZIP exactly 739,982 bytes; SHA-256 `c3031e9de5d66ba0d4185efceff67321a669b472fd264728ff911b06c372c123`; two PDFs: **43-page reading** + **42-page print**. Existing personal-use license and free-account-required disclosure approved. | **Only this corrected 004-C package** is eligible. Original v1.3 Boundary hashes are historical and must not be uploaded for the v1.4 release. |
| QA Supabase `fgpkejlmpfkxgpktgdzm` | Private `nbjb-private-products` object `boundary-builder-workbook/v1.4/NBJB-BB-001_v1.4_customer.zip` exists; QA product mapped to v1.4, **$14.99**, `terms_version=draft-v1`; one historical QA order, **0 product entitlements**. Founder-returned downloaded bytes/hash independently matched in #214. | Asset integrity, QA mapping and storefront presentation accepted; **no successful paid QA fulfillment**. |
| Draft storefront | Draft PR #265 `store.html` now says **Boundary Builder v1.4**, correct 43/42 pages, $14.99; Forge v1.3 separate. Local Chromium preview **PASSED** run #45441331235. | Keep customer buy buttons and LIVE release disabled until separately approved deployment/activation. |
| Production Supabase `plhbvtbvtxfzulsaxuim` | `commerce_products` **exists**; Boundary row `active=false`, `asset_version=v1.3`, old v1.3 key, `terms_version=NULL`; private bucket `public=false` with **0 product files**; **0 standalone orders**, **0 product entitlements**. | Earlier instructions claiming the tables/bucket/worker do not exist are outdated. No write or unsafe blind migration; reconcile actual current schema and preserve existing recurring-membership state. |
| Production worker | `commerce-live` Edge Function **deployed v1**, **compile-time `LIVE_RUNTIME_REVIEWED=false`**. Other LIVE membership functions remain active. | Remain **fail-closed**. Do not remove lock or deploy new function as part of this review. |
| Stripe LIVE | Existing merchant `acct_1UIHnYGyOSBYVfGl`; one-time price **USD 14.99**, **inactive**, metadata version **1.3** and inactive prelaunch, tax behavior `exclusive`. Stripe Tax registration API returned **0 registrations**. | Version metadata/catalog reconciliation, tax classification, registration/nexus/collection decision and any provider changes require distinct review/authorization. Zero Stripe registrations is **not** evidence that there are no legal tax obligations. |
| Terms and refunds | Published `terms.html` and `refunds.html` address Flamewalker+ subscriptions. Draft standalone `commerce-policy-live-review.html` covers personal-use, free account without paid membership, edition-specific ZIP, short-lived links, **proposed** 14-day first-purchase refund and failure-to-deliver support. | Final standalone customer-facing purchase/refund, geography, retention/privacy and support terms **not yet effective**; do not publish as approved. |
| Source integration | PR #265 remains **DRAFT/unmerged**; reviewed head at this checkpoint: `42feca4cf836c953ddb1a7a5541d76edc2ea9618`. Git compare shows **125 commits on main not on branch and 45 branch-only**. PR #249 is **closed**, not a current independent approval for this revised head. | Fresh integration/conflict and exact-head security review required before considering merge or deploy. Protect First Flame member auth, front door/SEO, recurring membership and unrelated products. |

### Required preparation sequence — no production mutation authorized here
1. **Reconcile the existing integration draft against fresh main**, focusing on `js/member-auth.js`, First Flame browser checks, home/navigation, subscription code and file overlap. Do not overwrite independently merged changes, disable failing controls or merge PR #265. Review existing CI failures and no-op route guarantees.
2. **Produce a specific LIVE Boundary v1.4 immutable asset plan**: private upload with independent readback/hash, product version/path/name reconciliation, and explicit rollback/kill-switch that keeps valid customer entitlements and webhook receipts intact. Never reuse v1.3 or synthetic QA files.
3. **Finalize standalone customer terms for qualified review** using the existing `commerce-policy-live-review.html`; confirm 14-day refund implementation and rights, failed delivery/recovery, buyer access, no paid subscription requirement, seller identity, actual geographic scope, privacy/erasure and support response. Published membership terms stay unchanged.
4. **Get an authoritative product-specific tax determination** (ebook/workbook/printable ZIP classification, Stripe `txcd_10302000`, registration/nexus obligations and destinations). Florida's general Sales and Use Tax guidance: https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx ; Florida DOR registration: https://floridarevenue.com/taxes/eservices/Pages/registration.aspx ; Stripe Tax registration guidance: https://docs.stripe.com/tax/registrations . Zero registrations is a check result, not a ruling; do not silently set universal tax exemption.
5. **Require a fresh security and commerce review** of signed events, strict `livemode`, price identity, idempotency, public/anonymous/file restrictions, 60-second links, paid-to-refunded transition, error/recovery path and isolation from active Flamewalker+ payments. Mark actual paid E2E as **DEFERRED**, not `PASSED`; never change manifest approval booleans to fabricate a pass.
6. **Assemble one exact-head founder approval package** with changes/diff, QA/pass/fail register, tax/terms dispositions, current live state, checkout-disabled deployment plan, operational incident owner and rollback. New production writes, PR merges, LIVE canary and public purchase switch each need their own clear approval; don't infer them from this preparation decision.

### 2026-11-24 Florida & multistate digital-goods tax desk research — advisory, NOT approval
- **Product facts:** Boundary Builder v1.4 is an exclusively online, downloaded, two-PDF ZIP (43-page reader + 42-page print); personal-use right to retain local PDF copies, **no physical shipment**, **no recurring paid access**. Match the final product terms and tax code to *these* facts, not Flamewalker+ subscription classifications.
- **Florida:** Florida DOR TAA 14A-010 (2014), page 4, expressly addresses sales/use tax on electronic book downloads as not taxable under the then-applicable law: https://floridarevenue.com/TaxLaw/Documents/14A-010.pdf . Florida DOR TAA 19A-015 (2019), page 5, addresses exclusively electronically transmitted information and no tangible goods: https://floridarevenue.com/TaxLaw/Documents/19A-015.pdf . Florida's 2026 statute §212.05 taxes retail tangible property and enumerated services: https://www.flsenate.gov/Laws/Statutes/2026/212.05 . **Preliminary** classification for fully electronic workbook PDFs is **generally not taxable as Florida sales of tangible personal property**; individual TAAs are historical, fact-specific and not a binding determination for NBJB. Confirm with qualified tax review or DOR before the first sale.
- **Stripe exact candidate** `txcd_10302000`: Stripe's current list identifies it as **Digital Books – downloaded – non subscription – with permanent rights**: https://docs.stripe.com/tax/tax-codes . Confirm whether a mixed instructional workbook/print worksheets ZIP qualifies; product tax codes are category identifiers, not self-executing legal tax exemptions. **Do not switch to `txcd_00000000` worldwide** to force no tax.
- **Seller nexus:** Florida DOR requires registration before selling taxable goods/services: https://floridarevenue.com/taxes/eservices/Pages/registration.aspx . The common Florida >$100,000 threshold cited there applies specifically to **out-of-state sellers with no physical presence**; it does not exempt a Florida-based business from obligations if a sale is otherwise taxable. Evaluate any other states where NBJB already has physical/economic nexus and their digital-product rules.
- **Verified live provider fact:** Stripe LIVE `/v1/tax/registrations` returned **zero registration records**; this does not prove non-taxability, lack of external registrations, or lack of filing obligations. Zero active registrations can cause Stripe automatic-tax calculations to show zero regardless of obligation: https://docs.stripe.com/tax/tax-codes .
- **Decision rule:** Until the actual seller entity, geographic sales scope, taxability classification, state nexus and supported registration/tax behavior are documented by an appropriate reviewer, leave active LIVE price and public store **OFF**. No tax registration or code change was made during this research.

### Updated digital purchase terms source
Existing draft `commerce-policy-live-review.html` was revised on source-only commit `85008119f26e22ec24b21aa08930a7580538d54a` to state the exact v1.4 edition, 43/42 PDFs, no subscription, proposed 14-day refund, paid-but-undelivered support/reconciliation and territory/tax limitations. Remains explicitly **DRAFT / NOT EFFECTIVE** pending founder/qualified review.

## 2026-11-24 — Cross-workstream commerce architecture & Boundary v1.4 asset deployment specification

**Status: planning only.** Evidence reconciled across existing DRAFT PR #265 (Revenue Forge), DRAFT PR #280 (WB-001 guest checkout), LIVE Supabase, and QA Supabase. This section does not authorize a database write, asset upload, public link, new Stripe Price, email send, or merge.

### Product access-model reconciliation — explicit founder decision required
| SKU / offer | Currently specified buyer path | Discount | Engineering / release status |
| --- | --- | --- | --- |
| `NBJB-BB-001` / Boundary Builder v1.4 | Existing **Free Flamewalker account** required; Flamewalker+ subscription NOT required | $14.99 retail; **no accepted Plus-specific discount** | QA private v1.4 staged and static UI accepted; real paid fulfillment deferred; LIVE inactive v1.3 |
| `NBJB-WB-001` / From Chaos to Clarity | **Guest checkout permitted** with buyer email, anti-bot challenge, HMAC link/recovery; account optional | $17.99 ordinary retail; $9.99 **only** with server-confirmed active Plus subscription/current provider | Separate unmerged draft PR #280, based on adapter PR #264; guest-specific additive SQL and service handlers, all LIVE flags locked, no hosted paid acceptance |
| Foundational Collection | Pending exact SKU / bundle constituent edition and ownership mapping | **$39.99** working public collection; **$29.99** proposed Plus price, not approved | Founder-review manufacturing ZIP held privately, no observed accepted LIVE bundle catalog or guest entitlement test |

**Design choice required:** Keep Boundary Builder's already approved free-account requirement for its first standalone release **(recommended to avoid scope expansion)** OR explicitly revise customer terms and scope a product-neutral guest purchase/recovery implementation modeled on PR #280. Do not silently apply a WB-001-specific `wb001_` API, signed webhook metadata, account-link policy or member discount to Boundary. Guest purchases require tested anti-bot, recovery, email delivery, privacy/retention and cross-account claim semantics. A Free account is **not** a paid membership.

**Integration reality:** PR #280 extends the older PR #264 adapter branch rather than current PR #265/main. Both touch `launch-backend-staging/commerce/live/index.ts`, `js/commerce-catalog.js` and `store.html`. Its WB-001 handlers and additive guest-order schema require a deliberate, separately reviewed cherry-pick/rebase into an exact-head integration; *do not blindly merge all draft branches*. Preserve separate `LIVE_RUNTIME_REVIEWED=false` plus `WB001_PUBLIC_RELEASE=false` and active recurring memberships. Distinguish the isolated QA scenario and real provider acceptance for each product.

### Boundary Builder v1.4 — exact private asset deployment candidate
- **Immutable source:** corrected 004-C release-locked archive and byte-identical QA filename `NBJB-BB-001_v1.4_customer.zip`, **739,982 bytes**, SHA-256 `c3031e9de5d66ba0d4185efceff67321a669b472fd264728ff911b06c372c123`. Two PDFs only: **43-page reading** and **42-page print**. Exclude historical v1.3 and draft/founder-review packages.
- **Existing production project:** `plhbvtbvtxfzulsaxuim`. **Private** bucket `nbjb-private-products` (public must remain false); exact versioned target `boundary-builder-workbook/v1.4/NBJB-BB-001_v1.4_customer.zip`. No public download URL, no public Git asset and no frontend service-role access.
- **Preflight at future separately approved production staging:** Read current bucket privacy/object count/size limit/policy, current `commerce_products` row and Stripe live price, product ownership and event tables, exact worker checksum/lock, backups. Verify upload destination does not exist before any binary write; no overwrite/upsert of old fixture.
- **After separately authorized private upload:** Independently retrieve the actual stored bytes through an owner-scoped secured channel, compute SHA-256 and exact 739,982-byte size, verify ZIP CRC and the two expected PDFs; Storage SQL metadata alone is insufficient integrity evidence. Prove anonymous/non-owner access denial through correct HTTP path, not only database role listing.
- **Only after stored-byte acceptance**, propose an **inactive** guarded transaction that conditionally updates the existing product `asset_version='v1.4'`, `asset_key='boundary-builder-workbook/v1.4/NBJB-BB-001_v1.4_customer.zip'`, `download_name='NBJB-BB-001_v1.4_customer.zip'`, preserves `amount=1499`, `currency=usd`, and writes only a final approved standalone `terms_version`. Fail closed if original inactive row, SKU, version, amount or merchant do not match; do **not** set `active=true` or activate the LIVE Stripe one-time Price.
- **Expected future delivery contract:** verified buyer order only after signed LIVE provider success, immutable paid order/receipt, account-bound entitlement, 60-second signed private download URL and authorized refresh. Current QA 0 product entitlements and disabled live worker do **not** establish this end-to-end.
- **Rollback / incident:** Keep web purchase buttons disabled and commerce worker hard lock while staging. On abnormal state, leave or restore `active=false`, Stripe one-time Price inactive and `LIVE_RUNTIME_REVIEWED=false`; stop new checkout, preserve event/receipt/order audit and legitimate owner assets. Do not delete a ZIP after any legitimate customer may have acquired ownership; manual reconcile/refund/support is safer than erasing buyer rights.
- **Release requirements remain separate:** actual seller/tax/geography, approved digital terms and remedy/support, secure fulfillment and provider-mode acceptance (or separately recorded risk waiver), exact-head CI/security review, **checkout-disabled production deployment approval**, independent **LIVE canary approval** and separate **public sale activation approval**.

### Tax and policy founder decision matrix — informational, NOT binding tax advice
1. For an electronically delivered permanent two-PDF educational workbook, Florida DOR TAA 14A-010 (https://floridarevenue.com/TaxLaw/Documents/14A-010.pdf) states downloadable electronic books were not subject to Florida sales and use tax under facts/law in 2014; TAA 19A-015 (https://floridarevenue.com/TaxLaw/Documents/19A-015.pdf) evaluates online educational courses in 2019. Both are **historical/fact-specific third-party rulings**, not an NBJB exemption certificate; compare 2026 §212.05 and any change in law.
2. Review candidate Stripe `txcd_10302000` (downloaded, permanent-right, non-subscription digital books) against the *actual workbook and printable exercise package*. Confirm separately if digital tools, instruction subscriptions and future bundles require different treatment. Never force a global exempt category to avoid registration.
3. Determine legal seller, physical nexus beyond Florida, out-of-state economic nexus, known customer geography and sales restrictions; **zero existing Stripe LIVE Tax registrations is only an observation**. Offer no-tax Florida pricing only after qualified review. DOR taxpayer assistance free general inquiry: **850-488-6800** (https://floridarevenue.com/taxes/tips/pages/default.aspx). Formal individualized binding advice may require taxpayer-specific submissions.
4. Existing one-time Stripe price has **exclusive** tax behavior: if local tax is required, purchaser may pay **$14.99 plus applicable tax**, not a guaranteed tax-inclusive $14.99. Give pre-payment total, receipt, refunds/tax adjustments and geographic disclosure before activating.
5. Existing `commerce-policy-live-review.html` remains **DRAFT** with proposed fourteen-day first-edition refund, paid-but-undelivered support, duplicate-charge refund/review and personal-use license. Do not silently make it effective or apply it to WB-001 guests, bundles or active recurring Flamewalker+ membership. Founder approval, appropriate privacy retention terms and applicable consumer law review required.

### Current disposition
**GO:** Existing v1.4 product and QA asset integrity; draft storefront copy and Chromium presentation.

**DEFERRED:** Actual Stripe sandbox purchase-to-entitlement-to-private-download and refund/dispute/replay.

**NO-GO:** Production deployment/activation, live charges or public sales. Separate reviewed release package and authorization required.

---

## Historical 2026-11-20 packet (superseded where inconsistent with the controlling 2026-11-24 reconciliation)

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
