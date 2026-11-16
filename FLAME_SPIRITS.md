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
