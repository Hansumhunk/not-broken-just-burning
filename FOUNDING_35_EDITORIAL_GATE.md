# Flamewalker+ — Founding 35 Editorial Gate

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
| Possible malformed exercise entries | Two entries: `THE NEED` and `CATEGORY` in `allowed-to-need` |
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
- Inspect **`allowed-to-need`** (“What You Learned You Were Allowed to Need”) using its original Google Doc and protected reader. Two exercise entries are only `THE NEED` and `CATEGORY`; determine whether they are table headers misparsed as questions. Repair only after checking source context.
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

Start with **`allowed-to-need`**, the two suspect exercise prompts, and its original workbook formatting; correct it in Supabase only after comparing the source. This is the first meaningful quality improvement in the locked thirty-five-lesson library.
