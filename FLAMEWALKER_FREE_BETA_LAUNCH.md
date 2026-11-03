# Flamewalker Free — Controlled Beta Launch Plan

**Prepared:** November 3, 2026  
**Scope:** NBJB public education and **free** Flamewalker membership only. This document is an operational test plan, not approval to launch paid subscriptions, community rooms, AI-assisted analysis, or protected programs.

## What is usable now

- Public NBJB lessons, articles, Path overview, founder and safety information.
- Free account with Supabase sign-in, email verification and password-recovery flows **implemented**. Password recovery and fresh-account email delivery still require hands-on release testing.
- Authenticated Dashboard, focus selection, Next Honest Action, member profile and device-local preferences.
- Six working reflection tools inside `member-workshop.html`, with explicit Save to My Work.
- Searchable, editable My Work and Progress history on the **same browser/device and same signed-in account**.
- Start Here written orientation lesson, Free Library entry point, and account settings including local-data removal.

## Not available — do not present as working

- Flamewalker+ subscriptions and live payments: **Coming Soon**, not for sale.
- Foundation videos, expanded exercise collections, premium lessons, purchased programs, live community, workshops and coaching: **Coming Soon** or **Editorial Preview**, as appropriate.
- Cross-device reflection sync: **not implemented**. Account credentials work across devices, but saved writing does not automatically follow.
- Full self-service account deletion: not implemented; use the contact route for requests.
- The browser local storage backing My Work is not encrypted or a substitute for protecting access to a shared device. Do not promise end-to-end encryption.

## Beta audience

Invite **5–10 consenting adults** from different contexts (at least two primarily mobile users and at least two desktop users). Men-first; other adults welcome. Do not require a participant to disclose trauma, personal history, treatment, or legal matters. All testing can use fictional or harmless sample entries.

The primary question is not whether a user likes a logo; it is **whether they can understand what Flamewalker is, complete one useful exercise, and return to their work without needing the founder's guidance**.

## Tester pathway (15–25 minutes, self-paced)

1. Begin at `https://notbrokenjustburning.com/`, find **Join**, and locate **Flamewalker Free** without being told where to click.
2. Create or use a test account. For fresh signup, confirm the email and first-run onboarding. **Do not share login credentials.**
3. From the Dashboard, find and complete **Start Here** (written lesson).
4. Choose a current Path focus and name one **Next Honest Action**.
5. Open **Toolbox → The Forge**; use fictional test input. Explicitly opt in to **Save to My Work**.
6. Go to **My Work**; find, edit/review if applicable, refresh and confirm the saved entry remains.
7. Open **Progress**; verify the activity summary and browser refresh.
8. Use **Sign Out** in the member navigation; attempt a direct My Work URL while signed out; try the browser Back button. Confirm no saved work is rendered.
9. Sign back in on the **same device/browser/origin**; confirm the test entry remains.
10. Visit **Watch**, **Circle**, **Membership**, and **Library**. Clearly identify what is available now vs Coming Soon.
11. On a separate device, confirm that device-local entries **do not** automatically sync; this is expected, not a bug.
12. Optional: check **Forgot password** recovery with a test account and report whether the email and recovery link work. Never share reset links or tokens.

## Capture feedback without collecting sensitive stories

Tester can send issues via the **Send Website Feedback** link on the Dashboard or the official **Website Feedback** contact route. Include only:
- Page / feature tested; phone or desktop, browser type.
- Expected result and actual result; simple steps to reproduce.
- Severity: **Blocker** (can't sign in, save, or keep content private), **Major** (core flow fails or confusing), or **Polish** (style, copy, spacing).
- Whether the issue can be repeated, and whether a refresh changed the outcome.

Do **not** request passwords, private reflections, medical information, screenshots containing personal data, or uploaded journals. Collect no therapy testimonials as the price of entry.

## Release gate and stop rules

**Go for a small public invitation** only after:
- [x] Founder desktop test of login → Forge → My Work → Progress and persistence on same device.
- [x] Founder mobile test of the same core flow.
- [x] Founder sign-out → direct My Work URL redirects to account access, and re-login restores saved work.
- [x] Automated site, save-flow, account-guard and auth smoke checks passing at last verified deploy (2026-11-03).
- [ ] **Real-browser Back-button test after logout** (a previously displayed My Work page must not reveal content).
- [ ] **Fresh-account email confirmation and password recovery** completed with controlled test inbox.
- [ ] At least two **uncoached** first-time testers complete sign-in → Start Here → save/reopen without a blocker.
- [ ] Confirm feedback email `notbrokenjustburning@gmail.com` is actively monitored during beta.
- [ ] Recheck critical paths after latest GitHub Pages deploy, including sign-out member-nav change.

**Stop invitations** if any tester can view another member's saved reflections through normal UI, signed-out saved work is exposed, account verification is unreliable, or saved work disappears during ordinary same-device use. Fix and retest before resuming.

## Beta rollout

- **Wave 0 (founder):** Finish above remaining account/security checks. Record results here or in a linked GitHub issue.
- **Wave 1 (3 users):** Two different devices/browsers, one novice to NBJB. Fix blockers first.
- **Wave 2 (remaining 2–7 users):** Invite only after Wave 1 blockers are closed. Review aggregate findings, not people's personal narratives.
- **Review:** Track completion rate, most confusing screen, failed action, and one change most likely to make the next action easier. Avoid inventing analytics or collecting user content without permission.

## Operator checklist

- [ ] Verify public homepage, Join, Contact, Support & Safety, Terms, and Privacy all open from the production domain with valid HTTPS.
- [ ] Check the browser's current deployed build (not merely a merged PR).
- [ ] Confirm no live payment/checkout links or misleading premium availability language.
- [ ] Confirm **Coming Soon** labels remain visible for unfinished videos, community, paid courses, and separately purchased programs.
- [ ] Confirm a newcomer can identify **Flamewalker Free**, the **Start Here** lesson, all six working tools, and what is device-local.
- [ ] Check mobile navigation, text sizing, tap targets, and sign-out.
- [ ] Validate feedback routing and response workflow; do not promise constant monitoring.

## Separate later-phase decision

Paid subscriptions are **not** included in this beta. Before any Flamewalker+ launch, reconcile the founding-release documentation's proposed **7-day** first-purchase refund window with the currently published draft policy describing **14 days**, obtain founder approval for final operator details, publish only approved manuscripts, and complete live billing/cancellation QA. Do not silently choose or advertise either refund term as a finalized offer.

**Release decision:** Controlled free-beta preparation in progress; no claim of paid launch or completed independent user validation.
