# Origin Vault IP01–IP25 — phase separation acceptance record

Date: 2026-11-22. Source: Issue #269 Phase 1 baseline and Directive 003-A comment. **The original IP01–IP25 case specifications and original 10 Python test bytes were not available for exact replay.** Never invent original case definitions. Original statuses are preserved exactly. New, separate local tests are `test_01` through `test_44` in `tests/test_origin_vault_phase2.py`.

| Case | Original local status | 003-B status | Acceptance evidence / limitation |
|---|---|---|---|
| IP01 | PASS | PASS — prior only | Phase 1 reported; original runner unavailable |
| IP02 | PASS | PASS — prior only | Same |
| IP03 | PARTIAL | PARTIAL | Actual original definition unavailable |
| IP04 | PARTIAL | PARTIAL | Actual original definition unavailable |
| IP05 | PARTIAL | PARTIAL | Actual original definition unavailable |
| IP06 | PASS | PASS — prior only | Phase 1 reported; original runner unavailable |
| IP07 | PASS | PASS — prior only | Same |
| IP08 | NOT RUN | NOT RUN | No platform environment for exact case |
| IP09 | PASS | PASS — prior only | Phase 1 reported; original runner unavailable |
| IP10 | PASS | PASS — prior only | Same |
| IP11 | PARTIAL | PARTIAL | Exact acceptance specification unavailable |
| IP12 | PASS | PASS — prior only | Phase 1 reported; original runner unavailable |
| IP13 | BLOCKED | BLOCKED | Hosting / real role separation not available |
| IP14 | NOT RUN | NOT RUN | No original test case artifact |
| IP15 | BLOCKED | BLOCKED | Hosting / real role separation not available |
| IP16 | BLOCKED | BLOCKED | Hosting / real role separation not available |
| IP17 | PASS | PASS — prior only | Phase 1 reported; original runner unavailable |
| IP18 | BLOCKED | BLOCKED | Hosting / real role separation not available |
| IP19 | BLOCKED | BLOCKED | Hosting / real role separation not available |
| IP20 | PASS | PASS — prior only | Phase 1 reported; original runner unavailable |
| IP21 | PASS | PASS — prior only | Same |
| IP22 | PARTIAL | PARTIAL | Original case not independently re-evaluated |
| IP23 | PARTIAL | PARTIAL | Original case not independently re-evaluated |
| IP24 | PASS | PASS — prior only | Phase 1 reported; original runner unavailable |
| IP25 | BLOCKED | BLOCKED | Original scenario blocked on platform infrastructure |

**Original matrix totals: 11 PASS, 6 PARTIAL, 6 BLOCKED, 2 NOT RUN (historical local results only).**

## Independent Phase 2 test suite (not substitutes for original IP cases)

**Environment:** Python standard library `unittest`, Linux `/mnt/data`, no network, database, Supabase writes, Git remote, cloud identity or private input. Fixture is a hard-coded fake source. Execute `python -m unittest discover -s tests -p 'test_origin_vault_phase2.py' -v`. Actual results during local build: **44/44 PASS** after correcting two test-fixture mistakes during the first run. These are implementation-unit tests, not cloud security acceptance.

| Phase 2 test IDs | Expected behavior | Actual observation |
|---|---|---|
| test_01–05 | Verified scoped actor allowed; unverified/wrong role or account denied | PASS |
| test_06–14 | Restricted source, missing rights, revoked/expired approval denied | PASS |
| test_15–26 | Purpose, license, attribution, derivative and department restrictions fail closed | PASS |
| test_27–30 | Duplicate hashes, wrong lineage and modified bytes detected | PASS |
| test_31–32 | Altered/reordered local audit chain detected | PASS |
| test_33–39 | Symlink, traversal, absolute, Git tree and oversize source refused; safe synthetic read allowed | PASS |
| test_40–44 | Hash does not imply rights, missing permission evidence, invalid hash and founder approval failures rejected | PASS |

## Not established

- Original ten Phase 1 tests; actual prototype architecture and SQLite schema; integration/reconciliation with original code.
- Real identity verification; founder-signed approval; independent audit anchoring; secure key management.
- Versioned durable storage, source deletion, interrupted-write recovery, backup and restore validation.
- Enforced Supabase Data API non-exposure, Storage RLS, cross-browser-account access denial or service-key isolation.
- Public repository secret scanning against real full history; external AI leakage prevention; external departmental send/checkout tests.

**No original IP case has been promoted based solely on this proposal or the 44 new unit tests.**