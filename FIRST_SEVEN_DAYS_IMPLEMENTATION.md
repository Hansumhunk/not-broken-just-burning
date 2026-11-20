# The First Seven Days — implementation and release specification

Version 1.0 | November 19, 2026 | Status: content complete, implementation proposed, founder approval required | Related: #220

## 1. Mission and boundaries

Deliver a free, original, seven-session orientation that provides a concrete first action before signup or purchase. Audience: men under relationship, fatherhood, work, identity or life pressure; others welcome. No prior NBJB vocabulary. Not therapy, diagnosis, legal guidance, crisis intervention or promise of improvement. The canonical consumer copy is [FIRST_SEVEN_DAYS_CURRICULUM.md](FIRST_SEVEN_DAYS_CURRICULUM.md). Do not assemble a teaser from protected lesson manuscripts.

Issue #220 owns the external member acquisition experiment, including the existing Nov 20–24 tagged posts, voluntary feedback cohort and the three-part independent paid customer verification. This package implements its proposed focused front door in content only. No new app, parallel campaign, ad spend, outreach, automated emails, H.A.W.K. promises, authentication changes, billing changes or deployment in this PR. Do not close #220 when the curriculum ships.

## 2. Journey and information architecture

Recommended initial release: one public static page, proposed route /first-seven-days.html, rendered from the approved learner copy, with a contents list and anchors #welcome, #day-1 through #day-7, #complete. Each section must have a unique heading, time estimate, lesson, practice with fictional example, three reflection questions, one achievable action, two-minute option, optional resource, and observable completion objective. All seven accessible in one visit; no date gates, countdown, lock, forced streak or required writing. One page is a deliberate simplification for static hosting, mobile reading and deep links. No changes to homepage, auth or newsletter in this operation.

On arrival: use the following proposed hero copy:
- Eyebrow: Free guided experience
- H1: The First Seven Days: From Chaos to Clarity
- Description: Seven short lessons for when life feels overwhelming. Sort what is happening, choose your next action, and begin building direction again. No account or payment required.
- Primary: Start Day 1 → #day-1
- Secondary: See all seven days → #journey
- Persistent, non-disruptive text link: Support & Safety → support.html
- Below hero: introductory copy, pacing guidance, privacy note and safety routing from curriculum.

Reading order: lesson first, then practice, reflection, action, resource, completion. On mobile do not place conversion CTAs above core exercises. Show simple "Day X of 7" text and next/previous links (first back to welcome, last next to completion). No automatic scroll or forced transition; return to day index is always available. Print styles should preserve every exercise without nav/CTA clutter; optionally offer browser print. No PDF download CTA until actual accessible PDF exists.

Day completion is self-assessed, never inferred from time, writing, pageview or a support click. The two-minute option counts equally. Optional skip leaves a day incomplete and allows continuing. Show "Reviewed/practiced X of 7" (not healing %, mental-health score, mastery or certification). When a learner visits completion with fewer marks, show "You can revisit any day"; do not require seven marks to access free plan or completion copy. All content remains accessible if JavaScript fails. No form is needed: exercises can be done mentally or on a safe personal note. Do not implement a new reflection archive or create duplicate tools.

## 3. Resource and scope map

Each public companion below was read on main and present in sitemap.xml. The optional resource must precede any account invitation, but must never gate completion. Public intros to interactive tools are readable without authentication. Interactive worksheets live in the existing free member workspace; do not link as though public guests can complete or save them directly. Verify production reachability and current membership gating before release.

| Day | New practice/output | Existing public companion | Optional depth after the free experience |
|---|---|---|---|
| 1 | Three-bucket pressure map | /check-in.html | Free Flame Check-In; later emotional command track |
| 2 | Four-line field note | /lesson-clarity-before-certainty.html | Free Forge; later Trusted Help & Clarity |
| 3 | Control budget | /six-sacred-questions.html | Free Six Sacred Questions; later Rebuilding Life |
| 4 | Low-risk boundary rehearsal | /lesson-boundaries-are-actions.html | Free Boundary Builder via existing lesson link; later Relationship Clarity |
| 5 | Signal-to-choice rehearsal | /path-masculine-restoration-steadiness.html | Emotional Command track |
| 6 | Role-to-value bridge | /lesson-other-person-not-your-measure.html | Inherited Manhood / Relationship Clarity |
| 7 | Next-mission card | /story-one-stone.html | Free One Stone via existing story; later Rebuilding Life |

The public Start Here member lesson already covers facts/feelings/control and orientation. Do not replace it or count this experience as seven protected lesson unlocks. The difference: Start Here introduces the member experience; this seven-day product creates a paced, sequential, no-login practice with seven original artifacts, an independently useful mission and optional return to existing tools. No manual transcription of paid worksheets. Premium references above are track-level navigation only; no premium bodies, workbook content or unverified audio/community benefits.

## 4. Completion and ethical membership transition

At completion present the complete seven-item reminder, next-mission review and free next steps from consumer copy. The free primary button is "Keep exploring free resources" → /path.html; secondary "Create a free Flamewalker account" → /join.html. For a known authenticated member, the optional existing hub route is /members.html; do not initialize new auth just to personalize this page. For a guest, default to the public routes. An optional lower-priority "Explore Flamewalker+" → /flamewalker-plus.html leads to public preview and existing membership flow. Link the existing terms and privacy pages through existing footer. Do not embed checkout, require a card, interrupt exercises, or insert a pop-up/paywall. No discounts, urgency, false scarcity, guilt, recovery promises, or signup as a condition of finishing.

Offer at drafting: 44 published written lessons plus guided workbooks, six tracks; README and member-lessons.html show $14.99/month or $149/year. Public preview says enrollment available in secure member area. Do not hardcode prices or lesson counts in UI unless product owner verifies them immediately before release; prefer canonical existing preview for changing details. Videos/live services not included. Existing paid members should see neutral copy, not a message asking them to repurchase. Any account upsell is optional, not clinical recommendation. No automatic enrollment into newsletter or marketing.

## 5. Progress, data and shared-device behavior

Recommended minimal V1: public content always works without persistence. If founder accepts optional progress tracking, offer explicit opt-in "Remember my day marks on this device" with clear notice: same browser profile only; anyone using it may see marks; no cloud sync. No reflection text boxes, no freeform notes, no personal identifiers, no content from other NBJB tools, no collection of distress ratings. Default in-memory only, no storage read/write before opt-in (except an existing deliberate preference may be read on return). Avoid persisting timestamps or topics beyond day numbers. Proposed browser storage key nbjb.first-seven-days.v1, value {"version":1,"completed":[1,3],"remember":true}; integer unique days 1–7 only; strictly validate and discard malformed/unknown schema. No user ID or association to member identity. Explicit "Clear day marks on this device" with confirmation, removes only that key and resets current session; turning remember off removes the key. No auto-merge on sign-in, no retry draft, no cross-device claims. If storage unavailable, usable in-memory controls plus plain explanation. Guest device marks are NOT account-specific; on a shared device use memory-only or clear. If existing browser/account privacy QA indicates risk, launch without persistence, not a weaker workaround.

Private exercises never sent to Supabase, PostHog, email, logs, URL query, clipboard automatically or third parties. Do not attach free journey to the paid progress key, server entitlement checks or existing My Work archive. A future authenticated progress feature needs separate scoped review and account-switch/delete/export tests.

## 6. Privacy-respecting measurement (proposal, not enabled here)

Use existing anonymous pageviews/UTM landing counts first. Only after measurement approval and policy/validator alignment add minimal allowlisted anonymous events, honoring GPC/DNT, analytics availability and opt-out. No person identification, session replay, autocapture, distress/reflection properties, email, user IDs, device IDs, private input or CRM joining.

Proposed events: nbjb_first_seven_started (deliberate Start Day 1 click); nbjb_first_seven_day_practiced (explicit mark, property day integer 1–7); nbjb_first_seven_finished (explicit completion action after seven marks; avoid duplicate firing within page session); nbjb_first_seven_free_cta_clicked; nbjb_first_seven_plus_preview_clicked. No skip events or safety-link click events. No events merely opening a day. These are counts of events, not unique people or proof of actions done. If instrumentation cannot meet current policy, omit it and use anonymous pageviews and voluntary aggregate feedback only.

Coordinate owner of #220: existing campaign unchanged; later, approved link variant can use utm_campaign=flamewalker_first10, utm_content=first_seven_days, source and medium corresponding to an actual authorized channel. Keep inbound tags on aggregate landing measurement only; do not propagate arbitrary parameters to other routes or send identifying data. Follow ANALYTICS.md change-control requirements (policy, privacy.html, README, static guardrails) in separately approved integration PR. Never infer precise individual conversion across anonymous traffic and account counts.

Report separately: tagged page landings; start events; Day 1 practiced marks; completion events; free-account and preview intent clicks; aggregate registrations (existing weekly review); independently verified live paying customers with protected lesson access. The cohort target proposed in #220 is 10 voluntary testers, 5 first useful actions, 3 feedback responses; these are learning targets, not forecasts or sales guarantees. No new charge or fake conversion. Small samples are directional only. No collection of private case details or reflection responses for feedback. Suggested voluntary questions: Was the first action realistic? Was anything difficult to understand? What would make it easier to return? A learner may decline.

## 7. Engineering and acceptance checklist

The documentation PR does not implement or run browser tests. The following are testable acceptance cases to execute in future scoped implementation using fictional fixtures only.

| ID | Scenario | Expected |
|---|---|---|
| A01 | Signed out / no account / no JS | All lessons, exercises, safety and completion text reachable; no paywall or hidden content |
| A02 | Direct #day-4 link; reload; back/forward | Correct visible heading, native navigation and no forced scroll; prior/next links work |
| A03 | Mark one day; repeat click/revisit; skip another | Count unique deliberate marks only; no automatic completion; skip can be revisited |
| A04 | Mark all 7 and clear | Accurate 7/7 practice count; completion copy remains accessible at all counts; clearing only target key |
| A05 | Default no opt-in; reload | No persisted marks; no reflections stored or uploaded |
| A06 | Opt in, mark days, reload, disable | Same browser restores valid day set; disable/clear removes key; no account association |
| A07 | Corrupt storage / blocked storage / private mode | Safe fallback, no page crash or misleading save claim |
| A08 | Shared browser, sign in/out/switch | No sensitive input; no transfer to account progress/My Work; guest mark limitation clearly disclosed; account-specific data untouched |
| A09 | 320px viewport, 200% zoom, 400% reflow, keyboard and screen reader | No horizontal overflow, clipped text, focus loss, inaccessible nav; headings/landmarks semantic, skip link, contrast, visible focus, status live region only for count |
| A10 | Reduced-motion, no custom font, slow/offline load | Content stays legible, no animation dependency; no false online/offline/save promise |
| A11 | Every public companion link; signed-out and signed-in paths | Correct page; working tools clearly free-account only; no unaccepted H.A.W.K. routes; return path usable |
| A12 | Safety and privacy links, print | Safety route available from every section; printed text readable, no missing exercise; no unsolicited crisis screening or automated escalation |
| A13 | GPC/DNT enabled, blocker, disabled analytics | No new event transmission; reading and practice unaffected |
| A14 | Anonymous events enabled on approved production host | Allowlisted event names/properties only; inspect network to verify no PII/reflection data; no duplicate completion in page session |
| A15 | Free / existing paid member checks | Same free value; optional direct public preview; no automatic billing, equal completion, no protected material leakage |
| A16 | Static validator/build / relative links / protected asset scan | CI passes on branch; no changes in production auth, homepage, newsletter, billing or existing tools; no protected lesson body in public page |
| A17 | Founder reads each lesson on mobile and desktop | All examples fictional, content non-diagnostic, non-adversarial, actionable, no required disclosure; approves copy and CTA hierarchy |
| A18 | Pilot after approved release | Consent-based cohort, optional feedback, first-action usefulness, no private notes collected; issue #220 updated with separate counts |

Minimum design: readable text at default browser settings, line length about 65–75 characters, adequate spacing, high contrast, native buttons/links, labeled controls, large tap targets, no image-only instructions. Respect reduced motion. Avoid overwhelming stacks of CTA cards; one clear primary action per section. Existing brand styles only. Validate crisis resource routing in release owner’s review; don't treat this content as personal safety planning. Optional print does not claim safe retention on monitored device.

## 8. Source and originality register (internal)

Project IP:
- Not_Broken_Just_Burning_Master_Strategy.pdf, sections I and V: founding mission, values, six questions, fire/warrior motifs. Used values and orientation, not spiritual proof claims.
- Sacred_Movement_Beginner_Curriculum_NBJB.docx, pillars 1–6: Fire Reclamation, Guardian’s Path, Sacred Mirror Work, Masculine Restoration, Voice of Fire, Circle of the Flame. Used sequencing themes rather than rituals, original homework or extended lessons.
- Sacred_Movement_Foundation_Plan_RickeyPartin.pdf, Movement Vision and Core Values: dignity, clarity, supportive environment. Used conceptual framing; no clinical claims.
- Project operating instructions: Chaos → Clarity → Agency → Action → Integration; men-first/humans welcome, agency, safety, accountability, ethics. Primary editorial constraint.

Google Drive educational sources directly read:
- [Masculine Restoration — Foundation Architecture v0.1](https://docs.google.com/document/d/11xxY0lAFHikqSVy6RVMfRDXZNt8OjSc2vu7-nBsQDds/edit): purpose, behavioral masculinity, core standard, restoration sequence, early module map. Used Day 3, 5, 6, 7 and course-level arc.
- [The Other Person Is Not Your Measure — Rebuilding Self-Worth](https://docs.google.com/document/d/1kmwueb9KlGiF9BUz71Ep9XR9k2WgxTbCV_k9ECM73p4/edit): role/approval distinction and conduct. Used thematic grounding; Day 6 new role-to-value exercise, public existing lesson companion.
- Construct Dictionary & Stage Boundaries v0.1: inspected as an exclusion/scope check; theoretical constructs are not presented to introductory learners as established clinical findings. No private founder case, research hypotheses, names, journals, diagnostics or evidence reused.
- A search result titled Boundaries, Agency & Rebuilding returned an invalid-argument error on native document read; not relied on. Public boundary lesson was actually inspected instead. Drive discovery also did not establish an existing completed seven-day product; limited targeted search, not exhaustive duplicate audit.

Repository main directly inspected:
- sitemap.xml and git tree — mapped public resource routes and checked no existing first-seven filename in main.
- check-in.html, six-sacred-questions.html, forge.html, lesson-clarity-before-certainty.html, lesson-boundaries-are-actions.html, path-masculine-restoration-steadiness.html, lesson-other-person-not-your-measure.html, story-one-stone.html, support.html — public companions and scope.
- member-start-here.html, member-tools.html, member-workshop.html, members.html, join.html, member-lessons.html, flamewalker-plus.html, README.md — existing access, overlap, current offer.
- FLAMEWALKER_ACCESS.md, MEMBERSHIP_QA_2026-11-18.md, ANALYTICS.md, js/member-learning-progress.js — privacy, progress isolation and QA. Access/README contain historical free-launch language about checkout; use current dated offer/preview for membership availability. Independent customer verification remains distinct.
- #220 and comments (Nov 18, Nov 19): campaign, activation dependencies, focused front-door proposal, ethics and pilot targets. This PR is the content deliverable; no claim of customer acquisition.

Originality check: new three-bucket map, four-line field note (feeling and unknown, not the existing Forge workflow), control budget, boundary rehearsal, signal-choice rehearsal, role-to-value bridge, and next-mission card are newly written lightweight practices with different examples, instructions and completion points. Conceptual overlap is intentional because these introduce NBJB's principles. No full free/premium lesson copied, no premium manuscripts accessed to manufacture an unlock. Full side-by-side protected curriculum comparison was not conducted; before publishing, authorized editorial owner should check the seven practices against the protected workbook inventory. No private founder dossier or journal used.

## 9. Implementation handoff and decisions

1. Founder approves all learner copy, no-account design, self-paced (not locked) format, 10–15 minute target, two-minute options, and noncommercial completion screen with optional paid preview.
2. Engineering owner creates scoped static page PR using existing CSS and navigation; agrees optional progress choice (recommended default memory only) and prints; no wider production routing changes.
3. Growth owner confirms placement within #220. For any new homepage, auth/dashboard or newsletter links, request separate approval and keep their implementation owned by existing workstreams. Public link can be manually shared only after release approval. Do not alter scheduled posts without coordination.
4. Safety/editorial owner checks public resource availability, support copy, versioned offer, overlap and all seven deliverables. Developer executes A01–A16, founder completes A17; growth owner executes A18 after authorized release.
5. Reuse established CI, independent member signup and protected lesson acceptance, #214 billing reconciliation, #160 security as relevant for paid conversion. Do not make paid outcomes an acceptance criterion for the free lessons themselves; avoid scaled paid acquisition until respective blockers are resolved.

**Release recommendation:** approve content for founder/editorial review now; do not merge or deploy in this documentation operation. Free content can proceed independently of billing if payment CTA is withheld until currently appropriate and its own safety/accessibility/privacy gates pass. Launch readiness remains unverified until scoped implementation and acceptance. No customer data, production code, infrastructure or scheduled messages changed by this operation.
