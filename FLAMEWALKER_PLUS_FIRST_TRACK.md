# Flamewalker+ First Guided Track

## Delivery status (October 29, 2026)

**Preview architecture implemented. Not approved for paid sales yet.**

**Track:** The Wounded Boy and Inherited Manhood, Masculine Restoration Module 1.

**First editorial batch:**
1. The Father Wound — Father Imprint Map.
2. The Mother Wound — Maternal Imprint Map.
3. The Boy Who Learned to Stay Quiet — Silence Inventory.

The original full written lessons were read from the owner's **private** NBJB Google Drive curriculum documents and staged as structured blocks in the Supabase database. Their private lesson bodies are not in this public repository. Their database status is `editorial_review`, NOT `published`. They cannot be retrieved by end users until deliberately approved and changed to `published`.

This first delivery uses **writing and guided exercises**, not unavailable videos. The track can expand as the other lesson drafts are editorially prepared.

## Runtime and security

- Static preview/reader: `member-premium-lesson.html` and `js/member-premium-lesson.js`; any signed-in user can view the non-sensitive track preview.
- Private content: `public.flamewalker_premium_lessons` under RLS, with `anon` and `authenticated` privileges revoked and an explicit deny policy. Only service-role operations can read unpublished bodies.
- Reader API: `read-flamewalker-lesson` Edge Function, `verify_jwt=true`, `@supabase/server` `auth: 'user'`. It checks server-authoritative membership tier, billing status, start/end dates, and `status='published'` on each request. No client-supplied entitlements are trusted.
- The same authenticated Edge Function serves a **metadata-only** `catalog` action to signed-in members: slug, title, summary, sequence and release status. No draft body is sent through the catalog. This lets later approved lessons appear without hard-coding every lesson ID into the reader.
- No full premium text, private source URLs, or private member reflections are committed to GitHub.
- The API responds with private no-store cache headers. JavaScript inserts lesson content using `textContent` (not remote HTML).
- Exercise text is **not automatically saved or submitted**. The member may copy it manually; only a per-user completion timestamp is stored in localStorage. Clear This Device should eventually clear this metadata too.
- Stripe Checkout and paid subscriber activation are NOT enabled or touched by this work.

## Editorial checklist

- [ ] Review original lesson text for formatting and publishing voice, remove internal draft directions, check examples.
- [ ] Verify all exercise prompts correspond to their actual source exercise, and check the smaller-door and safety language.
- [ ] Check chronology and lesson transitions; no diagnosis, legal advice, false claims or spiritual certainty.
- [ ] Approve first batch and change the protected row statuses from `editorial_review` to `published` through controlled, privileged administration. Never create a browser-accessible editing endpoint just for release toggles.
- [ ] Only advertise a published lesson as Available Now after approved paid-account read tests pass.

## Authorization and member testing still required

- [ ] No login: Edge Function blocks requests; preview redirects to account page.
- [ ] Free member: API returns 403, never returns protected body.
- [ ] Paid, active member: receives only released lessons.
- [ ] Paid member, canceled at period end: access continues only through valid paid period.
- [ ] Expired/incomplete/unpaid member: no lesson body; browser cannot self-upgrade via localStorage.
- [ ] Unpublished slug: no body for any member, including paid.
- [ ] Direct PostgREST attempt with anon/publishable and authenticated roles: access is denied.
- [ ] Mobile and desktop layout, reading length, long headings, focus, form reset/copy, account switching.
- [ ] Validate `Clear Member Data from This Device` also removes `nbjb.plus.lesson-progress.v1.<userId>`.
- [ ] End-to-end Stripe sandbox subscription, portal, webhook, duplicate event, payment failure, downgrade and RLS; tracked in PR #63 and Issue #36.
- [ ] Checkout terms, support, cancellations, taxes, renewal disclosures and real paid subscription production configuration before live charging.

## Definition of next release

A paid member, after editorial approval and successful billing QA, can open three complete written lessons with useful exercises, track only minimal completion metadata locally, and access future standard member lessons as they are added. Free resources remain free.

**Current status:** backend staging + reader preview, not a completed launch.
