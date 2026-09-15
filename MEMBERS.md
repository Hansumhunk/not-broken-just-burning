# Not Broken Just Burning — Member System

## Purpose

The member system exists to give people a place to **return**, not merely a page that says “Join.”

The intended journey is:

**discover → join → onboard → dashboard → choose a current focus → use a practice/tool → return → deepen connection**

Membership should create useful access, continuity, and community without turning NBJB into a rank hierarchy or pretending reflective tools are clinical treatment.

## Identity model

### Flamewalker

A Flamewalker is the movement identity for a person doing the work of reclamation. It is not a certification, diagnosis, religion, professional credential, or rank.

### Guardian

Guardian remains a future service / leadership role with responsibilities and defined scope. It is not automatically unlocked by time, purchases, clicks, or status points.

## Front-end first, backend second

The member experience is being designed and built before the final authentication/database provider is connected. That is the preferred approach for the current development phase.

The current member platform shell includes:

- `member-onboarding.html` — first-run member journey and device-local snapshot setup
- `members.html` — Flamewalker dashboard
- `member-path.html` — current Path focus and stage progress UI
- `member-tools.html` — member-facing tool hub and last-tool routing
- `member-library.html` — public material plus clearly marked future locked-content placeholders
- `member-profile.html` — minimal member profile and future visibility choices
- `member-settings.html` — prototype privacy/data preferences, export, and clear-device controls
- `member-auth.html` — disabled sign-in/create/recovery workflow mockups for the future authentication bridge
- `css/members.css` — shared member platform layout and responsive styles
- `js/member-service.js` — storage/service boundary between UI and data source
- `js/member-platform.js` — shared member interactions and rendering

The UI is intentionally separated from its storage mechanism:

`member UI → member service/adapter → localStorage now / authenticated backend later`

This lets the account bridge replace or extend the service layer later without rebuilding the member experience from scratch.

## Current device-local data model

The current prototype stores low-sensitivity continuity data under:

`nbjb.member.v2`

The service can migrate the earlier `nbjb.member.v1` snapshot.

Current local member data includes:

- optional display name / nickname
- optional short profile description
- prototype profile visibility choice
- current Flamewalker Path focus
- per-stage progress state: `not-started`, `in-progress`, or `practicing`
- one next honest action
- Guardian Code values being actively practiced
- last tool name opened from the member tools hub
- onboarding completion state
- prototype preferences for future cloud sync / member updates / motion behavior

This data stays on the current browser/device. It is not currently sent to GitHub, NBJB email, an analytics service, an NBJB database, or an AI model.

The member settings screen provides a device-local JSON copy action and a clear-device action.

## Privacy boundary

A member account does **not** automatically mean private reflections should be uploaded.

The member profile/service intentionally does not ingest the contents of:

- Forge notes
- Pattern Maps
- Six Sacred Questions answers
- shame reflections
- therapy/medical material
- legal evidence or active-case material
- sensitive journals or private source documents

Those should remain device-local by default unless a future feature deliberately offers secure storage with explicit purpose, consent, deletion controls, and appropriate protection.

A useful product principle is:

> **Your account can remember your journey without needing to read your journal.**

## Important security boundary

A static page in a public GitHub Pages repository is **not protected member content** merely because it is linked only after a login screen.

The current `member-library.html` therefore contains only public routes and architecture placeholders for future protected material. Private manuscripts, paid curricula, personal records, and proprietary member content must not be committed as public static assets and “protected” only by hidden links.

When real protected content exists, authorization must occur before the data/content is returned from a backend or private storage layer.

## Phase 2 — Real member accounts

A real member system requires authentication and persistent server-side storage. GitHub Pages is a static host and cannot securely provide this by itself.

The preferred current backend candidate is **Supabase** because it can provide authentication, Postgres, Row Level Security, and server/Edge Function capabilities while allowing the current static front end to remain largely intact. Firebase remains a viable alternative if requirements change.

Required capabilities before live accounts:

- secure account creation and login
- email verification or passwordless login decision
- credential handling delegated to the auth provider
- authenticated session management
- member profile persistence across devices
- Row Level Security or equivalent isolation between members
- member-only content/access-control checks
- account deletion
- appropriate data export
- privacy notice updated for provider behavior
- admin/moderator roles separated from ordinary membership
- rate limiting / abuse protection where appropriate
- unauthorized-access and account-edge-case testing

### Supabase bridge concept

The eventual connection should behave like a bridge between the existing public/member UI and secure account services:

1. the public Join/sign-in screen starts authentication
2. Supabase Auth establishes the signed-in user
3. the member service reads/writes only that user's permitted profile/progress data under Row Level Security
4. the existing Flamewalker dashboard renders the returned profile/progress
5. protected entitlements/content are requested only after authorization succeeds
6. logout returns the person to a public/signed-out state

The browser may use the Supabase project URL and public/anon publishable key only with correctly configured Row Level Security. A service-role/private secret must never be placed in browser JavaScript or committed to the repository.

Privileged operations such as account deletion should run through trusted server/Edge Function code, not through a service-role secret exposed to the browser.

## Future member library

The current member library reserves UX space for future deliberately released content such as:

- deeper guided practices
- intentionally released member-only Stories From the Fire
- recorded talks or workshops
- courses/programs with access entitlements
- live event/circle information
- founder updates
- purchased book/course access

These are placeholders only. They do not represent currently protected content.

## Phase 4 — Community

Community features should be designed only after moderation and safety rules exist.

Possible features:

- discussion spaces organized by Path stage
- structured reflection prompts
- event circles
- peer encouragement
- opt-in public member profiles

Before community launch, define:

- community guidelines
- moderation workflow
- reporting/blocking tools
- privacy defaults
- age policy
- crisis/safety escalation boundaries
- harassment and doxxing rules
- prohibited legal/medical advice behavior
- what moderators can and cannot see

## Member culture

The Guardian Code applies to member spaces:

- Trust
- Honor
- Respect
- Honesty
- Loyalty

These are conduct filters, not demands for obedience.

The member experience should avoid:

- artificial rank/status pressure
- shame-based engagement
- manipulative streaks or fear-of-missing-out mechanics
- implying site participation is treatment
- presenting unverified beliefs as fact
- turning private conflict into community entertainment

## Current development rule

`main` remains the public/live branch.

Member-system development occurs on `development` until the front-end member experience, authentication bridge, authorization model, privacy/security rules, and release QA are ready for deliberate launch.
