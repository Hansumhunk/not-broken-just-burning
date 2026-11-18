# Membership billing exceptions — controlled reconciliation

## Read-only baseline (2026-11-18)
Live Stripe: one active recurring monthly subscription with a paid invoice, scheduled cancellation; no live refunds on the complete returned list. Supabase: one matching live subscription, one separately classified sandbox entitlement, zero missing live rows, zero unmatched non-sandbox rows, zero cancellation or expired paid-through discrepancies. No customer identifiers published.

## Candidate release
The staged membership webhook retrieves the authoritative current subscription and expanded latest invoice. It does not extend active access unless a live paid invoice line covers the current membership item's service period. For a failed or unpaid renewal it preserves at most the previous confirmed paid-through boundary for the same subscription, then returns free access. It rejects cross-customer and conflicting subscription mappings; only known membership lookup keys are eligible. Existing trial semantics retained. Add payment-action-required, uncollectible and voided invoice events to subscription reconciliation where the Stripe endpoint is configured to deliver them. Provider API errors are redacted. This code is not a live deployment until signed-event acceptance, webhook event subscriptions, API compatibility, and release readback are verified.

Checkout candidate validates exact price/currency/interval/interval_count, rejects unknown offer/prototype keys, checks existing active billing and open subscription checkout sessions, and uses a customer-specific time-bucket idempotency key. Open sessions from other sales modes do not affect membership. This reduces duplicate-session risk, but is not an atomic cross-bucket lock; validate simultaneous requests at the boundary before production promotion. Do not expire sessions automatically.

## Refund-to-entitlement workflow
1. Confirm refund request belongs to member and actual Stripe invoice/charge; verify successful refund state and total refunded across that charge. Distinguish partial, pending, failed, full, one-time purchase, and subscription. Never infer subscription from customer alone.
2. For approved full membership refunds, separately verify the related subscription was canceled pursuant to the published policy. A refund alone is not cancellation. Do not alter unrelated product ownership, free accounts or another subscription.
3. If refund fully succeeded but billing remains active or scheduled, flag for authorized human review. If canceled while the matching entitlement remains paid, flag for immediate investigation; verify fresh provider state and signed webhook processing. Do not make an unverified manual access change.
4. Report only counts of confirmed mismatches, ambiguous mappings, pending/partial refunds, and corrections verified by authorized staff. Never report raw payment IDs or personal data.

The pure refundReview function classifies synthetic reconciliation cases; it has no mutation capability and is not a refund listener. Existing weekly operations review is the recurring private monitoring mechanism. Do not fabricate refunds, payments, customers, or provider events. Direct signed delivery and portal/browser acceptance remain deferred.
