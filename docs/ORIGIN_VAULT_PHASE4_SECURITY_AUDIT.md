# Origin Vault Phase IV — targeted security audit and corrective evidence

**Date:** 2026-11-22. **Coordination:** Issue #269 / existing **DRAFT** PR #271. **Input:** accepted Phase III exact head `c3c3988ab3a65a6418e5adfe9922d682aaad54b4`; 51 Phase II + 67 Phase III synthetic tests; original Phase I prototype remains unavailable. **Scope:** locally reproducible, fake records only. **Security status:** NOT cleared for confidential or production use.

## Inspected code

- `internal/origin_vault/policy.py`: purpose/role/source-rights/format restriction policy, content hashes and path reads.
- `internal/origin_vault/durable.py`: HMAC fixture credentials, source versions, revocation, audit, local outbox, SQLite snapshot/restore.
- `tests/test_origin_vault_phase2.py`, `tests/test_origin_vault_phase3.py`: retained historical synthetic suites.
- `docs/ORIGIN_VAULT_DEPARTMENT_CONTRACTS.md`: metadata-only proposed handoffs.
- New `internal/origin_vault/phase4_security.py`: isolated offline cryptography and separate signed checkpoint demonstration.

## Findings and action ledger

| Ref | Severity | Actual finding / threat | Action & evidence | Residual risk |
|---|---|---|---|---|
| S01 | **CRITICAL for real data** | Active SQLite BLOBs and Phase III snapshot/manifest are **plaintext**. Device theft/privileged access exposes originals, derivatives and sensitive metadata | New *separate* AES-256-GCM `cryptography` proof: in-memory SQLite snapshot → authenticated `.ovb` ciphertext, isolated restore. Encrypted `.ovr` review-artifact proof. **Q01–17 passed.** | Live SQLite and outbox remain plaintext; plaintext appears in process RAM and at isolated restore. No real ingestion allowed. Key store, full-disk/SQLCipher or other vetted active-store encryption needed. |
| S02 | **HIGH** | Original local audit hash chain can be re-written by a privileged SQLite owner; internal integrity can still report success | Reproduced via privileged manual rewrite of audit events and recomputed chain **Q23**; Ed25519 checkpoint with independently held public verifier rejects tampered state **Q18–25** | Test verifier/anchor exists in a separate process context only. Production immutable external anchoring, custody and latest-head monotonicity unimplemented. |
| S03 | **HIGH** | Valid historical backup may predate a source revocation and restore permission to a formerly authorized state | Q24 reproduces a valid old snapshot passing internal checks while *trusted later* external checkpoint flags rollback | Requires independent latest checkpoint and revocation epoch feed to deny old restore. Do not allow restored credentials to authorize operations until reconciled. |
| S04 | **MEDIUM** | Phase III accepted identical identity/owner signing key material, collapsing separation of duties | **Reproduced failing Q27 pre-fix**; `DurableVault.__init__` rejects equality among all three Phase III injected keys. **Q27 passes after fix** | Host administrator with access to distinct keys can still impersonate actors. Future KMS and distinct principals needed. |
| S05 | **HIGH** | `_safe_root()` checked only the final root for symlinks; a symlinked **ancestor** could redirect Vault creation to an unintended location | **Reproduced failing Q31 pre-fix**, then patched to reject symlinks at every existing ancestor before creation. **Q31 passes after fix** | Potential race with privileged local file-tree attacker; true production file-descriptor-relative creation and OS isolation still required. |
| S06 | **HIGH** | HMAC `mint_test_token` verifies possession of a test secret, **not human identity**, real ownership, MFA, or licensing | Added separate *structural* founder-identity assertion contract tests **Q28–30** (issuer/audience/subject/account/fresh WebAuthn/role), expressly **not cryptographic IdP verification** | Live approved IdP, verified JWKS/session, protected role registry, founder MFA, isolated signing service, secure enrollment/recovery are unimplemented. |
| S07 | **HIGH** | Source rights status and authorization metadata can be changed by privileged local DBA without the local hash-chain validating each row | **Q22** demonstrates changing `rights_verified` while `verify_integrity()` stays true; independent externally signed state digest fails | Must use independently protected checkpoints plus deny-all service/DB access and audit of authorizations. No admin-compromise protection while keys and Vault share device. |
| S08 | **HIGH** | Existing review-only outbox exports and SQLite WAL files remain plaintext; vault root permissions are necessary but not sufficient | New encrypted review-artifact PoC **Q09–11**; existing Phase III controlled export unchanged, to avoid silently changing release behavior | Encrypted review export is *not wired into production*; no plaintext derivative transfer permitted. |
| S09 | **HIGH** | Offline backup redundancy, key-loss recovery, legal holds, controlled deletion, RPO/RTO and remote storage loss are **not qualified** | Encrypted snapshot restore **Q12–17**, corrupted/altered/key mismatch and isolation checks; earlier Phase III tests retained | Only same-host synthetic restored; no off-device copy or external credential recovery. |
| S10 | **MEDIUM** | Unsafe key material or source bytes in public CI could leak | CI uses freshly generated fake keys, no repo secrets, no artifact uploads, no real material; cryptography dependency pinned in job | CI runner and PyPI are third parties; dependency integrity, runner hardening, audit of public history and dependency lock policy remain external gates. |

## Vulnerability-reproduction sequence

1. Accepted Phase III `DurableVault.__init__` did not reject `identity_key == owner_key`; new Q27 initially **failed** (`AccessDenied` not raised); narrow key separation patch changed this to **pass**.
2. Accepted Phase III `_safe_root` did not reject a **parent** symlink; new Q31 initially **failed**; narrow ancestor validation patch changed it to **pass**.
3. Phase III `verify_integrity()` did not detect privileged edits of `sources.rights_verified` or fully rehashed audit rows. Q22/Q23 intentionally **demonstrate** this existing limitation, then verify an independently signed state checkpoint detects both. **No false claim of local immutable logs.**
4. WAL-mode `sqlite3.Connection.serialize()` could not be reopened directly using `deserialize(':memory:')`. Synthetic recovery test Q13 initially errored. The encrypted snapshot implementation now normalizes the official SQLite rollback journal flags at image header bytes 18–19 **in memory only**, then performs an independent SQLite `integrity_check` before encrypting. No plaintext backup file is created by this new path. Q13/Q24 now pass. This transformation must be reviewed and qualified on additional SQLite versions before production use.

## Threat coverage disposition

- **Authorization**: per-source, per-purpose, one-use approvals validated in Phase III. Synthetic MFA structure now tested. **No actual founder credential integration**.
- **File safety**: traversal/root symlink and direct export filename tests retained; ancestor symlink fixed; inode swaps/hard links/file-race defense remain incomplete.
- **Database**: checksum, foreign key, version immutability by triggers and transaction rollback retained; privileged DB tampering is detectable **only with separately held trusted checkpoints**, not with local hash chain alone.
- **Crypto**: AES-GCM and Ed25519 provided by vetted third-party `cryptography`, not homemade primitives. AES key, Phase III signing keys and Ed25519 signer are separate injected fake runtime secrets; no production key store/rotation workflow.
- **Backups**: encrypted container holds only ciphertext and an intentionally non-identifying AAD header. Isolated restored destination returns to plaintext and must never be used for founder data under this directive.
- **Outward boundaries**: no live export, email, purchase, publication, social posting, remote data access or credentials.

## Qualification tiers

- **Implemented and CI verified:** refer to the exact-head GitHub Actions result *after* PR branch update. The pre-commit local Q01–31 and baseline suites do **not** establish this tier by themselves.
- **Implemented and locally tested:** `phase4_security.py`, two narrow `durable.py` patches and synthetic tests Q01–31.
- **Source inspected:** Phase III backup/SQLite, grants, handoff envelopes, revoked state, public repo workflow.
- **Architecture proposed:** OIDC IdP/MFA connector, independent signing/key custody, externally immutable anchor, encrypted *active* data store, off-device backup.
- **Blocked by explicit founder approval:** actual sensitive source ingest, live IDP configuration, separate Supabase project/spend, production keys, production merge, publication and department activations.
- **Not tested:** administrator-resistant encryption, genuine rights evidence, full real-IdP assertion verification, hosted RLS/Supabase Storage, off-device disaster recovery, actual RPO/RTO, retention/legal holds, owner-assigned separate administrator roles.

**Never ingest confidential founder, legal, clinical or family materials until all real security gates are separately accepted.**