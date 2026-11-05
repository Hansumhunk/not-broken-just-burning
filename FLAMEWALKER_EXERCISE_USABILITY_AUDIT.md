# Flamewalker+ exercise usability audit — 35 lessons

**Source:** Live Supabase `public.flamewalker_premium_lessons` manuscript blocks, reviewed November 4, 2026. This is a content/interaction-gap inventory, **not** a full browser QA pass or editorial approval.

## Finding

The premium reader provides general **Pause and reflect** notes and final guided-reflection fields, plus dedicated, inline workspaces for **all seven founding lessons**. The Father Imprint Map shipped in PR #136. PRs #138 and #139 introduced reusable side-by-side maps, selectable repeatable records and multi-stage guided forms for the remaining six published lessons. Real desktop/mobile acceptance is still outstanding. In multiple other manuscripts, instructions such as "write four columns", "choose three situations", "for each complete", or "write a plan" occur much earlier than the final reflection. The missing connection between instruction and input causes avoidable confusion.

**Severity:**
- **HIGH**: Explicit multipart map/audit, columns or repeated-entry worksheet with no matching on-page fields. These should be interactive before inviting more paying users.
- **MEDIUM**: A structured check, decision or plan with no inline form. Can be a short scaffolded list, checklist or one/few text fields rather than a four-column map.
- **LOW**: Mostly conceptual prose plus a final guided reflection; inspect flow and add an inline prompt only where genuinely useful.

**Design standard:** Teaching and examples LEFT; matching editable field RIGHT on desktop (stacked mobile). Do not render a second isolated worksheet after the chapter. Carry the **same DOM input nodes** forward when a lesson spans sections; preserve answers during navigation. Copy and deliberate Save to My Work only; never automatically upload private reflection text. Verify privacy, mobile, keyboard controls, and behavior on back/forward across sections. Avoid hardcoding a custom reader for every lesson; introduce reusable `exerciseSchema`/component layouts for structured exercise types, configured separately from original manuscript prose.

## Track 1 — published (7)

| # | Slug | Practice in manuscript | Priority | Work |
|---|---|---|---|---|
| 1 | `father-wound` | Four-column Father Imprint Map | COMPLETE | PR #136 side-by-side in reader; device QA still needed |
| 2 | `mother-wound` | Four-column Maternal Imprint Map | COMPLETE | Reusable 4-column map, PR #138; device QA pending |
| 3 | `learned-silence` | Silence Inventory: three situations, multiple questions each | COMPLETE | Three independent selectable situations, 10 prompts, PR #138; QA pending |
| 4 | `bullying-shame-early-armor` | Armor Audit for several strategies | COMPLETE | Repeatable strategy records, PR #138; QA pending |
| 5 | `what-strength-looked-like` | Strength Model Audit of five inherited rules | COMPLETE | Five independent inherited-rule records, PR #139; QA pending |
| 6 | `allowed-to-need` | Needs Permission Map across several needs | COMPLETE | Repeatable need-by-need records, PR #139; QA pending |
| 7 | `inherited-vs-chosen-manhood` | Parts A–F: Keep, Reforge, Retire, Build, Act, Review | COMPLETE | Six persistent guided stages, PR #139; QA pending |

**Founding lesson implementation status:** All seven now have inline workspaces in the protected reader. **Device acceptance remains open:** verify text-to-form alignment, navigation retention, readability, Copy and Save on actual desktop and mobile browsers before opening public sales. Published manuscript content and statuses were not changed by these UI fixes.

## Track 2 — editorial drafts (8)

| # | Slug | Practice in manuscript | Priority |
|---|---|---|---|
| 1 | `being-needed-vs-chosen` | Four-Lens Reciprocity Map; Placeholder Audit | HIGH |
| 2 | `the-love-bargain` | Bargain-to-Choice Worksheet | HIGH |
| 3 | `red-flags-and-responsibility` | Six-Column Reality Map and traffic-light decision check | HIGH |
| 4 | `betrayal-rewrite-trap` | Three-Column Reality Map and Memory-and-Meaning Table | HIGH |
| 5 | `children-not-relationship-glue` | Three-Column Fatherhood Reset Map | HIGH |
| 6 | `loyalty-without-self-abandonment` | Loyalty Audit and boundary questions | MEDIUM |
| 7 | `grieving-future-never-happened` | Two-Page Future-Loss Map | HIGH |
| 8 | `other-person-not-your-measure` | Values-Based Identity Inventory | HIGH |

## Track 3 — editorial drafts (5)

| # | Slug | Practice in manuscript | Priority |
|---|---|---|---|
| 1 | `promise-of-the-room` | Two-Column Expectations vs Reality exercise and process-goals comparison | HIGH |
| 2 | `split-alliance-therapy-triangle` | Five-Part Alliance Integrity Check | HIGH |
| 3 | `professional-authority-multiplier` | Label-to-Observable-Behavior translation and conversation rehearsal | HIGH |
| 4 | `when-you-stop-trusting-own-account` | Five-Column Facts/Evidence/Interpretation exercise | HIGH |
| 5 | `double-bind-darvo-reaction` | Chronological Sequence Map | HIGH |

## Track 4 — editorial drafts (5)

| # | Slug | Practice in manuscript | Priority |
|---|---|---|---|
| 1 | `body-as-ally` | Four-Column Embodied Stability Map | HIGH |
| 2 | `name-the-emotion-choose-action` | Four-part Emotion-to-Action Compass | HIGH |
| 3 | `the-space-between-trigger-and-response` | Pause/Prepare/Return response plan | MEDIUM |
| 4 | `boundaries-without-cruelty` | Four-Part Boundary Builder | HIGH |
| 5 | `discipline-without-self-punishment` | Minimum Viable Commitment and seven-day plan | MEDIUM |

## Track 5 — editorial drafts (5)

| # | Slug | Practice in manuscript | Priority |
|---|---|---|---|
| 1 | `provision-without-proving-worth` | Four-Column Provider Inventory | HIGH |
| 2 | `fatherhood-what-children-watch` | Two-Column Generational Pattern Review | HIGH |
| 3 | `brotherhood-without-dependency` | Five Tests of a Useful Circle (evaluation prompts) | MEDIUM |
| 4 | `lead-yourself-first` | Five-part decision process | MEDIUM |
| 5 | `the-integrated-man-thirty-day-map` | Three priorities and 30-day plan in four stages | HIGH |

## Track 6 — editorial drafts (5)

| # | Slug | Practice in manuscript | Priority |
|---|---|---|---|
| 1 | `sacred-law-emotional-boundaries` | Four-Part Boundary Builder | HIGH |
| 2 | `sacred-law-pattern-recognition` | Six-Question Pattern Check | HIGH |
| 3 | `sacred-law-self-worth` | Five-Line Worth Separation Practice | HIGH |
| 4 | `sacred-law-strategic-retreat` | Six-Part Engagement Test, act/delay/redirect/decline | HIGH |
| 5 | `sacred-law-authentic-voice` | Voice, Timing, and Repair Rehearsal | MEDIUM |

## Reusable reader component types to build

1. **Column map:** 2–6 input columns; teaching left / answer right; final consolidated review (Mother Wound, Reality Maps, Provider Inventory, Boundary Builder).
2. **Repeated-entry audit:** Add 1–5 situations, inherited rules, armor strategies, or needs; each entry has its own named prompts; allow edit and optional deletion without losing other entries.
3. **Step-by-step decision framework:** Answer one prompt at a time, then choose an action or category; optionally summarize and review.
4. **Timed/weekly practice plan:** Three priorities and a cadence/check-in (no notifications or backend storage needed).
5. **Reflection-only:** Use final exercise boxes where appropriate; do not force all educational prose to become a form.

## Acceptance criteria and release scope

- [ ] Prompt is next to its actual writing field when the reader encounters it, not at an unrelated footer.
- [ ] Layout is side-by-side at desktop width and stacked legibly on phones.
- [ ] Multi-part answers survive forward/back chapter navigation without automatic persistence.
- [ ] Review screen brings forward the existing answers; user can edit before Copy / Save.
- [ ] Explicit Copy/Save to My Work; privacy text reflects actual storage behavior and limitations.
- [ ] Browser refresh doesn't falsely promise persistence. Longer answers are not silently truncated on save.
- [ ] Controls are keyboard accessible; forms have accessible labels and no horizontal overflow.
- [ ] Tests verify field placement and data preservation, not merely matching HTML identifiers.
- [x] Dedicated interface workspaces for all seven published lessons have been implemented and automated-tested (PRs #136, #138, #139).
- [ ] Founder must confirm the seven workspaces behave well on actual desktop and mobile browsers; drafts retain `editorial_review` until separate publication approval.
- [ ] No changes to Stripe launch gates or disabled Read to Me.

**Important:** An exercise's appearance in this table means the manuscript contains an instruction requiring learner participation. Priority is an interface-design recommendation, not a judgment of clinical or manuscript quality.
