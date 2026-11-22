# Operation The First Flame — Member Activation Audit & Acceptance Checkpoint
**Date:** 2026-11-22  
**Scope:** Project Ignition III Directive 004; audit + narrowly scoped non-production onboarding correction  
**Authority:** Read-only connected-system inspection, branch-only changes, isolated synthetic tests. **No merge/deployment, member creation, marketing sends, DNS, payment, production schema mutation, or paid spend.**

## A. Verified inventory
| Component | Classification | Evidence and limitation |
| --- | --- | --- |
| Supabase Auth and login/recovery handlers | PARTIAL | `js/nbjb-auth.js`, `js/member-auth.js`, `SUPABASE_PRODUCTION_AUTH.md`; no new account/email-link/browser acceptance in this inspection |
| Authenticated page gate | PARTIAL | `js/member-bootstrap.js` performs `auth.refresh()` and checks current user before showing member main; prior #205 founder-reported restricted-access checks are historical |
| Profiles and member preferences | WORKING at schema level | Supabase `profiles` and `member_preferences` (3 rows each), owner-scoped RLS; no individual records inspected |
| Dashboard and member navigation | PARTIAL | `js/member-dashboard.js`, `js/member-platform.js`, PRs #199/#203 merged per #205; live cross-browser acceptance outstanding |
| Onboarding | PARTIAL → isolated fix prepared | `member-onboarding.html`, `js/member-platform.js`; fixed silent continuation after blocked local save in THIS DRAFT ONLY |
| Free member curriculum | PARTIAL | `member-start-here.html` and `js/member-start-here.js` exist; seven-day extension PR #254 remains open draft |
| Free vs paid access | PARTIAL | `membership_entitlements` owner-select/admin-write RLS, `flamewalker_premium_lessons` browser denied; server and two-account browser tests incomplete |
| Device-local progress | PARTIAL | `js/member-service.js`, `js/member-learning-progress.js`, `js/learning-continuity.js`; preserves member-scoped local metadata, not assured cross-device sync |
| Server progress | NOT TESTED | `learning_progress` and `member_path_progress` tables exist with RLS, both 0 rows at inspection; no claim of functional server sync |
| Bookmark feature | NOT TESTED | Reading-position continuity exists for verified paid access; dedicated comprehensive bookmark acceptance not run |
| Public front door | PARTIAL | PR #250 remains open draft, not deployed by this operation |
| First Seven Days | PARTIAL | PR #254 remains open draft, previous validation is documented in PR; not a production release |
| Analytics | PARTIAL | Existing `MEMBERSHIP_MEASUREMENT_RUNBOOK.md` establishes cookieless public event rules; PostHog event taxonomy inspected; no complete linked activation/retention funnel established |
| Email onboarding | BLOCKED by separate authorization | PR #230 is draft. Free signup is not newsletter consent; no Brevo provider acceptance executed here |
| Private reflection protection | PARTIAL | Existing member-service uses user-scoped browser localStorage; no reflection body transmitted in this change; real cross-account/browser tests outstanding |
| Monitoring | PARTIAL | Existing GitHub/analytics workflows and issue #205; no redundant scheduled monitoring created |
| Production deployment | NOT PERFORMED | All changes remain on `qa/first-flame-onboarding-save-gate-20261122` |

The Supabase security advisor on 2026-11-22 also reported: leaked-password protection disabled, `pg_net` in public schema, and twelve RLS-enabled tables with no policies (mostly restricted operational tables). **Do not add permissive policies to clear an informational advisory.** Review with the relevant owners before any security configuration change. Documentation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

## B. Existing activation architecture
Public discovery → free resource → optional registration (`member-auth.html`) → Supabase verification → authenticated member gate (`member-bootstrap.js`) → optional onboarding (`member-onboarding.html`) → real free `member-start-here.html` → user-initiated device-local reflection/progress → Dashboard/Path/Continue → optional paid discovery through the existing entitlement reader.

**Privacy boundaries:** No automatic marketing enrollment; no journal/reflection content in PostHog; no new server-side storage of private disclosures; premium content requires entitlement-checked delivery. Selected Path focus in current onboarding is an educational navigation preference. Further subject-specific interests should use approved, existing content metadata and not become a diagnostic or advertising profile.

## C. Branch-only implementation
- `js/member-platform.js`: one local save for onboarding information **and** initial Path progress, preserve existing progress, reject unapproved stage values, remain on screen and show an error when storage is blocked.
- `member-onboarding.html`: visible, accessible `role=alert` status for failed save.
- `scripts/test_first_flame_onboarding.mjs`: isolated synthetic regression coverage. No new database tables, auth providers, third-party SDKs, campaigns, or production handlers.

These changes address a specific **MA29 failure state**, not a general claim that entire registration or onboarding works.

## D. First member experience and E. Continuity
- Existing free lesson: **Start Here · Facts, Feelings, Control** (`member-start-here.html`). No lesson was invented.
- Existing Dashboard: Journey Compass, current Path focus, Next Honest Action, saved work metadata and links. The proposed patch does not replace it.
- Current journey and reading-position persistence is predominantly per-user, per-device. Cross-device learning sync should be separately designed and accepted, with explicit distinction between educational metadata and private reflection content.
- Do not mark lessons completed merely on pageview; progression is educational usage, not clinical recovery.

## F. Seven-day integration
Reuse PR #254's accepted seven-day editorial work. Do not create a competing curriculum or release a homepage link to an unmerged destination. Integration remains **pending** the separately approved #254 release, verification of live destination, and subsequent coordination with #250.

## G. Analytics baseline
PostHog schema inspection on 2026-11-22 identified `$pageview` as the event observed in the recent event taxonomy; it did not establish working authenticated registration, educational completion, or seven-day retention events. `MEMBERSHIP_MEASUREMENT_RUNBOOK.md` explicitly forbids PostHog person identification, private-workspace tracking, and raw sensitive URLs.

Required measurement definitions before any numerical activation claims:
- **Registration rate:** verified new accounts / eligible measured public visitors, with independently compatible identifiers and windows or explicitly label as unlinked volumes.
- **Activation rate:** verified users reaching dashboard / genuinely newly created accounts in a documented cohort.
- **Educational activation:** activated members performing a defined meaningful educational action, not simply opening a page.
- **D7 return:** members from the same eligible activation cohort who independently return within the defined seven-day window.
- **Free-to-paid:** confirmed external live Stripe purchases/eligible free cohort; do not treat checkout-intent clicks as payments.
- **Error rate:** discrete onboarding error states / eligible attempts when both numerator and denominator are observable.

Do not estimate rates using incompatible PostHog anonymous sessions and Supabase account counts. Preserve the documented Nov 17–20 analytics interruption as a **measurement gap**, not zero demand.

## H. Security and privacy
Metadata-only SQL inspection confirmed owner-or-admin RLS on `profiles`, `member_preferences`, `member_path_state`, `member_path_progress`, `member_continue_state`, `learning_progress`. `membership_entitlements` is member-readable but restricted to administrator write operations; premium lesson table denies `anon` and `authenticated` browser roles. These are **source/configuration inspections, not proof from adversarial two-account testing**.

Do not add permissive RLS policies to `commerce_*` or other internal tables merely to remove an advisor warning. Do not modify hosted Supabase settings without appropriate authorization.

## I. MA01–MA30 acceptance checkpoint
**Legend:** PASS = executed test evidenced; PARTIAL = source/config inspection or narrower historical/isolated evidence only; BLOCKED = prerequisite missing; NOT RUN = no independent execution. Historical founder reports are not relabeled as fresh independent tests.

| ID | Result | Evidence / next gate |
| --- | --- | --- |
| MA01 | PARTIAL | Signup path visible in `join.html`/auth source; live public navigation not verified |
| MA02 | NOT RUN | Real controlled new-account registration not authorized/executed |
| MA03 | NOT RUN | Duplicate signup not exercised |
| MA04 | NOT RUN | Verification email provider not exercised |
| MA05 | NOT RUN | Expired-link recovery not exercised |
| MA06 | PARTIAL | Auth guard source + historical #205 founder checks; new-account landing untested |
| MA07 | PARTIAL | Server-verification guard present; direct unverified-user test missing |
| MA08 | NOT RUN | Existing account login not independently exercised |
| MA09 | PARTIAL | Recovery handler source inspected; live recovery untested |
| MA10 | PARTIAL | Session refresh/identity logic present; bfcache/device tests missing |
| MA11 | PARTIAL | Onboarding page and handler; isolated patch tests only |
| MA12 | PARTIAL | Skip link present; full browser test missing |
| MA13 | PARTIAL | Local learning Path focus, no analytics added; end-to-end privacy test missing |
| MA14 | PARTIAL | Links reference existing `member-start-here.html` and published lesson routes; click/access untested |
| MA15 | PARTIAL | Free lesson and explicit local save code exists; authenticated browser action not run |
| MA16 | PARTIAL | Device-local recording implemented; cross-device/server behavior unproven |
| MA17 | NOT RUN | Repeat completion/idempotency not tested |
| MA18 | NOT RUN | Independent bookmark behavior not tested |
| MA19 | PARTIAL | Existing Continue Learning code; real resume test not run |
| MA20 | NOT RUN | Two-account isolation test not executed |
| MA21 | PARTIAL | PR #254 staging, unmerged |
| MA22 | PARTIAL | Free Start Here exists; broader meaningful free library acceptance incomplete |
| MA23 | PARTIAL | Server-side entitlement protections and historical #205 check; full isolation test pending |
| MA24 | PARTIAL | No newsletter opt-in in Auth signup source; provider-side proof pending |
| MA25 | PARTIAL | Cookieless policy exists, taxonomy incomplete for full funnel; no privacy audit of new real events |
| MA26 | BLOCKED | Compatible seven-day identity/cohort instrumentation unverified |
| MA27 | NOT RUN | Fresh mobile browser registration/onboarding run not performed |
| MA28 | NOT RUN | Keyboard + assistive technology acceptance not performed |
| MA29 | PARTIAL | Isolated handler scenarios PASS, complete browser failure/recovery still required |
| MA30 | PASS | This operation performed no production merge/deploy or external customer messages |

### Isolated engineering regression evidence
On 2026-11-22 the modified onboarding handler was exercised in a controlled JavaScript harness with mocks:
1. Successful save → one update, initial progress set and free lesson navigation: **PASS**.
2. Blocked local storage → error announced, no redirect: **PASS**.
3. Invalid Path choice → discarded instead of saved: **PASS**.
4. Existing progress = practicing → preserved, not downgraded: **PASS** (scripted regression added).

These are **handler-level tests, not browser end-to-end acceptance**. The corresponding repeatable Node script is committed in this branch; run `node scripts/test_first_flame_onboarding.mjs` before merge and record CI results.

## J. Founder release package — held
**Recommended decision: HOLD production.** Needed before any production release:
1. Existing Open the Gates team independently verifies MA01–MA10 using authorized disposable identity and real transactional email path.
2. Controlled authenticated desktop/mobile journey: free member reaches onboarding, completes/opts out, uses Start Here, saves action, returns; test storage-block failure and retry.
3. Two-account and role-change checks for local and database records, RLS, paid lesson denial, and cancel/expiry behavior.
4. First Seven Days PR #254 is separately approved/released/verified; only then reconsider PR #250.
5. Analytics owner confirms privacy-safe cohort method; do not turn on invasive person tracking to create an artificial funnel.
6. Review Supabase Auth password-security warning and operational RLS advisories.
7. Rebase proposed patch onto then-current main; rerun Node regression, repository validators, screen-reader/keyboard checks and exact-head CI.
8. Founder provides explicit approval for the **exact release candidate head** after acceptance. Separate approvals are needed for any email/marketing/billing changes.
9. Rollback: revert only this fix commit from the deployed release if it causes regression; preserve subsequent unrelated commits; rerun onboarding, login and free access smoke tests. Device-local user choices are not migrated or deleted by this patch.

## K. Operating autonomy
**Currently routine by existing code:** Supabase account handling, restricted page routing, in-browser member preferences, local work-save, and authenticated content access checks, subject to actual QA.  
**Not yet demonstrated as automatic:** first-time to seven-day member activation with measurable cohort retention, reliable cross-device progress, all 30 acceptance gates, automated customer-failure detection/repair.  
**Founder controlled:** production deploy, live entitlement changes, external campaigns, billing, privacy-policy changes, new infrastructure.

**Recommended next priority:** Finish Open the Gates provider/browser acceptance and ship a separately approved verified free-first pathway before adding complex AI personalization. A successful first lesson and a truthful Continue Learning state matter more than another unchecked feature.
