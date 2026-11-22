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

## L. Phase II browser acceptance and release reconciliation — 2026-11-22

**Classification discipline:** Chromium steps below were executed against a local HTTP static-site preview using two deliberately synthetic identity objects and a local-only stub of Supabase entitlement responses. All external browser requests were blocked. **This is browser-level UI acceptance, not real Supabase Auth account creation, provider email delivery, security/RLS adversarial proof, or a genuine 7-day retention cohort.** Manual phone and assistive-technology acceptance remain separate.

**Code/CI:** PR #270 now also includes `tests/first_flame_member_browser_test.py`, a targeted neutral signup message in `js/member-auth.js`, and a browser acceptance step in the existing static-site workflow. Synthetic Chromium checks executed with actual existing HTML, browser LocalStorage, JS, desktop and mobile viewport; non-PII screenshot artifact in GitHub Actions. No new production account, payment, marketing activity, provider request, or production deployment.

**First Seven Days conflict resolution:** PR #254's staged accepted content preserved byte-for-byte at its six original non-sitemap blob SHAs. The conflict was caused by three later public Search Dominion guide entries in `main:sitemap.xml`. The branch now has a two-parent merge commit `7f314e7046eada07bc78086ca1a99a3dfb44b5b1` with main `ac8d5da6bb214d4ea7be9d9109cf5f2c6cbcf932` as second parent, a merged main-preserving sitemap and exactly one First Seven Days URL. GitHub reports 0 commits behind main, mergeable true, seven changed files. Exact-head [static CI #44988758512](https://github.com/Hansumhunk/not-broken-just-burning/actions/runs/44988758512) and [staged Chromium CI #44988758483](https://github.com/Hansumhunk/not-broken-just-burning/actions/runs/44988758483) completed successfully. **Still draft, unmerged, not live.** PR #250 remains separate and cannot introduce a direct link to the staged page before actual live verification.

**Open the Gates F01–F16 recovery:** Existing [issue #205 checkpoint](https://github.com/Hansumhunk/not-broken-just-burning/issues/205#issuecomment-7068072390) explicitly reconstructs the sixteen cases and cautions the original historical F01–F16 artifact was not recovered. Relevant statuses there: F01–03 partial; F04 blocked; F05 partial; F06 blocked; F07–08 partial; **F09 source-confirmed failure** (Dashboard shortcuts to public Path pages) has isolated [draft PR #267](https://github.com/Hansumhunk/not-broken-just-burning/pull/267), not merged; F10–12 partial; F13 blocked; F14–16 partial. This Phase II browser fixture adds evidence for F03, F07, F08, F09's *independent* Dashboard continuation area, F12, F14, F15, but **does not clear real-provider or #267 founder approval gates**. Coordinate PR #267 with the Open the Gates owner, do not copy its fix into #270.

### MA01–MA30 Phase II requirement-by-requirement execution

Every row distinguishes isolated browser results from actual provider authentication. "PARTIAL" deliberately remains the overall status when only the simulated test passed.

| ID | Environment | Expected | Observed | Result | Evidence | Required next action |
|---|---|---|---|---|---|---|
| MA01 | Public HTML/main source | Visitors find free registration | Join and free CTA source present; no live browser click | PARTIAL | `index.html`, `join.html`, F01 | Fresh signed-out production click acceptance |
| MA02 | Real Supabase | New signup creates legitimate free member | No new account created | BLOCKED | F04, #205 | Explicit authorization for controlled new test identity and mail |
| MA03 | Browser fixture | Invalid and duplicate signup handled safely | Required fields asserted; provider duplicate behavior not contacted | PARTIAL | Chromium guest form + neutral no-session response | Approved real duplicate/idempotency scenario |
| MA04 | Real email provider | Confirmation arrives, redirect works | No actual verification email generated | BLOCKED | F05/F06 | Approve controlled transactional verification |
| MA05 | Real email provider | Expired/reused link recovers safely | Not exercised | BLOCKED | F06 | Approved provider expiry tests |
| MA06 | Local Chromium + fixture | New verified user reaches onboarding | Synthetic signed-in account can access onboarding | PARTIAL | `first_flame_member_browser_test.py` | Authenticated real new-account journey |
| MA07 | Local Chromium guest | Guest denied protected route | Guest redirected to account screen | PARTIAL | Chromium protected redirect | Real production route/gate acceptance |
| MA08 | Local Chromium + fixture | Returning login works | Synthetic session restored following sign-out; live password login untested | PARTIAL | Chromium sign-out/return | Real existing-account login |
| MA09 | Local Chromium + fixture | Errors/recovery understandable | Synthetic failed login displays error; recovery form is present | PARTIAL | Browser guest test | Real recovery email/retry acceptance |
| MA10 | Local Chromium + fixture | Sessions/expiration handled | Synthetic sign-out, subsequent guest redirect, same-device return verified | PARTIAL | Browser sign-out/re-entry | Actual Supabase expiry, Back and token invalidation |
| MA11 | Desktop + mobile Chromium fixture | Focus/values/action saved accurately | Verified local state across navigation and reload | PARTIAL | Chromium onboarding sequence | Real authenticated browser on approved account |
| MA12 | Desktop Chromium fixture | Setup optional | Skip reaches free Start Here with no local setup written | PARTIAL | Chromium skip scenario | Real authenticated skip verification |
| MA13 | Source + local browser | Preference can be changed without disclosing sensitive content | Only educational focus stored in scoped local data, no external browser network | PARTIAL | Browser isolated local-state assertion | Privacy manual audit and real environment |
| MA14 | Desktop/mobile Chromium fixture | Start Here accessible without paid purchase | Free fixture reaches the actual free lesson; no checkout | PARTIAL | Browser loaded `member-start-here.html` | Real free-entitlement end-to-end |
| MA15 | Desktop/mobile Chromium fixture | Deliberate first lesson action works | Synthetic facts/feelings/control submitted and saved, dashboard action updated | PARTIAL | Browser form/response | Real new-account case |
| MA16 | Desktop/mobile Chromium fixture | Saved progress truthful and restored | Device-scoped progress and action survive refresh; no cross-device claim | PARTIAL | Browser reload + local record inspection | Verify real device and determine sync roadmap |
| MA17 | Isolated source | Repeat completion safe | Not exercised as separate idempotency case | NOT RUN | N/A | Repeat-save and deliberate-practice state test |
| MA18 | Paid continuity | Bookmarks resume correct protected section | Not exercised in this free-member fixture | NOT RUN | `js/learning-continuity.js` source only | Existing paid QA identity, approved protected reader test |
| MA19 | Desktop/mobile Chromium fixture | Dashboard returns appropriate next action | Focus and Next Honest Action displayed after reload/return | PARTIAL | Browser Dashboard selectors | Real account return visit acceptance |
| MA20 | Local two-identity fixture | Data from A is not shown to B | A retained under own local key; B view blank, no A text | PARTIAL | Browser fixture `fixture-alpha`/`fixture-beta` | Provider-backed two-account RLS proof |
| MA21 | PR #254 staged Chromium | Seven-day path substantive and navigable | Existing accepted browser suite + merged branch CI passed, not published | PARTIAL | PR #254 exact-head actions | Founder separate deploy, then live route |
| MA22 | Source + staged content | Free experience has genuine depth | Existing free lesson and staged seven-day library present | PARTIAL | `member-start-here.html`, #254 | Verified public/member journey and editorial acceptance |
| MA23 | Supabase policy review | Free cannot read premium data | Browser-role premium table denied, entitlement reader inspected; new direct role attempt not run | PARTIAL | RLS inspection and historical F10 | Approved two-account server-side entitlement test |
| MA24 | Source + isolated browser | Auth signup does not enroll marketing | Auth form has no newsletter consent; external network blocked in fixture | PARTIAL | Auth source, PR #230 separate | Provider/consent acceptance owned by Flame Letter |
| MA25 | Local synthetic network guard | No private reflection data leaks to analytics | Browser fixture blocks all external calls, not proof of live configuration | PARTIAL | Browser route guard; analytics runbook | Owner review of real cookieless ingestion privacy |
| MA26 | PostHog/Supabase metrics | D7 cohort tracked without incompatible IDs | Linked cohort not established | BLOCKED | Measurement runbook | Approved privacy-safe metric design and repeat visits |
| MA27 | Chromium mobile emulation | Mobile controls fit and function | Focus/setup/lesson/dashboard and 390 px overflow check passed | PARTIAL | Mobile CI result | Physical Android/iOS manual check |
| MA28 | Chromium + source | Keyboard and screen reader access | Keyboard Enter activates failure path, role=alert visible; manual AT not run | PARTIAL | Browser keyboard test | Keyboard-wide + screen-reader acceptance |
| MA29 | Chromium + fixture | Failed saves report error without navigation and recover | Synthetic quota failure announced, state retained; retry saved and navigated | PARTIAL | Browser failure/retry + Node test | Test real storage denial, offline and stale assets |
| MA30 | GitHub and live-system change control | No unauthorized production release or messaging | Branch-only files and comments; no merge/deploy/payment/email sends initiated | PASS | PR #270/#254 current draft state | Founder exact-head authorization only after outstanding gates |

### Founder-controlled gates and release dependency order
1. **Current independent work:** Finalize #270 exact-head CI/browser preview, coordinate Open the Gates #267, keep private user data absent from test fixtures.
2. **Actual provider acceptance:** Requires founder approval of an approved controlled identity/email path (or a founder-supervised Work Cloud Browser session against an existing account). No automatic new live customer accounts or mail.
3. **First Seven Days:** #254 is technically mergeable and staged CI-green but not deploy-authorized. Founder must review exact head and separately authorize release. After live deployment, verify real availability/SEO/resources.
4. **Front Door:** #250 may only link to the actual verified public destination, then requires independent exact-head QA and founder deployment approval.
5. **First Flame #270:** Not part of either other release approval; independently accept real signup/lesson/return/error path and authorize precise head.
6. **No additional infrastructure, consent, Stripe, entitlement, account writes, marketing activation, DNS or paid spend permitted by this directive.**

## M. Phase III 004-D — actual independent engineering, member data and test classifications

**2026-11-22 read-only production** (Supabase `plhbvtbvtxfzulsaxuim`): 4 Auth users, 4 confirmed, 4 profiles, 4 member_path_state, 4 member_continue_state, **0 member_path_progress, 0 learning_progress**; **0 `profiles.onboarding_completed=true`**, **0 non-null server `member_continue_state.next_honest_action`**, 3 Auth accounts with `last_sign_in_at` in previous 7 days, 0 created in that time. Existing `NBJB Commerce QA` has 2 confirmed Auth users and 2 profiles but is dedicated commerce QA, not approved registration testing; 0 separate Supabase development branches in either project. The read-only `pg_policies` inspection confirmed own-row/admin member policies and explicit premium manuscript browser deny. No JWT-scoped adversarial account attempts have been made. Security Advisor warnings remain under #160.

**One-transaction Start Here repair** (isolated #270): Original `js/member-start-here.js` saved the reflection with `service.recordToolEntry` and then attempted an independent `service.update` for the optional Dashboard Next Honest Action without checking the second write. Phase III now passes the optional action into `service.recordToolEntry`, which applies it to the same local member record and performs **one verified storage save**. `member-start-here.js` also suppresses unintended rapid duplicate identical submits within 1800ms without recording duplicates; a genuinely edited new reflection is still eligible. Browser QA fixture injects storage quota denial, proves neither reflection nor action changes, retries successfully with exactly one write, then double-clicks and proves a single retained activity entry. This is browser-fixture evidence; not real-provider Auth acceptance.

**Authoritative controlled-provider packet**: `FIRST_FLAME_PROVIDER_ACCEPTANCE_004D.md` defines production vs Commerce QA selection, A/B founder-controlled identities, maximum eight transactional Auth emails, zero incremental spend, cleanup and sessions, redaction, 14-step provider acceptance, 7-day measurement semantics, PR sequencing and the precise separate founder approval request. No real account, outbound Auth mail, consent, Stripe or Supabase settings changes were made.

### Phase III MA01–MA30 evidence tiers — retain Phase II expected/observed and actions above

These describe the **newest evidence available** and do NOT silently promote a case to provider PASS. "Partial" remains an umbrella result; each fixture is limited to mocked identities.

| Case | Phase III evidence category | Overall | Remaining real gate |
|---|---|---|---|
| MA01 | Source-only | PARTIAL | Real first visit through public Join |
| MA02 | BLOCKED | BLOCKED | Approved A new account |
| MA03 | Browser Fixture Verified | PARTIAL | Real duplicate signup response |
| MA04 | BLOCKED | BLOCKED | A/B verification email |
| MA05 | BLOCKED | BLOCKED | Reused/expired provider link |
| MA06 | Browser Fixture Verified | PARTIAL | Real verified-user onboarding |
| MA07 | Browser Fixture Verified | PARTIAL | Real guest/auth protection |
| MA08 | Browser Fixture Verified | PARTIAL | Real return login |
| MA09 | Browser Fixture Verified | PARTIAL | Provider recovery/error behavior |
| MA10 | Browser Fixture Verified | PARTIAL | Actual sign-out/session expiry |
| MA11 | Browser Fixture Verified | PARTIAL | Real A/B member journey |
| MA12 | Browser Fixture Verified | PARTIAL | Real member optional skip |
| MA13 | Browser Fixture Verified | PARTIAL | Real account privacy check |
| MA14 | Browser Fixture Verified | PARTIAL | Real free entitlement access |
| MA15 | Browser Fixture Verified — **atomic lesson + action save** | PARTIAL | Approved A with valid Auth |
| MA16 | Browser Fixture Verified — one write and refresh | PARTIAL | Same-device real session/return |
| MA17 | NOT RUN | NOT RUN | Intentional repeat-practice lifecycle beyond rapid duplicate guard |
| MA18 | NOT RUN | NOT RUN | Paid protected reading continuity |
| MA19 | Browser Fixture Verified | PARTIAL | Real authenticated Dashboard |
| MA20 | Browser Fixture Verified | PARTIAL | Real two-JWT owner isolation |
| MA21 | Staged Chromium CI #254 | PARTIAL | Founder content release and real live URL |
| MA22 | Existing source and editorial review | PARTIAL | Live first-lesson and seven-day acceptance |
| MA23 | RLS policy review; historical founder denial | PARTIAL | Real free/B authenticated access denial |
| MA24 | Source-only | PARTIAL | Provider-level no marketing enrollment |
| MA25 | Browser network-block fixture / analytics runbook | PARTIAL | Production telemetry privacy proof |
| MA26 | BLOCKED | BLOCKED | Defined and genuinely elapsed D7 cohort |
| MA27 | Browser Fixture Verified — mobile emulator | PARTIAL | Physical mobile device |
| MA28 | Browser Fixture Verified — keyboard Enter negative path | PARTIAL | Full keyboard and assisted screen-reader test |
| MA29 | Browser Fixture Verified — storage deny/retry, one-write, double-click | PARTIAL | Real offline/storage/accessibility acceptance |
| MA30 | GitHub branch-only evidence | PASS | Exact-head founder release decision before any merge |

**Real Provider Verified in Phase III = none.** Historical founder reports in #205 are preserved as historical, not treated as today's new authorization.

### F01–F16 coordinated status — do not duplicate Open the Gates

The source of record is the 2026-11-21 **reconstructed** sixteen-case matrix at [issue #205](https://github.com/Hansumhunk/not-broken-just-burning/issues/205#issuecomment-7068072390); the historical original standalone matrix was not recovered. Current Phase III mapping:

| F-case | Current evidence tier | Operational result |
|---|---|---|
| F01 | Source-only public homepage | PARTIAL |
| F02 | Source-only Join | PARTIAL |
| F03 | Browser Fixture Verified signup fields/neutral no-session messaging | PARTIAL |
| F04 | Provider account/duplicate | BLOCKED |
| F05 | Historical confirmed accounts and redirect source | PARTIAL |
| F06 | Provider link replay/expiry | BLOCKED |
| F07 | Browser Fixture Verified onboarding save/skip/fail | PARTIAL |
| F08 | Browser Fixture Verified free lesson/action | PARTIAL |
| F09 | **Failed production source path**; #267 separately fixes in unmerged draft | FAIL (production) |
| F10 | Historical founder free/guest + RLS source review | PARTIAL |
| F11 | Server entitlement source/historical production | PARTIAL |
| F12 | Browser Fixture Verified return + server-refresh code | PARTIAL |
| F13 | Provider recovery/magic link | BLOCKED |
| F14 | Browser Fixture Verified logout/guest redirect/account switch | PARTIAL |
| F15 | Browser Fixture Verified desktop/mobile/keyboard error; not physical AT | PARTIAL |
| F16 | Signup source separated from marketing workflows | PARTIAL |

**Release interactions:** #267 edits `js/member-dashboard.js` + `scripts/test_member_access_guard.js`; #270's production changes are disjoint from those two. #254 edits isolated lesson page/assets/test and **sitemap**; #250 edits `index.html`, `join.html`, `css/visitor-journey.css` and is logically dependent on #254 deployment and public route acceptance. #249 overlaps #270 on `.github/workflows/validate-site.yml`; if combined later, reconcile workflow coverage instead of overwriting tests. #255 is already merged. After each proposed merge, the other branch heads/CI become historical and require main resynchronization and new exact-head validation. **No merge/deploy authorized.**

**Authorization boundary:** Only founder's separate, named A/B Auth identity/inbox, environment, transactional-mail scope and data cleanup decision enables provider registration. Until that decision, all P01–P14 are BLOCKED by design; do not forge test accounts or send mail. The precise request and stop conditions are in `FIRST_FLAME_PROVIDER_ACCEPTANCE_004D.md`.

---

## N. Directive 007 — production R1–R5 acceptance reconciliation (2026-11-22)

**Supersedes stale *current-status* statements in sections written before the five releases; preserves all old matrices and historical evidence verbatim.** This is a new provenance/date-specific checkpoint, not a second acceptance program.

**Verified accepted production main:** `2cef0da1c244de4a84d8c8e33753660a7ec96655` (R5 #249). R1 #267 routing merge `a76c3bf8dd0daeb3df852dab5c5e7c6bcc0a5c3f`; R2 #270 onboarding/atomic device save `84d15c144eb94889cbd2c8e0981e6ee5e34ec9a8`; R3 #254 free public Seven Days `e33885ca7758c2aeb2307993cd66f6a779f6346e`; R4 #250 free visitor Front Door `66428c4145cae34e4c2bdfec6e8969174a98882f`; R5 #249 source-only assurance `2cef0da1c244de4a84d8c8e33753660a7ec96655`. GitHub metadata confirmed all five CLOSED/MERGED. R5 post-merge CI and GitHub Pages were successful per the [Executive Registry #274](https://github.com/Hansumhunk/not-broken-just-burning/issues/274#issuecomment-7084333919); this does NOT imply customer/provider security acceptance.

**Accepted single-account actual customer journey, not synthetic:** Issue #205 Account A founder-observed live Supabase registration and verification email; free entitlement/provisioning; optional onboarding/Path; free Start Here and explicitly saved My Work + Next Honest Action; Dashboard refresh; logout/protected-route denial; same-device returning sign-in. This was a controlled internal QA identity, *not* external acquired demand. Preserve these completed successes; never demand another Account A manual retest.

**Independent source / CI / HTTP:** #267 maps six Dashboard focus shortcuts to protected member Path stages in production (prior F09 source FAIL **RESOLVED at code level**). #270 delivers one local write for saved Start Here reflection + Next Honest Action; blocked storage/failure and rapid duplicate fixture tests run in release CI. #254 Seven Days public HTML/CSS/JS and self-canonical sitemap published; #250 direct public free guest link, Join page, desktop/mobile/keyboard CI and live outbound HTTP 200 verified [Front Door gate](https://github.com/Hansumhunk/not-broken-just-burning/actions/runs/45058278371). #249 source-only auth/webhook/Postgres fixtures, not two real JWTs or verified charge/refund, are accepted as security engineering.

**Current Supabase read-only aggregate checkpoint** (2026-11-22): 5 confirmed Auth accounts, including a known internal QA account; 1 newly created Auth in previous 7 days; 3 active free entitlements and 2 active paid entitlement rows; 0 server `profiles.onboarding_completed=true`, 0 server `member_continue_state.next_honest_action`, 0 server learning/path-progress entries. Account/user cohorts and free-to-paid external customers cannot be deduced from these mixed grains. PostHog event catalog includes `$pageview` but no observed NBJB-specific completed-first-action or verified-member-return event names. Auth `last_sign_in_at` does not reconstruct D7 visits. Browser local work does not automatically update those server tables. Never infer lack of local educational activity from server zeros.

### MA01–MA30 reconciled against current evidence

PASS is **explicitly scoped** to the labeled evidence, not a blanket multi-account/provider acceptance. PARTIAL means some source/fixture or Account A subscope accepted; DEFERRED means unexecuted by founder decision.

| Case | Current class | Verified evidence / still missing |
|---|---|---|
| MA01 | PASS—public route | R4 homepage + Join + free Seven Days published; outbound GET/Chromium, not human comprehension |
| MA02 | PASS—Account A | Genuine founder-controlled production registration and verified free member |
| MA03 | PARTIAL | Synthetic invalid/duplicate behavior; actual second registration/duplicate provider probe waived |
| MA04 | PASS—Account A | Genuine one transactional confirmation email/link and account verification |
| MA05 | DEFERRED | Provider expired/reused verification link not tested |
| MA06 | PASS—Account A | Genuine verified member onboarded and reached free lesson |
| MA07 | PASS—single-account | Founder observed guest/protected-route denial after sign-out; not adversarial two-user JWT |
| MA08 | PASS—Account A | Founder observed returning password login |
| MA09 | PARTIAL | Error/recovery UI fixtures; actual recovery provider email/link deferred |
| MA10 | PARTIAL | Actual logout & return A verified; provider session expiry/race not verified |
| MA11 | PASS—Account A | Chosen Path and Next Honest Action survived same-device refresh |
| MA12 | PARTIAL | Optional skip fixture/source; founder skip scenario not repeated |
| MA13 | PARTIAL | Device-scoped preferences/source privacy; distinct-account isolation deferred |
| MA14 | PASS—Account A | Actual Free tier opened substantive Start Here without purchase |
| MA15 | PASS—Account A + CI | Deliberately saved free reflection and Dashboard action; atomic failure branch validated in fixture, not in real A |
| MA16 | PASS—same device | Saved My Work/action persisted across refresh, sign-out and returning login; no cross-device sync |
| MA17 | PARTIAL | Rapid double-submit browser regression passes; separate deliberate repeat-practice lifecycle not established |
| MA18 | DEFERRED | Paid-reading bookmark continuity not independently rerun as this program |
| MA19 | PASS—Account A | Dashboard actual tier/focus/work/action rendered; R1 route fixed at source+CI |
| MA20 | DEFERRED | Two genuine ordinary-member JWT row isolation challenge not performed; owner RLS inspected only |
| MA21 | PASS—public course | R3 seven substantive day lessons, valid canonical+index, live HTTP and browser candidate |
| MA22 | PARTIAL | Curriculum published, editorial/staged QA; real multi-day behavioral continuity cannot be inferred |
| MA23 | PARTIAL | Guest direct manuscript SQL grant/policy deny + historical founder checks; real ordinary Free JWT reader denial deferred |
| MA24 | PARTIAL | Signup and newsletter consent isolated in code; negative provider marketing-enrollment audit not run |
| MA25 | PARTIAL | No upload claimed; local mock network checks, PostHog taxonomy incomplete; production leakage audit deferred |
| MA26 | DEFERRED | No complete comparable external D7 activated cohort; don't calculate retention |
| MA27 | PARTIAL | Desktop/mobile Chromium accepted; founder physical mobile verification waived |
| MA28 | PARTIAL | Automated keyboard/landmark tests accepted; manual screen-reader audit waived |
| MA29 | PARTIAL | Actual offline/storage failure/recovery covered by released synthetic CI; no real provider failure injection |
| MA30 | PASS—release controls | R1–R5 merged after exact-head approval and validation, provider Pages deployment; security gaps separately open |

### F01–F16 Open the Gates source matrix — 007 reconciliation

Original reconstruction retained at [issue #205](https://github.com/Hansumhunk/not-broken-just-burning/issues/205#issuecomment-7068072390). Never promote the whole matrix to real-provider PASS.

| F | Current class | Rationale |
|---|---|---|
| F01 | PASS—public UI | Public homepage and free entry deployed with outbound HTTP 200 |
| F02 | PASS—public UI | Join benefit/guest/optional signup links released, HTTP 200 |
| F03 | PARTIAL | Source/form fixture; provider duplicate/invalid state not exercised |
| F04 | PARTIAL | Real Account A created; duplicate identity prevention not provider-tested |
| F05 | PASS—A | Founder-owned verification mail/confirmed account |
| F06 | DEFERRED | Expiry/replay provider link behavior |
| F07 | PASS—A | Genuine optional onboarding focus/save and free lesson |
| F08 | PASS—A | Actual first lesson, saved tool work and Next Honest Action |
| F09 | PASS—released source/CI | All six Dashboard focus shortcuts corrected by merged R1; not a fresh human six-route test |
| F10 | PARTIAL | Member RLS policies and guest restrictions; two distinct ordinary JWTs deferred |
| F11 | PARTIAL | Backend paid entitlement reference and historical founder premium/free; fresh Free JWT denial deferred |
| F12 | PASS—A | Founder observed returning sign-in and same-device work |
| F13 | DEFERRED | Provider password recovery/magic link |
| F14 | PASS—A | Founder observed signout protected-page denial and restored A state |
| F15 | PARTIAL | Automated responsive/keyboard accepted; human AT excluded by waiver |
| F16 | PARTIAL | Code consent segregation; actual list isolation not audited in this release |

### Next bounded improvement, not a historical blocker
**Observed:** Public First Seven Days is fully released but `members.html` has **no direct link** to `first-seven-days.html`, despite the public course describing the member Hub as a continuation destination. **Customer consequence:** A signed-in member may need to navigate back through the visitor homepage to rediscover free seven-day lessons. **Source-only 007 correction staged on a separate draft branch:** add a small public link to first-run Dashboard and the free member learning card, explicitly disclosing that temporary public day marks do **not** synchronize into the Hub or private My Work; do not create storage/tracking/auth systems. Add targeted test inside existing member-access regression suite. **Production remains unchanged pending its own exact-head founder release approval.**

**Hard boundaries retained:** no new QA B, emails, premium payment tests, marketing, production tracking, DDL, Auth config or customer changes. Real A/B JWT, Free JWT manuscript denial, recovery provider behavior, physical AT and D7 are **DEFERRED, not PASS**. #249 and security issue #160 own unrelated security improvements. Production and new draft source must never be conflated.
