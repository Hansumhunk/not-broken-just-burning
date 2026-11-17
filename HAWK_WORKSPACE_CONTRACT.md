# H.A.W.K. Dashboard — version 1 workspace contract

Tool 10 is a read-only coordinator for the nine standalone version-1 tools. It does not replace those editors or rewrite existing records. No server, account, analytics, network, automatic storage or external dependencies. All data remains in session memory unless the user deliberately exports.

## Envelope

```json
{"format":"NBJB-HAWK-WORKSPACE","version":1,"modules":{"NBJB-HAWK-TIMELINE":{"format":"NBJB-HAWK-TIMELINE","version":1,"entries":[]}}}
```

Only these module keys are allowed:

| Tool | Format key | Record ID |
| --- | --- | --- |
| Timeline | NBJB-HAWK-TIMELINE | T- |
| Evidence index | NBJB-HAWK-EVIDENCE | E- |
| Documentation checklist | NBJB-HAWK-CHECKLIST | C- |
| Communication analyzer | NBJB-HAWK-COMMUNICATION | Single review, no record ID |
| Court preparation | NBJB-HAWK-PREPARATION | P- |
| Parenting log | NBJB-HAWK-PARENTING | L- |
| Financial organizer | NBJB-HAWK-FINANCIAL | F- |
| Witness observations | NBJB-HAWK-WITNESS | W- |
| Support network | NBJB-HAWK-SUPPORT | S- |

Each value is a complete original version-1 envelope. Missing module keys mean not loaded, not empty. Entry modules contain up to 1,000 records. Communication retains original review and checks fields. Record IDs and timestamps preserved. Validation uses the matching standalone tool's actual validators, copied as static source at build time from the nine reviewed HTML files, not runtime evaluation. Strict object shape checks reject unexpected or missing keys, including at envelope level, rather than silently discard fields. Canonicalization follows existing standalone import rules (trim/deduplicate reference fields, normalize financial amount). No record deduplication by title or inferred identity. Duplicate IDs within a module rejected before state changes.

## Replacement and recovery policy

- One standalone import replaces that module only, after explicit confirmation if previously loaded. No append, union, automatic merge, or latest-timestamp wins.
- A workspace import validates every module before applying a complete replacement. Absent modules are cleared. Any invalid module rejects the whole import. Explicit confirmation if any module is loaded.
- Communication/support are sensitive separate modules. Each requires explicit opt-in to load, even when inside a workspace. Workspace export checkboxes default ON for ordinary modules, OFF for communication/support. User explicitly selects modules; no implicit bundling. Individual exports allow separate recovery in the original tools.
- Remove one module or clear all with confirmation; never deletes files or source records. No editing in dashboard. Reopen original editor, export updated module, explicitly replace snapshot.
- Dashboard limits 128 MiB workspace, 100 MiB ordinary standalone (support 32 MiB; communication 256 KiB), 1,000 entries per record module. Export refuses files beyond these bounds, suggesting individual exports where appropriate. No passwords or encryption; secure storage is the user's responsibility. Imports atomic; pending reads blocked from concurrent mutation by busy control, except Clear which immediately invalidates the pending import. A late read or error cannot restore discarded data or interfere with a newer session.

## Display policy

Default module counts, loaded-versus-not-loaded, user-entered status counts, reference presence counts, and no record text. No scores or legal/clinical judgments. Optional detailed next-action and link views explicitly activated on screen; no communication drafts, source aliases or support text in dashboard display. Printed summary only (counts and reference totals); record details excluded. Reference checks: structured T/E/C fields and communication refs only, plus complete E- tokens in timeline's free-text reference field, labeled as token extraction (not a parser of legacy aliases). Separate statuses: present in selected snapshot; not present in loaded snapshot; target module not loaded. Count distinct source-record/target-ID relationships; duplicate links in one source deduplicated. No inferred associations.

Next-action view uses existing user-entered text for active checklist, active court preparation, parenting follow-up, financial next steps and witness review; no auto deadlines, recommendations, or sorting based on inferred risk. Support and communication handled in standalone editors, not rendered in detail. No combined financial totals, custody time, evidence credibility, or case-readiness score.

## Release gates

Teaching guide >=3,000 substantive body words, 3 fictional worked scenarios and 1 guided practice. Validate exact standalone schema compatibility with generated fixtures and original editor import-compatible envelopes; test atomicity, duplicate rejection, replacement, optional sensitive modules, reference distinctions, defaults and exports. Real-browser desktop/mobile, keyboard/screen-reader, actual downloads/import/printing and editorial review pending as for earlier modules. Production unchanged until release gates and approval.
