# Origin Vault Phase III — durable local-first architecture & hosted decision gate

**Directive:** 003-D; **coordination:** Issue #269, Draft PR #271. **Status:** source-only decision, no hosted provisioning, DDL, bucket, access grant or migration execution. Zero additional spending.

## Delivered local model (read carefully before extrapolation)

New `internal/origin_vault/durable.py` uses Python 3.13 stdlib `sqlite3`, SQLite `BEGIN IMMEDIATE` transactions, WAL `synchronous=FULL`, foreign keys, append-only original-source and derivative version rows protected by SQLite triggers, HMAC-signed test identities/one-time owner grants and SHA-256 source/derivative checks. Audit rows track lifecycle hashes. SQLite `backup()` creates a consistent DB snapshot, an HMAC-signed manifest, integrity and isolated restore tests. This stores bytes in a **local unencrypted SQLite BLOB**, which is intentional for synthetic acceptance and **not approved for real founder source material**. Data and database objects remain outside the public Git checkout and CI artifacts.

A valid HMAC test signature only proves possession of the injected secret; it is **not** founder identity, human rights verification, evidence adjudication, third-party timestamping, encryption at rest, or a trusted cross-device disaster recovery guarantee. Local administrators can rewrite data/triggers and, if they possess the signing key, forge a new manifest. A complete production design requires separate hardware-backed keys, server-side identity proofs, operational IAM, KMS-encrypted source object storage, independent immutable audit anchors, retention/legal hold review and off-site encrypted backup with monitored restore drills.

## Host choice (no approval to create anything)

| Model | Isolation and credential boundary | Security/recovery liabilities | Cost posture | Decision |
|---|---|---|---|---|
| **A. Local-first** | No browser API. Strongest default data-minimization if real use eventually moves to OS-encrypted offline volume; synthetic implementation presently unencrypted | Host theft, disk damage, local malware, no independent custodian, missing encrypted off-device backup, owner signing-key custody | No *new hosted service* cost; no claim of free backups, media, professional review or recovery | **Continue this model only with fake records at zero spend** |
| **B. Existing Supabase project, new `origin_vault_private` schema + dedicated private bucket** | Browser roles denied; non-exposed schema, purpose-specific server identity, RLS defense in depth; however shares administrators, project service_role, compute, operational accounts and blast radius with current membership/commerce | Must ensure Data API schema exclusion, storage RLS, zero browser access, secret isolation, backup consistency for DB metadata + object bytes, incident/key rotation. Existing `private` schema and two other private buckets must NOT be reused | No separate project compute when sharing an existing instance, but storage, egress and resource usage may increase | **Not approved; future only with narrow risk acceptance and full permission tests** |
| **C. Fully separate Supabase project with distinct IAM and credentials** | Separate Postgres/Auth/Storage instance and service keys, separate backups and incident response if management grants are scoped | Still not isolated if shared founder/organization admin credentials or shared secret vault; separate encrypted backup, legal access procedures and operating cost required | Supabase states every new project adds compute; extra paid micro project can add at least **~$10/month** compute before other services (public price basis, not account quote) | **Preferred eventually for sensitive hosted Vault, subject to founder approval and verified cost** |

**Sources checked November 22, 2026:**
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/platform/your-monthly-invoice
- https://supabase.com/docs/guides/platform/manage-your-usage/compute
- https://supabase.com/docs/guides/platform/manage-your-usage/branching
- https://supabase.com/docs/guides/storage/buckets/fundamentals
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/changelog.md (CLI v3 defaults to local operations; hosted changes still require explicit authorization). 

The available `get_cost` API requires an explicit founder-provided organization ID and follow-on confirmation; **no cost quote was requested or billable infrastructure action taken**. The minimum infrastructure approval request must specify actual target, measured monthly estimate, permissions, retention and rollback budget.

## Hosted boundary implementation contract — PROPOSAL ONLY

The previously committed `docs/origin_vault_schema_PROPOSAL.sql` remains a **non-executed schema proposal**, not a migration. A future hosted implementation should separate:

1. **Metadata** in a non-exposed private schema with source classifications, evidence refs, source-version/object digests, owner/account scope, one-time signed grants, revocations, editorial approvals, derivative lineage, idempotency and audit entries.
2. **Original byte storage** in a **new dedicated private bucket** or project-isolated object store. Never write founder source bytes in public database, existing premium-audio bucket, commercial-assets bucket, or website Git history. No signed URL issuance without bounded server-side authorization.
3. **Identity and approval signing service** with owner sign-in + MFA, server-validated subject/account/role, independent signer identity, one-use grant IDs, externally anchored approvals, revocation invalidation and short token TTL. Never authorize from user-editable JWT metadata or front-end flags. Do not distribute private signing keys to code/CDN/PR/CI.
4. **Trusted ingestion and derivative workers** use least privilege, separate per-purpose grants, source rights/license evidence review, content scanning, retention/legal holds and clear attribution; a SHA-256 hash is only an integrity digest.
5. **Department handoffs** are isolated review-only envelopes. Education, Eternal Flame Engine, Revenue Forge and Content/Social each require independent downstream editorial/marketing/consent/product/fulfillment/release gates. Executive Command only gets aggregate counts and blockers.
6. **Backup and restore** include metadata, encrypted objects, grant/revocation history, key custody, test identities, hash manifests and independent anchoring. Periodic restores must be performed under different credentials in an isolated environment with defined RPO/RTO, verify all versions and no revived permissions.

Before authorizing any hosted engineering: identify the owner of backup keys and who can delete objects, documented incident recovery plan, independent third-party security review for personally sensitive material, lock down exposed schemas and prove `anon`/`authenticated`/cross-account denial and privileged worker access in a **separately authorized test environment**.

## Key denial boundaries demonstrated now

- **Not a rights engine:** no untrusted text may declare itself owned through hashes, signed fixture tokens or LLM assertions.
- **Not a live vault:** local file encryption, admin-resistant logs, external identity, distributed locks, remote backup, AV/MIME scanning, searchable real private content, hosted login/RLS/storage, arbitrary trust revocation at the IdP, consent export, secure deletion have **not** passed.
- **No revenue or marketing execution:** safe department preview interfaces return only non-identifying review metadata; a draft does not carry authority to send, sell or publish.

## Founder dependencies (no action requested for continuation of synthetic work)

**Required for hosted / sensitive next stage only:** (1) recover exact Phase I ZIP or explicitly accept it remains unrecovered (without misidentification); (2) choose an isolated hosted development target **and approve its verified cost**; (3) authorize any named real source separately with rights/consent evidence and treatment of clinical/legal data; (4) approve production hosting, credentials and editorial/publication/commerce release **separately after independent tests**. Never treat approval of one as approval of another.