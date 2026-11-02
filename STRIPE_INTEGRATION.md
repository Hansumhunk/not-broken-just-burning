# NBJB Stripe Integration Plan

Status: sandbox foundation  
Stripe account: Not Broken Just Burning sandbox  
Mode: test / sandbox  
Architecture target: Stripe-hosted Checkout + Stripe Billing + Customer Portal + signed webhooks + Supabase entitlements

## Core rule

Stripe is the payment authority. Supabase is the access authority.

A browser redirect, success page, query string, localStorage flag, or client-side JavaScript state must never grant paid membership, product ownership, or event access.

## Approved launch commercial model

### Public: Open NBJB
No account required. Public articles, stories, Path introductions, selected tools, videos/clips, previews, and genuinely useful educational resources.

### Free account: Flamewalker
Supabase account with `free_member` entitlement. Dashboard, Path focus, starter exercises, selected learning material, basic continuity/progress, and the free library. No Stripe Customer is required until a payment flow needs one.

### Paid membership: Flamewalker+
One simple recurring membership intended to include the vast majority of NBJB's self-guided digital ecosystem rather than creating repeated micro-paywalls.

Approved launch prices:
- Monthly: **$14.99 USD**
- Annual: **$149 USD**

Included as material becomes available:
- core Path curriculum;
- Masculine Restoration;
- learning tracks and mini-courses that are part of the standard member library;
- full recurring instructional video library;
- reflection tools, worksheets, exercises, and practices;
- Pattern Lens;
- Flame Reviews;
- deeper Progress and continuity features;
- standard digital member releases.

Member advantage: target **15% off eligible separately sold NBJB products and live experiences**. Implement discount mechanics only when eligible products/events actually exist.

### Separate purchases
Do not create a toll booth around ordinary digital content. Separate purchase should be reserved primarily for material additional value/cost, such as:
- physical books, workbooks, journals, merchandise;
- ticketed live workshops, seminars, retreats, and events;
- high-touch facilitated services/programs;
- exceptionally large standalone flagship programs only when there is a clear reason not to include them in Flamewalker+.

Keep `product_entitlements` and `event_entitlements` because the architecture should support these without forcing NBJB to monetize every entitlement class.

## Stripe sandbox objects

Product:
- Flamewalker+
- Sandbox product ID: `prod_VItxJ2MjqlnzNX`
- Offer slug: `flamewalker_plus`

Recurring prices:
- Monthly lookup key: `flamewalker_plus_monthly`
- Sandbox price ID: `price_1UII9YGxoOD2zUCj0aXpeDCq`
- Amount: $14.99/month
- Annual lookup key: `flamewalker_plus_annual`
- Sandbox price ID: `price_1UII9aGxoOD2zUCjTsGFf43N`
- Amount: $149/year

Prefer server-side lookup keys / allowlisted offer configuration over trusting Price IDs supplied by browsers. Live-mode Product and Price IDs will be created and configured only at the production gate.

## Accepted Stripe implementation shape

The Stripe implementation planner was accepted for this model:
- web checkout;
- Stripe-hosted Checkout;
- flat-rate subscription pricing;
- freemium account with no card required, then explicit upgrade;
- Customer Portal for self-management;
- cancel at period end;
- Smart Retries + automated recovery emails;
- Stripe Tax threshold monitoring until actual obligations/registrations require collection;
- self-serve sales model.

## Recommended Stripe surfaces

1. Stripe-hosted Checkout for subscription upgrades and one-time purchases.
2. Stripe Customer Portal for payment-method updates, invoices, cancellation, and later plan changes.
3. Stripe Smart Retries + automated recovery emails for failed recurring payments.
4. Stripe Tax threshold monitoring initially, until actual tax registrations/obligations are established.

## Server-side components

### create-checkout-session
Authenticated Supabase Edge Function.

Responsibilities:
- verify the Supabase user JWT;
- accept only allowlisted internal offer slugs such as `flamewalker_plus_monthly` and `flamewalker_plus_annual`, never arbitrary client-supplied Stripe Price IDs;
- resolve offer slug / lookup key to Stripe Price ID server-side;
- create or reuse exactly one Stripe Customer for the NBJB user;
- write the Supabase user ID into Stripe metadata and/or Checkout client_reference_id;
- create a Checkout Session in `subscription` mode;
- return only the hosted Checkout URL.

### create-customer-portal-session
Authenticated Supabase Edge Function.

Responsibilities:
- verify the user;
- look up that user's Stripe customer reference from trusted data;
- create a Customer Portal session;
- return the hosted portal URL.

### stripe-webhook
Publicly reachable Supabase Edge Function with platform JWT verification disabled because Stripe authenticates via its signed webhook.

It MUST:
- read the raw request body;
- verify `Stripe-Signature` using `STRIPE_WEBHOOK_SECRET`;
- reject invalid signatures;
- process events idempotently;
- mutate entitlement tables only through a trusted server/admin database client;
- return 2xx only after the event is safely accepted/processed.

Initial event families:
- `checkout.session.completed`;
- subscription created/updated/deleted;
- invoice paid;
- invoice payment failed;
- refunds / charge refunds for one-time entitlements where applicable.

Finalize exact event names against the Stripe API version used during implementation.

## Customer mapping

Do not rely on email as the durable join key.

Use the Supabase Auth user UUID as the NBJB identity and persist the Stripe Customer ID as a provider reference. Checkout metadata should carry the user UUID so webhook processing can deterministically find the account.

## Membership state

- valid paid subscription → `tier=paid_member`, `status=active`
- payment recovery underway → `paid_member / past_due` with product behavior defined deliberately
- cancel at period end → keep access through paid period and set `cancel_at_period_end=true`
- ended subscription → return to `free_member`; do not delete the NBJB account

Cancellation should normally be at period end.

## Secrets

Never commit Stripe secret keys, webhook signing secrets, or Supabase secret/service keys. Use Supabase project secrets/environment variables.

Expected Stripe secrets/configuration:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- allowlisted server-side offer lookup configuration

## Sandbox test matrix

Before production:
1. Free member cannot mutate entitlement rows.
2. User A cannot read User B entitlements.
3. Checkout requires an authenticated user.
4. Client cannot substitute an arbitrary Stripe Price ID.
5. Monthly sandbox subscription grants paid access only after verified webhook processing.
6. Annual sandbox subscription grants the same paid tier.
7. Duplicate webhook delivery is harmless.
8. Failed payment transitions membership according to policy.
9. Cancel-at-period-end preserves access until paid-through timestamp.
10. Subscription termination returns member to free without deleting the account.
11. One-time purchase later grants only the purchased product/event.
12. Refund later removes or marks only the relevant entitlement.
13. Invalid webhook signature is rejected.
14. Customer Portal opens only for the authenticated user's Stripe Customer.
15. No Stripe/Supabase secret appears in browser source, GitHub, logs, or localStorage.
16. Shared-browser/local-state tests remain separate from server-authoritative access.

## Production gate

Do not switch to live Stripe credentials until:
- sandbox checkout and portal flows pass;
- webhook replay/idempotency passes;
- entitlement RLS/ACL tests pass;
- failure/cancel behavior passes;
- privacy and terms copy reflects paid services;
- production webhook endpoint is registered;
- live Flamewalker+ Product and monthly/annual Prices are created;
- live Product/Price configuration is installed server-side;
- one low-value real transaction is tested and reconciled end-to-end.

At launch the customer-facing promise should remain simple: one paid digital membership, not a maze of microtransactions.

## November 2, 2026 sandbox wiring status

- Stripe sandbox account: **Not Broken Just Burning sandbox**. Live account access remains unconnected to the Stripe plugin.
- Sandbox recurring prices confirmed: `flamewalker_plus_monthly` ($14.99/month), `flamewalker_plus_annual` ($149/year). No test Checkout sessions or subscriptions had been recorded at the time of the last check.
- Sandbox Customer Portal configuration `bpc_1UIKh4GxoOD2zUCjDQLIklsx` supports cancellation **at period end**, invoice history and payment method updates. Its default return URL was corrected to `https://notbrokenjustburning.com/member-store.html`.
- Created **test-mode only** webhook endpoint `we_1UXNnOGxoOD2zUCjSYZVsn22` at `https://plhbvtbvtxfzulsaxuim.supabase.co/functions/v1/stripe-webhook`. It receives Checkout completed, subscription lifecycle, invoice paid, and invoice payment failed events. This endpoint is **not** a live-mode webhook.
- Deployed the current draft branch's three sandbox-guarded Supabase functions as version 3: `create-checkout-session` (JWT required), `create-customer-portal-session` (JWT required), `stripe-webhook` (JWT off; Stripe-Signature required). This is a deployed sandbox backend, NOT a live site checkout release.
- **Outstanding manual security step:** Copy the sandbox endpoint's **signing secret** directly from Stripe Dashboard to Supabase Project → Edge Functions → Secrets, setting `STRIPE_WEBHOOK_SECRET` to that endpoint's signing secret. **Never paste the secret into GitHub, chat, email, browser JavaScript, or analytics.** This signed secret cannot be installed through the current connected Supabase tool. Do not test payments until this is done.
- Confirm `STRIPE_SECRET_KEY` in Supabase Secrets is the matching **sandbox** credential; never swap it for a live key in this project. Stripe `sk_test_` guards explicitly block live credentials in current draft functions.
- The separate draft [policy PR #89](https://github.com/Hansumhunk/not-broken-just-burning/pull/89) requires owner approval of the refund policy and publication before enabling live paid billing.
- The protected lesson UI remains draft PR #88 and all three starter lessons remain in **editorial review**; they are not currently purchasable.
- Run a real authenticated sandbox Checkout and webhook, verify server-side entitlement change, then cancel through the Customer Portal. Also test invalid signatures, duplicate deliveries, failure paths, and account isolation. **This QA is NOT yet complete.**
- **Go-live is explicitly blocked** until a verified live Stripe account, approved/refined policies, truly published lesson content, secure separated production credentials/webhook, and all end-to-end tests are complete.


## November 2, 2026 live launch candidate status

- Sandbox $14.99 checkout, signed webhook, active paid entitlement, Stripe Customer Portal cancellation and period-end state synchronization **all verified** with the nominated Flamewalker QA account. The QA subscription is scheduled to end December 2, 2026. Do not confuse it with a real payment.
- The original description of the sandbox product was updated to a precise planned three-written-lesson founding offering. No complete video library, private coaching or future merch discount is promised at launch.
- The public member store's accurate founding-offer wording is merged in PR #94. Private author review reader is merged in PR #95 and Supabase reader function v8; all three lesson rows remain `editorial_review`, none `published`.
- **New source files staged, not deployed:** `create-live-checkout-session`, `create-live-customer-portal-session`, `stripe-live-webhook`. They use **separate** `STRIPE_LIVE_SECRET_KEY` and `STRIPE_LIVE_WEBHOOK_SECRET`. The test functions retain `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- Live checkout requires `NBJB_LIVE_BILLING_MODE` set explicitly to `canary` with `NBJB_LIVE_CANARY_USER_ID` for one real test account, or `public` after successful QA; absent or any other value fails closed. The live portal must remain available to existing paying members even if new checkout is paused. The signed live webhook must continue processing cancellations while checkout is paused.
- Live-only code requires `sk_live_` API credential, rejects test-mode Stripe events, rejects the sandbox QA user, and demands a subscription paid-through date before paid entitlements are written. The test-only billing code continues to reject live credentials and live events.
- The static store's `js/member-billing.js` keeps `checkoutEnabled = false` and references the dedicated live endpoints. Only open it after live credentials, policies, content release and canary QA are verified. **Never let a URL flag activate public billing.**
- Still required: legal operator name/support verification, owner approval of refund terms and three manuscripts, Stripe live-account activation, create live product and monthly/annual prices with correct lookup keys/amounts, register live webhook and secure signing secret, deploy dedicated live functions, run real low-value canary Checkout and cancel, then open public checkout.
- The current PR #90 is a draft that predates several merged website improvements. **Reconcile/rebase against current main before attempting a production merge.** Do not force-merge an outdated layout or policy page.
