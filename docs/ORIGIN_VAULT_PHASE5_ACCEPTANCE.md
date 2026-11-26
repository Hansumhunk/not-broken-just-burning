# Origin Vault Phase V — reproducible synthetic security acceptance

**Environment:** local Python 3.13, standard SQLite, pyca/cryptography installed, Linux ephemeral directories and synthetic generated keys; no internet/external identity, real documents, hosted storage, source secrets or CI artifacts. **Command:** `python -m unittest discover -s tests -p 'test_origin_vault_phase5.py' -v`. New tests independent of the 51+67+31 established Phase II–IV tests.

| Case | Expected / actual when run locally | Result | Evidence reference |
|---|---|---|---|
| V01 | Source encrypted BLOB, neither SQLite DB nor WAL contains synthetic plaintext, integrity valid | PASS | `test_v01_active_source_encrypted_on_disk_and_wal` |
| V02 | Scope-bound preview requires grant; valid granted operation decrypts | PASS | `test_v02_preview_requires_original_approval_and_decrypts` |
| V03 | Derivative BLOB protected; reviewed handoff contains metadata only | PASS | `test_v03_derivative_encrypted_in_SQLite` |
| V04 | Wrong content key refuses re-open | PASS | `test_v04_protected_mode_wrong_key_rejected_after_restart` |
| V05 | Missing content key refuses protected Vault open | PASS | `test_v05_protected_mode_refuses_missing_key` |
| V06 | Old plaintext DB cannot silently be rebranded protected | PASS | `test_v06_legacy_mode_refuses_protected_content_key` |
| V07 | Content key reuse with signing/identity keys blocked | PASS | `test_v07_protected_key_must_be_independent` |
| V08 | Plaintext review outbox disabled in protected mode | PASS | `test_v08_no_plaintext_legacy_export_even_with_authorized_grant` |
| V09 | Plaintext .sqlite3 backups disabled in protected mode | PASS | `test_v09_no_plaintext_backup_generation` |
| V10 | Privileged plaintext BLOB substitution rejected by integrity | PASS | `test_v10_replacing_ciphertext_with_plaintext_rejected` |
| V11 | Modified AEAD ciphertext rejected by integrity | PASS | `test_v11_tampered_ciphertext_fails_integrity` |
| V12 | Sealed backup restores synthetic protected BLOB with correct content key | PASS | `test_v12_sealed_snapshot_recovers_protected_blob_only_with_content_key` |
| V13 | Fake separate checkpoint retains only verified signed latest record | PASS | `test_v13_checkpoint_issued_to_independent_simulated_registry` |
| V14 | Replay of checkpoint sequence rejected | PASS | `test_v14_checkpoint_replay_denied` |
| V15 | Decreased checkpoint sequence rejected | PASS | `test_v15_checkpoint_regression_denied` |
| V16 | No independent latest anchor: restore rejected before file write | PASS | `test_v16_missing_latest_anchor_fails_closed` |
| V17 | Matching latest anchor: synthetic restore **quarantined, never released** | PASS | `test_v17_matching_latest_backup_restores_quarantined_not_released` |
| V18 | Old valid snapshot before newer revoked approval refused | PASS | `test_v18_old_signed_backup_cannot_resurrect_revoked_approval` |
| V19 | Wrong vault/checkpoint identity refused | PASS | `test_v19_foreign_checkpoint_cannot_qualify_recovery` |
| V20 | Wrong backup key rejected without decrypted destination | PASS | `test_v20_rejected_wrong_backup_key_does_not_leave_decrypted_files` |
| V21 | Fake pinned Ed25519 ID assertion verifies correct context and fresh MFA claim | PASS | `test_v21_pinned_fake_idp_signature_plus_mfa_checked` |
| V22 | Forged test issuer signature rejected | PASS | `test_v22_forged_fake_idp_signature_denied` |
| V23 | Wrong audience, account, role or subject rejected | PASS | `test_v23_wrong_audience_or_cross_tenant_denied` |
| V24 | Stale MFA assertion denied | PASS | `test_v24_stale_passkey_assertion_denied` |
| V25 | Modified browser-supplied assertion without valid issuer signature denied | PASS | `test_v25_browser_claim_without_verified_signature_denied` |
| V26 | Simulated revoked session ID rejected | PASS | `test_v26_revoked_idp_session_denied` |
| V27 | Unknown issuer key ID rejected | PASS | `test_v27_wrong_kid_denied` |

**Locally observed result:** `Ran 176 tests ... OK` (51+67+31+27). No formal red/green regression claim for original 149, which were previously independently accepted. The Phase V local test fixtures had two test-construction mistakes corrected before final success (wrong handoff role and a test that initially did not mutate the browser claim). Neither demonstrated a new core vulnerability.

**Not qualified by these tests:** full active SQLite encryption, WAL metadata confidentiality, real OAuth/WebAuthn, independent persistent checkpoint storage, signer compromise recovery, cross-device restoration, RPO/RTO, KMS, real rights provenance, legal hold enforcement, production readiness. Historical IP01–IP25: 11 prior PASS / 6 PARTIAL / 6 BLOCKED / 2 NOT RUN, unchanged; original ten tests unrecovered.