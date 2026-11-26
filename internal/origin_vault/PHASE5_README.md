# Origin Vault Phase V — SOURCE-ONLY, synthetic, NOT operational

Continue the original branch and Draft PR #271, Issue #269. Phase II 51 + Phase III 67 + Phase IV 31 regression cases must remain intact. Run all four phases using the existing GitHub Actions workflow or locally:

```bash
python -m unittest discover -s tests -p 'test_origin_vault_phase2.py' -v
python -m unittest discover -s tests -p 'test_origin_vault_phase3.py' -v
python -m unittest discover -s tests -p 'test_origin_vault_phase4.py' -v
python -m unittest discover -s tests -p 'test_origin_vault_phase5.py' -v
```

**What changed:** `DurableVault` accepts optional `content_key` (new synthetic Vault only, distinct from identity/approval/backup keys). When present, original/derivative bytes are AES-256-GCM-encrypted *before* SQLite insertion; direct plaintext export and backup are denied, legacy mode/downgrades refused and known-key/open checks enforced. Existing sealed snapshot helper can restore protected BLOBs only with appropriate `content_key`, but it is not the externally gated release API. `phase5_security.py` is an offline trust-custody simulator with monotonic signed checkpoint verification and quarantine-only recovery. `phase5_identity.py` is a pinned signed fake identity assertion verifier, not a live IdP.

**What remains unsafe for private materials:** other DB columns/SQLite metadata + journal are plaintext, unencrypted OS swap/temporary process memory may exist, external checkpoint custody is only simulated, trusted real identity/MFA and key escrow are not set up, and plain local restored metadata remains sensitive. The prior `restore_sealed_snapshot` development helper is still callable and does **not** itself demand the latest external anchor; a real service must enforce one centrally, not rely on a wrapper's optional use. There is no shipping secure backend. Do not ingest founder, legal, medical, family, subscriber or third-party documents. No live project, service, release, send, sales or spending authorization.

For exact environment, risk, responsibilities and future launch gates see `docs/ORIGIN_VAULT_PHASE5_QUALIFICATION.md` and `docs/ORIGIN_VAULT_PHASE5_ACCEPTANCE.md`.