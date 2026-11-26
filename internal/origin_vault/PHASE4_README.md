# Origin Vault Phase IV: security hardening (synthetic only)

Continuation of accepted Phase III code within **Draft PR #271 / Issue #269**, not a replacement engine. **No production deployment, real source ingestion, founder identity credentials, external integration, revenue, marketing or paid infrastructure.** Historical Phase I prototype and ten tests are still unavailable.

## New code

- `phase4_security.py` uses **pyca/cryptography 46.0.4** AES-256-GCM for sealed synthetic review artifacts and backup snapshots. SQLite's online backup runs directly into an in-memory SQLite connection; its serialized image is validated, sealed and written to an `.ovb` ciphertext file. No plaintext `.sqlite3` backup is created by this new path. New restoration writes plaintext SQLite **only inside a distinct synthetic test directory**; the live Vault SQLite and original outbox stay plaintext and are NOT approved for sensitive materials.
- Separately held **Ed25519** signed checkpoint of all seven security-relevant tables, per-row content hashes and current audit head/version. Offline checkpoint validation rejects some privileged rewrites and historical backup rollback. Real anti-rollback requires a separately protected **latest** checkpoint with monotonicity under independent custody, not merely a local signature.
- Structural pretend founder MFA contract verifies synthetic assertion fields **only**: the supplied values are not actually cryptographically verified IdP claims. Never call it on untrusted frontend input or claim identity is established.
- Two narrow Phase III `durable.py` fixes: injected identity/approval/backup keys cannot be identical; all symlinked parent components of a Vault root are rejected.

## Tests

```bash
python -m pip install --disable-pip-version-check --no-input 'cryptography==46.0.4'
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tests -p 'test_origin_vault_phase2.py' -v
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tests -p 'test_origin_vault_phase3.py' -v
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tests -p 'test_origin_vault_phase4.py' -v
```

**Never execute this with founder journals, legal/clinical documents, customer data or real production passwords.** The **pin above** only documents free-source testing; changes to a production dependency require a separate supply-chain review. Tests generate random fake keys within memory; GitHub Actions job provides no secret credentials, performs no API calls and retains no artifacts.

## Material open gates

Real MFA and trusted founder authorization; rights/licensing evidence checks; encrypted **running** SQLite / source metadata / WAL / temporary files and exports; independently anchored latest audit checkpoint; off-device encrypted restore, key custody/recovery, legal holds and deletion; actual account-specific price and project boundary; external security acceptance on the exact hosting environment. **The Vault is NOT operational.**