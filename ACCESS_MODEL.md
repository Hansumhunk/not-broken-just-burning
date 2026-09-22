# Not Broken Just Burning — Phase Two Access & Entitlement Model

Status: development architecture. The initial Supabase authorization foundation now exists in the Phase Two project, but live authentication UI, protected-content delivery, and billing are not yet connected.

## Core access ladder

NBJB uses four access classes:

1. **Public**
2. **Free Flamewalker**
3. **Paid Flamewalker**
4. **Separate product / event entitlements**

The purpose is not to make the public site useless. Public NBJB should still teach, clarify, offer selected tools, and earn trust.

The member platform adds continuity and organized learning. Paid membership adds depth. Flagship products remain concentrated programs that can keep their own value.

## Public

Public access can include:

- Stories From the Fire
- Lessons From the Fire
- Path introductions
- selected public tools and lightweight exercises
- movement / founder / support / resource pages
- public trailers, excerpts, clips, and promotional teaching

### Public video rule

The organized NBJB instructional video library does **not** begin at the public layer.

Public channels may use:
- trailers
- short excerpts
- movement introductions
- selected promotional clips
- calls to create a free Flamewalker account

Full instructional lessons intended for the member learning library should require at least Free Flamewalker access.

## Free Flamewalker

Free membership is the first authenticated member layer.

Working access target:

- onboarding
- member dashboard
- current Path focus
- Next Honest Action
- profile and privacy settings
- limited continuity / saved-work features
- selected starter exercises
- selected starter worksheets
- selected foundational videos
- selected learning tracks
- member updates
- ability to purchase standalone products

Free membership should feel meaningfully useful, not like a checkout page wearing a login screen.

## Paid Flamewalker

Paid membership is the recurring depth layer.

Working access target:

- full dashboard continuity
- richer My Work / Progress history
- Pattern Lens
- 7 / 30 / 90-day Flame Reviews
- Boundary Builder / One Stone follow-up continuity
- deeper guided practices and worksheets
- full recurring member video library
- selected mini-courses included with membership
- recorded member workshops / replays where designated
- member-only releases
- richer future Circle / event access
- preferred pricing on eligible standalone products

Paid membership should not automatically absorb every future flagship program.

## Separate products and events

Possible separate entitlements:

- books / e-books
- workbooks
- flagship courses
- specialty programs
- ticketed workshops
- live seminars
- event replays when sold separately
- limited 1:1 clarity sessions
- bundles

A paid member may receive preferred pricing while the product still requires its own entitlement.

## Entitlement vocabulary

The backend should eventually support at minimum:

- `public`
- `free_member`
- `paid_member`
- `product:<slug>`
- `event:<slug>`

Examples:

- `product:masculine-restoration-flagship`
- `product:fatherhood-under-pressure-workbook`
- `event:2027-spring-workshop`

Do not use a single `is_member` boolean as the final authorization model.

## Video delivery

The website is the organized learning home.

The public YouTube channel may remain useful for discovery, trailers, clips, excerpts, and selected public teaching, but it should not be treated as the protected member library.

Unlisted YouTube links are not reliable access control. Member-only video should eventually use a delivery system capable of authenticated or signed access.

Large video files should not be committed to the public GitHub repository.

## Library model

The Member Library should organize access by entitlement:

### Free Library
- Start Here
- selected foundational videos
- selected guided exercises
- selected worksheets
- selected member updates

### Paid Library
- deeper exercises
- full recurring video tracks
- selected mini-courses
- workshop / replay collections
- paid-member releases
- advanced Path material

### Owned Library
- separately purchased courses
- books / workbooks
- specialty programs
- event access / replays when appropriate

A member should be able to see what they can access, what is paid-member only, and what requires a separate purchase without confusing those categories.

## Pricing rule

Final prices and discount percentages remain undecided.

The architecture should support paid-member preferred pricing without hard-coding a permanent percentage.

## Security rule

The current front-end entitlement prototype is for interface development only.

A public static file is not protected because JavaScript hides a button.

Real protected content must be delivered only after authenticated backend authorization. Paid/private curricula, protected media URLs, unreleased manuscripts, and proprietary downloads must not be committed as public assets and hidden cosmetically.

## Privacy rule

Membership level does not change the core data-minimization boundary:

> **Your account can remember your journey without needing to read your journal.**

Do not automatically upload highly sensitive Forge notes, Pattern Maps, Sacred Questions answers, therapy/medical information, legal evidence, or private journal content merely because a member upgrades.


## Implemented Supabase foundation

The Phase Two Supabase project now implements the first backend entitlement foundation described in this document.

Implemented server-side structures:

- authenticated member profile and low-sensitivity preferences
- current Path focus and per-stage Path progress
- Next Honest Action / last-tool / Continue state
- learning-progress metadata
- authoritative Free vs Paid membership entitlement state
- separate product entitlements
- separate event entitlements
- private admin/moderator role support
- Row Level Security on every user-facing table

The database preserves the access vocabulary:

- `public` — implicit signed-out/public-site access
- `free_member`
- `paid_member`
- `product:<slug>`
- `event:<slug>`

Ordinary members may read only their own entitlement rows and cannot promote themselves, grant themselves a product, or grant themselves an event. An explicit admin role can cross the normal ownership boundary.

The authoritative migration and security notes live in:

- `supabase/migrations/20260918010500_phase_two_member_foundation.sql`
- `SUPABASE_BACKEND_PLAN.md`
- `SUPABASE_SCHEMA.md`

No live billing is connected. Future checkout/webhook code must be server-side and must not make browser JavaScript authoritative for entitlement mutation.
