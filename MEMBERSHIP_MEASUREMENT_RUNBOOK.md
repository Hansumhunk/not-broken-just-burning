# Membership measurement — privacy-first operating contract

## Source hierarchy and definitions
- PostHog: cookieless public-page activity, existing free signup CTA clicks, and `nbjb_membership_checkout_requested` counts by allowlisted plan (monthly/annual). The last event occurs after an eligible checkout click and terms acknowledgment; it is an **intent count**, not a unique customer, completed payment, successful Stripe session, or verified enrollment.
- Supabase: aggregate account registrations from Auth, entitlement access tiers/status/current validity, test/live webhook receipt classifications. Never equate entitlement rows with customers; sandbox and internal QA must be separately classified.
- Live NBJB Stripe: authority for paid subscription status, scheduled/final cancellation, recurring amounts, invoices, payments, refunds, and payment retention. Do not mix test and live data. Exclude known internal/test customers from external acquisition and retention claims. Include internal live paid revenue only in explicitly labeled totals, not external customer traction.

## Weekly growth pulse
Use the same seven complete local calendar days (America/New_York) versus the preceding seven days; document freshness and source limitations. Count public pageviews/available visitor estimates, free CTA requests, aggregate registrations, checkout request events by allowed plan, confirmed new live external paid subscriptions. Check PostHog event schema before querying a newly deployed event. Treat absence before verified ingestion as unavailable, not necessarily zero. Report stage volumes separately; do not divide anonymous intent events by incompatible signup/customer cohorts or present a true linked funnel unless the same cohort/window is independently verifiable without introducing invasive tracking.

## Weekly revenue and subscription retention
- Gross collected subscription payments vs refunds, separately from Stripe fees/net settlement, using verified payment/invoice records and matching currency.
- Active live recurring subscription value: sum monthly recurring amounts normalized by interval (annual / 12, monthly / interval_count) for eligible current subscriptions, excluding unsupported metered amounts, one-time products, trial-only/unpaid or test records. Label estimates, discount/tax treatment, internal live subscription and scheduled cancellations explicitly. Do not equate gross recurring run rate with cash collected.
- Report current active externally paying customers, new subscriptions, period-end cancellations, scheduled cancellations and failed/unpaid renewals. Count each genuine subscription once; do not treat scheduled cancellation as churn until paid access ends.
- Retention: denominator is external paying subscribers at start of a defined period, numerator is those same subscribers still paid at its end (or first eligible renewal cohort successfully renewed). Report not measurable for zero or unverified denominator; distinguish cancellation intentions from effective churn. No individual IDs in user-facing reports; private reconciliation only when necessary.
- Repeat reports in existing NBJB Weekly Operations Review and NBJB Member Growth Pulse; do not create a duplicate schedule. Keep small cohort breakdowns private, report no personal reflections or medical/legal context.

## Guardrails
No PostHog person identification, session replay, private-workspace tracking, payment/customer IDs, emails, journal contents, or collection of raw URL query strings/fragments in URL properties. No real events manufactured merely to verify instrumentation. Synthetic software tests and first real observed event are distinct.
Optional exit feedback is a member-initiated email separate from cancellation; only broad categories may be aggregated privately, with small cohorts suppressed. Refunds, cancellations, charges and direct outreach require authorized human processing.
