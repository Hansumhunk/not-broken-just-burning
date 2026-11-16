# Flamewalker+ — Founding 35 Editorial Gate

## Latest production update — November 16, 2026

**35 of 35 protected written lessons are now published and included with active Flamewalker+ membership.** The protected Supabase database was verified after a conditional, 28-row status promotion. Six tracks contain 7 + 8 + 5 + 5 + 5 + 5 lessons, with 0 manuscripts left in editorial review as of this release.

The private manuscript bodies remain server-authorized, no public GitHub content copies were created, and videos remain paused. [Release PR #184](https://github.com/Hansumhunk/not-broken-just-burning/pull/184) and [navigation follow-up PR #185](https://github.com/Hansumhunk/not-broken-just-burning/pull/185) update the member experience. Production browser QA and final founder content proofing remain active post-release acceptance items; a structural/word count audit is not a substitute for that work.

**The November 15 and November 4 sections below are historical snapshots and are superseded for production availability.**

---

## Current production status — November 15, 2026

**35 protected guided-lesson manuscripts exist across six tracks: 7 published, 28 in editorial review.** The November 4 snapshot below recorded the original all-draft state and is retained as historical context, not current production availability.

- **Track 1 — The Wounded Boy and Inherited Manhood:** seven full-length manuscripts published and accessible only through server-authorized Flamewalker+ membership or authorized editorial review.
- **Tracks 2–6:** all 28 manuscripts and guided exercises are already drafted, not empty placeholders. Counts are 8 + 5 + 5 + 5 + 5. They remain unpublished pending final editorial quality and founder approval.
- **Protected curriculum audit:** 28/28 drafts contain 25–70 teaching blocks each, 7–8 guided prompts, a Next Honest Action and a Smaller Door; no missing or empty required action/exercise fields were found in the current structural audit. Lengths range from approximately 7,159 to 18,540 JSON characters per manuscript. This measures structure, not quality or approval.
- **Formatting candidates:** 18 short paragraph fragments occur across six draft lessons, mainly section names and worksheet column labels. Inspect the actual reader before altering source material. A short label is not automatically a defect.
- **Cross-track duplication:** source and safety disclaimers repeat intentionally; final review must still check that each lesson's skill and exercise are distinct.
- **Public member catalog:** all 35 titles can now be discovered in the authenticated Lessons hub. Only seven published premium lessons have reader links for paid members; 28 draft previews expose titles and summaries only, with no protected manuscript bodies or promises of release dates. Videos remain shelved.
- **Remaining approval gate:** complete substantive source/claim review, sequence and redundancy evaluation, mobile/keyboard exercise UX, and **founder signoff tied to each final manuscript revision** before changing any of the 28 records to `published`. Do not bulk publish simply because the structural checks pass.

---

**35 drafts · 6 tracks · 0 published**  
Created: November 4, 2026  
**Decision: Founding content scope is frozen until editorial, usability, access, and launch gates are completed.**

## What is actually built

The protected Supabase `flamewalker_premium_lessons` library holds 35 distinct unpublished lesson drafts arranged as 7 + 8 + 5 + 5 + 5 + 5 across tracks `wounded-boy`, `placeholder-wound`, `safe-room-courtroom`, `steadiness-command`, `life-rebuilt`, and `sacred-laws`. Private text is not embedded in public GitHub Pages; the published public syllabus is only a list of titles, summaries, and guided tool names.

The Sacred Laws track draws from an existing five-law April 2025 source, confirmed by reading both the original and its second-edition reconstruction. The separate early book manuscript is not approved or finished; do not market its draft as a finished book.

**No new founding-content expansion.** Future concepts go to an after-launch backlog.

## Initial automated audit — performed November 4

| Check | Result |
|---|---|
| Distinct protected lesson slugs | 35 / 35 |
| Editorial-review status | 35 |
| Published / purchasable lessons | 0 |
| Missing blocks, exercise prompts, Next Honest Action, Smaller Door fields | 0 |
| Teaching blocks inspected | 3,491; zero empty |
| Guided prompt entries inspected | 261; zero empty |
| Short paragraph fragments | 10 (mostly short words like “and”, “Or:” in earlier manuscripts; verify layout) |
| Former malformed exercise entries | Resolved: six source worksheet column headings in `allowed-to-need` rewritten as six source-faithful guided questions. Readback verified; 0 short prompts across library |
| Protected-table security | Row-level security on; no direct `anon` or `authenticated` table grants observed |

These checks verify structure, **not** whether the writing is accurate, useful, original, publication-ready, or safe in every context.

## Editorial gates — apply to every lesson

1. **Purpose, audience, and tone.** The teaching addresses a recognizable male experience without assigning one identity or motive to every person or encouraging gender warfare. It offers capable adults agency, not permanent grievance.
2. **Clarity of claim.** Label source-derived concepts and new teaching accurately. Facts, observations, emotional responses, assumptions, and unknowns must remain distinct. No third-party diagnosis or unsupported certainty.
3. **Usable teaching value.** Clear lesson outcome, concrete practical example, voluntary guided questions, Next Honest Action, and a Smaller Door. The paid companion teaches more than a free article or repeats a neighboring lesson.
4. **Responsible boundaries.** Review health, safety, parenting, crisis, legal and financial references. No promise of therapy, legal representation, guaranteed results or supernatural certainty. Protect a learner's autonomy.
5. **Sequence and redundancy.** Identify repeated concepts, especially Sacred Law 1 versus Track 4 boundaries; Law 2 versus Track 3 fact checking; Law 3 versus Track 2 self-worth; Law 4 versus Track 4 pause-and-return; and Law 5 versus Track 1 learned silence. A repeated theme needs a distinct practical outcome, not different branding alone.
6. **Reader and exercise UX.** Confirm every section loads for the authorized editor, guided prompts are intelligible and keyboard/phone usable, device-local reflection saving works after consent, the optional device read-aloud is accurately labeled, and no retired AI Doc Maker audio is shown.
7. **Founder editorial signoff.** An approved manuscript must receive explicit founder approval linked to the current revision. Device-local checklist marks by themselves do not change published status or grant paid access.

## Prioritized review backlog

### Pass 1 — Fix known worksheet and formatting problems
- **Completed November 4:** Read the original `allowed-to-need` Google Doc. Its six `Needs Permission Map` entries were worksheet column headings, not reflection questions. Replaced those six labels with six source-faithful questions in the protected manuscript; kept the lesson in `editorial_review`. The `updated_at` revision changed, so prior local editorial review notes must be revalidated.
- Check ten unusually short paragraphs in `allowed-to-need`, `inherited-vs-chosen-manhood` and `learned-silence`. These may be stylistic joiners or extraction artifacts. Fix only if the actual reading experience suffers.
- Recheck exercise count and prompts after each repair; old saved review checkmarks must be revalidated when the manuscript revision changes.

### Pass 2 — Source and safety review
- Verify the research/clinical terminology and citations of the five *Safe Room* lessons. Do not treat hypotheses as established findings.
- Check parenting, legal, body/health and safety statements across all tracks for narrow accuracy and appropriate qualified-support advice.
- Confirm Sacred Laws track source attribution and the distinction between symbolic meaning and factual assertions.

### Pass 3 — Distinct paid value
- Compare all six tracks for duplication. Each lesson should supply a unique skill and a usable exercise rather than only a new title.
- Confirm scenario realism, teachable progression, coherent introductions, transitions, and concise reflections.
- Preserve the existing public educational material; the paid offer must add structured value.

### Pass 4 — Human founder editorial review
- Review each manuscript on the authorized account in the private reader.
- Inspect every guided prompt, note revisions, copy/save where appropriate, and give explicit approval on final text.
- Do not mass-approve the 35 drafts merely because an automated audit passes.

### Pass 5 — Member access and launch verification
- Free member receives no premium manuscript text.
- Approved paid member only sees explicitly published lessons.
- Editor can review unpublished lessons without giving unrelated free accounts access.
- Test exercise workflow and reader in real mobile/desktop browsers; test cancellation, renewal, tax and refunds with production-ready Stripe configuration before taking real charges.
- Finalize legal operator, support, Terms and refunds. **Do not open checkout prematurely.**

## Immediate next piece of work

The first source-faithful exercise repair is **complete** (`allowed-to-need`, six corrected prompts). Next: inspect the ten short paragraph fragments in early source manuscripts in the actual reader and evaluate readability before altering them.
