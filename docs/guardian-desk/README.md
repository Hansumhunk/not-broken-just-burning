# Operation Guardian Desk — Development gate

**Directive:** NBJB-GUARDIAN-DESK-001 · **Baseline:** November 22, 2026 · **Status:** NON-PRODUCTION / NO PUBLIC RELEASE

Guardian Desk will eventually provide approved policy answers, limited authenticated member guidance, secure ticket intake, escalations, and aggregate Executive Command reporting. It must reuse NBJB's existing feedback, support, auth, billing and entitlement architecture. This branch contains audit and acceptance documentation; the **local executable synthetic prototype is separately delivered to the founder as a downloadable ChatGPT ZIP and has not been installed in GitHub or hosted**.

## Audited existing behavior

- `member-feedback.html` and `js/member-feedback.js` prepare an email or clipboard message; they **do not create a ticket or confirm delivery** (issue #205; merged PR #204).
- `contact.html` advertises the public email channel and member support routes.
- `MEMBER_SUPPORT_OPERATING_RUNBOOK.md` and merged PR #244 describe human-approved billing, refund request and cancellation support; retain these.
- `refunds.html` contains currently published cancellation/refund terms. Follow the live approved policy, not arbitrary AI-generated rules.
- `privacy.html` distinguishes device-local reflection contents from limited account metadata; keep private reflection text entirely outside support.
- Supabase NBJB Phase Two: 23 public application tables, 11 active Edge Functions on read-only inspection. No support/ticket table found in accessible non-system schema metadata. No hosted schema changed.
- Existing Commerce QA is independently populated; no QA migrations were performed.
- Stripe live and sandbox account contexts were discovered read-only, without inspecting or changing individual customer transactions.
- Existing Executive Command issue #274 is the designated aggregate reporting workstream. Do not create a second executive dashboard.

## Prototype actually built and tested, separately delivered

Loopback-only Python standard-library HTTP server and SQLite. Deterministic, versioned approved-source FAQ; safety-sensitive question routing; synthetic `TEST:` tickets, classification and exact duplicate detection; constrained state machine, minimal audit rows and aggregate local reporting. No member or payment integrations, mail, uploads, analytics or generative API. **29 unit + HTTP tests passed locally, zero failures, ResourceWarnings treated as errors.** Real account/hosted acceptances are NOT claimed. Existing production release gates remain protected.

## Ordered integration gates

1. Founder signs off published KB wording, support collection/retention policy and meaningful support availability. No false 24/7 human staffing promises.
2. Review existing production/Commerce QA schema, isolation and spend impact; seek separately scoped authorization before any hosted write.
3. Implement authenticated RLS-protected tickets, privilege-limited operator actions, audits, rate limiting and incident dedupe. No public case records or private journals.
4. Add **read-only** account support with existing Supabase Auth; Stripe payment status and Supabase access entitlement are separate sources of truth.
5. Integrate private escalations with current departments and **aggregate-only** Executive Command metrics. Keep sensitive cases out of public GitHub.
6. Run GD01–GD30 in the intended hosted QA environment; verify cross-account denial, prompt-injection resistance, privacy, mobile accessibility, safety and graceful shutdown.
7. Prepare precise founder approval/rollback packet; separate the public Help interface approval from any privileged account-action authority.

This is an **engineering review branch only**. No production deploy, live billing mutation, account edit, mailing, spending, or new support backend has been authorized or executed.

Tracking issue: #275. Related issues: #205, #214, #160, #274; PR #244.
