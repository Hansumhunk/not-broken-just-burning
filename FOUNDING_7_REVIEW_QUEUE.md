# Flamewalker+ — founding 7 founder review queue

**Status November 4, 2026: one founder content acceptance (Lesson 1), six awaiting review, zero published. This queue is NOT a publication authorization.** The source manuscripts remain in the private database; this public GitHub checklist contains only non-sensitive titles, links and editorial criteria.

## Open each private lesson while logged in as the designated editorial reviewer

| # | Lesson (authorized review link) | Guided prompts | Targeted check |
|---:|---|---:|---|
| 01 | [The Father Wound](https://notbrokenjustburning.com/member-premium-lesson.html?lesson=father-wound) | 5 | Source-faithful Father Imprint Map prompts and Next Honest Action; implementation-only notes removed. |
| 02 | [The Mother Wound](https://notbrokenjustburning.com/member-premium-lesson.html?lesson=mother-wound) | 5 | Source-faithful Maternal Imprint Map and practical relationship action; implementation-only notes removed. |
| 03 | [The Boy Who Learned to Stay Quiet](https://notbrokenjustburning.com/member-premium-lesson.html?lesson=learned-silence) | 5 | Silence Inventory and low-risk voice practice; implementation-only notes removed. |
| 04 | [Bullying, Shame, and the Early Armor](https://notbrokenjustburning.com/member-premium-lesson.html?lesson=bullying-shame-early-armor) | 5 | Check shame-versus-fact distinction and gentle Armor Audit. |
| 05 | [What Strength Looked Like in Your House](https://notbrokenjustburning.com/member-premium-lesson.html?lesson=what-strength-looked-like) | 7 | Check source-faithful seven-question Strength Model Audit; choose a testable rule. |
| 06 | [What You Learned You Were Allowed to Need](https://notbrokenjustburning.com/member-premium-lesson.html?lesson=allowed-to-need) | 6 | Review repaired Needs Permission Map and safety of making requests. |
| 07 | [Inherited Manhood vs. Chosen Manhood](https://notbrokenjustburning.com/member-premium-lesson.html?lesson=inherited-vs-chosen-manhood) | 6 | Review full KEEP/REFORGE/RETIRE/BUILD/ACT/REVIEW Code and seven-day practice. |


## Founder content review recorded — Lesson 1

- **The Father Wound** (`father-wound`): founder replied **“okay, this all looks good”** after the Lesson 1 review handoff. Treat this as **content acceptance of the current revision**, not permission to activate public sales or publish the entire track.
- Accepted Supabase manuscript revision: `updated_at = 2026-11-04 22:52:28.328069+00`; 149 reading blocks, five guided prompts. Any further manuscript change requires renewed editorial acceptance.
- **Still outstanding:** real desktop/mobile reader check, premium content access verification, and final release acceptance. Database status stays `editorial_review` until those are complete.
- **Next founder review:** Lesson 2, *The Mother Wound* (`mother-wound`), current revision `updated_at = 2026-11-04 22:52:29.580414+00`; 205 reading blocks and five guided prompts.
## Approve the actual current revision, not an old draft

For each lesson, read the body and the entire guided exercise in the authenticated reader, verify correct section navigation and local-only reflection saving, inspect a phone and desktop layout, check an optional device voice read-aloud session, and record factual/cultural/trauma-informed edits before signing off. Check that a free account cannot retrieve the manuscript. The checklist stored on the device is not founder approval and cannot change publication status.

Founder signoff decision for each lesson: **APPROVE CURRENT REVISION** / **REVISE** / **HOLD**. Specify slug and revision shown in the reader. Approval must be unambiguous and current before any status change from `editorial_review` to `published`.

## Technical audit and quality repairs completed

- Across the seven: **2,453 nonempty blocks**, **39 nonempty guided prompts**, no remaining short/empty prompts or flagged internal-implementation notes; each still has a specific `nextAction`, a `smallerDoor`, and educational safety language. This is a structural check, not a full evidence review.
- Lesson 1–3: removed exactly three internal future-implementation paragraphs per draft from the customer-facing reader body; upgraded their guided questions, next action and smaller-door practice from generic field content to source-faithful material. Their `updated_at` revision timestamps changed.
- Lesson 5: Strength Model Audit now uses seven practical questions, matching its seven-step source exercise. Lesson 7: six source-faithful guided code prompts replace six labels. Lesson 6: earlier source-based Needs Permission Map repair retained.
- Source and safety checks: no empty exercises or reader blocks in the proposed launch track. A targeted language scan found no deterministic neuroscience or clinical diagnostic teaching claims in its checked terms, but this cannot replace full factual, originality or safety review.
- Deployed Supabase function **create-live-checkout-session v6** now checks a server-side count of at least **seven rows with status=published**, in addition to the independent `NBJB_LIVE_BILLING_MODE` launch switch. With **zero published** now, checkout remains unavailable even if a browser attempts to call it. Deployed source copied to `launch-backend-staging/` in this launch PR for inspection.
- The reader-only connector styling fix remains unmerged in PR #128 until real-browser visual QA. The staging checkout UI and policy links remain a draft in PR #129. Neither PR has opened public checkout.

## Next decision

Review **The Father Wound** first, mark requested changes or approve that exact revision, then continue through lesson 7. If fewer than seven are approved, keep checkout closed and edit the remaining lessons; do not pad the release with drafts. Once seven are approved, verify free/paid access, a real controlled Stripe canary, webhook/entitlement fulfillment and cancellation before public billing goes live.
