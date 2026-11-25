# NBJB — “Before You Hit Send” Growth Launch Pack
**Created:** 2026-11-23 | **State:** Candidate only; does not assert production publication.
**Source candidate:** \`before-you-send.html\`, \`js/before-you-send.js\`, \`css/before-you-send.css\`, \`scripts/test_before_you_send.mjs\`. Related acquisition tracker: GitHub #220; customer-experience QA: #115/#205; executive registry: #274.

## Commercial hypothesis
A free, 90-second, nonjudgmental tool that helps a person avoid sending a regrettable message is easier to describe, demonstrate and share than the whole NBJB ecosystem. It gives the visitor actual value *before* asking for a free account, and offers a deeper free Boundary Builder and seven-day public curriculum afterward.

**Acquisition chain:** problem-specific short video or search → useful public tool → optional free membership → member Start Here → genuine repeated benefit → optional premium. No gate on the public tool, no email harvesting, no false scarcity, no clinical claims.

## Exact proposed public URL — ONLY AFTER RELEASE APPROVAL
https://notbrokenjustburning.com/before-you-send.html

## Test and privacy gates
- [ ] New isolated regression tests (4 choices, no user text collection/persistence, no unsafe links, canonical/sitemap wiring) PASS on exact PR head.
- [ ] Existing static-site and SEO CI checks PASS, no broken references or member-auth regression.
- [ ] Founder mobile and desktop review: four results, keyboard-only navigation, visible focus, copy success/fallback, no horizontal scrolling.
- [ ] Real public link and social OG preview tested **after** authorized site deployment. Do not publish a pre-release broken link.
- [ ] Privacy: no message text typed or persisted; reuses the existing anonymous `nbjb_free_membership_cta_clicked` event with the fixed `before_send` placement on the optional free-join link, subject to existing privacy controls. Existing public pageview collection follows site privacy settings. No personalized selections in shared URLs or event properties.
- [ ] Legal and safety wording reviewed by founder, including parenting urgency, legal restrictions, danger, and no-contact obligations.
- [ ] Separate exact-head founder approval for merge/deploy. No unapproved production change.

## First three social experiments — NOT SCHEDULED OR SENT
**Tracking:** Per-channel aggregate tagged landings to the same public tool. No names/reflection text. Use only allowed fixed lowercase/underscore UTM values. Do not interpret missing event data as zero clicks.

### Facebook post — boundary / action first
**Hook:** “You can be furious and still choose what leaves your phone.”

Caption:
A message can be true to your anger and still be wrong for your future. Before you reply, try separating one fact, one necessary topic, and one action you can control. No account required.

I built a free 90-second “Before You Hit Send” tool at Not Broken Just Burning. It gives you a neutral response framework—or permission not to reply at all.

Try it: https://notbrokenjustburning.com/before-you-send.html?utm_source=facebook&utm_medium=organic_social&utm_campaign=before_send_launch&utm_content=boundary_post

#NotBrokenJustBurning #HealthyBoundaries #MensGrowth #EmotionalClarity

### Instagram Reel — pause before reply (30–40s)
**On-screen opening:** “That text you’re about to send? Read this first.”
**Founder voiceover:**
“Being angry doesn’t make you weak. But sending the first thing your anger writes can cost you tomorrow. Ask yourself three things: Is a reply actually required? What fact can I confirm? What action do I control? We built a free tool for that. No account. No private messages uploaded. It takes about 90 seconds. Find ‘Before You Hit Send’ at Not Broken Just Burning.”
**Caption:** “The goal isn’t silence. It’s choosing what you can stand behind tomorrow. Link in bio to the free 90-second message reset. #MensMentalHealth #DivorceRecovery #Boundaries #NotBrokenJustBurning”
**Note:** Do not claim that links in Instagram captions are reliably clickable. Put canonical tool URL in profile link or story link when authorized; independently verify the destination. Use a native Reel, not a duplicate Metricool queue entry.
**Tagged bio URL:** https://notbrokenjustburning.com/before-you-send.html?utm_source=instagram&utm_medium=organic_social&utm_campaign=before_send_launch&utm_content=ig_reel

### Facebook or short vertical video — parent logistics
**Hook:** “If the kids are involved, the message needs a purpose.”
**Founder script:**
“You can disagree with another adult and still keep the child's practical needs first. Confirm the arrangement, ask for the specific detail you need, and don't turn the text into a second argument. Court orders, safety and urgent child needs always come first. Our free ‘Before You Hit Send’ exercise can help you pick a calmer next step.”
**CTA:** https://notbrokenjustburning.com/before-you-send.html?utm_source=facebook&utm_medium=organic_social&utm_campaign=before_send_launch&utm_content=parenting_video
**Tags:** #Fatherhood #Coparenting #MensGrowth #NotBrokenJustBurning

## Source-specific acquisition plan
1. **Native social:** publish *one* founder-approved demonstration of actual tool use per platform; avoid synthetic engagement and repeated identical links in unrelated groups.
2. **Intent-based website discovery:** new page meta/OG/canonical/sitemap, internal links from homepage, resources and divorce recovery. Monitor real Search Console index/performance later; indexing not guaranteed.
3. **Partner distribution:** once the tool is public and tested, optionally offer as a supplemental resource only to partners who invite or approve it. Do not imply endorsement.
4. **Opt-in sharing:** public fixed-link Copy button; no selected personal context attached.
5. **Free-member conversion:** see join CTA as optional step after value; follow aggregate anonymous landing metrics and *verified external* free signups separately. No fabricated visitor→account identity mapping.

## Decision checkpoints
- **Day 0:** Founder checks tool and approves exact release/head; production changes only then.
- **Days 1–7 after deployment:** measure source-tagged visits, new externally verified Free accounts, member onboarding/first lesson if observable, and content feedback. Zero or missing event rows may mean tracking failure; check coverage.
- **Day 14:** compare genuinely observed engagement against founder-only/test traffic. Keep, adapt or retire the campaign based on evidence; don't manufacture additional features if distribution is the bottleneck.

## Guardrails
No new domains, ad spend, Brevo marketing activation, API secrets, Stripe changes, member-data exports, automatic outreach, or unreviewed production merge. This is educational material, not clinical treatment, legal strategy, or a safety-plan substitute.


### Ignition V — privacy correction / release hold
Non-form radio groups, non-submitting button, disabled-by-default controls and visible failure fallback; enable only after handlers attach. Native GET no longer possible via tool UI. Existing source/CI tests extended; exact-head browser results required. Do not deploy until FE01–FE20 disposition and founder exact authorization.
