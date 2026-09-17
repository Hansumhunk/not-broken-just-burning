# Not Broken Just Burning — Member System

## Purpose

The member system exists to give people a place to **return**, not merely a page that says “Join.”

The intended journey is:

**discover → join → onboard → dashboard → choose a current focus → use a practice/tool → save only what matters → return → review progress → deepen connection**

Membership should create useful continuity, access, and community without turning NBJB into a rank hierarchy or pretending reflective tools are clinical treatment.

## Identity model

### Flamewalker

A Flamewalker is the movement identity for a person doing the work of reclamation. It is not a certification, diagnosis, religion, professional credential, or rank.

### Guardian

Guardian remains a future service / leadership role with responsibilities and defined scope. It is not automatically unlocked by time, purchases, clicks, or status points.

## Access model

Phase Two is designed around four access classes:

1. **Public**
2. **Free Flamewalker**
3. **Paid Flamewalker**
4. **Separate product / event entitlements**

Public remains genuinely useful. Free membership creates the return point and opens the starter Library. Paid membership provides the deeper recurring learning and continuity layer. Flagship courses, books, workbooks, specialty programs, and live events may remain separate purchases with paid-member preferred pricing where designated.

The detailed architecture lives in `ACCESS_MODEL.md`.

Current development includes `js/member-entitlements.js`, a local prototype-only entitlement service for testing Free vs Paid member UI before real authentication and billing exist. It is not security.

## Front-end first, backend second

The member experience is being designed before the final authentication/database provider is connected.

Current development-only member routes:

- `member-onboarding.html` — first-run setup
- `members.html` — dashboard
- `member-path.html` — current Path focus and stage progress
- `member-tools.html` — Toolbox
- `member-work.html` — searchable archive for deliberately saved work
- `member-progress.html` — longitudinal history and review layer
- `member-library.html` — member library shell
- `member-media.html` — video/learning hub shell
- `member-store.html` — storefront and entitlement shell
- `member-community.html` — discussion / Discord companion shell
- `member-profile.html` — profile
- `member-settings.html` — privacy/data controls
- `member-auth.html` — future sign-in/signup/recovery bridge mockup

Shared layers:

- `css/members.css` — core member platform layout
- `css/member-expansion.css` — saved-work/progress/media/store/community extensions
- `js/member-service.js` — storage/service adapter
- `js/member-platform.js` — shared member navigation, My Work, Progress, profile, Path, and settings behavior
- `js/tool-member-history.js` — shared explicit Save to My Work bridge for all six Toolbox tools
- `js/member-history-insights.js` — structured My Work filters and transparent 7 / 30 / 90-day review summaries
- `js/member-entitlements.js` — prototype-only Free / Paid / product / event access vocabulary for front-end testing

The UI is separated from its storage mechanism:

`member UI → member service/adapter → localStorage now / authenticated backend later`

## Current device-local data model

The current prototype stores low-sensitivity continuity data under `nbjb.member.v2` and can migrate the earlier `nbjb.member.v1` snapshot.

A separate development-only entitlement simulator stores a local Free/Paid test tier under `nbjb.member.entitlement.prototype.v1`. This exists only so the front end can be tested before the backend becomes authoritative.

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
- explicitly saved My Work entries

Saved activity is capped to a bounded local list so the prototype does not grow browser storage without limit.

## My Work and Progress are different layers

**My Work** answers: *What did I deliberately save, and where is it?*

**Progress** answers: *What appears to be changing, repeating, or worth reviewing over time?*

Keeping archive and interpretation separate makes both easier to understand.

The explicit-save flow is:

`use tool → review result → optionally add comparison context → choose Save to My Work → confirm device-local save → My Work → optional longitudinal Progress review`

All six Toolbox tools use the same shared save bridge:

- The Forge
- Flame Check-In
- Pattern Map
- Boundary Builder
- One Stone
- Six Sacred Questions

Normal tool use does **not** add anything to My Work. Saving requires a separate member-controlled action and confirmation.

## Structured saved-work metadata

A saved entry can now carry optional member-selected comparison metadata in addition to its tool-specific fields, title, summary, and timestamp.

Current optional themes are:

- Work
- Relationships
- Family
- Parenting
- Money
- Identity
- Boundaries
- Conflict
- Grief
- Wellbeing
- Purpose
- Trust

A member can select up to six themes for a saved entry. These themes are not inferred by the system.

Optional structured context can also include:

- context — what was happening around the entry
- outcome — member-marked as improved, mixed, unchanged, harder, still unfolding, or not recorded
- what helped
- what changed

These fields exist so later reviews can compare what the member chose to record. They are not clinical measures, scores, truth ratings, or automated conclusions.

My Work can now search saved details and filter by tool, theme, and member-marked outcome.

## Current longitudinal review

Pattern Map remains the first tool with a dedicated repeated-language comparison because its structure naturally supports repeated-event review.

A saved Pattern Map can include:

- anchor event
- before / after context
- repeated observations
- differences or exceptions
- evidence entered by the member
- inference entered by the member
- careful summary
- timestamp

After multiple saved Pattern Maps, Progress can surface repeated language across separate entries using a transparent frequency rule. It does **not** claim that repetition proves motive, diagnosis, causation, or objective truth.

Five saved Pattern Maps is the current UX threshold for calling the view a longitudinal review. This is a product threshold, not a scientific or clinical threshold.

## Flame Review prototype

Progress now includes transparent **7-day, 30-day, and 90-day Flame Review** windows.

Each review can summarize only the member's deliberately saved information within that period:

- number of saved entries
- themes the member selected most often
- outcomes the member explicitly marked
- tools used
- one reflection question based on the saved history

The review does not diagnose, score, rank, or announce a hidden pattern as fact. When structured metadata is absent, it says so rather than inferring it from private writing.

This is the foundation for a future richer periodic review that may compare actions, exceptions, recurring contexts, and member-chosen Pattern Lenses while preserving the distinction between observation and interpretation.

## Privacy boundary

A member account does **not** automatically mean private reflections should be uploaded.

> **Your account can remember your journey without needing to read your journal.**

Highly sensitive material should remain device-local by default, including therapy/medical material, legal evidence or active-case material, private journals/source documents, and highly sensitive reflections unless a future secure-storage feature is deliberately chosen.

Future cloud history should require a deliberate sync choice, deletion controls, and clear explanation of what leaves the device.

## Video / learning strategy

**Public channels = discovery, trailers, clips, excerpts, and movement introductions**

**Free Flamewalker = first organized instructional video layer**

**Paid Flamewalker = deeper recurring video / learning library**

**Separate product entitlement = flagship course or specialty-program video**

**Discord = conversation / announcements / live community companion**

The organized instructional NBJB video library begins at Free Flamewalker access. Public YouTube may introduce the movement and publish promotional clips or excerpts, but it should not be treated as the protected learning library.

Members should not have to search Discord history to find an official lesson, replay, worksheet, or course module.

Large video files should not be stored directly in the public GitHub repository. Unlisted YouTube URLs are not reliable authorization. Future protected video should use a delivery model that supports authenticated or signed access.

## Storefront strategy

The eventual commerce flow should be:

`member → checkout provider → successful purchase → entitlement on member account → owned item appears in Member Library`

The account model must distinguish Free Flamewalker, Paid Flamewalker, separately owned products, and event access. Do not reduce final authorization to one `is_member` boolean.

Paid membership can provide preferred pricing on designated standalone products without automatically bundling every flagship course, book, workbook, workshop, or specialty program into the recurring subscription.

A storefront card is not security. Private manuscripts, paid courses, protected videos, unreleased books, and proprietary files must not be committed as public static assets and hidden behind links.

## Community / discussion strategy

A useful split is:

- website: identity, structured prompts, official resources, program pages, event pages, account progress
- Discord: fast conversation, live rooms, announcements, informal community interaction

Before real community launch, define community guidelines, moderation workflow, reporting/blocking, privacy defaults, age policy, crisis/safety boundaries, harassment/doxxing rules, limits on legal/medical advice, and moderator visibility/permissions.

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
- opt-in sync rules for appropriate saved-work/progress data
- member-only content/access checks
- purchase entitlement storage
- account deletion and appropriate export
- provider-specific privacy notice
- admin/moderator roles separated from ordinary membership
- abuse/rate limiting where appropriate
- unauthorized-access and account-edge-case testing

A Supabase service-role/private secret must never be placed in browser JavaScript or committed to the repository.

## Member culture

The Guardian Code applies to member spaces: Trust, Honor, Respect, Honesty, Loyalty. These are conduct filters, not demands for obedience.

Avoid artificial rank/status pressure, shame-based engagement, manipulative streak mechanics, implying site participation is treatment, presenting unverified beliefs as fact, or turning private conflict into community entertainment.

## Current development rule

`main` remains the public/live branch.

Member-system development occurs on `development` until the front-end experience, authentication bridge, authorization model, privacy/security rules, protected-content delivery, commerce/community safeguards, and release QA are ready for deliberate launch.
