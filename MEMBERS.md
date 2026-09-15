# Not Broken Just Burning — Member System

## Purpose

The member system exists to give people a place to **return**, not merely a page that says “Join.”

The intended journey is:

**discover → join → onboard → dashboard → choose a current focus → use a practice/tool → return → review progress → deepen connection**

Membership should create useful access, continuity, and community without turning NBJB into a rank hierarchy or pretending reflective tools are clinical treatment.

## Identity model

### Flamewalker

A Flamewalker is the movement identity for a person doing the work of reclamation. It is not a certification, diagnosis, religion, professional credential, or rank.

### Guardian

Guardian remains a future service / leadership role with responsibilities and defined scope. It is not automatically unlocked by time, purchases, clicks, or status points.

## Front-end first, backend second

The member experience is being designed before the final authentication/database provider is connected.

Current development-only member routes:

- `member-onboarding.html` — first-run setup
- `members.html` — dashboard
- `member-path.html` — current Path focus and stage progress
- `member-tools.html` — Toolbox
- `member-progress.html` — saved member-tool history and longitudinal review
- `member-library.html` — member library shell
- `member-media.html` — video/learning hub shell
- `member-store.html` — storefront and entitlement shell
- `member-community.html` — discussion / Discord companion shell
- `member-profile.html` — profile
- `member-settings.html` — privacy/data controls
- `member-auth.html` — future sign-in/signup/recovery bridge mockup

Shared layers:

- `css/members.css` — core member platform layout
- `css/member-expansion.css` — progress/media/store/community extensions
- `js/member-service.js` — storage/service adapter
- `js/member-platform.js` — shared member interactions and rendering
- `js/pattern-member-history.js` — explicit Pattern Map → member history bridge prototype

The UI is separated from its storage mechanism:

`member UI → member service/adapter → localStorage now / authenticated backend later`

## Current device-local data model

The current prototype stores low-sensitivity continuity data under:

`nbjb.member.v2`

It can migrate the earlier `nbjb.member.v1` snapshot.

Current local member data can include:

- optional display name / nickname
- optional short profile description
- prototype profile visibility choice
- current Flamewalker Path focus
- per-stage progress state: `not-started`, `in-progress`, or `practicing`
- one Next Honest Action
- Guardian Code values being practiced
- last tool opened
- onboarding completion state
- prototype preferences
- explicitly saved member-tool history

The service currently caps saved activity history to a bounded local list so the prototype does not grow browser storage without limit.

## Tool history and longitudinal progress

Tool content is **not automatically copied** into member history merely because a member opens a tool.

The preferred pattern is explicit save:

`use tool → review result → choose Save to My History → local member record → Progress page`

The first implemented example is Pattern Map.

A saved Pattern Map record can contain:

- anchor event
- before / after context
- repeated observations
- differences or exceptions
- evidence entered by the member
- inference entered by the member
- careful summary
- timestamp

The Progress page can compare multiple saved Pattern Maps over time. The first rule-based longitudinal review is intentionally transparent: after multiple entries, it surfaces repeated language across separate saved maps. It does **not** claim that word repetition proves motive, diagnosis, causation, or objective truth.

Five saved Pattern Maps is the current UX threshold for calling the view a longitudinal review. This is a product threshold, not a scientific or clinical threshold.

Future versions may add better structured comparison or AI-assisted summaries only after privacy, consent, and backend design are explicit.

## Privacy boundary

A member account does **not** automatically mean private reflections should be uploaded.

A useful product principle is:

> **Your account can remember your journey without needing to read your journal.**

Highly sensitive material should remain device-local by default, including:

- therapy or medical material
- legal evidence / active-case material
- private journals or source documents
- highly sensitive Forge or pattern notes unless the member deliberately chooses a future secure-storage feature

The current Pattern Map history prototype is device-local and explicitly opt-in. Future cloud history should require a deliberate sync choice, deletion controls, and clear explanation of what is stored.

## Video / learning strategy

The preferred content model is:

**website = organized learning home**

**Discord = conversation / announcements / live community companion**

Members should not have to search Discord history to find the official lesson, replay, worksheet, or course module.

Large video files should not be stored directly in the GitHub repository. A dedicated video host should provide playback. Future protected member video should use a provider / delivery model that supports real access control or signed/private playback where appropriate.

Possible member media collections:

- Start Here / foundation videos
- Path-stage lessons
- recorded workshops and talks
- replay library
- founder updates
- member-only releases

## Storefront strategy

`member-store.html` reserves the product experience for:

- books / e-books
- released workbooks and downloads
- workshops and courses
- special member releases

The eventual commerce flow should be:

`member → checkout provider → successful purchase → entitlement on member account → owned item appears in Member Library`

A storefront card is not security. Private manuscripts, paid courses, unreleased books, and proprietary files must not be committed as public static assets and hidden behind links.

## Community / discussion strategy

The member platform reserves a Circle area for future discussion.

A useful split is:

- website: identity, structured prompts, official resources, program pages, event pages, account progress
- Discord: fast conversation, live rooms, announcements, informal community interaction

Potential spaces:

- general member lounge
- Path-stage circles
- book/video/workshop discussion
- live event circles and Q&A

Before any real community launch, define:

- community guidelines
- moderation workflow
- reporting and blocking
- privacy defaults
- age policy
- crisis/safety boundaries
- harassment and doxxing rules
- limits on legal/medical advice
- moderator visibility and permissions

## Important security boundary

A static page in a public GitHub Pages repository is **not protected member content** merely because it is linked only after a login screen.

Real protected content must be returned only after authenticated authorization from backend/private storage.

## Phase 2 — Real member accounts

The preferred current backend candidate remains **Supabase** because it can provide authentication, Postgres, Row Level Security, and server/Edge Function capabilities while allowing the current static front end to remain largely intact.

Required capabilities before live accounts:

- secure account creation and login
- verification / recovery design
- authenticated session management
- member profile persistence across devices
- Row Level Security or equivalent member isolation
- opt-in sync rules for appropriate progress/history data
- member-only content/access checks
- purchase entitlement storage
- account deletion
- appropriate account data export
- provider-specific privacy notice
- admin/moderator roles separated from ordinary membership
- abuse/rate limiting where appropriate
- unauthorized-access and account-edge-case testing

### Supabase bridge concept

1. public Join/sign-in starts authentication
2. Supabase Auth establishes the signed-in member
3. the member service reads/writes only that member's permitted profile/progress under RLS
4. the existing Flamewalker dashboard renders the returned state
5. optional history sync is handled according to explicit privacy preferences
6. protected media/store/library entitlements are checked before content is returned
7. logout returns the person to a public/signed-out state

A Supabase service-role/private secret must never be placed in browser JavaScript or committed to the repository.

## Member culture

The Guardian Code applies to member spaces:

- Trust
- Honor
- Respect
- Honesty
- Loyalty

These are conduct filters, not demands for obedience.

Avoid:

- artificial rank/status pressure
- shame-based engagement
- manipulative streak mechanics
- implying site participation is treatment
- presenting unverified beliefs as fact
- turning private conflict into community entertainment

## Current development rule

`main` remains the public/live branch.

Member-system development occurs on `development` until the front-end experience, authentication bridge, authorization model, privacy/security rules, protected-content delivery, commerce/community safeguards, and release QA are ready for deliberate launch.
