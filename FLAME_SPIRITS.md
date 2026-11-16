# Flame Spirits — NBJB Mission Control

**Founder-controlled automation headquarters for Not Broken Just Burning.**

Flame Spirits are small, independently understandable tasks, not unsupervised employees or autonomous ChatGPT sessions. Version 1 uses **GitHub Actions** and Node.js to run public-data reconnaissance outside ChatGPT's scheduled-task limit. Reports appear under **GitHub → Actions → Flame Spirits Mission Control → latest run → Summary**.

## The first five spirits

| Spirit | Role | Version 1 status |
| --- | --- | --- |
| Spirit of Sight | Inspect 10 public sitemap routes for basic SEO metadata, availability and noindex problems | **Runnable on GitHub** |
| Spirit of Listening | Sample public discussion feeds and aggregate five high-level topic counts without sharing posts or identities | **Runnable if feeds permit access**; inaccessible sources are clearly reported |
| Spirit of Alliance | Verify availability of three known, publicly documented mission-aligned organizations as research leads | **Runnable on GitHub**; founder must evaluate fit and initiate contact |
| Spirit of the Ledger | Check membership revenue | **Intentionally held**: no financial reporting in a public GitHub repository |
| Spirit of the Guard | Look for risky GitHub Actions patterns in checked-in workflows | **Runnable on GitHub**; not a replacement for Supabase advisories, Dependabot or secret scanning |


## Added production-ready read-only spirits

| Spirit | Role | Scope |
| --- | --- | --- |
| Spirit of the Library (#22 Resource Library Curator) | Inspect outgoing public resource and crisis-support links on `support.html` and `resources.html`; check allowlisted official service destinations | Inaccessible or redirected sites are marked for manual verification, never falsely called broken |
| Spirit of Integrity (#26 Brand Consistency Inspector) | Inspect five public-facing pages for specific indicators: men-first language, free vs paid membership labels, crisis options, and scope boundaries | Deterministic presence checks only, not editorial, clinical or legal approval |

These two spirits run on the existing Flame Spirits Monday/Wednesday/Friday GitHub schedule. The new module is `scripts/flame_spirits_guardrails.mjs`. Individual CLI checks: `node scripts/flame_spirits.mjs resources` and `node scripts/flame_spirits.mjs brand`. The workflow runs both with the other spirits using `all`. No additional ChatGPT scheduled-task slots or paid APIs are required.

## #16 — Spirit of the Forge: Digital Product Opportunity Scout

This spirit researches possible **workbooks, guided journals, fatherhood planning kits, and self-trust tools** using only public material, and it reports **ranked hypotheses**, not validated paying demand.

**Independent GitHub schedule:** Tuesdays around 10:23 AM America/New_York, in \`.github/workflows/flame-spirit-products.yml\` (GitHub may delay scheduled jobs). It uses the existing site's GitHub Actions infrastructure, not an additional ChatGPT task slot.

**Three separate evidence classes:**
1. **NBJB fit:** inspect public \`index.html\`, \`resources.html\`, \`lessons.html\`, and \`books-projects.html\` for established themes and existing public products/works-in-development. Do not read private manuscripts or claim unfinished projects are for sale.
2. **Audience topic signals:** aggregate only the topical titles of publicly accessible RSS/Atom feeds from Daddit and MensLib; never output usernames, exact titles, stories, post URLs, private messages, or quotes. Product-format requests are counted separately from general discussion. If feeds are unavailable, record **unverified** rather than a negative demand finding.
3. **Adjacent book supply:** make four low-rate, read-only Open Library Search API requests for broad bibliographic matches, with a contact-identified User-Agent and explicit selected fields. Public catalog hit counts are *fuzzy catalog supply*, **not** sales, customer willingness to pay, prices, profit, or definitive competitors. Respect the API's current usage guidelines and discontinue it if the provider no longer permits this use.

**Output:** four concepts ordered for further exploration, foundation page references, only aggregate topical counts, broad public catalog reference links, confidence limits, one tiny founder-reviewable sample-product exercise for each, and a recommendation to validate usefulness before launch. No growth forecasts or invented prices.

**Founder approval gates remain absolute:** no checkout, product publication, preorders, advertising spend, revenue changes, paid subscriptions, content creation that edits the curriculum, outreach, data collection, video work, or sharing member details. The spirit cannot write to the repository; its workflow uses \`contents: read\`.

**Execution:** \`node --test scripts/test_flame_spirit_products.mjs\` verifies offline scenarios and privacy; \`node scripts/flame_spirits.mjs products\` executes one read-only research pass. Reports appear under GitHub Actions → **Flame Spirit Product Opportunity Scout** → selected run → Summary. The existing Monday/Wednesday/Friday \`all\` command deliberately skips this new spirit, avoiding redundant frequent calls.

The Library Spirit fetches only explicitly allowlisted external support domains; unexpected domains are identified for founder review rather than fetched. Its HTTP signals do **not** establish whether a telephone service remains accurate or available. A blocked/redirected response should be checked manually using the official provider. The Brand Spirit reports missing configured phrases or cues; it does not read or rewrite protected lesson manuscripts, infer meaning beyond the checks, verify legal statements, or approve copy.

The full weekly member/Stripe/Supabase monitoring functions configured in ChatGPT remain separate. This GitHub system does not require a ChatGPT plan upgrade.

## How to operate

1. Founder reviews and merges the isolated pull request containing this file and the new workflow. Until merged to the **default branch**, its recurring schedule will **not** run.
2. Open [GitHub Actions](https://github.com/Hansumhunk/not-broken-just-burning/actions), select **Flame Spirits Mission Control**, then **Run workflow** if a manual baseline is desired.
3. Scheduled checks run **Monday, Wednesday and Friday around 9:17 a.m. America/New_York**, subject to GitHub scheduling delays; summaries are visible in each successful run.
4. Extend each spirit by reviewing a pull request. For local checks use: node --test scripts/test_flame_spirits.mjs ; node scripts/flame_spirits.mjs all .

## Explicit permissions and safety

- The GitHub Actions workflow uses contents: read. It cannot push files, merge PRs, publish content or modify GitHub issues through the built-in token.
- The code does not read member records, personal reflections, Supabase data, Stripe financial data, secrets or other private systems.
- **No video, audio/video inventory, generation, publishing or scheduling.**
- **No automatic outreach, spending, invoices, prices, charges, refunds, client messages, publishing or production edits.**
- Public community feeds can block bots. An inaccessible feed means **unknown**, not no activity. This is a directional research signal, not proof of demand or clinical guidance.
- Public organization URLs are verified as leads, not endorsements or relationships.
- All report text is appropriate for a **public repository**. Keep future commercial or member-specific reporting in a **private** operations repository with restricted secrets and logs, after explicit founder approval.
- Model-backed reasoning requires a separate supported AI provider, credential review, cost caps and explicit founder approval. GitHub Models' standalone inference API **retired July 30, 2026**; do not build on that former service.
- Standard GitHub-hosted Actions runners are currently free for public repositories; artifact storage, larger runners and external services can have separate limitations or charges. This workflow uses no artifact uploads or paid APIs.
- GitHub may delay or miss scheduled executions; workflows in public repositories can be automatically disabled after long inactivity. Check Actions run history.

## Next evolutionary steps

- Add founder-approved free sources and data quality checks to the Audience Spirit.
- Add an outreach draft review queue, not auto-send, for the Alliance Spirit.
- Build a **private** Ledger Spirit using restricted read-only Stripe access, never exposing financial records to public logs.
- Build a guarded **private** Supabase Security Spirit for linter history; never read private reflection content.
- Introduce a documented AI-reasoning adapter only after provider access, expense limits, and human review gates are established.

**Governing principle: the spirits gather information and recommend actions. The founder approves what affects people, the brand, money or production.**
