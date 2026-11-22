# Origin Vault Phase IV — operational qualification and founder approval package

**2026-11-22 · source-only design, synthetic tests, zero new spending.** Coordinated via Issue #269, Draft PR #271. No hosted resources created or mutated.

## 1. Identity and human approval — enforcement handoff contract

The `phase4_security.verify_synthetic_founder_contract()` function **only validates supplied assertion fields**; it is intentionally **not** a cryptographically verified OIDC, JWT or live MFA implementation. Future private trusted service must:

1. **Authenticate:** founder enrollment through a named identity provider; enforce phishing-resistant WebAuthn/passkey for privileged founder requests and separately verified recovery factors. Disable self-assigned editor/admin roles. Any relevant Supabase provider and feature support must be verified against the exact account plan before configuration.
2. **Server-verify:** OIDC discovery issuer, pinned expected audience/client, signed `id_token`/access token against trusted JWKS including algorithm allowlist, unexpired token, `sub`, `aud`, `iss`, `exp`, `nbf`, nonce/state for login, secure session cookie, fresh `auth_time` and actual verified `amr`/`acr` status. Protect from stale sessions or IdP account deletion. Never trust browser-provided MFA booleans or user-editable JWT metadata.
3. **Authorize server-side:** map stable IdP `sub` to a protected owner/account/role registry, not self-asserted token `role`. Require custodian/editor/reviewer segregation; founder-only final approval; explicit step-up authentication for source registration, rights grant, export, sensitive deletes and commercial/publication requests.
4. **Issue a signed decision:** a separate, restricted signer issues one-time approval ID bound to **source ID/version/SHA, actor ID, owner/account, rights evidence ID, permitted purpose, derivative kind and/or destination, token expiry, source revocation epoch, and requesting session**. Only trusted server may store or consume the approval; no signing keys in browser, CI or source repository.
5. **Enforce separated gates:** register source → verify rights evidence (independent from possession/hash) → grant process permission → separately approve derivative kind → human review and editorial signoff → separately authorize a department handoff → receiving department verifies its own consent/publishing/product/fulfillment gate. Invalidation of source, session, issuer keys or rights immediately blocks all pending decisions. Revoke signing keys and all sessions under incident workflow.
6. **Prove in staging:** wrong account, wrong actor, lost MFA, stale IdP session, modified JWT, wrong issuer/audience, replays, revoked rights, old version, expired grant, anonymous/browser access, cross-role access, administrator change, approval-key rotation and kill-switch tests against the actual service. None have been executed on a live IdP.

**Synthetic approved fields:** `iss`, `aud`, `sub`, protected `account_id`, `role`, `auth_time`, `exp`, `amr` with WebAuthn. Test fixtures cannot make real grants. **Hard required environment decisions:** who owns IdP tenant, allowed founder devices, account recovery method, protected admin assignments, approval-signing key location, incident revocation operator, data classification, contact for rights disputes.

## 2. Encryption and key custody

- **Demonstrated only:** pyca/cryptography AES-256-GCM, random 96-bit nonce, authenticated context-bound header and 128-bit authentication tag; in-memory serialized SQLite backup encrypted into `.ovb`; local encrypted fake review artifact `.ovr`; rotated backup to a new file; forged/truncated/incorrect key and context denied. Ed25519 checkpoints verified using an independently supplied public key. No bespoke cryptographic algorithms.
- **Live active storage still plaintext:** SQLite `.sqlite3`/WAL, `sources.data`, derivative BLOB, rights metadata, outbox and restored database remain plaintext. `os.chmod(0600)` is **not encryption**. No private material may enter this build.
- **Production candidate:** choose a vetted actively maintained full-database encrypted solution compatible with the deployed OS (e.g., reviewed SQLCipher integration) plus per-object AEAD for original/export bytes, encrypted temp/swap/log protection, and encrypted transport. Confirm algorithm/license/runtime support and run a separate migration test. Do not claim this PoC implements SQLCipher.
- **Separation:** device full-disk key, active-data encryption key, approval-signing key, audit-attestation key and backup encryption key belong to separate controlled roles/stores. Do not save keys in SQL, CI environment, GitHub artifacts or on the same unprotected backup media. No arbitrary memory dump/log of decrypted values. Use KMS/HSM or vetted OS keychain with MFA, documented operator access and independently protected recovery material. Rotation must rewrap or re-encrypt all retained versions; revoking a key without a safe recovery plan can make data permanently unreadable.
- **Privileged administrator boundary:** an admin controlling OS, runtime and all keys can always read or alter data. Independent custody and external attestations reduce blast radius; a locally stored Ed25519 signature with an exposed signing key **does not** provide third-party proof.

## 3. Signed audit anchoring and revocation rollback

Phase III locally chains `event_hash` but permits privileged rewriting. New Q22/Q23 demonstrate such changes still passing `verify_integrity()`; a separately signed Ed25519 checkpoint contains canonical logical digest across *all seven security-relevant tables*, audit head, sequence, vault identifier and monotonically increasing checkpoint ID. An independently held latest checkpoint detects later data changes and rollback of a valid older backup (Q24). **This is a synthetic demo:** the latest anchor must be stored on a separate access-controlled, append-only/offline system with independent signing-key custody, verified independent time and monotonic version; protected local screenshots or files are not adequate. After restore, compare latest remote anchor/revocation epoch before enabling access. Gap between checkpoints is a real rollback window. Test deliberate local administrator editing, local file deletion and compromised signer incident.

## 4. Disaster recovery qualification, not an off-site restore claim

| Item | Locally demonstrated | Missing to qualify real resilience |
|---|---|---|
| Snapshot consistency | Phase III SQLite backup & Phase IV in-memory encrypted backup | Independent host / version matrix; hot-write isolation at production scale |
| Confidentiality | AES-GCM synthetic `.ovb`, tag failure and wrong-key denial | Encrypted **active** store, volume/swap/temp encryption, key custody, remote credentials |
| Isolation | Restore requires absent destination, validates structure and original version hashes | Distinct physical device and account; secure sandbox; malware/host compromise assessment |
| Revocations | Recent separately signed checkpoint detects restored old state | Durable external revocation clock; reconciliation gate before activation |
| Encrypted object bytes | Snapshot protects SQLite records | Explicit object storage and outbox backup plan; avoid false claim of restored `outbox` |
| Version history | Phase III append-only rows/triggers | Real retention policy, independent append-only destination and verify multiple backup generations |
| Legal hold / deletion | **Not implemented** | Signed hold decisions, litigation preservation rules, GDPR/retention analysis, deleted backups/media/key rotation |
| Key-loss recovery | **Not implemented** | Two-person recovery, separate encrypted recovery kit, irrecoverable loss drills and revocation |
| Off-device loss | **Not tested** | Separate hardware/account, separate encryption keys, offsite copies and full restore exercise |
| RPO/RTO | **Not measured** | Founder selects acceptable loss window and recovery deadline; measure with controlled full-stack restoration |

**Proposed future runbook, not executed on real data:** stop new approvals → suspend all outward connectors → record trusted latest external checkpoint and rights revocation epochs → authenticate two independent custodians → read trusted remote encrypted backup → restore isolated hardware into encrypted active store → integrity-check every source/derivative/permission and provenance record → verify remote anchor, entitlement and retention hold → reject stale permissions/old sessions → complete negative access tests → founder explicitly signs resumption. If key or audit anchor lost, remain quarantined and disclose the gap; do not silently reconstruct ownership.

## 5. Hosting decision (no new project authorized)

| Option | Isolation | Principal risk | Costs/recovery | Conclusion |
|---|---|---|---|---|
| **A. Local-first** | Can avoid public app API; requires separate encrypted device, backup and key holders | Lost device, malware, local admin and inaccessible off-device backup | No added cloud project; **hardware/backup security not proven free** | **Continue synthetic engineering today; never use real sources without full-disk/active DB encryption and separated trusted backup** |
| **B. Existing `NBJB Phase Two` Supabase, private schema and new private bucket** | Separate non-exposed schema, new bucket and policies, but **same project** administrators and service-level blast radius | Shared `service_role`, compromised operations, accidental RLS/Data API exposure, commerce/member systems coupled | No new compute project but storage/egress/backups may add charges; same-instance incident affects all | Not preferred for sensitive founder originals; only with explicitly approved shared-risk acceptance |
| **C. Separate Supabase project** | Separate DB, Auth, storage, service keys, policies, backup lifecycle if operational account privileges are scoped | Shared organization administrators could still bypass logical isolation unless independently governed | Supabase publicly states extra paid project incurs **at least ~$10/mo incremental compute after the $10 organizational credit** (not an account-specific quote), plus storage/network/backups and plan charges | **Preferred future hosted candidate**, pending founder written approval, actual quote and staging acceptance |

Public sources verified 2026-11-22: https://supabase.com/docs/guides/platform/your-monthly-invoice ; https://supabase.com/docs/guides/platform/billing-on-supabase ; https://supabase.com/docs/guides/platform/compute-and-disk ; https://supabase.com/docs/guides/storage/buckets/fundamentals ; https://supabase.com/changelog.md . Supabase CLI v3 runs local by default, but do not run it in this initiative without specific authorization. **No live billing or project change was made.** If project separation requires a paid plan, independent backup cost or additional credentials, obtain actual in-account estimate before any checkout.

## 6. Departmental review contracts

Only a metadata-only, review-only descriptor may cross an **unconnected** integration boundary. Each handoff needs: `{source_digest, source_version, derivative_digest, derivative_version, account, purpose, rights_evidence_ref, founder_approval_id, approval_expiry, revocation_epoch, permitted_department, independent_editorial_review_id, outbound_disabled: true}`. No raw bytes or private titles. Actual handoff must authenticate the recipient and enforce consent/release checks. The Phase III `preview_handoff` only returns descriptive metadata and stays unchanged; **no email, Stripe, browser, publication, public Git source upload, social connector or downstream API** is activated.

- Education: lesson/workbook candidates only; distinct educational editorial permission.
- Eternal Flame Engine: newsletter **draft** only; Brevo double opt-in/suppression and campaign release always independent.
- Revenue Forge: commercial manuscript candidate only; price, SKU, payment/fulfillment and customer entitlements always independent.
- Social: non-identifying approved excerpt/script candidate only; channel-specific approval and publisher gate always independent.
- Executive Command Hub: aggregate counts/security blocker states without source text, personal names, private metadata or direct access to original records.

## 7. Phase I archival exception

Earlier directed searches of uploaded project files, available Library entries, Drive and GitHub did not locate the **exact original Phase I ZIP/Python/SQLite sources and its original ten test bytes**. Phase IV does not purport to recover or recreate it. Keep missing in historical register and require either original artifact with checksum/test replay or an **explicit exception** stating unavailable historic evidence; such exception never constitutes acceptance of missing original IP01–25 cases. Do not indefinitely block independent development.

**Original IP01–25:** 11 historical PASS, 6 PARTIAL, 6 BLOCKED, 2 NOT RUN, all unchanged. Phase II 51, Phase III 67, Phase IV Q01–31 remain separately named suites.

## 8. Single founder decision package for *future* staging

**No founder action is needed for current synthetic engineering.** To progress beyond synthetic-only without violating authority, the founder must separately decide:

1. **Historical archive:** supply exact original Phase I prototype/tests, **or** approve a written archival exception preserving the gap (not a substitution for acceptance).
2. **Operating topology:** select A/B/C, name secure staging environment, review a real monthly cost estimate (if C) and expressly approve any project/account/spend creation. Until then **$0 spending**.
3. **Security ownership:** specify trusted IdP, passkey MFA devices/recovery, source custodian, founder-only authorization signer, independent audit signer/anchor custodian, backup encryption key custodian and incident suspension authority.
4. **Recovery policy:** approve retention/legal hold procedures, off-device backup location, RPO/RTO targets, secure deletion obligations, annual restore cadence and a budget (if needed).
5. **Separate release gates:** allow production only after independent pen test, actual MFA/session authorization, encrypted active storage, remote restore and audit-anchor acceptance. Give separate later consent before any named sensitive source ingestion or publication/commercial/marketing release.

**Founder approval of one item never implicitly approves another. Do not create, spend, ingest, merge, publish or deploy in this phase.**