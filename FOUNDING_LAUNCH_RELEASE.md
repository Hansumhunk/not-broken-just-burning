# Flamewalker+ founding release: exactly what is offered

**Status:** Launch preparation, not live subscription sales.  
**Updated:** November 4, 2026

## Release promise
A single, evolving digital educational membership. At purchase, the subscriber receives the standard digital lessons and exercises **actually published and listed on the offer page**. Newly released standard digital material becomes available to active subscribers as it is published. There is **no guaranteed future content volume, frequency, video library, private coaching, community access, or deadline**.

Planned founding written library, *ten lessons across two distinct tracks, all in editorial review*:

**Track 1 — The Wounded Boy and Inherited Manhood (seven full-length drafts)**
1. **The Father Wound** — inherited rules about manhood; Father Imprint Map (five prompts).
2. **The Mother Wound** — early rules around closeness, approval and emotional responsibility; Maternal Imprint Map (five prompts).
3. **The Boy Who Learned to Stay Quiet** — practicing grounded expression instead of habitual silence; Silence Inventory (five prompts).
4. **Bullying, Shame, and the Early Armor** — imposed/internalized shame and protective habits; Armor Audit (five prompts).
5. **What Strength Looked Like in Your House** — inherited definitions of strength; Strength Model Audit (six prompts).
6. **What You Learned You Were Allowed to Need** — needs, help and requests; Needs Permission Map (six prompts).
7. **Inherited Manhood vs. Chosen Manhood** — choice, integration and action; One-Page Chosen Manhood Code (six prompts).

**Track 2 — The Placeholder Wound (three concise guided drafts, with five more public-education drafts in reserve)**

1. **Being Needed Is Not Being Chosen** — The Placeholder Audit (three prompts).
2. **The Love Bargain** — The Bargain Check (three prompts).
3. **Red Flags and Responsibility** — The Decision Review (three prompts).

Their complete source drafts were written for a potential public educational series. This proposed paid reader experience uses the short lessons with guided private reflection, not a claim of exclusive ownership of their educational prose. The two tracks have separate lesson numbering; the founding library totals **7 long-form + 3 shorter = 10 lessons**.

**Database verification, November 4, 2026:** All seven are present in Supabase `flamewalker_premium_lessons`, `track_slug = wounded-boy`, `status = editorial_review`. Lessons 4–7 were transcribed from the existing complete Google Drive lesson drafts into the *private database only*, preserving the lesson's substantive educational paragraphs, source worksheets, Next Honest Action and safety note. Internal source basis, proposed video concepts and book-chapter development notes were deliberately excluded from paid-reader text. No source manuscript bodies were added to public GitHub or HTML.

**November 4 extension:** Three concise relationship lessons were inserted in private Supabase under `track_slug = placeholder-wound`, with `lesson_number` 1–3, `status = editorial_review`. Internal short-video concepts were excluded; source prose, three prompts, One Action and educational boundaries were preserved. No manuscript bodies appear in the public GitHub repository. All ten currently remain `editorial_review`.

**Do not claim any of the ten are published or included in a purchasable product until the founder signs off, status is deliberately changed to `published`, paid reader entitlements are verified, and live billing is approved.**

**Planned recurring prices:** $14.99/month or $149/year in USD, plus tax where applicable. Cancellation should prevent future renewal and preserve paid access through the paid-through date. Founding subscription policies are in draft PR #89.

## Verified vs outstanding

### Verified in the sandbox (Nov 2, 2026)
- Authenticated **single-account** Stripe sandbox Checkout at $14.99/month.
- Successful simulated payment and Supabase `paid_member` entitlement activation.
- Signed webhook event handling and Stripe Customer Portal opening.
- Period-end cancellation with entitlement preserved through the paid-through date. Flexible Stripe billing uses `cancel_at`; webhook v10 maps this to `cancel_at_period_end=true`.
- Dedicated QA page `qa-stripe-sandbox.html`; billing functions accept sandbox secrets only and authorize only `NBJB_SANDBOX_TEST_USER_ID`.

### Still required before real customer charges
- Founder approves the ten lesson manuscripts and their exercises; publish `status=published` and verify each is only returned to active paid members.
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

## Editorial reader handoff — November 4, 2026

The private reader at `member-premium-lesson.html?lesson=father-wound` accepts access decisions **only from the server-authorized `read-flamewalker-lesson` function**. The existing function permits (1) eligible paid members to read `published` lessons and (2) the nominated internal reviewer to read `editorial_review` manuscripts. Free members are denied with HTTP 403. The browser tier display is not the security authority.

For authorized editorial previews, the reader now provides a five-area checklist with optional notes, revision-aware local storage, and a **Copy Review Summary** action. The checklist is **not formal approval**; it cannot publish manuscripts, change their editorial status, or grant paid membership. It is only a device-local review aid. Approvals and any server-side publication will be deliberately separate, after founder signoff.

Reviewer access depends on the server-side `NBJB_SANDBOX_TEST_USER_ID` secret. Never add that ID, credentials, premium prose, or private journal material to the public repository.

**Review links (must be signed in as designated reviewer):**
- `member-premium-lesson.html?lesson=father-wound`
- `member-premium-lesson.html?lesson=mother-wound`
- `member-premium-lesson.html?lesson=learned-silence`
- `member-premium-lesson.html?lesson=bullying-shame-early-armor`
- `member-premium-lesson.html?lesson=what-strength-looked-like`
- `member-premium-lesson.html?lesson=allowed-to-need`
- `member-premium-lesson.html?lesson=inherited-vs-chosen-manhood`
- `member-premium-lesson.html?lesson=being-needed-vs-chosen`
- `member-premium-lesson.html?lesson=the-love-bargain`
- `member-premium-lesson.html?lesson=red-flags-and-responsibility`

**Remaining acceptance:** Founder reads each draft and marks requested edits; verify a normal Free account sees no lesson body; approve manuscripts explicitly; publish only approved lessons; test live paid content delivery before enabling live checkout. Sandbox billing and currently disabled public checkout are unaffected.
