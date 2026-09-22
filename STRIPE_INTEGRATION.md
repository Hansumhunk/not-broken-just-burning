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
