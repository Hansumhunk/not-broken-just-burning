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

Safety and source accuracy: accepted copy explicitly covers scope, no forced disclosure, monitored devices, appropriate urgent support, not requiring confrontation, court/caregiving constraints, non-diagnostic emotional practice and neutral optional membership. All links in the accepted curriculum were resolved against the pinned main tree; public companion routes are unchanged. Working tools remain signed-in free-account features. No material editorial change required; renderer retains accepted copy, converting links to equivalent relative routes. Display additions are navigation, marks guidance, visible practiced status, a brief repeated scope statement, hero and generic CTA labels only. Normalized learner body parity independently checked for all nine sections, with no differences.

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

Initial full-page browser run 44545418281 stopped at a case-sensitive test assertion on a CSS-uppercase day label; corrected to compare DOM text, no learner-copy or UI change. Subsequent tests use the available runner Chrome first and capture initial screenshots before assertions. Latest exact-SHA run is authoritative; the former failure is not a pass. Local exact-JS component fixture (Git blob 935963430ae5bf46fa84b29878f817d3c06711d2) passed all seven toggles, visible marks, clear/focus, fresh document reset, synthetic bfcache event reset, no external requests and JS-disabled control hiding. Local HTTP/file navigation blocked by browser policy, so full-page evidence remains the isolated Actions run.

## Directive 002-B — final release preparation (2026-11-19)

Founder directive accepts curriculum, overlap review, prior six-file implementation, static #904, browser #3 and review artifact; accepted body retained byte-for-byte. Synchronized branch with main bf3cd4ac0d7ed9ff93746b04c4608b8fb030af32. Release-only candidate adds one sitemap URL and matching index,follow/self-canonical/social metadata under explicit command preparation; SEO coordination request #241 comment 7012753637 is posted, owner concurrence and explicit merge authorization remain required. No change to existing sitemap entries, SEO scripts, robots, analytics, auth, billing or homepage. Sitemap URL and metadata must release atomically; no public promotion before live acceptance.

Independent visual inspection of prior screenshot and all 18 print page renders: desktop and lesson layouts readable, narrow header too tall, last page contained only closing lines. Scoped CSS compacts mobile navigation into responsive grid and tightens print spacing without changing content or reducing the 10.5pt print body size. Exact new screenshots/PDF require visual readback. Candidate CI tests mobile touch emulation, reflow, keyboard, no-JS, axe, print and existing production routes; real physical device and human screen-reader verification cannot be substituted by emulation.

### Release sequence (do not execute without authorization)
1. Confirm owner concurrence under #241, review exact candidate artifact and record physical device/manual AT tests, verify final SHA zero commits behind current main and required checks all green; if main changes, synchronize and rerun. Founder expressly approves PR #254 merge and deploy as a single destination + sitemap release. Preserve #252 as accepted source record; no requirement to merge it to publish content already present in #254.
2. Merge only #254 using GitHub permitted method, record actual merge SHA, confirm Pages deployment completion at that revision. Do not assume branch success equals live delivery.
3. Clean signed-out desktop and phone: GET https://notbrokenjustburning.com/first-seven-days.html, all seven direct anchors, previous/next, no-JS access, optional marks and reload reset. Verify exact published HTML/CSS/JS against release commit, accessible safety/print, 200 HTML at canonical path, matching canonical/OG, index,follow and absence of restrictive X-Robots-Tag; sitemap includes it once, robots permits it, production resource links stay reachable; no analytics/auth/paywall/private-data changes. Use existing SEO production probe and exact-file checks; native GSC URL inspection after live route verified, not a promise of indexing. Record live results in #254/#241.
4. Only after successful destination acceptance, Front Door owner #250 can stage/update link from placeholder to verified live URL, sync and test homepage/join and obtain separate founder release approval. No link to nonexistent target. Newsletter #1/#230 remains gated; include link only in established consent-based sequence after approved release, no new sends. #220 owns voluntary pilot and P0 acceptance; existing cadence only.

### Rollback
- Before merge: leave draft, no production effect. After merge, freeze distribution and record failing symptom + exact SHA. If homepage link has been activated, Front Door owner reverts/holds that link first; if newsletter not yet sent, hold queued references. Use GitHub revert of only #254's shipped change (and if necessary #250 link change, separately). For merge commit use git revert -m 1 <actual-merge-SHA> on a new rollback branch; squash commit use git revert <actual-squash-SHA>; if linear multi-commit merge identify exact commits or restore only #254 paths and remove its single sitemap entry. Never force push or restore whole stale tree. Require founder emergency rollback authorization, review static checks, deploy, verify sitemap entry removed and no advertised broken route, unchanged membership and remaining pages. If page must remain accessible during rollback, owner-approved temporary correction/noindex + sitemap removal can precede removal; do not leave indexable orphan or broken CTA. Do not touch unrelated concurrent releases.

### Owner-only manual acceptance record
- Physical phone (iOS Safari or Android Chrome): open from approved local/staged preview, 7 anchors, touch next/back, mark/unmark/clear, rotate, 200% text, no clipping, safety/free links; record model/OS/browser and pass/fail. Desktop real browser keyboard Tab, Shift+Tab, Enter/Space, screen reader (NVDA/VoiceOver/TalkBack): landmarks, headings, practice button state/count announcements, focus, no private reflection fields. Print on paper or actual OS print preview: Letter/A4, all headings/exercises/closing readable; no clipping. Record physical evidence or explicitly approve a documented exception. No manufactured device evidence.
- Pilot #220 only following release and P0 eligibility: existing voluntary cohort target, anonymous aggregate count of completed useful actions and optional questions about clarity, ease, barriers; do not solicit private reflections, use unsolicited messages, collect account identifiers or change analytics. Existing 10 voluntary testers / 5 first actions / 3 voluntary feedback objectives remain proposals, not forecasts.

Release preparation run #4 passed candidate browser acceptance, mobile touch emulation, 0 desktop/mobile axe violations and 17-page print completeness. Its new production baseline probe failed at an overescaped title/H1 regex despite HTTP 200 for the initial page. Replaced those assertions with HTMLParser title/H1 extraction; rerun both workflows on the corrected exact head. Treat production route verification as pending until the new run passes. No shipped page change from this test repair.
