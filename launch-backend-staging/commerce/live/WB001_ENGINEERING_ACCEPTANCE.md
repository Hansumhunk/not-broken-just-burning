# WB-001 Engineering Release Acceptance — 2026-11-22
**Project:** The Forge Press | **SKU:** NBJB-WB-001 | **Status:** SOURCE-STAGED; NOT FOR SALE
**PR:** #280 (draft), extending commerce drafts #242 and #264. PR #265 remains DO NOT MERGE.
**Founder-approved:** retail USD 17.99; active Flamewalker+ USD 9.99 (44.5% discount); no compulsory registration or subscription.

## Work staged: actual source, not another roadmap
- Existing commerce-live worker imports WB-001 action and signed-webhook handlers. Existing recurring Stripe membership handler is untouched. Source hard-lock LIVE_RUNTIME_REVIEWED=false and independent WB001_PUBLIC_RELEASE=false remain.
- Separate additive SQL candidate uses existing commerce_products, authenticated product_entitlements, private product Storage bucket and LIVE/SANDBOX merchant split. A direct order ledger supports guest or identified buyer without changing prior commerce_orders or subscription tables.
- Guest checkout: server-verified, human challenge, retail Price chosen server-side, Stripe hosted email, tagged one-time order, idempotency key, verified signed event, durable paid status, transactional receipt, HMAC link in fragment, 60-second private Storage signed download. Guest does not need a Flamewalker account.
- Member checkout: verified JWT; DB membership source/paid-through plus real LIVE Stripe subscription/customer matching; server chooses 999 cents only when active and in paid-through period. Free, expired and unverifiable member accounts never receive a privileged price.
- Atomic reservation and event ledger refuse mismatched Price, SKU, tax, checkout or payment. Duplicate events do not grant twice. Partial refunds hold review, full refund or dispute rejects new downloads. Lost guest links use same-email CAPTCHA recovery and nonce rotation only after accepted email.
- Source tests: Node pure security/business rules, HMAC tampering, simulated checkout/webhooks/refund, disposable PostgreSQL guest/member/free, price, signature-event receipt, recovery and denial. Full PDF ZIP is NEVER in public Git.
- UI: hidden guest checkout + member button, Turnstile integration and guest access/recovery page. Separate browser release flag stays false.

## Actual observations
- Production Supabase already has commerce_products and private nbjb-private-products bucket; all five older product SKUs are inactive. Current deployed commerce-live worker source is hard-locked.
- The existing Stripe LIVE account has Stripe Tax status active, with **zero** tax registrations (list returned 0 with no remaining pages). Tax treatment is not established.
- The completed ZIP contains only two PDFs and SHA256:
  e5194f3fbe0e863fd467c9f0e130c6e5ba70754677a2e1828bc5c5fbb9357f87
- Closure of GitHub assurance issue #249 records OFFLINE checks, NOT a successful signed sandbox purchase; its real sandbox webhook was still pointed at production. Existing commerce QA issue #214 still requires an explicit mode-provenance disposition.

## Exact outstanding provider gates
P01. Verify standalone QA Supabase project fgpkejlmpfkxgpktgdzm and Stripe SANDBOX account acct_1UIHnhGxoOD2zUCj, with no path to live project or LIVE merchant; repair sandbox webhook routing under separate authorization. Do not mutate production account or customer records.
P02. After verified QA isolation, configure disposable SANDBOX one-time Price 1799 and member Price 999, with reviewed tax behavior. No LIVE products/prices now.
P03. Execute real signed test Checkouts: unauthenticated guest 1799; paid-through Plus 999; Free and expired Plus 1799; wrong member/account forbidden; receipt and download; payment failure/expiry; duplicate and late events; refund, partial refund, dispute, recovery, replay and outbox/email failure; maintain existing membership.
P04. Qualify existing Brevo or other approved TRANSACTIONAL mail only: verified sender, controlled email receipt acceptance and deliverability, retry / suppression responsibilities; never import subscriber contacts or activate marketing.
P05. Configure approved free-use Turnstile challenge, hostname/action attestation, abuse throttles and guest recovery with uniform responses.

## Exact tax and customer-rights gates
T01. Zero Stripe Tax registrations does not establish a tax exemption or absence of an obligation. Determine digital-good sales tax nexus/registration obligations for relevant jurisdictions, beginning with Florida. Complete registration with tax authority if actually required BEFORE creating corresponding Stripe Tax registrations. Do not invent collection status.
T02. Have the downloaded educational PDF workbook classification and exact tax code reviewed; an existing candidate tax code for another workbook is not authority for WB-001.
T03. Determine inclusive vs exclusive price behavior for 1799/999 and the precise customer disclosure. Current source expects automatic tax but no actual tax registrations are configured. No live tax setting was changed.
T04. Finalize one-time digital delivery terms, license, privacy retention, consumer/refund rights, support, email deliverability, account-optional ownership and asset correction procedure. Current commerce-policy-live-review.html is NOT an approved consumer policy.

## Security, asset, release
S01. Close issue #214 sandbox-vs-LIVE entitlement provenance; never discount based only on a stale client flag, or alter an existing valid member in the course of testing.
S02. Compare additive SQL to exact current hosted schema, RLS/grants, backup, concurrency, email retention and owner deletion policies. DO NOT apply the historic production-schema-staged.sql over an existing production database.
S03. Upload only final customer ZIP to existing PRIVATE bucket under versioned key; verify exact SHA256 plus bytes and two PDF names; no public buyer file or service-role key.
S04. Complete hosted auth, provider, download and revocation tests against isolated QA. A previously signed private URL may remain usable for up to 60 seconds even after revocation; do not promise instant revocation.
S05. Require independent security approval, exact-head founder release authorization, locked deployment/change ticket and reversible rollout. Both backend runtime and WB-001 product release flag stay false until then.
S06. Separately authorize ONE LIVE canary charge only after tax/providers/gates pass; verify receipt, payee, amount, entitlement, access, refunds and customer support BEFORE opening public sales.

## Strict release decision
No QA hosted project mutations, no live Stripe changes, no product ZIP upload, no new spending, no real email, no live payments or customer changes were performed in this source phase.
Node/SQL/CI successes demonstrate **synthetic code correctness only**. Actual real-provider acceptance and release authorization remain required.
