# Origin Vault Phase III: durable local-first synthetic prototype

**Development only**. Continuation of Phase II PR #271. Phase I original prototype remains unavailable. These files are a *new extension*, not recovered Phase I implementation. Never feed real journals, clinical/legal records, private founder archives, customer data, or licensed source texts into this prototype.

## Implemented (local only)

- `durable.py`: standard-library `sqlite3` and HMAC-based reference with a private filesystem root, 0700 directories, 0600 DB, SQLite WAL `synchronous=FULL`, `BEGIN IMMEDIATE` transactions, foreign keys, duplicate account-wide source SHA uniqueness, original source versions in SQLite BLOB rows, triggers rejecting original-version mutation/deletion, concepts/derivative versions tied to source/version digests, review-only candidate states, revocation/one-time signed grant consumption, and locally verifiable audit hash linkage.
- HMAC-SHA256 **synthetic** identity and owner approval tokens. Each signed grant binds source/version/SHA/account/actor/owner/purpose/rights reference/scope/expiration. Wrong scope, replay, forgery, expiry and account mismatch are denied. Signing/verifying keys are injected at runtime as >=32-byte bytes; **do not store keys in code, GitHub, SQLite or CI**.
- Controlled synthetic local export: exact derivative version, one-time grant, fixed private `outbox`, restrictive filename policy, no overwrite, pending/complete audit ledger. An interrupted pending export is removed/aborted when the store next opens. **No production file handoff or public publishing.**
- SQLite `Connection.backup` creates a standalone consistent snapshot, SHA-256 digest and HMAC-signed manifest; restore requires the manifest and a *new* isolated root; SQLite integrity/foreign-key check, source/derivative digests and local audit chain are validated on opening. Restore never silently overwrites another environment.
- Four department handoff **preview** metadata contracts with zero payload bytes and no outbound connectors; executive aggregate counts without source title/body disclosure.

## Run on Linux / Python 3.13 with stdlib only

```sh
python -m unittest discover -s tests -p 'test_origin_vault_phase2.py' -v
python -m unittest discover -s tests -p 'test_origin_vault_phase3.py' -v
```

All tests use `tempfile.TemporaryDirectory()` and runtime `os.urandom` keys. CI must never retain test vault files as artifacts or print signing material. This prototype has no CLI for real material and **must not** run on the production NBJB server.

## What this does NOT prove

- Actual copyright ownership, licensing verification, source-consent, founder identity or approval authenticity. The signed permissions are from a test-only issuer whose secrets the tests control; a future service must use an independently authenticated identity provider and a separate privileged grant-signing service with rotation/revocation.
- Encryption at rest, OS-privilege isolation against the host administrator, key custody, external signature anchors, immutable storage, tamper-resistant auditing or cryptographically complete historical backups. SQLite triggers and local hashes are editable by a privileged local user.
- Device loss recovery without redundant off-device encrypted backups, disaster recovery RTO/RPO, independent restoration on another host, remote multi-user concurrency, web API authorization or secure hosted object storage.
- Automated release for education, Brevo, Revenue Forge, or social media. A handoff preview is not editorial/publishing/marketing/product activation permission.

## Safety invariants

1. The SQLite DB, export folder, backups and signer keys stay outside any Git tree; program checks roots and Git ancestry on Linux.
2. Filesystem permissions and HMAC messages are local-in-process safeguards, not a standalone production security guarantee.
3. A source checksum is integrity evidence only, never an ownership or clinical/legal authority claim.
4. Phase II's original 51 tests and historical IP01–IP25 outcomes are kept distinct from new Phase III tests.
5. Hosted schema/bucket, standalone Supabase project, real source import, payment/marketing, production merge and public release remain strictly blocked pending separate founder approvals.