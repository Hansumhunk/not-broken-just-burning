# Flamewalker+ founding release: exactly what is offered

**Status:** Launch preparation, not live subscription sales.  
**Updated:** November 2, 2026

## Release promise
A single, evolving digital educational membership. At purchase, the subscriber receives the standard digital lessons and exercises **actually published and listed on the offer page**. Newly released standard digital material becomes available to active subscribers as it is published. There is **no guaranteed future content volume, frequency, video library, private coaching, community access, or deadline**.

Planned initial written track, *all still in editorial review*:
1. **The Father Wound** — inherited rules about manhood; Father Imprint Map (five prompts).
2. **The Mother Wound** — early rules around closeness, approval and emotional responsibility; Maternal Imprint Map (five prompts).
3. **The Boy Who Learned to Stay Quiet** — practicing grounded expression instead of habitual silence; Silence Inventory (five prompts).

All three are currently in Supabase `flamewalker_premium_lessons` with `status = editorial_review`. Do not claim they are available or change their status until the founder signs off and the protected reader has been published.

**Planned recurring prices:** $14.99/month or $149/year in USD, plus tax where applicable. Cancellation should prevent future renewal and preserve paid access through the paid-through date. Founding subscription policies are in draft PR #89.

## Verified vs outstanding

### Verified in the sandbox (Nov 2, 2026)
- Authenticated **single-account** Stripe sandbox Checkout at $14.99/month.
- Successful simulated payment and Supabase `paid_member` entitlement activation.
- Signed webhook event handling and Stripe Customer Portal opening.
- Period-end cancellation with entitlement preserved through the paid-through date. Flexible Stripe billing uses `cancel_at`; webhook v10 maps this to `cancel_at_period_end=true`.
- Dedicated QA page `qa-stripe-sandbox.html`; billing functions accept sandbox secrets only and authorize only `NBJB_SANDBOX_TEST_USER_ID`.

### Still required before real customer charges
- Founder approves the three lesson manuscripts and their exercises; publish `status=published` and verify each is only returned to active paid members.
- Founder approves Terms, refund/cancellation approach and legal operator identity. Remove editorial-draft banners, set effective date, publish policy pages and connect to Stripe Checkout.
- Verify Stripe **live** account activation, settle tax setup, create live product and two live recurring prices, configure Customer Portal and **live webhook signing secret**.
- Implement live billing as a deliberately separate server-side path. **Do not replace the existing production Supabase `STRIPE_SECRET_KEY` with an `sk_live_` key**: current functions are explicitly test-only and the shared project serves real free members.
- Validate live event signature, Checkout, entitlement, cancellation, failed payment behavior, access isolation, and renewal state. The success redirect alone must never confer membership.
- Publish accurate listing of exactly what founding members receive on day one. Do not advertise the full video library or 15% merchandise discount as current benefits.

## Owner choices pending

1. Approve the three manuscripts and exercises for founding release, or specify revisions.
2. Approve, edit, or reject the proposed **7-calendar-day first-purchase refund request window**; specify any renewal-refund exception beyond statutory rights and service failures.
3. Confirm correct legal business name and monitored support email on checkout, receipts and policy pages.
4. Confirm live Stripe verification/payment enablement in the live dashboard.

**Core rule:** Founding version is small by design; paid access must be reliable, not a promise of unfinished features.
