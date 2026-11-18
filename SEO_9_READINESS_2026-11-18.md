# SEO 9/10 — public organic growth operating plan
November 18, 2026 | NBJB | Internal development checklist, not a Google score or ranking promise.

## Baseline and completed P1 work
- Existing static validator run #777 (PR #237) passed 122 HTML pages: navigation, fragments, internal-link graph, metadata and launch guards. One duplicate public title (Placeholder Wound hub vs first lesson) and four long public descriptions surfaced as warnings; member/noindex description notices are not public SEO priorities.
- Current main sitemap inspected: 96 distinct canonical HTTPS URLs, including 10 H.A.W.K. tool pages, no member or Join URLs. robots.txt allows crawling and points at the canonical sitemap. This is source verification, not proof of Google indexing, live HTTP responses or DNS health.
- This branch distinguishes Placeholder Wound track title from its first lesson, shortens four public-page descriptions (divorce recovery, books/projects, steadiness, institutional betrayal), improves divorce and betrayal hub intent and navigation, adds men's mental health resources page with authoritative help links, adds context links from five public pages, and updates sitemap for changed pages. Keep #237's six direct Founder Lesson links separate; reconcile before release. Do not modify member gates, H.A.W.K. tool logic, privacy or Stripe.
- GSC Wizard connector previously returned subscription_required; use free native Google Search Console rather than purchase a plan without founder approval. The public web retrieval attempt failed; do not interpret this as an outage. Production fetch, URL Inspection and real-browser measurements remain unverified.

## 9 out of 10 readiness rubric
Score each criterion 1 only when evidence meets acceptance; 0.5 for partial implementation with explicit gaps; 0 for unverified or not built. No 9/10 until at least 9 points AND every P1 critical gate (1–4, 6) is fully met. These are internal operating controls, not an SEO vendor metric or ranking prediction. Baseline is provisional; reevaluate after deployment.

| # | Criterion | Baseline before this PR | Evidence required for 1 point |
|---|---|---:|---|
| 1 | Technical source integrity (P1) | 0.5 | Latest main CI validates all HTML, canonical/meta/link/fragment/sitemap checks; duplicate public titles fixed; no orphan public teaching pages; no public disclosure of protected content. |
| 2 | Production crawlability (P1) | 0.5 | Canonical HTTPS, redirects, robots and sitemap fetched successfully, main deployed and public key URLs return 200 with matching canonical; account routes retain noindex. |
| 3 | Search Console and indexing (P1) | 0 | Verified domain property, sitemap accepted, URL Inspection of homepage and three priority hubs, indexing coverage reviewed, exclusions/canonical errors triaged. Not all URLs must be indexed. |
| 4 | Discovery and internal links (P1) | 0.5 | Priority hubs reachable via public navigation, all 14 public lessons linked from appropriate parent, related resources and breadcrumb structure verified, no orphan pages. |
| 5 | Search intent / topic clusters (P1) | 0.5 | Three distinct hubs deployed with useful teaching, related pages, unique title/snippet, one primary intent per page; opportunity map refined with actual queries. |
| 6 | Trust, safety, accuracy (P1) | 0.5 | Clear survivor-led author/scope; reviewed public health, child and legal-adjacent claims against authoritative sources; support routing verified; no unsupported promises or diagnosis marketing. |
| 7 | Mobile performance and usability | 0 | Lab checks on mobile/desktop for three hubs and homepage, accessibility/keyboard checks, documented fixes; where field data exists, target LCP <=2.5s, INP <=200ms, CLS <=0.1 at 75th percentile. If no sufficient field data, document lab baseline and follow-up. |
| 8 | Search measurement | 0.5 | Native Search Console impressions/clicks/CTR/queries plus privacy-safe aggregate traffic baseline; weekly report and trend checks. No reflection content or person-level health segmentation. |
| 9 | Editorial publishing and maintenance | 0.5 | Each target has a unique brief, owner, sources, internal links and release review; scheduled monthly refresh; no bulk thin pages or premium manuscript leakage. |
| 10 | Earned authority and distribution | 0 | Relevant genuine external referrals/links documented, a repeatable ethical partnership/outreach process and monitoring; no paid link schemes or fake reviews. |

Initial provisional total: 3.5/10 under this stricter rubric (seven partial criteria, three unverified). Recalculate only with documented evidence; don't count draft PRs as production passes.
 
## P1 priority queue — release and verify
- [ ] Reconcile #237 and this branch against latest main; do not duplicate content from other active branches. Review #229 separately.
- [ ] CI latest head and main green. Collect warnings; resolve duplicate public title. Confirm no unrelated account/checkout or H.A.W.K. behavior changes.
- [ ] Browser review mobile/desktop and keyboard of divorce hub, betrayal hub, new mental health hub and resources. Check all external help links and operational availability.
- [ ] Merge through protected PR workflow when reviewed; verify Pages deployment SHA and production HTML responses (not just repository).
- [ ] Open https://search.google.com/search-console — select existing verified NBJB domain property if present; otherwise add Domain property notbrokenjustburning.com, copy Google's DNS TXT verification value into domain DNS, leave other records unchanged, verify. Alternative URL-prefix verification if appropriate. Founder performs account/DNS authorization.
- [ ] In native Search Console Sitemaps submit https://notbrokenjustburning.com/sitemap.xml only if not already submitted/accepted. Record status and discovered URL count.
- [ ] Inspect '/', '/divorce-recovery.html', '/masculine-restoration-placeholder-wound.html', '/mens-mental-health.html' after deployment; review Google-selected canonical, index status, last crawl, live test. Request indexing only for substantially changed eligible pages where appropriate. No guarantee or deadline for indexing.
- [ ] Check Pages > indexing exclusions, redirects, 404, duplicate canonicals, crawl failures and intentional noindex. Do not remove noindex from private account pages.
- [ ] Reconcile 14 public lessons with hubs; verify #237 included; add reciprocal links only where useful. Keep noindex unapproved printable companion (#235) until approved and reviewed.
- [ ] Record 28-day search baseline and latest 7-day organic traffic; export aggregate query/page data if GSC connector not available. Do not claim estimated search volume or rankings.

## P2 topic content briefs (hypotheses, not researched keyword volumes)
| Existing primary page | Target reader question | Supporting pages / next editorial work |
|---|---|---|
| divorce-recovery.html | What do I do after separation or divorce as a man? | HAWK tools; first-24-hour checklist, parenting routines, high-conflict communication, practical organization. Review existing coverage before adding new pages. |
| masculine-restoration-placeholder-wound.html | How can I rebuild after betrayal without losing my identity? | Eight existing lessons; improve clarity of self-trust, grief, boundaries, rumination vs necessary records, relationship reciprocity. |
| mens-mental-health.html | Where can men find mental health guidance and appropriate support? | Steadiness, One Stone, Flame Check-In, connection and support. Source any medical claims; distinguish lived experience and clinical advice. |
| path-masculine-restoration.html | How do I rebuild identity, direction and responsibility after crisis? | Six-anchor modules; link existing stages and future public guides as relevant. |
| resources.html | What tools can I use to think clearly and take a next step? | Existing signed-in tools and future approved printable companion. Explain free/account distinctions clearly. |

Avoid overlapping new articles with existing lesson intent. Start from query data, audit existing page, enhance it first, then create a distinct useful resource if the gap remains. All health/legal/safety-related resources require suitable sources and scope review, not just word count.

## P2/P3 measurement and maintenance
- PageSpeed Insights https://pagespeed.web.dev/ mobile + desktop for four target pages; keep dated evidence, improve obvious loading and layout problems. Field data may be sparse.
- Validate deployed structured data with https://search.google.com/test/rich-results; markup must match visible content. AI discovery uses the same useful crawlable text and search fundamentals; no speculative GEO hacks, fabricated credentials, or mandatory llms.txt.
- Weekly record GSC clicks/impressions/CTR by page, indexed coverage, organic referral visits and aggregate free/paid conversion totals when permitted. Keep membership QA separate; no identifiable analytics or sensitive reflection events.
- Monthly review priority pages, sources, links, article authorship, search snippets and conversion routes. Earn relevant links through genuinely useful public resources, partnerships and voluntary referrals; never buy ranking links.
- 9/10 is readiness, not a promised amount of traffic, revenue, or search placement.

## References
- Google Search Essentials: https://developers.google.com/search/docs/essentials
- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google people-first content and YMYL guidance: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Search Console property verification: https://support.google.com/webmasters/answer/9008080
- Search Console sitemaps: https://support.google.com/webmasters/answer/7451001
- Google AI features: https://developers.google.com/search/docs/appearance/ai-features
- Core Web Vitals: https://web.dev/articles/vitals
- NIMH: https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health
- American Academy of Pediatrics: https://www.healthychildren.org/English/family-life/family-dynamics/types-of-families/Pages/adjusting-to-divorce.aspx
- National Domestic Violence Hotline safety plan: https://www.thehotline.org/what-is-a-safety-plan/
