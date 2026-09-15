# Not Broken Just Burning — Member System

## Purpose

The member system exists to give people a place to **return**, not merely a page that says “Join.”

The intended journey is:

**discover → join → enter the Flamewalker Hub → choose a current focus → use a practice/tool → return → deepen connection**

Membership should create useful access, continuity, and community without turning NBJB into a rank hierarchy or pretending reflective tools are clinical treatment.

## Identity model

### Flamewalker

A Flamewalker is the movement identity for a person doing the work of reclamation. It is not a certification, diagnosis, religion, professional credential, or rank.

### Guardian

Guardian remains a future service / leadership role with responsibilities and defined scope. It is not automatically unlocked by time, purchases, clicks, or status points.

## Phase 1 — Device-local Member Hub

Implemented in the `development` branch:

- `members.html`
- `css/members.css`
- `js/members.js`

The current Member Hub provides:

- optional name / nickname
- current Flamewalker Path focus
- one next honest action
- Guardian Code values being actively practiced
- quick routes to all reflection tools
- quick routes to each Path stage
- a clear explanation of current versus future member capabilities

The member snapshot is stored with browser `localStorage` under:

`nbjb.member.v1`

It stays on that browser/device. It is not sent to GitHub, NBJB email, an analytics service, or an NBJB database.

The hub includes a clear **Clear This Device** action.

## Phase 2 — Real member accounts

A real member system requires authentication and persistent server-side storage. GitHub Pages is a static host and cannot securely provide this by itself.

Required capabilities before launch of accounts:

- secure account creation and login
- email verification or passwordless login
- password / credential handling delegated to a reputable auth provider
- member profile
- account deletion
- data export where appropriate
- cross-device synchronization of low-sensitivity member preferences / progress
- privacy notice updated for the chosen providers
- security rules preventing members from reading one another's private data
- moderation/admin roles separated from ordinary membership
- rate limiting / abuse protection where necessary

### Data-minimization rule

A member account does **not** automatically mean private reflections should be uploaded.

Default server-stored data should be limited to what is necessary for membership, such as:

- account identifier
- display name if chosen
- current Path focus
- selected public/member preferences
- access entitlements
- optional event/course progress

Sensitive Forge notes, Pattern Maps, shame reflections, medical details, legal evidence, and similar material should remain device-local by default unless a future feature deliberately offers secure storage with explicit consent and a clear reason.

## Phase 3 — Member-only content

Possible member areas:

- deeper guided practices
- downloadable worksheets that are intentionally released
- member-only Stories From the Fire
- live/event information
- recorded talks or workshops
- founder updates
- community prompts
- book/course access after purchase

Do not publish private manuscripts or paid curricula merely because the member architecture exists.

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

Member-system development should occur on `development` until the hub and account architecture are ready for deliberate release.
