# Not Broken Just Burning

Official website and digital platform for the **Not Broken Just Burning** movement.

## Current version

**Version 1.0 — Public Production Baseline**

Primary public domain:

**https://notbrokenjustburning.com/**

Official public channels:

- Email: `notbrokenjustburning@gmail.com`
- Facebook: `https://www.facebook.com/profile.php?id=61575787773619`

## Mission

Not Broken Just Burning is a survivor-led, fire-forged movement born from lived experience and aimed beyond one life.

The founding mission used three verbs: **awaken, guide, protect**.

The current public platform translates those into:

- **Awaken** — increase clarity about what is happening inside and around us.
- **Guide** — offer stories, questions, tools, language, and maps rather than pretending to own somebody else's answers.
- **Protect** — strengthen agency, boundaries, discernment, dignity, and routes to appropriate real-world support.

A recurring NBJB idea is **pain into power**. The site keeps that grounded: suffering is not automatically useful or noble. The work is deciding what can be learned, reclaimed, built, or carried forward without allowing pain to become identity.

## Technology

The public site intentionally remains lightweight:

- HTML
- CSS
- vanilla JavaScript
- SVG brand assets
- GitHub Pages
- GitHub Actions validation
- PostHog cookieless aggregate web analytics

There is currently no account system, reflection database, or newsletter backend. Basic public-site traffic is measured with privacy-conscious cookieless analytics; reflection-tool contents remain browser-only.

## Public architecture

```text
index.html              Home / platform gateway
path.html               Six-stage actionable Flamewalker Path
forge.html              Thought reflection tool
fire.html               Stories From the Fire library
movement.html           Mission, values, symbolism, founder, future vision
resources.html          Free tools and resources hub
pattern-map.html        Pattern / evidence / inference mapping tool
check-in.html           Daily Flame Check-In
join.html               Participation / Join the Movement
contact.html            Official email and social contact routes
support.html            Crisis, domestic-violence, and safety routing
privacy.html            Plain-language privacy and data-use notice
404.html                Custom not-found page
story-armor.html        Full reflection
story-boundaries.html   Full reflection
story-one-stone.html    Full reflection
story-shame.html        Shame / accountability reflection
CNAME                   Custom GitHub Pages domain
sitemap.xml             Custom-domain sitemap
robots.txt              Crawl policy and sitemap location
BRAND.md                Brand language and publishing boundaries
ENGAGEMENT.md           Contact, subscriber, safety, and privacy architecture
scripts/validate_site.py Static-site validation
.github/workflows/validate-site.yml Automated validation on site changes
```

## Brand system

The Eye + Flame identity uses:

- **Eye** — witness, memory, accountability, discernment
- **Flame** — transformation and surviving energy
- **Triangle** — structure, discipline, direction
- **Radiance** — clarity carried outward

Primary phrase:

**See clearly. Burn clean. Build deliberately.**

### Guardian Code

- Trust
- Honor
- Respect
- Honesty
- Loyalty

These are behavioral filters, not demands for obedience.

### Flamewalker

A Flamewalker is the movement identity for a person doing the work of reclamation. It is not a rank, diagnosis, religion, certification, or membership requirement.

### Guardian

Guardian remains a future service / leadership identity. The public site must not imply that formal Guardian training, certification, paid mentorship, or professional services exist until they actually do.

## The Path

1. Fire Reclamation
2. The Guardian's Path
3. Sacred Mirror Work
4. Masculine Restoration
5. Voice of Fire
6. Circle of the Flame

The Path is a map, not a hierarchy.

Sacred Mirror Work explicitly includes **shame versus accountability**, including the distinction between learning from choices or trauma responses and converting them into a verdict about personal worth.

## Free reflection tools

### Flame Check-In

A quick snapshot of body, emotion, thought, boundary, need, and next action.

### The Forge

Separates fact from assumption, examines evidence for and against a thought, maps patterns, and rewrites the thought more accurately.

### Pattern Map

Separates repetition, context, verifiable evidence, differences, and inference. It explicitly warns that repetition alone does not prove motive, intent, or cause.

### Boundary Builder

Turns a vague sense that something is wrong into behavior, impact, boundary, and an action the user controls.

### One Stone Planner

Breaks an overwhelming mountain into one realistic next action and what can intentionally wait.

**Privacy design:** Current reflection entries remain in the visitor's browser session and are not submitted to an NBJB server.

## Masculine Restoration production track

Masculine Restoration is the men-first Stage 04 rebuilding system within the Flamewalker Path. The current public release includes:

- a six-anchor operating system: Steadiness, Direction, Strength, Protection, Responsibility, and Brotherhood
- the first full anchor module, **Steadiness**, with an on-device audit
- a specialized **Institutional Betrayal** branch
- **The Placeholder Wound**, an eight-lesson relationship-rebuilding track covering unequal commitment, hindsight, fatherhood, loyalty, grief, comparison, and self-respect
- cross-links into existing NBJB reflection tools and related Stories From the Fire

The material is educational and de-identified. Lived experience can generate public lessons without turning assumptions about another person's motives into established facts.

See `MASCULINE_RESTORATION.md` for the current architecture and publishing rules.

The architecture file is a public publishing reference; unreleased member layers, deeper modules, workshops, and future services remain roadmap material until deliberately launched.

## Content system

The public Stories From the Fire library is maintained in `fire.html` and now includes dozens of full reflections rather than a four-story launch sample.

The content model is:

**read → recognize → reflect → use a tool → choose an action → return**

Private journals may inspire public reflections, but names, private case details, legal allegations, medical records, therapy records, and sensitive third-party information are removed unless there is a deliberate and appropriate reason to publish them.

## Founding vision versus current offering

Early NBJB descriptions imagined a larger ecosystem including digital storytelling, guided journaling, workbooks, coaching, ceremonies, community spaces, an in-person sanctuary, circles, retreats, tarot, energy readings, and other spiritual exploration.

Those ideas are historical or future vision unless deliberately launched.

**Do not present an imagined program as a current service.**

This matters especially where an offering could be mistaken for licensed mental-health treatment, crisis care, medical care, legal services, or another regulated profession.

## Engagement and contact

Current engagement includes:

- Join the Movement
- optional browser-only Flamewalker commitment
- official public Gmail inbox
- official Facebook page
- permanent Contact / Support / Privacy routes

Emailing NBJB once does **not** count as consent to receive marketing or newsletter messages.

Newsletter signup is intentionally deferred until after V1.0. A future release can add a real subscriber provider, explicit consent, unsubscribe controls, retention/deletion rules, and an updated privacy notice without delaying the initial public launch.

## Privacy-conscious analytics

NBJB uses PostHog only for basic aggregate website measurement: daily visitors, pageviews, sessions, page popularity, and ordinary traffic-source information. The implementation is intentionally narrower than a default product-analytics install.

Production analytics are configured to:

- use PostHog cookieless mode with stateless server hashing
- discard raw client IP data
- create no identified person profiles
- disable interaction/click autocapture
- disable session replay
- disable heatmaps
- disable automatic JavaScript exception capture
- disable console-log and performance/network capture at the project level
- honor browser Global Privacy Control and Do Not Track signals by not loading analytics
- run only on the production NBJB hostname, not local or branch previews

The Forge, Flame Check-In, Pattern Map, Boundary Builder, One Stone, and other reflection fields remain browser-only. Their typed contents are not analytics events.

The purpose is editorial feedback, not surveillance: learn which public pages people use, which material is ignored, and how overall reach changes over time.

## Support & Safety

NBJB is educational and reflective. It is not crisis response, diagnosis, treatment, legal representation, or proof of motive / abuse / wrongdoing.

The Support & Safety page includes U.S. routes for:

- 911 for immediate life-threatening danger
- 988 Suicide & Crisis Lifeline
- National Domestic Violence Hotline

These should be periodically rechecked.

## V1.0 production baseline

- [x] GitHub Pages deployment active
- [x] Custom domain attached to the repository
- [x] `CNAME` set to `notbrokenjustburning.com`
- [x] `sitemap.xml` moved to the custom domain
- [x] `robots.txt` points to the custom-domain sitemap
- [x] Official public contact email
- [x] Official Facebook channel
- [x] Contact page
- [x] Privacy disclosure for public email contact
- [x] Custom 404 page
- [x] `.nojekyll`
- [x] automated static-site validator
- [x] GitHub Actions validation workflow
- [x] static canonical, Open Graph, and Twitter/X sharing metadata across indexable public pages
- [x] search-intent optimization on core public entry pages
- [x] visible founder authorship disclosure on long-form article pages
- [x] runtime WebSite / Organization / ProfilePage / Article / BreadcrumbList structured data
- [x] `main` protected by an active branch ruleset requiring pull requests and the `validate` status check
- [x] newsletter removed from the V1.0 critical path
- [x] privacy-conscious cookieless aggregate analytics with no reflection-content capture

## V1.0 external / account-level checks

The repository-side production handoff is complete. The remaining checks require GitHub or search-platform account settings rather than public-site code:

- [ ] confirm the GitHub Pages DNS check reports success for `notbrokenjustburning.com`
- [ ] enable **Enforce HTTPS** in GitHub Pages when the setting is available
- [ ] verify `notbrokenjustburning.com` in Google Search Console and submit `https://notbrokenjustburning.com/sitemap.xml`

These are operational controls, not missing public-page features.

## Post-launch backlog

- monitor Google Search Console indexing/crawl reports after verification and sitemap submission
- real newsletter/subscriber infrastructure with consent and unsubscribe controls
- expanded Stories From the Fire
- future Library / books / guides / courses when deliberately released
- future events, community, or service offerings only when they actually exist

## Publishing guardrails

Project storage may contain books, manuscripts, curricula, paid resources, private journals, therapy material, correspondence, legal material, merchandise ideas, and other sensitive or commercial IP.

**Do not publish source material merely because it exists.**

Public content should:

- avoid identifying private third parties without a deliberate editorial/legal reason
- avoid turning private legal or therapy records into public case files
- adapt personal lessons into universal, useful concepts where appropriate
- keep unpublished books, curricula, and commercial materials private until deliberately released
- label survivor-originated psychological or neurocognitive models accurately
- avoid presenting spiritual interpretations as established scientific fact
- keep clear scope and safety boundaries on mental-health-adjacent tools
