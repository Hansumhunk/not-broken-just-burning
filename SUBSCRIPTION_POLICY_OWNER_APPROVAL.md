# Flamewalker+ subscription policies — owner approval required

**Prepared:** November 2, 2026  
**Status:** Draft / no live checkout / do not publish as binding policy yet.

## Exact owner decisions needed

1. **Refund guarantee:** approve the proposed **7-calendar-day first-purchase refund request window** for new Flamewalker+ subscriptions, or specify a different policy. The draft has no download/lesson-usage exception and allows statutory rights. Annual and monthly initial purchases are treated alike.
2. **Renewal payments:** approve that recurring renewals are *not automatically refunded or prorated* after the grace period, except as required by law, for billing errors, or material non-delivery.
3. **Cancellation:** approve cancel-at-period-end through the Stripe Customer Portal and support email. Confirm this works in actual sandbox tests before representing it as functional.
4. **Contact:** confirm `notbrokenjustburning@gmail.com` is the correct billing-support inbox and is monitored for billing questions.
5. **Legal/operator identity:** verify the proper legal business/operator name Stripe requires on invoices, receipts, and customer terms. Do not infer a legal entity from the brand alone.
6. **Consumer-law review:** consult a qualified professional if required for your operating locations and intended customer markets, especially auto-renewal notice and digital-sale refund rights.
7. **Privacy and tax:** confirm the payment data description is accurate and determine applicable tax registrations with a qualified advisor; do not assume enabling Stripe Tax alone satisfies obligations.
8. **Launch promise:** approve clearly that Flamewalker+ is a growing library, not a finished video catalog; only published lessons count as available now.

## What this PR adds

- `terms.html` — proposed digital educational-service / membership Terms of Service.
- `refunds.html` — proposed subscription cancellation/refund policy.
- `privacy.html` — forward-looking Stripe billing data-use clarification.
- Contact/Home/Member Store links and sitemap entries.

**Every new policy page carries a prominent EDITORIAL DRAFT disclaimer.** This banner must be removed, a final effective date applied, policies owner-approved, and a final CI check run before merging this PR and enabling policy URLs on Stripe Checkout.

## Stripe Dashboard actions after publication

- Configure Checkout **Store policies**: turn ON Terms & Privacy and supply the final site URLs (`https://notbrokenjustburning.com/terms.html`, `https://notbrokenjustburning.com/privacy.html`).
- Turn ON Refund policy with the final `https://notbrokenjustburning.com/refunds.html` link.
- Turn ON Support contact with the confirmed business support email / contact page.
- Configure subscription terms acceptance as required for your business and jurisdiction.
- Review and confirm cancellation instructions, invoices, and email notices in Stripe Customer Portal.

This PR does not activate billing or merge the draft billing PR #63 / protected lesson PR #88. Do not treat checkout-design preview as a deployed, working subscription.
