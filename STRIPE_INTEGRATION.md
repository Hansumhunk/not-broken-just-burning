# NBJB Stripe Integration Plan

Status: sandbox foundation  
Stripe account: Not Broken Just Burning sandbox  
Mode: test / sandbox  
Architecture target: Stripe-hosted Checkout + Stripe Billing + Customer Portal + signed webhooks + Supabase entitlements

## Core rule

Stripe is the payment authority. Supabase is the access authority.

A browser redirect, success page, query string, localStorage flag, or client-side JavaScript state must never grant paid membership, product ownership, or event access.

## Initial commercial model

- Public access: no account.
- Free Flamewalker: Supabase account with `free_member` entitlement. No Stripe Customer required until a payment flow needs one.
- Paid Flamewalker: flat-rate recurring Stripe Billing subscription.
- Products: one-time Checkout purchases mapped to `product_entitlements`.
- Events/workshops: one-time Checkout purchases mapped to `event_entitlements`.

Prices are intentionally not hard-coded in this document. Product/Price IDs belong in server-side configuration after pricing decisions are approved.

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
- accept only allowlisted internal offer slugs, never arbitrary client-supplied Stripe Price IDs;
- resolve offer slug → Stripe Price ID server-side;
- create or reuse exactly one Stripe Customer for the NBJB user;
- write the Supabase user ID into Stripe metadata and/or Checkout client_reference_id;
- create a Checkout Session in `subscription` or `payment` mode;
- return only the hosted Checkout URL.

### create-customer-portal-session

Authenticated Supabase Edge Function.

Responsibilities:
- verify the user;
- look up that user's Stripe customer reference from trusted data;
- create a Customer Portal session;
- return the hosted portal URL.

### stripe-webhook

Publicly reachable Supabase Edge Function with platform JWT verification disabled.

It MUST:
- read the raw request body;
- verify the `Stripe-Signature` using `STRIPE_WEBHOOK_SECRET`;
- reject invalid signatures;
- process events idempotently;
- mutate entitlement tables only through a trusted server/admin database client;
- return 2xx only after the event is safely accepted/processed.

Initial event families:
- `checkout.session.completed`
- subscription created/updated/deleted
- invoice paid
- invoice payment failed
- refunds / charge refunds for one-time entitlements where applicable

The exact event list should be finalized against the current Stripe API version while implementing.

## Customer mapping

Do not rely on email as the durable join key.

Use the Supabase Auth user UUID as the NBJB identity and persist the Stripe Customer ID as a provider reference. Checkout metadata should carry the user UUID so webhook processing can deterministically find the account.

## Membership state

Suggested translation:

- valid paid subscription → `tier=paid_member`, `status=active`
- trial if later enabled → `paid_member / trialing`
- payment recovery underway → `paid_member / past_due` with product behavior defined deliberately
- cancel at period end → keep access through paid period and set `cancel_at_period_end=true`
- ended subscription → return to `free_member`; do not delete the NBJB account

Cancellation should normally be at period end.

## One-time products and events

Checkout success alone does not unlock content in the browser.

Verified webhook processing writes:
- `product_entitlements(user_id, product_slug, ...)`, or
- `event_entitlements(user_id, event_slug, ...)`.

Refund/revocation behavior must update the corresponding entitlement.

## Secrets

Never commit:
- Stripe secret keys,
- webhook signing secrets,
- Supabase secret/service keys.

Use Supabase project secrets / environment variables.

Expected Stripe secrets:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- server-side offer/price configuration as appropriate

## Sandbox test matrix

Before production:

1. Free member cannot mutate entitlement rows.
2. User A cannot read User B entitlements.
3. Checkout session requires an authenticated user.
4. Client cannot substitute an arbitrary Stripe Price ID.
5. Successful subscription webhook grants paid access.
6. Duplicate webhook delivery is harmless.
7. Failed payment transitions membership according to policy.
8. Cancel-at-period-end preserves access until the paid-through timestamp.
9. Subscription termination returns member to free without deleting their account.
10. One-time purchase grants only the purchased product/event.
11. Refund removes or marks only the relevant entitlement.
12. Invalid webhook signature is rejected.
13. Customer Portal can only be opened for the authenticated user's customer.
14. No Stripe/Supabase secret appears in browser source, GitHub, logs, or localStorage.
15. Shared-browser/local-state tests remain separate from server-authoritative access.

## Production gate

Do not switch to live Stripe credentials until:
- sandbox products/prices are approved;
- checkout and portal flows pass;
- webhook replay/idempotency passes;
- entitlement RLS/ACL tests pass;
- refund/cancel/failure behavior passes;
- privacy and terms copy reflects paid services;
- production webhook endpoint is registered;
- live Stripe Product/Price IDs are configured server-side;
- one low-value real transaction is tested and reconciled end-to-end.
