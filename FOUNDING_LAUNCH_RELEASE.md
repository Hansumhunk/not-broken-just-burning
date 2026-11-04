# Current founding release inventory — November 4, 2026

**CURRENT STATUS: 20 private editorial-review lessons across 3 tracks; ZERO published; paid checkout CLOSED.**

- **Track 1, `wounded-boy`:** 7 full-length guided manuscripts and exercises.
- **Track 2, `placeholder-wound`:** 8 guided relationship lessons; lessons 1–3 were previously expanded and lessons 4–8 were expanded from five existing short NBJB public-education drafts on November 4.
- **Track 3, `safe-room-courtroom`:** 5 newly expanded, research-oriented learning drafts adapted from the first five existing `When the Safe Room Becomes the Courtroom` lesson foundations. These are educational reflections only, not verified clinical or legal findings.

All ten newly imported lessons include teaching sections, concrete situations, Next Honest Action, Smaller Door, and eight guided prompts. No manuscript bodies from Drive or Supabase were added to the public repository. Original Google Drive files remain unchanged.

**Important:** The 20 lesson target counts *prepared drafts*, not editorially approved or purchasable lessons. Review the entire corpus for teaching clarity, examples, source/factual accuracy (especially research claims in the Safe Room foundations), trauma-informed boundaries, responsive reader rendering, and usable exercises. A saved reviewer checklist does not approve or publish a lesson. No live payment activation without verified entitlements, cancellation and finalized legal terms.

The following sections record earlier stages of this project and may refer to the former 3, 7, or 10 lesson milestones. They are preserved as history rather than current inventory.

---

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

**Track 2 — The Placeholder Wound (three expanded guided modules, with five more public-education drafts in reserve)**

1. **Being Needed Is Not Being Chosen** — Four-Lens Reciprocity Map / expanded Placeholder Audit (**seven prompts**).
2. **The Love Bargain** — Bargain-to-Choice Worksheet / expanded Bargain Check (**eight prompts**).
3. **Red Flags and Responsibility** — Six-Column Reality Map / expanded Decision Review (**eight prompts**).

Their complete source drafts were written for a potential public educational series. This proposed paid reader experience uses substantially expanded guided modules with their own scenarios, deeper teaching, tools, Smaller Door exercises, and Next Honest Actions. This is not a claim of exclusive ownership of their original educational prose. The two tracks have separate lesson numbering; the founding library totals **7 original full-length + 3 newly expanded = 10 substantial guided lessons**.

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


## Track 2 deepening — editorial revisions

**Scope:** The three existing protected rows in `track_slug=placeholder-wound` were expanded *in Supabase only*, preserving the original Google Drive short-form educational drafts and the private reader's entitlement control.

| Track 2 lesson | New private text | Teaching blocks | Guided prompts | Deepening |
| --- | --- | ---: | ---: | --- |
| Being Needed Is Not Being Chosen | approximately 18,000 characters | 67 | 7 | Contribution vs consideration; the over-functioning loop; four reciprocity lenses; three non-diagnostic scenarios; boundary conversation and smaller step |
| The Love Bargain | approximately 18,500 characters | 70 | 8 | Explicit agreements vs invisible hopes; sacrifices and family commitments; real-life scenarios; bargain-to-choice worksheet; seven-day action |
| Red Flags and Responsibility | approximately 18,500 characters | 70 | 8 | Facts/feelings/interpretations/patterns/unknowns; hindsight discipline; four scenarios; traffic-light decisions; six-column reality map |

Each private lesson is `content.version = 2` with `status = editorial_review`; editorial checklist notes are revision-aware. No content is marked `published`, no Stripe checkout was enabled, and no source manuscript bodies were placed in public HTML or GitHub.

**Member value:** Paid guided learning now differs meaningfully from the proposed free articles: more nuance, scenario teaching, structured reflection, multiple perspectives, practice prompts, and an actionable integration framework. The original eight-part public educational series remains free to be published separately if approved.

**Review criteria before founding approval:** full-text rendering and page grouping in the authenticated reviewer; presence of every exercise prompt; useful reading time and mobile legibility; claims not framed as diagnoses or mind-reading; no source-private relationship facts or identifiable persons; clear professional and safety boundaries; consistency across both tracks. Editorial approval and a genuine free-versus-paid access test remain pending.


## Private editorial workflow and structural audit (Nov 4, 2026)

The server-authorized reader now offers a ten-lesson review queue grouped by track, with links to the drafts. It shows device-local saved checklist notes **as work in progress, never publication approvals**. Prior notes for other lessons require opening each server-authorized draft to verify its current revision; the current draft is compared against `updated_at`. The checklist uses each lesson's real exercise prompt count (5–8).

Read-only database audit: ten drafts, zero published; none have empty content blocks or empty exercise prompts. Every lesson includes an exercise title, 5–8 prompts, a Next Honest Action and Smaller Door. These checks do **not** establish editorial, clinical, or factual approval. Founder manuscript review and real-browser free-versus-paid account checks remain pending. No private lesson prose has been committed to public GitHub.

## Narration fix — November 4, 2026

**Verified reason for the broken narration promise:** the private `nbjb-premium-audio` bucket has thirteen live `father-wound/section-N.mp3` clips, while the reader generates **twenty text sections** before the final exercise. The other nine lesson slugs have no published recording objects. The previous recorded player also finished after each individual section. A separate basic browser text-to-speech control likewise stopped at each section.

**Launch decision:** remove the incomplete *recorded* narration UI entirely and keep its existing private audio objects for possible future production. No complete natural/studio-quality audio collection is being advertised or sold. Replace the old accessibility fallback with a clearly marked **device read-aloud** feature that starts at the current section and continues automatically through all remaining text sections and optional exercise prompts. Provide Pause, Stop, speed, and current-section-only controls. Speech is chunked, retains the active utterance against garbage collection, and uses a short asynchronous handoff to reduce browser playback races.

This is a browser-generated voice, not professional narrated audio, and mobile browsers may suspend speech when the screen locks or the page is backgrounded. **Actual device-based end-to-end listening is still a separate user acceptance check**; JS unit/static validation does not establish universal cross-browser TTS reliability.

The server authorization for signed private historical audio assets remains intact; no Supabase recordings were deleted, the premium lesson access rules are unchanged, and paid checkout stays closed.
