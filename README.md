# Not Broken Just Burning

Official website and digital platform for the **Not Broken Just Burning** movement.

## Current version

**Version 0.7 — Launch Engineering**

Current deployment:

**https://hansumhunk.github.io/not-broken-just-burning/**

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

There is currently no account system, reflection database, or newsletter backend.

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
sitemap.xml             Current GitHub Pages sitemap
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

## Content system

Current full Stories From the Fire include:

- The Armor We Don't Need Forever
- Boundaries Can Hurt
- One Stone at a Time
- The Shame That Wasn't Mine

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

Newsletter signup remains intentionally inactive until a real subscriber provider, consent flow, unsubscribe process, retention policy, and privacy disclosure are configured and tested.

## Support & Safety

NBJB is educational and reflective. It is not crisis response, diagnosis, treatment, legal representation, or proof of motive / abuse / wrongdoing.

The Support & Safety page includes U.S. routes for:

- 911 for immediate life-threatening danger
- 988 Suicide & Crisis Lifeline
- National Domestic Violence Hotline

These should be periodically rechecked.

## V0.7 launch engineering completed so far

- [x] GitHub Pages deployment active
- [x] Official public contact email
- [x] Official Facebook channel
- [x] Contact page
- [x] Privacy disclosure for public email contact
- [x] Custom 404 page
- [x] `robots.txt`
- [x] `sitemap.xml`
- [x] `.nojekyll`
- [x] automated static-site validator
- [x] GitHub Actions validation workflow
- [x] initial Open Graph metadata on major launch pages

## Remaining before V1.0

- [ ] choose and connect real newsletter provider
- [ ] define subscriber consent / unsubscribe / retention behavior
- [ ] update privacy notice for newsletter provider
- [ ] choose whether to keep GitHub Pages URL or add a custom domain
- [ ] finish canonical URLs and Open Graph metadata across all public pages
- [ ] create a proper raster social-sharing image
- [ ] full desktop / tablet / phone QA
- [ ] keyboard and accessibility review
- [ ] verify every interactive tool with blank, normal, and very long input
- [ ] final private-name / legal-allegation / unpublished-IP audit
- [ ] decide whether to launch with privacy-minimal analytics or no analytics

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
