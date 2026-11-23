# Frontier Engine — Non-production implementation and launch acceptance
Date: 2026-11-23. **Stacked on PR #282**, deliberately not a production branch. Related: #220, #241, #274, #115, #205, #214. Zero new spending.

## Existing inventory and anti-duplication
- Preserve PR #282 `Before You Hit Send`: public no-text-input response framework, link and test suite already staged. It is the first of three tools, not rebuilt.
- Existing signed-in: Boundary Builder, One Stone, Pattern Map, Forge, Check-In and Six Sacred Questions. First Seven Days already addresses chaos, facts, boundaries and rebuilding identity.
- New fatherhood planner is a **short, no-account child-centered repeatable-routine builder**, distinct from existing fatherhood guidance and existing member tools.
- New identity compass is a **limited values-to-observable-action public demonstration**, linked explicitly to existing First Seven Days Day 6; it does not rebuild the deeper course.
- No new Supabase tables, accounts, payments, newsletters, trackers or email systems.

## Selected tool + landing page pairs
| Tool | Search page | Search-intent hypothesis | Differentiation |
|---|---|---|---|
| Before You Hit Send (PR #282) | guide-before-sending-angry-text.html | what to do before sending an angry text | clear practical communication choice without uploading messages |
| Fatherhood Stability Planner | guide-fatherhood-routines-after-separation.html | father routines after separation | small child-centered routine, no personal calendar data |
| Identity Rebuild Compass | guide-rebuilding-identity-after-divorce.html | rebuilding identity after divorce | 2-minute values/action compass, linked to Day 6 |

Search evidence: manual public results review showed published discussion from OurFamilyWizard and Copara for angry co-parenting texts, and AAP/HealthyChildren resources for children's routines after separation; these confirm topic coverage and intent, **not** verified demand volume. Native GSC performance/volume, indexing and actual ranks not obtained during this operation. Existing SEO #241 indicates prior native Search Console verification and processing/gating caveats. Do not invent volume or keyword difficulty.

## Candidate privacy/security requirements
- Two new browser-only scripts accept **only generic radio selections**; no identifying names, free text, storage, fetch, beacons, or selection analytics.
- Sharing copies a fixed canonical URL; never embeds selection or query values.
- Outputs are selectable readonly local textareas. Copy action is voluntary.
- No diagnostic or legal conclusion, child safety/court order caveats remain prominent.
- Existing privacy-conscious public page analytics and homepage/member CTAs are untouched. Never create person-level health/intimacy segments.
- All 3 pages and tools require mobile+keyboard+screen reader and browser clipboard acceptance before merge. Static checks are not browser proof.

## Three not-yet-published distribution packages
**Only use these after exact-head release approval AND successful public URL checks.** Do not duplicate founder's existing native Meta-scheduled posts. Suggested UTM tokens are campaign hypotheses, not proven measured links.

### 1. Before You Hit Send
- FB: "That angry text may be understandable. It still deserves one second of choice. A free tool helps you choose whether to pause, stick to facts or communicate about a practical need. No message upload. Try it: [approved link]."
- IG Reel, 30 seconds: "Before you reply, ask: Is there an urgent responsibility? What do I know for sure? What actually needs addressing? There is a free 90-second message-reset tool on NBJB. No account required. Link in bio after launch."
- Vertical clip: phone face-down, 3 questions on screen, no screenshots of real messages.
- Community: "Free, no-login message-reset exercise for responding deliberately to difficult conversations; general education, not legal or crisis advice."
- Partner: "May be appropriate as a practical supplemental resource for an organization's communication education page, with no member data requirement."
- Example tagged URL after launch: https://notbrokenjustburning.com/before-you-send.html?utm_source=facebook&utm_medium=organic_social&utm_campaign=frontier_engine&utm_content=send_reset

### 2. Fatherhood Stability Planner
- FB: "A child may remember a dependable five minutes more than a grand promise. Here is a free, private routine builder for fathers adjusting to separation. Choose one moment, a child-centered need and a realistic time. [approved link]"
- IG Reel, 30 seconds: "Separation can change your calendar. It doesn't have to erase one steady ritual. Pick the time you can actually give, the child's need, and one action. Try the free Fatherhood Stability Planner after launch."
- Vertical clip: shoes by a doorway, bedtime book or breakfast, close on "What promise can I keep?"
- Community: "An educational, no-account way to choose one age-appropriate, realistic parenting anchor, subject to parenting arrangements and safety."
- Partner: "Family-support and fatherhood programs may link to this free routine-building exercise; no child names or schedules are collected."
- Example tagged URL after launch: https://notbrokenjustburning.com/fatherhood-stability-planner.html?utm_source=facebook&utm_medium=organic_social&utm_campaign=frontier_engine&utm_content=father_routine

### 3. Identity Rebuild Compass
- FB: "When a role changes, your values do not have to disappear with it. Pick one value, one part of your day and five minutes to practice it. Free Identity Rebuild Compass. [approved link]"
- IG Reel, 30 seconds: "Who are you when the job title, relationship or old routine changes? You don't have to answer that for the rest of your life tonight. Choose one value and one small action. Free tool after launch."
- Vertical clip: empty workbench or moving box, then one completed small task; avoid crisis imagery.
- Community: "Free practical values-to-action exercise for adults rebuilding direction after major life change, without labels or scores."
- Partner: "Suitable as an optional low-intensity self-reflection activity paired with existing support, not a substitute for clinical guidance."
- Example tagged URL after launch: https://notbrokenjustburning.com/identity-rebuild-compass.html?utm_source=facebook&utm_medium=organic_social&utm_campaign=frontier_engine&utm_content=identity_compass

## Measurement contract after approval
Use existing verified PostHog pageview coverage to observe aggregate landings, tool page views and existing free-membership CTA interactions when present and privacy-permitted; **new tool selections are not recorded**. Count actual new genuine free accounts separately from anonymous visitor and CTA metrics in authorized aggregate Supabase. Exclude founder/test accounts. Do not claim exact person-level cross-source funnel or paying customers without separate Stripe+entitlement+lesson verification. Need at least URL-specific smoke tests and referrer/UTM parse coverage before claiming attribution.

## Acceptance checklist
- [x] Existing feature/source inventory and #282 preserved
- [x] Three nonduplicative initial choices with two public tool extensions
- [x] Three distinct educational search pages staged
- [x] Navigation, canonical, OG and sitemap staging
- [x] No-paywall static tools and browser-only private choices by source inspection
- [ ] Full exact-head CI run; see Actions
- [ ] Mobile, keyboard, screen-reader and clipboard browser acceptance
- [ ] Founder legal/safety copy review
- [ ] Separate release approval for PR #282 then stacked PR
- [ ] Live indexability/search and actual visitor measurement after deployment
- [ ] Publishing of prepared channel packages (not scheduled or sent)
