# Origin Vault Phase IV — separate executable synthetic security acceptance

**Scope:** Linux / Python 3.13.5 / SQLite 3.46.1 / `cryptography` 46.0.4, using only fake source text and ephemeral random test keys. Q01–Q31 correspond to named methods in `tests/test_origin_vault_phase4.py`. Reproducible invocation: `PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tests -p 'test_origin_vault_phase4.py' -v`. CI must run Phase II, Phase III and Phase IV in *distinct* steps and emit no source bytes, keys, test databases or backup artifacts. Baseline: accepted Phase III `c3c3988ab3a65a6418e5adfe9922d682aaad54b4`.

| ID | Expected property / negative condition | Local outcome | Evidence |
|---|---|---|---|
| Q01 | AES-GCM authenticated round trip | PASS | `test_q01` |
| Q02 | Synthetic plaintext absent from encrypted envelope | PASS | `test_q02` |
| Q03 | Wrong AES key denied | PASS | `test_q03` |
| Q04 | Modified ciphertext denied | PASS | `test_q04` |
| Q05 | Truncated ciphertext denied | PASS | `test_q05` |
| Q06 | Encrypted context/purpose or reference mismatch denied | PASS | `test_q06` |
| Q07 | Unsupported short key denied | PASS | `test_q07` |
| Q08 | Fresh per-object random nonces yield different ciphertext | PASS | `test_q08` |
| Q09 | Encrypted review fixture is private, decrypts locally only | PASS | `test_q09` |
| Q10 | Protected review artifact refuses overwrite | PASS | `test_q10` |
| Q11 | Review artifact symlink destination denied | PASS | `test_q11` |
| Q12 | SQLite synthetic source absent in ciphertext backup, decodes verified file image | PASS | `test_q12` |
| Q13 | Authenticated backup restores isolated synthetic SQLite with source integrity | PASS after WAL header normalization | `test_q13` |
| Q14 | Wrong-key restore denied before creating target | PASS | `test_q14` |
| Q15 | Backup ciphertext modification detected | PASS | `test_q15` |
| Q16 | Existing restore target cannot be overwritten | PASS | `test_q16` |
| Q17 | New encrypted key protects rotated snapshot, previous key cannot unlock new copy | PASS | `test_q17` |
| Q18 | Trusted Ed25519 checkpoint verifies original state | PASS | `test_q18` |
| Q19 | Altered checkpoint payload invalidates signature | PASS | `test_q19` |
| Q20 | Wrong public verifier denied | PASS | `test_q20` |
| Q21 | Checkpoint from other vault identifier denied | PASS | `test_q21` |
| Q22 | Privileged rights metadata change may pass internal ledger, but latest external checkpoint rejects | PASS, weakness reproduced | `test_q22` |
| Q23 | Privileged attacker rehashes complete local audit, independent signed checkpoint still rejects | PASS, weakness reproduced | `test_q23` |
| Q24 | Old legitimate backup before revocation cannot pass later trusted checkpoint | PASS, rollback reproduced | `test_q24` |
| Q25 | Older signed checkpoint denied by monotonic min counter | PASS | `test_q25` |
| Q26 | All three Phase III injected keys are distinct in test setup | PASS | `test_q26` |
| Q27 | Reused Phase III identity+owner signer key rejected | PASS **after fix**; previously FAIL | `test_q27` |
| Q28 | Structural fake founder contract requires recent MFA/WebAuthn and correct subject/account | PASS | `test_q28` |
| Q29 | Missing WebAuthn and wrong account denied | PASS | `test_q29` |
| Q30 | Stale reauthentication denied | PASS | `test_q30` |
| Q31 | Symlinked private-root **parent** rejected | PASS **after fix**; previously FAIL | `test_q31` |

**Interpretation:** 31/31 local successes do **not** establish a real identity provider, encrypted live data store, administrator-resistant audit, external anchor custody, offsite recovery, legal rights verification or safe private-data ingestion. Every signature/key here is a synthetic fixture. CI result and exact commit must be added by independent workflow, not inferred from local success.

## Historic matrices, NEVER promoted

- **Original IP01–IP25:** 11 historical PASS, 6 PARTIAL, 6 BLOCKED, 2 NOT RUN. Original Phase I source files and ten tests still unrecovered, no original case definition replayed.
- **Phase II:** 51 synthetic standard-library policy tests, accepted prior result; must rerun unchanged.
- **Phase III:** 67 synthetic SQLite/identity/recovery tests, accepted prior result; must rerun unchanged.
- **Phase IV:** Q01–Q31 *new* distinct synthetic encryption/checkpoint/identity-contract/security regression tests.

## Failure → repair record

- Q27 reproduced an actual independent HMAC key-reuse acceptance flaw (pre-fix FAIL: no `AccessDenied`), then the narrow `DurableVault.__init__` identity/owner/backup key inequality check made it PASS.
- Q31 reproduced an actual symlinked **ancestor** admission flaw (pre-fix FAIL: no `AccessDenied`), then the `_safe_root` symlink-ancestor rejection made it PASS.
- Q13/Q24 initially ERROR because `sqlite3.deserialize` cannot reopen a backup image with WAL header flags in an in-memory connection. A narrowly scoped, **in-memory only** SQLite file-header journal normalization at bytes 18–19 and revalidation made both PASS. No custom encryption algorithms were used.
- Q22/Q23 demonstrate administrator integrity limitations despite local `verify_integrity()` reporting true, and successful detection **only** when trusted independent Ed25519 checkpoint is retained outside the compromised trust boundary.

## Reproducible environment record

- Python `3.13.5`, SQLite `3.46.1`, `cryptography==46.0.4` (vetted pyca primitive), Linux ephemeral `tempfile.TemporaryDirectory` restricted directories, all fake documents and in-memory random keys.
- No network in unit tests. GitHub Actions job may install the pinned public dependency; test job must never upload artifacts.
- Pre-fix logs local: `/mnt/data/origin_vault_phase4_prepatch.log`, `/mnt/data/origin_vault_phase4_symlink_prepatch.log`; normal local final reruns in separate logs. These sandbox logs are *not* GitHub artifacts and contain only synthetic test names.