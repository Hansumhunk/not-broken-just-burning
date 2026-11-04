# Flamewalker Free — Open Early Access Launch Plan

**Decision:** November 3, 2026 — the founder chose to **skip formal Waves 0, 1, and 2**. There are no mandatory tester cohorts, invitation quotas, or staged beta approvals for Flamewalker Free.

**Scope:** The public NBJB educational site and existing **free** Flamewalker membership. Open early access is a practical way to learn from voluntary users; it is **not** approval to open paid subscriptions, live community areas, protected courses, or AI-assisted analysis.

## What is available now

- Public NBJB articles, lessons, Path overview, founder information and safety resources.
- Free Supabase-backed account sign-in and authenticated member navigation.
- Dashboard, Path focus, Next Honest Action, member profile and settings.
- All six working reflection exercises in `member-workshop.html`.
- Explicit **Save to My Work** and Progress history on the **same device/browser and account**.
- Start Here written orientation lesson and the Free Library.
- Sign Out through the member navigation; feedback through the existing contact email.

## What is not available yet

- **Flamewalker+ paid subscription** is not for sale. The planned courses, premium lessons and billing release remain separate from the Free launch.
- Videos, expanded exercises, purchased programs, community rooms, workshops, and live coaching are **Coming Soon** or **Editorial Preview**, not current benefits.
- Private reflections are stored in browser local storage, **not encrypted or cross-device synced**. Account credentials can work across devices, but saved writing does not automatically follow.
- Full self-service account deletion is not implemented; users may request help through the public contact route.

## Open access and feedback

Invite anyone who wants to try Flamewalker Free through the normal public **Join** route; no required number or sequence of testers. **Men-first, other adults welcome.** Do not demand personal histories, therapy disclosures, testimonials or journal entries as a condition of joining.

The Dashboard's early-access feedback link and the Website Feedback contact route allow voluntary reports. Ask only for the affected page, browser/device, steps to reproduce, expected versus actual behavior and severity. Do not request passwords, authentication links or tokens, private reflections, journals, medical information, or sensitive legal details. The support inbox is not a crisis service.

Prioritize reports as **Blocker** (sign-in, privacy, or saved-work loss), **Major** (core flow failure or strong confusion), or **Polish** (wording and appearance).

## Technical follow-ups — important, but no formal waves

Already tested:
- [x] Founder desktop and mobile walkthrough: sign in, navigate Dashboard and Toolbox, use Forge, save to My Work, see Progress and return without unwanted login.
- [x] Founder sign-out → open My Work while signed out → redirect to Account Access → sign back in and reopen same-device saved entry.
- [x] Latest recorded production GitHub Pages deploy and automated validation for site, save flow, auth guard and Supabase Auth runtime (November 3, 2026).

Still unverified in a real browser:
- [ ] **Back button after signing out:** stale My Work content must not reappear.
- [ ] **New-account confirmation email** with a dedicated test account.
- [ ] **Forgot Password** email and full reset/sign-in flow.
- [ ] Newly added **Sign Out** in member navigation and **Send Website Feedback** link in production.
- [ ] Owner confirms the feedback inbox is monitored during public early access.

These are follow-up checks, **not** reasons to resurrect a three-wave rollout. However, if anyone can see another account's work via normal UI, signed-out private reflections are exposed, verification/recovery consistently fails, or saved entries are lost under normal same-browser use, **stop promotion, repair, and retest immediately**.

## Operator checklist

- [ ] Confirm the live homepage, Join, Contact, Support & Safety, Terms, Privacy and member login routes work over HTTPS.
- [ ] Ensure public language accurately distinguishes **Flamewalker Free, available now** from **Flamewalker+, Coming Soon**.
- [ ] Avoid any live payment CTA, claims of completed video courses, or promises of secure cloud reflection synchronization.
- [ ] Keep working Reflection Toolbox and Start Here routes easy to find.
- [ ] Use voluntary user feedback to improve navigation and learning value; avoid invented engagement metrics.

## Paid launch is separately gated

Before any Flamewalker+ charge, approve published lessons and exercises, operator identity, terms, cancellation/refunds, payment setup and live entitlement isolation. The founding draft proposes a 7-day refund window while published draft copy refers to 14 days; reconcile that discrepancy with founder approval rather than silently selecting either.

**Release state:** Flamewalker Free is publicly accessible and may be presented as **Open Early Access**. No staged test waves. Outstanding checks are identified above, and **paid access remains disabled**.
