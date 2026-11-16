# NBJB Flamewalker+ — founding 28 editorial revision and release-readiness audit

**Audit date:** November 15, 2026  
**Scope:** 28 private, previously drafted manuscripts across Tracks 2–6.  
**Production state at audit:** 7 founding Track 1 lessons remain published; all 28 Tracks 2–6 remain `editorial_review` and unavailable to ordinary paid members. This report does **not** authorize publication.

## Completed editorial work

- Read the original protected content, headings, worksheets, sources and existing guardrails. The three extensive original Placeholder Wound manuscripts (lessons 1–3) were retained, avoiding needless rewrites of already-developed material.
- Added substantive, specifically authored practical sections to **25** shorter manuscripts: scenario analysis, observable-versus-interpreted distinctions, sample conversations, options for lower-intensity practice, responsibility and safety boundaries, and realistic follow-through.
- Added verified study-context notes to **five** When the Safe Room Becomes the Courtroom lessons, distinguishing empirical correlations / vignette studies from claims about individuals or clinical diagnoses.
- Replaced internal 'educational draft' / 'v0.1' boilerplate with reader-facing learning outcomes in **20** lessons, and removed two stand-alone internal foundation labels. Source ancestry remains stored in the protected `sourceKind` / `sourceEdition` fields rather than erased.
- The originating titles, exercise titles, exercise prompts, Next Honest Action, Smaller Door and protected database access rules were preserved. The JSON content revision incremented with each material change.
- Videos remain shelved, as requested by the founder.

## Structural and editorial consistency checks — passing

- 28 distinct review manuscripts with valid typed text blocks and no blank/invalid blocks.
- Every manuscript includes **7 or 8 non-empty guided questions**, a non-empty **Next Honest Action**, a non-empty **Smaller Door**, and an explicit professional/safety boundary.
- No duplicate guided exercise titles or exact shared exercise-question pairs detected among the 35 current lessons.
- Each draft includes a practical method, scenario, or worked practice appropriate to its teaching goal.
- Database protected-table **row-level security remains enabled**. The `anon` and `authenticated` roles do not have direct `SELECT` privilege on the premium lesson table.
- Final status readback: **7 published; 28 editorial_review**. No subscription configuration, payment, entitlement, or manuscript publication state was changed.

The checks above establish content structure and revisions. They do not replace fact-checking of every claim, founder editorial judgment, or real-browser acceptance testing for every manuscript.

## Current private manuscript inventory

*Teaching words count paragraph text, not headings, separate worksheet prompts or source metadata. Word count is not itself a quality grade.*

### 2. The Placeholder Wound (8 manuscripts)

| # | Lesson | Revision | Teaching words* | Guided prompts | Status |
|---:|---|---:|---:|---:|---|
| 1 | Being Needed Is Not Being Chosen | 2 | 2223 | 7 | Editorial review |
| 2 | The Love Bargain | 2 | 2171 | 8 | Editorial review |
| 3 | Red Flags and Responsibility | 2 | 2183 | 8 | Editorial review |
| 4 | The Betrayal Rewrite Trap | 4 | 1587 | 8 | Editorial review |
| 5 | Children Are Not Relationship Glue | 4 | 1532 | 8 | Editorial review |
| 6 | Loyalty Without Self-Abandonment | 4 | 1415 | 8 | Editorial review |
| 7 | Grieving the Future That Never Happened | 4 | 1470 | 8 | Editorial review |
| 8 | The Other Person Is Not Your Measure | 4 | 1389 | 8 | Editorial review |

### 3. When the Safe Room Becomes the Courtroom (5 manuscripts)

| # | Lesson | Revision | Teaching words* | Guided prompts | Status |
|---:|---|---:|---:|---:|---|
| 1 | The Promise of the Room | 4 | 1509 | 8 | Editorial review |
| 2 | Split Alliance: When Therapy Feels Two Against One | 4 | 1464 | 8 | Editorial review |
| 3 | The Professional Authority Multiplier | 4 | 1473 | 8 | Editorial review |
| 4 | When You Stop Trusting Your Own Account | 4 | 1411 | 8 | Editorial review |
| 5 | The Double Bind, DARVO, and Reaction as Evidence | 4 | 1422 | 8 | Editorial review |

### 4. Steadiness & Emotional Command (5 manuscripts)

| # | Lesson | Revision | Teaching words* | Guided prompts | Status |
|---:|---|---:|---:|---:|---|
| 1 | Your Body Is Not the Enemy | 3 | 1201 | 8 | Editorial review |
| 2 | Name the Emotion, Choose the Action | 3 | 1149 | 8 | Editorial review |
| 3 | The Space Between Trigger and Response | 3 | 1114 | 8 | Editorial review |
| 4 | Boundaries Without Cruelty | 3 | 1062 | 8 | Editorial review |
| 5 | Discipline Without Self-Punishment | 3 | 1067 | 8 | Editorial review |

### 5. Rebuilding a Life That Holds (5 manuscripts)

| # | Lesson | Revision | Teaching words* | Guided prompts | Status |
|---:|---|---:|---:|---:|---|
| 1 | Provision Without Proving Your Worth | 3 | 1087 | 8 | Editorial review |
| 2 | Fatherhood Under Pressure: What Children Watch | 3 | 1128 | 8 | Editorial review |
| 3 | Brotherhood Without Dependency | 3 | 1062 | 8 | Editorial review |
| 4 | Lead Yourself Before Leading Others | 3 | 1024 | 8 | Editorial review |
| 5 | The Integrated Man: A Thirty-Day Rebuilding Map | 3 | 1209 | 8 | Editorial review |

### 6. The Five Sacred Laws of Survival (5 manuscripts)

| # | Lesson | Revision | Teaching words* | Guided prompts | Status |
|---:|---|---:|---:|---:|---|
| 1 | The Law of Emotional Boundaries | 2 | 1304 | 8 | Editorial review |
| 2 | The Law of Pattern Recognition | 2 | 1196 | 8 | Editorial review |
| 3 | The Law of Sacred Self-Worth | 2 | 1199 | 8 | Editorial review |
| 4 | The Law of Silence and Strategic Retreat | 2 | 1321 | 8 | Editorial review |
| 5 | The Law of the Authentic Voice | 2 | 1332 | 8 | Editorial review |

## Sources verified for the Safe Room editorial notes

1. Friedlander, M. L., Escudero, V., Welmers-van de Poll, M. J., & Heatherington, L. (2018). *Meta-analysis of the alliance–outcome relation in couple and family therapy*. **Psychotherapy**. DOI: [10.1037/pst0000161](https://doi.org/10.1037/pst0000161). The findings are group-level relationships; no particular clinician or partner is adjudicated.
2. Harsey, S., & Freyd, J. J. (2020). *Deny, Attack, and Reverse Victim and Offender (DARVO): What Is the Influence on Perceived Perpetrator and Victim Credibility?* **Journal of Aggression, Maltreatment & Trauma**. DOI: [10.1080/10926771.2020.1774695](https://doi.org/10.1080/10926771.2020.1774695). The evidence uses experimental vignettes and informs conceptual education, not individual determinations.
3. Drożdżowicz, A., & Grodniewicz, J. P. (2025). *Epistemic injustice and psychotherapy*. **Philosophical Psychology**. DOI: [10.1080/09515089.2025.2519320](https://doi.org/10.1080/09515089.2025.2519320). This is philosophical conceptual analysis, not proof that any specific clinical encounter involved misconduct.

## Release gates still outstanding

1. **Final substantive editorial quality:** inspect the final rendered manuscript and worksheets for readability, claim calibration, distinct paid value and appropriate trauma-informed language. Structural QA alone is insufficient.
2. **Private reader acceptance:** check a permitted editorial-review account on mobile/desktop; verify all sections render, reflection tools work with keyboard, and device-local saving does not leak or overwrite content. Confirm a genuine free/ordinary paid account cannot access unpublished manuscripts.
3. **Founder signoff tied to a specific revision:** approval must refer to the specific lesson revision numbers above. These revisions have **not yet received founder publication approval**. A general instruction to improve drafts is not assumed to be final approval of the finished manuscripts.
4. **Controlled release:** after each approved track passes its gates, change only its approved rows to `published`, recheck RLS and the protected lesson reader, update advertised subscription scope, and verify existing subscribers can see their newly included lessons.

### Suggested release order

The Placeholder Wound (8), Safe Room (5), Steadiness & Emotional Command (5), Rebuilding a Life That Holds (5), then The Five Sacred Laws of Survival (5). Release order is a proposal, not a promise of dates or future included content.

**Privacy note:** This report contains public-facing titles and non-sensitive QA metadata only. **It does not copy paid or draft manuscript bodies into the GitHub repository.**
