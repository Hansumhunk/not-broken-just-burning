# NBJB Platform Quality Gate — 2026-11-05

## Scope and release decision

**Status: engineering QA in progress. Not a launch authorization.**

Founder's conversation-based visual review of the 28 draft lessons in Tracks 2–6 is complete. This records a **visual usability review**, not a server-side publishing approval or a full source/safety/editorial signoff.

The Supabase production project currently has **28 `editorial_review` lessons** and **7 `published` foundational lessons** (read-only query, November 5). The paid checkout UI remains disabled. Do not change payment settings, membership entitlement rules, RLS, or draft lesson statuses as part of usability fixes.

## Verified in repository and CI

- All 28 draft slugs have protected, dynamically built eight-question (or source-defined) guided workbooks. Neither private manuscript blocks nor full unpublished exercise questions are hardcoded in the public workbook module.
- The 7 foundational lessons use dedicated practice workspaces; form controls have explicit labels and desktop/mobile CSS rules.
- The reader preserves the same in-memory input elements as members move between sections. A bookmark records reading position only, not answers.
- A complete worksheet is written to `data.worksheet` of a device-local `Lesson Worksheet` entry only after the learner presses **Save Complete Workbook to My Work**. The My Work page displays the full document and Copy Entry uses the same full text, not just the short card summary.
- The manuscript-fetch edge function gates access server-side, distinguishes the designated editorial reviewer from paid users, and restricts non-reviewers to `published` lessons. The `flamewalker_premium_lessons` table has row-level security enabled.
- The checkout UI and Read to Me are disabled for this release stage.
- CI validates the site and runs member save, member access guard, workshop, and premium editorial reader regression tests.

**Usability follow-ups discovered in this audit:** The editorial workbook originally rendered at a later section despite an earlier manuscript exercise in multiple lessons. PR #147 addressed Split Alliance; PR #148 addressed DARVO. PR #149 additionally covers early exercises in `the-love-bargain`, `promise-of-the-room`, `professional-authority-multiplier`, `when-you-stop-trusting-own-account`, and `loyalty-without-self-abandonment`. Where wording/meaning genuinely matches, the same input is reused. Distinct earlier questions retain independent inputs and are included in the consolidated document.

## Still requires hands-on acceptance — not proven by green CI

1. **Signed-in and signed-out account journeys:** new user, email confirmation, login, logout, password recovery, first-run onboarding, return to a lesson, and an expired session.
2. **Actual access isolation:** free member cannot read published premium manuscript; ordinary member cannot read unpublished drafts; reviewer can read drafts; expired/canceled paid access is rejected; accounts cannot read another member's data.
3. **Real browsers/mobile:** desktop Chrome, mobile Chrome/Android, Safari/iOS; section navigation, touch targets, text wrapping, keyboard focus, screen reader labels, copy/save buttons and back/forward input continuity.
4. **Storage and recovery:** Save full worksheet, open it from My Work, copy it, close/reopen the lesson, test private browsing/storage-disabled behavior, clear the device, and verify that a refresh correctly **does not** promise unsaved response persistence.
5. **Actual backend health:** runtime project health, Auth redirect URLs and Security Advisor, server endpoint denial tests, production DNS and HTTPS. Repo code inspection is not a substitute for live account testing.
6. **Commercial gate (later):** legal business/operator details, terms/support/refunds, tax handling, sandbox billing lifecycle, cancellations and renewals. Checkout remains locked until this is completed and founder authorizes activation.
7. **Foundational Track 1:** the seven published lessons have regression tests, but a fresh founder-led real-device usability pass is still to be recorded.
8. **Content safety and quality:** verify source attributions and narrow clinical/legal/parenting/health claims separately from the visual signoff, particularly the Track 3 professional-authority material.

## Next acceptance sequence

- Verify PR #149 CI and merge, then revisit the five fixed early exercises in the authorized reader to confirm field placement and full My Work output.
- Conduct one end-to-end signed-in device session: login → open a lesson → answer at the early exercise → advance and return → complete → explicitly save → open the full My Work entry → copy → reload.
- Conduct one separate ordinary free-account denial check on the premium endpoint and one reviewer-account access check.
- Complete real mobile and keyboard tests. Record pass/fail and device type here before calling the platform launch-ready.
- Keep video and audio lesson production on the post-launch enhancement roadmap; it is not a blocker for written curriculum QA.

**Privacy rule:** no worksheet text, private journal, legal record, or non-public manuscript should be copied into a public GitHub Pages file. Test fixtures must use synthetic prompts and sample responses only.
