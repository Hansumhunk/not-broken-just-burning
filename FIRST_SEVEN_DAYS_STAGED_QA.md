# First Seven Days — staged implementation QA record

Directive 002-A | Review-only | Baseline 983435aeff79ea7ec8f46f9afad6a0e527de0f08 | Accepted curriculum PR #252 at 93b5c482e5e03491a40dfd94cf53bc9eaa087df0

## Editorial overlap and source integrity

Read-only production inventory: 44 published lessons across six tracks (7 Inherited Manhood; 8 Relationship Clarity; 14 Trusted Help & Clarity; 5 Emotional Command; 5 Rebuilding Life; 5 Sacred Laws). All 44 had structured workbook objects, prompt arrays, and manuscript block arrays. Reviewed inventory of workbook titles, public syllabus, existing workbook renderer mapping and usability audit. No protected manuscript or workbook prompt reproduced in this record, HTML, test data, or public assets.

A read-only database comparison normalized case and punctuation, scanned 12-word contiguous sequences across accepted learner copy and all published blocks/exercises/next-action/smaller-door fields: zero matching sequences on all 44 rows. Also compared normalized complete prompts longer than 25 characters with each of the seven new exercise sections: zero exact matches, 44 lessons checked per day. This is a lexical comparison, not proof of semantic uniqueness; conceptual overlap is intentional and reviewed below.

| Day | Editorial comparison (categories only) | Finding |
|---|---|---|
| 1 | Body awareness, sustainable discipline, grief and survival adaptations | Basic prioritization of immediate tasks, later tasks and care, rather than embodiment/body or relationship-loss inventory. |
| 2 | Discernment, credibility, contested narratives and relationship reality | Four-line incident note with feelings and open unknown; not the clinical/institutional, evidence, attribution or relationship-specific audits. |
| 3 | Self-governance, responsibility, leadership and strategic retreat | Time-budgeted single choice and influence distinction; not extended role or engagement decision tools. |
| 4 | Emotional boundaries and relationship limits | Closest thematic match; low-risk private rehearsal with resumption and safety rather than full access/participation audit; no premium prompts copied. |
| 5 | Emotion-to-action, response pause, body awareness, voice and retreat | Closest thematic match; simple rehearsal of a mild fictional trigger, signal, interruption and response; no extended paid workbook or trauma evaluation. |
| 6 | Inherited identity, self-worth, provider and relationship comparison | Role-to-value bridge with one small behavior; not detailed family history, provider, comparison or inherited-code work. |
| 7 | Sustainable discipline and 30-day integration | One-week mission and fallback, not the multi-domain thirty-day plan. |

Safety and source accuracy: accepted copy explicitly covers scope, no forced disclosure, monitored devices, appropriate urgent support, not requiring confrontation, court/caregiving constraints, non-diagnostic emotional practice and neutral optional membership. All links in the accepted curriculum were resolved against the pinned main tree; public companion routes are unchanged. Working tools remain signed-in free-account features. No material editorial change required; renderer retains accepted copy, converting links to equivalent relative routes. Display additions are navigation, marks guidance, hero and generic CTA labels only.

## Scope and coordination

New isolated page, scoped CSS and vanilla JS. All lessons static; no runtime Markdown or fetching content; no analytics loader/events, storage, forms, authentication, entitlements, billing, email, external scripts or trackers. Marks are opt-in by deliberate button use and live only in page memory; reload, close or bfcache restoration resets marks. No forms collecting private answers. No permanent tracking, not a healing score. Safety links persist. Previous/next, index and direct fragments work without JS. Print uses native browser printing; CSS hides interaction and site chrome, preserves lessons and safety.

Staging robots noindex,nofollow deliberately avoids shared sitemap edits; SEO issue #241 owns final canonical/index inclusion and release-time metadata. No homepage (#250), join, auth, newsletter (#1/#230), billing or analytics changes. PR #252 remains the documentation review. #220 owns cohort and acquisition; no outreach, no advertising, no new schedule. The browser test workflow is isolated to this candidate branch's PR, not a production or recurring automation. No paid dependencies or purchase. Review-only PR must not be merged/deployed without explicit release approval, final indexing decision and coordination.

## Acceptance evidence

Executable browser suite and existing validation are the pre-release evidence. Treat results as pending until the exact candidate workflow succeeds. See Actions run, artifacts and PR checks. Cases mapping:
- A01/A02: direct fragments, no JS, native navigation, full content.
- A03/A04: deliberate toggle/count, independent days, all seven, reset; completion always reachable.
- A05/A06/A07/A08: memory-only, no storage calls/keys and no auth coupling; persistent opt-in/deletion/cross-account features intentionally deferred. Verify reload and bfcache where supported.
- A09/A10: desktop and mobile Chromium, reflow, keyboard/focus, contrast/axe, reduced-motion and offline/blocked-network static content. Physical device / manual assistive technology acceptance remains separate.
- A11/A12: baseline file/fragment links, accessible safety, print PDF contains all seven lesson headings and completion. Production URL checks and human print inspection remain final gates.
- A13/A14: no analytics code or network requests; no event deployment. No new instrumentation to test.
- A15: no gated route or payment to view content; independent authenticated checkout/entitlement acceptance remains owned by Customer Experience QA.
- A16: existing static validation and exact changed-file list.
- A17: founder review/manual mobile/desktop.
- A18: voluntary pilot after approved production release.

Release status: staged, not operationally complete. No launch until editorial founder review, green checks, owner coordination and production/post-release acceptance.
