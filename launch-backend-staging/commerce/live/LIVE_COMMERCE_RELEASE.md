# NBJB Wave One — dedicated LIVE commerce release adapter (draft)

**Stage:** source-only, fail-closed. **DO NOT DEPLOY, MERGE INTO MAIN, SET LIVE SECRETS, CREATE LIVE CHECKOUT OR CHARGE A CARD WITHOUT SEPARATE RELEASE APPROVAL.** Stacked on PR #242, so the QA implementation and exact-head acceptance records remain intact. This operation does **not** modify the deployed Flamewalker+ subscription backend.

## Verified production facts — November 20, 2026

- Stripe live payee: `acct_1UIHnYGyOSBYVfGl`, card charges and payouts enabled; explicit live context `livemode=true`.
- Separate sandbox `acct_1UIHnhGxoOD2zUCj`, `livemode=false`; it must never be used for actual storefront sales.
- Production Supabase: `plhbvtbvtxfzulsaxuim`, active. QA Supabase: `fgpkejlmpfkxgpktgdzm`, active. Distinct data, user accounts, function endpoints and credentials.
- Stripe live catalog has recurring Flamewalker+ and an annual membership product/price. **No Boundary Builder or Forge live products/prices.** The existing `$149` one-time membership price is NOT either standalone product.
- Live Stripe Tax reports `active`; merchant-specific tax registrations, SKU tax treatment, live price behavior and refund/support policy still need founder/qualified review. Sandbox tax choice is not an automatic live approval.
- Production has `product_entitlements` but not `commerce_products` or `commerce_orders`. There is no private `nbjb-private-products` bucket or deployed dedicated commerce function in production. Live membership endpoint `/functions/v1/stripe-live-webhook` is active and must not be changed.
- QA has two mapped test products, three private synthetic PDFs, isolated sandbox receiver, authenticated test accounts, and unsigned webhook rejection (HTTP 400 `signature_required`). **No successful genuine signed sandbox checkout, fulfillment, refund, concurrency or cross-account delivery acceptance yet**. Do not mark this passed.
- Customer product candidate files v1.3 were independently SHA-256 verified against PR #242 comment 7017532437. They remain private, not live-uploaded.

## Code package (NOT active in production)

`live/index.ts`, `live/provider.ts`, `live/signature.ts`, and `live/commerce-core.mjs` are derived from the accepted sandbox worker with an explicitly different live boundary:
1. `LIVE_RUNTIME_REVIEWED=false` is the source-level hard stop. Merely setting `NBJB_COMMERCE_LIVE_CHECKOUT=enabled` cannot open it.
2. `productionAllowed` requires **all** of: `NBJB_COMMERCE_MODE=production`; `sk_live_` or `rk_live_` prefix; production ref and URL exactly `plhbvtbvtxfzulsaxuim`; origin exactly `https://notbrokenjustburning.com`; expected Stripe account exactly `acct_1UIHnYGyOSBYVfGl`. No localhost or sandbox accepted.
3. Every signed Stripe webhook must be `livemode=true`, cryptographically validated with the **dedicated live commerce endpoint signing secret**. Every reconciled Checkout Session, PaymentIntent and Charge must be `livemode=true` and tagged `nbjb_commerce=v1-live`. A verified Stripe account lookup runs before checkout or webhook processing.
4. Only the exact Wave One slugs/prices (`boundary-builder-workbook` $14.99, `forge-workbook` $19.99) may pass the live SKU/Price shape. One-time, USD, exact live Product and Price IDs, exact tax behavior and no mismatched SKU.
5. Worker retains owned-order status, signed private storage download with 60-second expiry, deterministic order reservation/idempotency, provider reconciliation, refund and dispute controls. No stored or public card details.
6. `live/commerce-live-client.js` accepts only the exact public production origin and production Supabase URL, and requires an explicitly enabled release configuration. The server is authoritative regardless of browser flags.
7. `live/commerce-live-config.js` defaults disabled. `live/commerce-live-store.js` supports genuine one-time purchases only once the final approved page and terms are installed. No public HTML, deployed JS or checkout activation has been changed.
8. `live/live-guard.test.mjs` supplies isolated live-account, mode, price, payment and ownership regression fixtures; it is **not** evidence of actual provider acceptance.

## Required isolated release sequence

1. Finish and independently attest provider-level sandbox acceptance: two real **test** Checkouts and signed events, duplicate/session recovery, failed/expired payment, 60-second asset delivery, cross-SKU/user denial, full successful refund/revoke, partial/dispute review, and membership unaffected. #249 records case evidence, not guessed outcomes. Use Work Cloud Browser or authorized test harness, not repeated founder screenshots.
2. Confirm founder-approved final price/version/manuscripts, digital goods tax classification and actual registration treatment, applicable taxes, purchase/refund/privacy/retention/support terms, physical-print and accessibility disposition. Reconcile any legislation with qualified advice where relevant.
3. Review the production SQL as a **separate migration** against the production schema, backups, auth deletion lifecycle, RLS/grants, signed storage policies and existing membership functions. Do not execute QA-staged scripts blindly; perform dry-run/review then apply once to exact live ref under explicit release authorization.
4. Create exactly two live **one-time** Stripe products/prices in `acct_1UIHnYGyOSBYVfGl`, with founder-confirmed tax code and exclusive/inclusive behavior per SKU; do not reuse sandbox `prod_`/`price_` IDs and do not modify Flamewalker+ prices. Keep live products/checkout unavailable before launch.
5. Verify and privately upload **only** individual v1.3 buyer ZIPs for the two Wave One SKUs, immutable versioned object keys, expected checksums and private bucket with no client read/list. Keep older v1.0 immutable and do not upload the aggregate manufacturing archive.
6. Deploy a dedicated **commerce-live** function (not `stripe-live-webhook`) to production with Stripe signatures verified in handler and JWT independently checked on customer actions. Configure only production-only secrets, via secure dashboard; no chat, repo, public JS or logs. Create a separate live Stripe event destination only once the worker is deployed and ready. Do not touch membership webhooks.
7. Run independent production preflight: `/commerce-live/webhook` rejects unsigned/wrong-mode events, live account ID is attested, no live checkout route without source release and env gate, all three non-Wave-One products inactive, private assets gated. Reconcile all checkout events and ledger before unlock.
8. Prepare a dedicated release PR that switches `LIVE_RUNTIME_REVIEWED` to true and replaces storefront-only JS/terms with founder-approved live copy. Verify `https://notbrokenjustburning.com` after separately approved deploy; never allow a sandbox public link.
9. Activate one SKU at a time only after exact-head founder approval. A live **paid canary transaction requires separate explicit authorization**; do not automatically create or refund one. Verify actual receipt, signed event, one active owner/SKU, private download, membership unaffected, payout/payee context.
10. Rollback: disable new storefront checkouts and affected SKU, leave signed webhook processing and legitimate existing downloads alive, preserve ledger and refunds, restore reviewed compatible code if needed. Do not delete production migration, orders or private archives.

## Evidence and tracked blockers

- **Passed:** live merchant charges/payouts capability; separate sandbox/live account identities; QA two SKU configuration; QA synthetic storage; QA unsigned webhook rejection; exact v1.3 archive fingerprints; local QA preview starts and authenticated free test account works.
- **Not passed:** actual signed sandbox payment/fulfillment/refund cases, production SQL and bucket, production live Stripe products/prices and tax registration decision, dedicated live webhook signed acceptance, site release integration, customer live canary.
- **Current launch state:** production checkout remains off, all live sales disabled by code, **no production changes, no real charges, no new recurring spend**.

User-facing progress should state the difference between *live account exists and can collect* versus *standalone product checkout is released and proven*. Never call a sandbox price a live sale.
