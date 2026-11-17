# H.A.W.K. development and release standard

## Mission and scope

H.A.W.K. helps people facing high-conflict divorce organize the external situation through lawful documentation, preparation, independent observations and disciplined action. Flamewalker supports internal recovery. Preserve the original H.A.W.K. manuscript as a separate archival work. The center is education, not legal representation, therapy, investigation, crisis services or an evidence-admissibility determination.

## Definition of done for each major application

- At least 3,000 substantive teaching words in the instructional body, excluding navigation, boilerplate, form labels, metadata, disclaimers and repeated filler. Count the actual committed teaching prose at readback. Do not use a displayed word count as the only verification.
- At least three realistic fictional worked scenarios and a guided practice exercise.
- A real functional application, appropriate instructions, input validation, accessible labels, mobile layout and clear empty/error states.
- Connect to existing NBJB material; reuse existing tools when appropriate instead of rebuilding them.
- Case data stays offline by default. No case-record uploads, cloud entitlement data, third-party analytics, session replay, or network calls in offline tools. No automatic record collection. Explain that exported files are not encrypted, that users are responsible for their storage, and that records can be lost if not exported.
- Preserve originals and do not imply a working timeline is an immutable evidence record. No advice to monitor another person, bypass access permissions, coach witnesses, or retaliate.
- Verify static site CI, core function behavior, real-browser desktop/mobile and accessibility checks, and editorial review before release. A draft PR or a simulated event harness does not prove live browser QA. Do not mark unfinished tools available.

## Build order

| Order | Application | Status |
|---|---|---|
| 01 | Incident Timeline Builder | Implementation complete on feature branch; browser and editorial review pending |
| 02 | Evidence Index | Implementation complete on feature branch; browser and editorial review pending |
| 03 | Documentation Checklist | Implementation complete on feature branch; browser and editorial review pending |
| 04 | Communication Analyzer | Implementation complete on feature branch; browser and editorial review pending |
| 05 | Court Preparation Organizer | Next |
| 06 | Parenting Log | Planned |
| 07 | Financial Organizer | Planned |
| 08 | Witness Observation Organizer | Planned |
| 09 | Support Network Map | Planned |
| 10 | H.A.W.K. Dashboard | Planned |

## Tool 01 architecture

Public lesson: `hawk-incident-timeline.html` (3,778 substantive teaching words, 17 sections, 3 worked scenarios, 1 guided exercise).

Offline application: `downloads/hawk-timeline-offline.html`. Self-contained HTML with an inline script/style and restrictive CSP; no external resource dependencies or persistence. Memory-only session, explicit JSON export/import, local print. Up to 1,000 entries. Exported records are readable and not encrypted.

Interoperability: version-1 JSON envelope `{format: "NBJB-HAWK-TIMELINE", version: 1, entries: [...]}`. Stable event reference `T-` followed by 16 uppercase hexadecimal characters. Entries include date precision (day, month, unknown), date, optional local time, neutral category, source classification, factual description, context, evidence references, practical impact, unresolved questions, fresh correction note and creation/last-update UTC timestamps. Do not infer dates or evidence validity. The working timeline is editable and not a historical audit log. Explicit versioned exports are needed for prior states.

Tool 02 should use stable evidence references (e.g. E001) and support linking to stable timeline event references, without importing original sensitive attachments or creating a cloud database. Do not require a real case to test the applications. Decide on a versioned shared workspace format before combining the tools, retain backwards compatibility, and make import/merge behavior explicit.

## Tool 01 validation record

- Committed instructional body independently counted at 3,778 words.
- JavaScript syntax check passed.
- Simulated DOM/event harness: 15/15 checks passed (blank date/fields; invalid day; valid add; approximate and unknown dates; export; required correction; stable ID; search; filtered export; print invocation; clear; JSON round trip; malformed import; delete).
- GitHub Actions Validate static site run #699 succeeded at commit 2752d420bfffdad49b7fcb95eaa68fd5982fb7ad.
- Real browser desktop/mobile, actual download/print under CSP, keyboard/screen reader usability and editorial review are still required before production. No live production release from this PR yet.


## Tool 02 architecture and verification

Public lesson: `hawk-evidence-index.html` (3,735 independently counted teaching words, 17 sections, three worked scenarios, one guided exercise).

Offline application: `downloads/hawk-evidence-index-offline.html`. Memory-only editor, explicit JSON export/import, text-only rendering, restrictive CSP, no network or automatic storage. Up to 1,000 records. Exported files are unencrypted.

Evidence envelope: `{format: "NBJB-HAWK-EVIDENCE", version: 1, entries: [...]}`. Stable ID: E- plus 16 uppercase hexadecimal characters. Legacy codes such as E001 may be retained as an alias (not an official exhibit number). Each entry includes title, neutral category, type, source status, record date, acquired date, origin, storage alias, description, limitations, related timeline IDs, correction note, and creation/update timestamps. The tool does not receive original documents or inspect metadata.

Interoperability: optional read-only import of a Tool 01 version-1 timeline export; only event ID set retained in memory. Per-record links are stored in the evidence export. Unmatched IDs mean absent from selected file, not false. User copies E-ID into timeline reference field manually. Separate versioned exports remain the source of working data. No automatic two-way synchronization, combined workspace or cross-file merge yet.

- Committed teaching body verified at 3,735 words.
- JavaScript syntax and offline dependency inspection passed.
- Simulated DOM harness: 20 of 21 initial assertions passed. Search test incorrectly expected one result for "Message" even though both records used the record type "Message or email". Focused retest of unique title, all-field behavior, category filtering and full export passed all four assertions. All intended core behaviors verified in simulation.
- Desktop/mobile browser behavior, download/print under CSP, keyboard/screen-reader and editorial review still pending.
- Tool 03 should track missing records, lawful request routes, priority, status, and next action. Reuse existing reference formats; no sensitive uploads or automatic access to other people's records. No requirement to collect every possible document.


## Tool 03 architecture and verification

Public lesson: `hawk-documentation-checklist.html` (3,801 independently counted teaching words, 17 sections, three worked scenarios, one guided exercise).

Offline application: `downloads/hawk-documentation-checklist-offline.html`. Memory-only task plan, restrictive CSP, no external dependencies, account, network, automatic storage or reminders. Up to 1,000 tasks, explicitly exported unencrypted JSON or printed displayed entries.

Checklist envelope: `{format: "NBJB-HAWK-CHECKLIST", version: 1, entries: [...]}`. Stable task ID C- plus 16 uppercase hexadecimal characters. Entries include title, category, priority, status, purpose, lawful access/request route, next action, optional target date and source/basis, actual request date, related timeline and evidence IDs, outcome, revision note, creation/update timestamps. Target dates are planning fields, not legal deadlines; requested status requires a recorded request date, and completed/deferred/not-needed status requires a result or reason.

Optional read-only local readers for version-1 timeline and evidence exports retain only corresponding ID sets in memory. Cross-reference checks establish presence in a selected file, not truth, provenance or admissibility. The tool does not synchronize source files or transmit requests. It reports counts of active, completed, deferred and not-needed tasks, not a measure of case readiness.

- Committed prose independently counted at 3,801 words.
- JavaScript syntax and offline dependency inspection passed.
- Simulated DOM harness: 24/24 checks passed, including required fields, valid dates and date basis, request date, outcome, stable IDs, both reference imports, duplicate rejection, no source descriptions retained/displayed, sorting, search-independent status/priority filters, round-trip export, print invocation and removal.
- Static integration validation: run #707, completed (success) at integration commit bb2580c0819e75154b32fad3c29102b77caccb6d.
- Real-browser desktop/mobile, actual download/print, keyboard/screen-reader and editorial review remain release gates.
- Tool 04 should teach communication discipline and offer local self-review of drafts, not diagnosis, motive detection, legal assessment or automatic messaging. Use a transparent rules/checklist approach without network, external AI, or claims to infer intent or criminal conduct. Avoid encouraging contact if restricted or unsafe.


## Tool 04 architecture and verification

Public lesson: `hawk-communication-analyzer.html` (4,087 independently counted teaching words, 17 sections, three worked scenarios, one guided exercise).

Offline application: `downloads/hawk-communication-analyzer-offline.html`. Memory-only draft reviewer with restrictive CSP, no external dependencies, AI, automatic storage, accounts, network calls or message sending. Three decision inputs (safety, permitted channel, practical need) plus stated purpose are required before drafting/review/export; unsafe, uncertain, restricted or unnecessary contact blocks the reviewer. This is a self-report workflow, not actual permission, legal advice or risk assessment.

Transparent English literal rules: absolute terms, personal labels, possible motive attribution, accusation words, threat-like phrases, repeated punctuation, uppercase words, plus length review above 120 words. Every flag is contextual; no abuse score, personality classification, predictive claim or green-light result. Composer joins the user's own factual context, practical request/update and optional next step. Initial and revised drafts can be independently reviewed. A six-item human reflection checklist resets on revised draft or decision changes and requires a current revised review.

Review envelope: `{format: "NBJB-HAWK-COMMUNICATION", version: 1, review: {...}, checks: {...}}`. Contains one working review with decision choices, purpose, optional manual T-/E-/C- references, original outgoing draft, revised draft, composer fields and historical reflection choices. Imported text is restored while current decision fields and checks reset; only a summary of prior choices and count is displayed. No record of actual sending. Export is optional readable, unencrypted JSON. No automatic cross-file synchronization or validation of referenced IDs.

- Final teaching body independently counted at 4,087 words after editorial clarification of import behavior.
- JavaScript syntax and offline dependency inspection passed.
- Simulated DOM harness: 27/27 checks passed, including emergency/uncertain/restricted/no-response gates, purpose and reference validation, all seven pattern classes, length threshold, stale-review invalidation, composer, human checklist reset, export gating, import reconfirmation, malformed input handling, cancel and clear. Later changes were copy/word-count only.
- Static integration validation: run #714, in_progress at integration commit 494000e29f922b07d8f6a8bc0310800444a07981.
- Real browser/mobile, actual local download/import under CSP, keyboard/screen-reader and editorial review remain release gates.
- Tool 05: Court Preparation Organizer should help users structure issues, questions for counsel, relevant record references and practical logistics; distinguish official dates from personal targets. Do not offer procedural deadlines, legal conclusions, filings, witness coaching or litigation strategy as legal advice. Keep the same word-count and offline standards.
