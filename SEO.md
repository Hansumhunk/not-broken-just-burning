# Not Broken Just Burning — SEO Roadmap

## Purpose

SEO should help people who are already searching for language around trauma, abuse, betrayal, rebuilding, fatherhood under pressure, shame, boundaries, discernment, identity, and practical reflection discover useful NBJB material. NBJB is men-first, so search planning should intentionally include the language men use when trying to understand harm, isolation, loss of direction, and major life disruption without turning that focus into gender warfare or outrage marketing.

The goal is **relevance and clarity**, not keyword stuffing, diagnosis claims, or pretending survivor-originated frameworks are established clinical treatment.

## Current technical foundation

Current production foundation on `main`:

- custom domain: `https://notbrokenjustburning.com/`
- `robots.txt` allows crawling and points to the sitemap
- `sitemap.xml` lists public indexable pages
- canonical URLs use the permanent domain
- major pages use unique title and description metadata
- major pages use Open Graph metadata
- public deep-dive pages use one clear H1 and semantic article/page structure
- internal links connect Path stages, Guardian Code values, Six Sacred Questions, Fire reflections, Lessons, Resources, Founder, and Support
- Phase Two/member workspace pages remain off `main` and outside the public sitemap
- `main` is protected by an active branch ruleset requiring pull requests and the `validate` status check

## Search-intent map

### Homepage / movement discovery

Primary themes:

- men rebuilding after abuse or controlling relationships
- survivor-led personal growth
- rebuilding after trauma and major life disruption
- emotional rebuilding after betrayal
- fatherhood under pressure
- identity loss, isolation, and rebuilding direction
- reflection after difficult experiences
- clarity, boundaries, agency, voice, and purpose

Primary pages:

- `/`
- `/movement.html`
- `/founder.html`

### Flamewalker Path

Search themes:

- rebuilding identity after trauma
- setting boundaries after betrayal
- shame and accountability
- finding your voice after difficult experiences
- reconnecting after isolation
- healthy masculinity and emotional responsibility

Primary pages:

- `/path.html`
- six Path deep-dive pages

### Reflection tools

Search themes:

- emotional check-in worksheet
- thought examination tool
- fact vs assumption exercise
- pattern recognition vs evidence
- how to write a boundary
- break overwhelm into small steps

Primary pages:

- `/resources.html`
- `/check-in.html`
- `/forge.html`
- `/pattern-map.html`

### Guardian Code

Search themes:

- rebuilding trust after betrayal
- honor and integrity under pressure
- respect and boundaries
- honesty without cruelty
- healthy loyalty vs self-abandonment

Primary pages:

- `/movement.html`
- five Guardian Code deep dives

### Six Sacred Questions

Search themes:

- how to think clearly when emotional
- separate facts from assumptions
- build a timeline of events
- context changes meaning
- motive vs evidence
- cause vs intent
- turn analysis into action

Primary pages:

- `/movement.html`
- `/question-who.html`
- `/question-what.html`
- `/question-when.html`
- `/question-where.html`
- `/question-why.html`
- `/question-how.html`

### Stories and journal-derived lessons

Search themes:

- shame after trauma
- hypervigilance after difficult experiences
- boundaries can feel lonely
- carrying everyone else's problems
- hope after emotional collapse
- fear vs evidence
- finding identity after survival
- strength as restraint
- gratitude while grieving

Primary pages:

- `/fire.html`
- `/lessons.html`
- individual `story-*.html` pages

## Editorial SEO rules

1. Write for the human question first. Keywords follow naturally.
2. One clear H1 per public page.
3. Use descriptive H2/H3 headings that explain the page rather than vague inspirational headings alone.
4. Every public deep-dive page should link to at least one related framework/tool and back to its parent hub.
5. Avoid duplicating the same article under different titles.
6. Do not make medical, legal, scientific, or treatment claims that the content cannot support.
7. Survivor-originated frameworks should remain clearly identified as NBJB concepts.
8. Do not expose private legal/family material for search traffic.
9. Titles and descriptions should be unique and accurately match visible page content.
10. Do not add pages merely to capture keywords. A page should teach something useful.

## V1.0 production handoff

Repository-side SEO wiring is complete for the V1.0 static site:

- custom-domain canonical URLs on every indexable HTML page
- unique page titles and descriptions, with remaining length notices treated as editorial polish rather than crawl defects
- static Open Graph title, description, URL, and shared 1200×630 image metadata on every indexable page
- large Twitter/X card metadata on every indexable page
- sitemap coverage for every indexable public page
- robots wiring to the custom-domain sitemap
- automated internal-link, fragment, metadata, accessibility-basics, sitemap, and production-guard validation

External / account-level work:

- confirm GitHub Pages DNS health
- enforce HTTPS on the custom domain
- verify the domain in Google Search Console
- submit `https://notbrokenjustburning.com/sitemap.xml`
- inspect indexing and crawl reports once Google has processed the site

Post-launch technical polish:

- measure Core Web Vitals on real devices and field traffic
- add structured data only where it accurately describes visible content
- validate any future structured data with Google's current tooling
- reconsider privacy-conscious analytics only if a concrete measurement need exists

## After V1.0

Use Search Console data to learn what real people search for. Improve pages when the query matches the page's purpose. Do not chase unrelated high-volume searches.

Useful measurements:

- indexed pages
- impressions by query
- clicks by query
- click-through rate by page
- average search position over time
- pages with impressions but weak titles/descriptions
- queries that reveal missing useful content
- broken links / crawl errors

SEO is a feedback loop, not a one-time ranking button.
