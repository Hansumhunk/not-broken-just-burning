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

## Front-end first, backend second

The member experience can be designed and built before the final authentication/database provider is connected. That is the preferred approach for the current development phase.

The front end should be treated as a real product shell rather than a fake login system. We can design:

- the Flamewalker dashboard
- profile/snapshot editing
- current Path focus and progress views
- Guardian Code practice views
- member resource/library navigation
- future event, course, circle, and member-content shells
- account/settings/privacy screens
- signed-out, loading, empty, error, and access-denied states
- sign-in, create-account, recovery, and verification screen layouts

During this phase, low-sensitivity prototype state can continue to use browser `localStorage`.

The code should keep a clean service boundary so the UI does not care whether its data comes from local storage today or a secure backend tomorrow. Conceptually:

`member UI → member service/adapter → localStorage now / authenticated backend later`

When the backend is connected, the service layer can be replaced or extended without rebuilding the member experience from scratch.

### Important security boundary

A static page in a public GitHub Pages repository is **not protected member content** merely because it is linked only after a login screen. Until real authentication and server-side authorization exist, member pages are prototypes/workspaces, not secure access-controlled areas.

When paid, private, or member-only content is introduced, the protected data/content must come from an authenticated backend or private storage after access is checked. Do not commit proprietary paid material to the public repository and then rely on hidden links.

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

The preferred current backend candidate is **Supabase** because it can provide authentication, a Postgres database, Row Level Security, and server/Edge Function capabilities while allowing the existing static front end to remain largely intact. Firebase remains a viable alternative if requirements change.

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

### Supabase bridge concept

The eventual connection should behave like a bridge between the existing public/member UI and secure account services:

1. public Join/sign-in screen starts authentication
2. Supabase Auth establishes the signed-in user
3. the member service reads/writes only that user's permitted profile data under Row Level Security
4. the existing Flamewalker Hub renders the returned profile/progress
5. protected entitlements/content are requested only after authorization succeeds
6. logout returns the person to a public/signed-out state

The browser may use the Supabase project URL and public/anon publishable key only with correctly configured Row Level Security. A service-role/private secret must never be placed in public JavaScript or committed to the repository.

Account deletion or other privileged operations that require elevated permissions should run through a trusted server/Edge Function, not through a service-role secret in the browser.

### Data-minimization rule

A member account does **not** automatically mean private reflections should be uploaded.

Default server-stored data should be limited to what is necessary for membership, such as:

- account/member identifier
- email/account identifier used by authentication
- display name if chosen
- current Path focus
- selected Guardian Code values / low-sensitivity preferences
- next honest action if the member intentionally chooses to sync it
- access entitlements / role
- timestamps
- optional event/course progress

Sensitive Forge notes, Pattern Maps, shame reflections, medical details, legal evidence, therapy material, and similar content should remain device-local by default unless a future feature deliberately offers secure storage with explicit consent and a clear reason.

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
