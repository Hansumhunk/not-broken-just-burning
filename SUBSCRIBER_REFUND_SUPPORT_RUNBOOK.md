# Flamewalker+ subscriber care: refunds and cancellation

**Draft for founder approval, November 2, 2026. No live sales yet.**

Our guiding principle: NBJB will not fit everyone, and subscribers must not be pressured into staying. A cancellation is a decision, not a negotiation.

## Proposed voluntary policy
- Cancel recurring renewal **any time**, directly through Stripe's Customer Portal. No required call or explanation; no cancellation penalty.
- First purchase: full refund on request within **14 calendar days** for monthly subscriptions, or **30 calendar days** for annual subscriptions.
- Renewal charge: ordinarily full refund if requested within **7 calendar days** of the renewal. Do not demand proof of lesson usage or an explanation for disliking the material.
- Outside these windows: handle duplicate charges, billing errors, nondelivery and genuine hardship case by case, fairly; honor rights required by applicable law. Decline only clearly fraudulent or repeatedly abusive requests.
- A refund is not the same as stopping future renewal. If a full refund is approved, **cancel the Stripe subscription** as part of the refund process and normally end paid access. Leave the free Flamewalker account intact.
- Simple cancellation without a refund leaves paid access active until the paid-through date.
- The refund goes to the original payment method through Stripe, subject to banking timelines.

## Support workflow (live mode only)

1. Verify that a message reached the official published support mailbox `notbrokenjustburning@gmail.com`. Ask for account email, approximate payment date and the nature of the request. Do not collect full card details, passwords or personal journal content.
2. Locate the correct Stripe **live** Customer, invoice and payment using the account email, then validate the customer's ownership of the account. Do not rely on email alone for authorization in server code; use the member's authenticated Supabase UUID mapping.
3. If they only want cancellation, direct them to the self-service **Manage Billing** Customer Portal or process their request promptly; verify that future renewal is turned off and send a confirmation with the paid-through date.
4. If requesting a refund, calculate days from the charge date in the applicable plan or renewal window. Apply the generous first-purchase/renewal policy without demanding a personal explanation.
5. When approving a full refund, **cancel future billing as well** (immediate subscription end when appropriate) and refund the charge through Stripe. These are distinct actions: refunding the payment alone may not end a subscription. Check the actual subscription state and entitlement afterward.
6. Confirm in Supabase that paid membership is downgraded when it should be. If immediate cancellation or refund event handling did not update entitlement, use a trusted server-side reconciliation path; never modify a customer's paid tier from browser JavaScript.
7. Reply with the refund amount, transaction date, cancellation status, and that refunds generally appear according to the card issuer/financial institution's processing schedule. Keep a minimal support record (no private journal content).
8. Periodically audit canceled subscriptions, accidentally renewed charges, failed refunds and emails awaiting action. Check annual renewal notices and other jurisdiction-specific requirements before live launch.

## Before activating paid membership
- Publish the final approved policy and Terms with effective date and **legal business/merchant name**.
- Make the refund and cancellation terms accessible before and at checkout; put the support email on the receipt/policy pages.
- Verify the Stripe Customer Portal cancellation link works without unnecessary steps.
- **Do not assume Stripe automatically cancels a subscription just because a refund was issued**. Test and document both actions.
- Confirm refunds, subscription termination and payment disputes cannot accidentally leave permanent paid entitlements.
- Review annual renewal notification requirements applicable to the actual business and customers; configure operational notices rather than promising what hasn't been implemented.
- Run live canary subscription and cancellation only when founder authorizes charges and live account is ready.

This is a working policy/business plan, not a claim that the live implementation is complete.
