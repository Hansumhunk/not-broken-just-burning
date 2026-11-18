# Flame Letter operations — release candidate
Tracking: #1. Provider: Brevo Free, provisional pending founder account validation. No live signup or send authorized.
## Setup
Create separate NBJB account and Flame Letter confirmed list; use hosted signup URL with required affirmative consent, email only, double opt-in and CAPTCHA. Use distinct form/source tags only where supported without PII analytics. Do not import Gmail or member accounts. Verify sending identity and domain per provider DNS values; preserve existing records; do not add duplicate SPF or DMARC. Confirm valid business postal address before sending. Keep marketing and transactional flows separate. Provider is authoritative for consent, confirmation, suppression and deletion; no Supabase copy at launch. If provider cannot demonstrate timestamp, source, consent wording/version and suppression behavior, hold release. Disable optional individual open/click tracking where possible; disclose remaining processing. Recheck provider terms, DPA, retention and applicable international consent rules before launch.
## Activation gate
Founder creates account and verifies sender, address, DNS, and data handling. Use provider-hosted form link rather than a third-party embed initially; no secret in browser. Update privacy notice before enabling link. Pilot with controlled addresses; check invalid input, duplicates, bot challenge, double opt-in, consent records, unsubscribe, re-subscription, deletion, bounce/suppression, failure states, mobile and desktop. No public sending until approved. Add homepage/join/resources links after rebase and review. CI plus manual tests required; never mark signup live prematurely.
## Welcome sequence (draft, trigger confirmed signup only)
Day 0 — Welcome to the Fire: You do not need to tell us your story to begin. Choose one free resource at https://notbrokenjustburning.com/resources.html. What would make today a little more manageable?
Day 2 — Finding Clarity in Chaos: Write who, what, when, where, why and how; mark any answer you do not know as unknown. Pick one fact you can verify. Explore https://notbrokenjustburning.com/six-sacred-questions.html.
Day 4 — Your First Honest Action: Choose one task you can finish in fifteen minutes. Progress need not solve the whole problem. Explore https://notbrokenjustburning.com/resources.html.
Day 7 — Strength Without Domination: Choose a boundary that describes your own behavior, not another person's obedience. Practice it calmly. Explore https://notbrokenjustburning.com/movement.html.
Day 10 — The Flamewalker Path: Fire Reclamation, Guardian's Path, Sacred Mirror, Masculine Restoration, Voice of Fire, Circle of the Flame. Start with the stage that fits today; no need to finish in order. https://notbrokenjustburning.com/path.html.
Day 14 — Continuing Your Journey: The free account is optional and useful on its own; paid membership is another optional step. https://notbrokenjustburning.com/join.html.
## Member sequences (draft; only independently consenting confirmed subscribers; member status sync not implemented)
Free: Day 0 locate dashboard; Day 3 choose a Path focus and Toolbox practice; Day 7 return to the next honest action; Day 14 optional premium overview. Paid: Day 0 locate protected lesson library; Day 3 practice a section reflection privately; Day 7 resume lesson; Day 14 locate benefits, billing management and support. Do not transmit account status to provider until separate consent and integration review. Required account notices remain transactional.
New content: one announcement when genuinely substantive; describe who it helps and what is available, no manufactured urgency. Skip overlapping broadcasts where possible.
## Weekly reusable template
Subject: [specific useful idea]
Preheader: [one practical promise, no health claims]
Teaching: [150–250 words]
Question: [one private reflection, never request sensitive reply]
Tool: [public resource, one instruction]
Action: [one realistic task]
Optional invitation: Explore free resources or Flamewalker+; no obligation.
Footer: NBJB LLC, verified mailing address, unsubscribe link, educational scope, privacy link.
## Initial 12-week editorial inventory
Week | Teaching | Reflection | Tool | Action
---|---|---|---|---
1 | Clarity before certainty | What do I know today? | Six Sacred Questions | Write three facts
2 | Facts vs assumptions | What would change my mind? | Forge | Label one interpretation
3 | Boundaries without control | What will I do if this continues? | Boundary Builder | Draft one boundary
4 | Trust is earned through behavior | What consistency would look like? | Pattern Map | Identify one observable behavior
5 | Emotion is information, not an order | What action would I regret? | Check-In | Delay one nonurgent response
6 | Fatherhood under pressure | What does my child need today? | One Stone | Keep one small promise
7 | Identity beyond roles | What value survives a lost title? | Path | Practice one value
8 | Betrayal and rebuilding | What needs protection now? | Forge | Identify one controllable step
9 | Accountability without shame | What can I repair? | Guardian Code | Make one repair
10 | Brotherhood and isolation | Who can I reach out to safely? | Resources | Invite one friend to talk
11 | Fear, hope and purpose | What is worth doing despite uncertainty? | One Stone | Schedule fifteen minutes
12 | Integration after survival | What practice will I keep? | Path | Write one weekly commitment
## Analytics
UTM source=flame_letter, medium=email, campaign=flame_letter_YYYY_MM_DD, content=edition_slug; never put email or member identifiers in URLs. Aggregate provider confirmations, deliveries, clicks, unsubscribes; note attribution limits. No PII to PostHog. Track anonymous landing/CTA only after reviewing existing controls. Review weekly operations automation first; no new send automation until founder launch approval.
## Cost check
Free 300 sends/day shared across confirmation, automation and broadcast; at 100 subscribers weekly campaigns fit with headroom, at 250 monitor welcome/confirmation volume, at 500 or 1000 a simultaneous broadcast exceeds free daily quota. Obtain actual paid quotes for required monthly sends and contact caps before upgrading. No charges authorized.
