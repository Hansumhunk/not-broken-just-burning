# The First Flame — Phase III: controlled Supabase provider acceptance and release decision packet

**Directive:** Project Ignition III / 004-D · **Prepared:** 2026-11-22 UTC · **Owner:** NBJB First Flame / Open the Gates · **Status:** preparation only; real-provider test authorization NOT GRANTED · **Production release:** WITHHELD · **Spend:** zero additional.

## A. Actually verified; do not conflate evidence types

Read-only connected GitHub and Supabase checks were executed on 2026-11-22. Source and browser-fixture evidence is in `FIRST_FLAME_ACTIVATION_AUDIT_20261122.md` and this PR's exact-head CI.

- Production GitHub `main`: `ac8d5da6bb214d4ea7be9d9109cf5f2c6cbcf932` at inspection. PR #270 accepted Phase II head `3bbe09f41d87e60f334115c8c8e65718354ab5d5`; Phase III added one-transaction Start Here saves and browser negative QA, see current PR head and CI rather than reusing a stale SHA.
- PR #267 Dashboard focus-route fix `74b1966a97a6c72dc396952bdb17824feb03ce03`, draft and unmerged, 2 files; static CI #44941212190 green. **On production, F09 member Dashboard shortcut to member practice remains unfixed.**
- PR #254 First Seven Days `7f314e7046eada07bc78086ca1a99a3dfb44b5b1`, draft/mergeable, conflict resolved; exact-head staged static and browser CI passed #44988758512 and #44988758483; accepted curriculum and 3 Search Dominion guide URLs preserved.
- PR #250 Front Door `78d206e23ed894e8e257427fbcacec8afb81230f`, draft; `css/visitor-journey.css`, `index.html`, `join.html`. Must not link to unreleased seven-day content.
- PR #249 assurance is still draft; its `.github/workflows/validate-site.yml` intersects PR #270 and must be reconciled if both are eventually released. PR #255 membership security already merged to `main`.
- Supabase production `NBJB Phase Two`, `plhbvtbvtxfzulsaxuim`: **4 Auth accounts, 4 confirmed, 4 profiles**, 4 Path-state rows, 4 continuation-state rows, **0 `member_path_progress`, 0 `learning_progress`**, **0 profiles marked onboarding completed**, **0 server Next Honest Actions**. Three accounts had `last_sign_in_at` within the preceding seven days; zero were created in that interval. These are aggregate administrative counts, NOT external activation or D7 retention.
- Existing `NBJB Commerce QA`, `fgpkejlmpfkxgpktgdzm`: **2 confirmed Auth accounts, 2 profiles, 0 learning-progress rows**. It was created for commerce tests and includes commerce orders/receipts and staged entitlements; **not** independently approved or established as a general member journey test environment. No project has a dedicated Supabase development branch. **Do not repurpose its two users without separate founder consent and environment validation.**
- Production policies inspected via `pg_policies`: member private-state tables have own-row/admin SELECT and mutating `WITH CHECK` where applicable. Premium manuscript table has browser-deny policy. Existing server reader has protected entitlement path (historically reviewed), but no user-token owner-denial probe conducted in Phase III.
- Security Advisor: `auth_leaked_password_protection` disabled and `pg_net` installed in `public`; #160 owns review. DO NOT change them in this operation.

## B. Proposed exact authorization — *requires a separate founder yes*

**Preferred target for the actual live member experience:** existing production Supabase `NBJB Phase Two`, accessed only through `https://notbrokenjustburning.com`, with two **new founder-owned QA mailbox identities** A and B. **Do not run until the founder explicitly approves this project, the two exact address identities in a private exchange, the test scopes, and maximum transactional mail.** The brand-new identity exercise is inherently a production Auth record write; Phase III authority does not authorize that write.

**Alternative isolated test target:** existing Commerce QA ONLY if the founder authorizes its repurposing, the authentic signup/verification redirect and membership schema parity are independently demonstrated, and no billing endpoint/test user/Stripe event flow is altered. At present this is not a validated equivalent. No new project/preview domain/SMTP provider/DNS or billable infrastructure is authorized.

**Auth mail authorization requested separately:** maximum **8 individual provider-triggered transactional emails in total**, only to A and B, covering a minimum of 2 signup confirmations and 2 password recovery messages, with the remaining budget for approved duplicate/resend, magic-link and expired/replayed-link scenarios. If configured Auth behavior causes a different count, requires a paid plan, needs a domain/redirect/config change, or unexpected message destination, **STOP** rather than continue; record remaining cases BLOCKED. The exact actual message count is not known before execution. **No marketing, Brevo newsletters, bulk email, contact imports or unrelated SMTP.**

**Cost:** $0 additional authorized. Use only existing plan limits; check provider limits first. Do not incur any incremental charge or create billable resources. A test invitation must never be represented as external growth.

**Private handling:** Founder supplies A and B through a private approval channel at execution time; addresses and tokens must NOT be committed to the public repository, CI logs, issue comments, screenshots or analytics. Use strong distinct passwords selected by the founder; never store passwords in scripts or GitHub. Screenshots crop or redact account addresses. Only synthetic, non-sensitive educational practice content may be entered. Existing four production accounts and real customers untouched.

**Cleanup proposal requiring founder approval:** Immediately sign out both test sessions; record server confirmation of revocation where possible, recognising JWTs may remain valid until expiry after user deletion. Then founder chooses either keep clearly labelled test accounts excluded from acquisition reporting (preferred for reproducibility) or separately authorize targeted deletion after revoking sessions and verifying all related rows. **No deletion or bulk purge without separate explicit approval; do not delete existing customer data.** Save only aggregate pass/fail status and redacted test timestamps.

## C. Executable manual/provider acceptance script — no calls authorized yet

| Step | Environment/action | Expected provider-backed observation | Status now |
|---|---|---|---|
| P01 | Founder-approved account A, clean signed-out browser; open `join.html` and account page | Free-no-card explanation, normal form; no newsletter precheck | BLOCKED: no test authorization |
| P02 | Register new A with valid password | Auth record created and verification required; no paid entitlement | BLOCKED |
| P03 | Receive and open A email confirmation | Email arrives at A only; signed link confirms A; redirects to allowed account/onboarding URL | BLOCKED |
| P04 | Login as A and refresh browser | `getUser()` server verification, authenticated page visible, correct A identity | BLOCKED |
| P05 | A onboarding: focus, optional values/Next Honest Action; then first Start Here lesson | One honest save; free lesson reachable; no upgrade required | BLOCKED (browser fixture already PASS) |
| P06 | A enters harmless facts/feelings/control and explicitly saves | One local record + optional Dashboard action; refresh persists; no private data uploaded | BLOCKED (browser fixture already PASS) |
| P07 | A Dashboard > member Path practice > Learning Trail; logout, browser Back, sign back in on same device | F09 routed to authenticated stage; sign-out denies private view; same-device state resumes | BLOCKED (F09 #267 draft; fixture only) |
| P08 | Register/verify B on second controlled mailbox; attempt duplicate A signup | No A→B identity crossover; neutral duplicate messaging; no account existence enumeration | BLOCKED |
| P09 | B attempts direct query of A profile/path/progress with own JWT | Owner RLS rejects/filters A rows; A data never returned; no admin/service bypass | BLOCKED |
| P10 | B attempts published premium manuscript via authenticated protected reader; guest direct access | Free/guest denied; no manuscript body or usable entitlement leakage | BLOCKED |
| P11 | A and B sign-in recovery; expired/reused links | Recovery and expiry behavior match provider policy; one-use links not replayable; no unrelated account change | BLOCKED |
| P12 | Check A/B account creation not reflected in marketing provider, analytics sensitive events, external growth | 0 newsletter subscriptions by implication; no reflections captured; exclude internal A/B from metrics | BLOCKED |
| P13 | Logout both and inspect fresh device | A/B device-local entries remain separately keyed, no cross-device sync claim | BLOCKED |
| P14 | Cleanup according to separately selected founder choice | Test mail/session tokens no longer usable according to revocation/expiry design; customer data untouched | BLOCKED |

**Execution controls:** Confirm project ref, Auth Site URL/redirect allowlist, provider limits and inbox control first; no provider configuration mutation. Use only one approved A/B pair. Stop and document upon unexpected checkout/entitlement promotion, privacy access, non-test mail, provider charges, or unauthorised redirects. Record environment, UTC time, expected/observed, outcome and redacted evidence for each P case. Browser interception of candidate HTML could be considered *only after* the founder approves an exact test design, because normal production domain currently serves `main`, **not** PR #270. Testing production signup alone does not validate unpublished candidate changes.

## D. Release integration — conflict-safe, no implied merger

No PR is release-authorized here. Confirm latest heads and CI again at every gate because branch merges update `main`.

1. **#267 Dashboard navigation** (2 scoped files) first; exact-head founder approval, merge and production verification for all six Path shortcuts. Historical live F09 remains FAIL until then.
2. **#270 First Flame** (signup message, onboarding reliability, atomic Start Here write, fixture tests). Real-provider P01–P13 tests should verify relevant production Auth path, and candidate controls must be checked in a permitted preview/isolated browser with real provider or post-release independent live acceptance. Separate founder exact-head approval, no coupling to #267. Rebase/synchronize from new main safely and rerun CI.
3. **#254 First Seven Days** seven-path candidate; source remains accepted. Before release recheck main synchronization and the exact sitemap merged set after #267/#270; exact-head founder approval, deploy, then verify real `/first-seven-days.html` HTTP 200, all seven sections, accessibility, links and sitemap.
4. **#250 Front Door** after destination is actually live and accepted, replace only the intended unlinked placeholder with the verified live route (no broken deep link); synchronize/test; require separate exact-head founder release authorization. Do not deploy combined with #254 automatically.
5. **#249 assurance** overlaps #270 on `.github/workflows/validate-site.yml` despite distinct product code. Reconcile CI workflow content non-destructively if staged for release; maintain all independent security checks. Production commerce and Stripe QA are separate and not a prerequisite to **free** content unless a shared gate fails.

Rollback (post-authorization only): freeze distribution; identify exact merged commits; revert only approved changed paths/commit via reviewed branch; verify main and protected member/logout/free flows, sitemap, existing 3 SEO guide URLs, and unaffected Stripe/analytics. Never force-push shared main or revert unrelated releases. Record any restored noindex or broken-link protection.

## E. Activation measurement — privacy-first, inspectable reality

**Immediately usable but incomplete:** From Supabase `auth.users` audit creation, email confirmation and sign-in *aggregates*; from existing site PostHog cookieless pageview data and any explicitly verified CTA metrics; from browser UI a local progress status visible to the member. These grains are incompatible and must not be divided as if they formed one funnel. An account count is not an external member count, `last_sign_in_at` is only the latest sign-in, and `profiles.onboarding_completed` currently remains 0 despite active member UI. No trustworthy D7 return rate can currently be calculated.

**Proposed optional future isolated design, NOT deployed:** Store only server-verified `user_id` (backend only), a small fixed event enum (`onboarding_saved`, `first_free_action_saved`, `return_authenticated`), UTC event time, and a boolean `qa_account` classification; or better, aggregate first-execution timestamps in an RLS-protected per-user activation checkpoint table with one row per member. Do not collect names, email addresses in analytical payload, journal/reflection text, specific emotional scores, private situations or IP/device fingerprint. Use authenticated server writes with ownership validation, no self-attested marketing status, no service key in browser. Propose 30–90-day raw retention and longer anonymous aggregates only after privacy/legal review; subject to separate migration/deploy approval and RLS two-account tests. D7: define cohort as unique confirmed *non-QA* free accounts created on date D; member returns with authenticated session after D+7 days within a predeclared observation window. Require true event history, full elapsed window and sample counts; report “not measurable yet” until implemented. Do not turn this into a healing score or individual engagement dashboard.

**Current PostHog taxonomy inspection (read-only, 2026-11-22):** NBJB Website Analytics / active project ID 623555 schema includes `$pageview`, but the returned event catalog has **no `nbjb_*` custom events** and no recorded first-action, onboarding-save or verified-member activation event names. The website source may contain a free-CTA capture statement, but the current catalog does not establish ingestion of that event. No person IDs or sensitive reflection properties were queried. This is an instrumentation/evidence gap, not proof of zero member demand or zero interactions. Do not invent a valid funnel or D7 retention series from it.

**Alternative without new persistence:** voluntary founder-run manual acceptance for two accounts; label acceptance proof only, not platform retention analytics. Preserve the known Nov 17–20 analytics gap as *unknown*, not zero.

## F. Evidence ledger and founder decision boundary

- **Browser Fixture Verified:** Phase II local Chromium with fake Auth/entitlements and blocked external requests; Phase III extends it to Start Here reflection + Dashboard action in one write, including blocked-storage rollback; exact-head CI link belongs in PR commentary after passing.
- **Source/DB Policy Verified:** Supabase RLS own-row and browser manuscript-denial policies, four confirmed production accounts, zero server learning-progress rows; genuine user-token owner denial **not executed**.
- **Historical Evidence:** founder manual signed-in/free vs premium tests in issue #205, not fresh P01–P13.
- **Blocked:** new account, two inbox verification/recovery/duplicate account, live email, real B→A RLS, expired links, production paid-denial, physical Android/assistive-tech and D7.
- **Provider-pass classification:** **0** new Phase III provider cases passed until P scripts have real redacted evidence.

**Single founder approval request (no implied consent):** “Approve controlled Auth-only provider QA on existing NBJB Phase Two (project `plhbvtbvtxfzulsaxuim`) for exactly two *new* founder-controlled test inboxes A and B to be identified privately; maximum eight transactional Auth emails solely to them; free registration, verification, duplicate/expiry/recovery, two-account/paid-denial, save/logout/return; synthetic content; no payments/marketing/DNS/config/new services and no incremental spend. Approve sign-out/revocation after tests; separately choose whether to retain labelled QA accounts or authorize exact-user cleanup. No production PR merge or deployment is included.” The requested approval is **not yet granted**.
