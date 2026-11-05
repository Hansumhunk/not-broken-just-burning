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

## Mobile usability — founder acceptance (2026-11-05)

The founder reported all five practical mobile checks passed: no horizontal overflow, usable typing and scrolling, back/forward response continuity, complete worksheet saved and opened in My Work, and tappable controls. **One founder-led mobile test: 5/5 passed.** Exact device/browser model was not recorded. This does not certify every browser or screen reader.

## Member-access security check — 2026-11-05

- Production Supabase project `plhbvtbvtxfzulsaxuim` reports `ACTIVE_HEALTHY`.
- Inspected **deployed** `read-flamewalker-lesson` Edge Function v15, not only source control: `verify_jwt=true`, `withSupabase({ auth: "user" })`, explicit authenticated user ID, authoritative membership entitlement lookup, time/status checks, and reviewer-only `editorial_review` retrieval. Privileged queries are scoped to the caller or to a private title-only catalog. Premium responses set no-store headers.
- All 12 current `public` tables have RLS enabled. The private manuscript table denies browser access. The three entitlement tables permit ordinary signed-in clients to SELECT their own records, but not create or change an entitlement. `private.is_admin()` consults a restricted `private.user_roles` table, not writable user metadata.
- **High-priority issue found and fixed in production:** `authenticated` originally had `TRUNCATE`, `TRIGGER`, and `REFERENCES` rights on six shared member tables. TRUNCATE is not subject to RLS and could have permitted table-wide deletion through an otherwise authenticated database role. Migration `20261105200137_revoke_unsafe_member_table_privileges` revoked only those unnecessary rights from `learning_progress`, `member_continue_state`, `member_path_progress`, `member_path_state`, `member_preferences`, and `profiles`. Production readback confirmed all six privileges now false for all six tables. `SELECT`, `INSERT`, `UPDATE`, and `DELETE` remain available for normal own-row workflows, with RLS intact. No records were deleted and no publishing/billing settings changed.
- Supabase's existing **default** privileges on future `public` tables are broad; every future migration must explicitly audit grants and enable restrictive RLS before exposing a new table. Do not globally change defaults without impact analysis.
- Supabase Security Advisor reports three remaining notices: [password leak checking disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) (WARN; recommended to enable in Auth configuration), [`pg_net` installed in `public`](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) (WARN; defer relocation pending dependency assessment), and [audio ingest table has RLS without a policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) (INFO; consistent with a deliberately backend-only queue).
- **Not yet live-tested:** direct HTTP 401/403 from guest/free accounts, expired or canceled paid accounts, alternate ordinary signed-in accounts, cross-account reads, or Auth email/reset flows. Source and configuration review does not certify these without independent sessions.

**Usability follow-ups discovered in this audit:** The editorial workbook originally rendered at a later section despite an earlier manuscript exercise in multiple lessons. PR #147 addressed Split Alliance; PR #148 addressed DARVO. PR #149 additionally covers early exercises in `the-love-bargain`, `promise-of-the-room`, `professional-authority-multiplier`, `when-you-stop-trusting-own-account`, and `loyalty-without-self-abandonment`. Where wording/meaning genuinely matches, the same input is reused. Distinct earlier questions retain independent inputs and are included in the consolidated document.

## Still requires hands-on acceptance — not proven by green CI

1. **Signed-in and signed-out account journeys:** new user, email confirmation, login, logout, password recovery, first-run onboarding, return to a lesson, and an expired session.
2. **Actual access isolation:** free member cannot read published premium manuscript; ordinary member cannot read unpublished drafts; reviewer can read drafts; expired/canceled paid access is rejected; accounts cannot read another member's data.
3. **Broader browser matrix:** one founder mobile acceptance pass (5/5) is recorded. Still test a second phone/browser, desktop keyboard focus, screen readers and alternative viewport widths.
4. **Storage and recovery:** Save full worksheet, open it from My Work, copy it, close/reopen the lesson, test private browsing/storage-disabled behavior, clear the device, and verify that a refresh correctly **does not** promise unsaved response persistence.
5. **Backend runtime:** project health (ACTIVE_HEALTHY), live Edge Function authorization configuration, and Security Advisor checked. Still verify Auth redirect URLs, 401/403 account denial, production DNS and HTTPS, and close or consciously accept remaining security warnings.
6. **Commercial gate (later):** legal business/operator details, terms/support/refunds, tax handling, sandbox billing lifecycle, cancellations and renewals. Checkout remains locked until this is completed and founder authorizes activation.
7. **Foundational Track 1:** the seven published lessons have regression tests, but a fresh founder-led real-device usability pass is still to be recorded.
8. **Content safety and quality:** verify source attributions and narrow clinical/legal/parenting/health claims separately from the visual signoff, particularly the Track 3 professional-authority material.

## Next acceptance sequence

- Verify PR #149 CI and merge, then revisit the five fixed early exercises in the authorized reader to confirm field placement and full My Work output.
- Conduct one end-to-end signed-in device session: login → open a lesson → answer at the early exercise → advance and return → complete → explicitly save → open the full My Work entry → copy → reload.
- **Next:** Conduct guest and ordinary free-account denial checks against the protected reader using separate browser sessions. Verify that no manuscript blocks appear and no premium entitlements are granted. Keep test credentials out of ChatGPT and screenshots.
- Use the designated reviewer session to confirm unpublished draft access; verify paid and expired/canceled accounts separately without manually altering live billing records.
- Broaden the already-passed founder mobile check to a second real device/browser and keyboard/screen-reader checks; record device/browser details before calling the platform launch-ready.
- Keep video and audio lesson production on the post-launch enhancement roadmap; it is not a blocker for written curriculum QA.

**Privacy rule:** no worksheet text, private journal, legal record, or non-public manuscript should be copied into a public GitHub Pages file. Test fixtures must use synthetic prompts and sample responses only.
