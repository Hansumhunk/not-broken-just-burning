# Origin Vault — Phase 2 secure architecture and threat model

**Directive 003-B / Issue #269 · November 22, 2026**  
**Status:** reviewed **proposal only**; no production database, Storage bucket, branch, project, or external service created.

## Verified current boundaries

Read-only Supabase inspection confirmed an ACTIVE_HEALTHY project `NBJB Phase Two`, `public` member/commerce tables, an existing `private` schema holding *other departments' existing infrastructure*, and two existing **private** buckets for premium audio and commercial assets. The Vault shall not use these tables, that private schema, or these buckets. Current production systems remain independent.

The private Drive provenance/source register v0.1 was inspected as the policy context only. It is not reproduced here. It emphasizes separating underlying source records from derivative summaries, retaining contradictions, grading claims and AI-assisted attribution, and treating sensitive source titles and material as private.

## Architectural choice: local-first now; dedicated isolation only after approval

| Option | Security isolation | Cost implication | Recommendation |
|---|---|---|---|
| **A. Local-first Vault** | Disconnected original-byte storage; encrypted volume and separate locked backups, no browser/member access | No *new hosted* charge. Hardware, backup media, encryption/key management, loss and disaster-recovery labor still carry costs | **Chosen for current zero-spend, source-restricted work**, contingent on proper local security setup |
| B. Same NBJB Phase Two project, **distinct `origin_vault_private` schema and new private bucket** | Non-exposed schema; distinct backend identity and isolated storage policy, but same database/server/administrator and shared operational blast radius | No additional project compute just for using the same instance; possible DB/Storage/egress overages. Requires explicit approval before *any* schema or bucket creation | Future option for low-sensitivity approved material after independent role/RLS/Storage acceptance |
| C. Separate Supabase project and organization-scoped service identities | Stronger database, keys, backups and service isolation if configured correctly; not inherently a guarantee against cross-project management credentials | A second paid project generally starts around **$10/month** at Micro compute; charge varies with plan, region, scale and usage. Requires founder cost quote and approval | Preferred eventual hosted option for especially sensitive materials, **not authorized now** |

Pricing basis: Supabase's 2026 public billing guide states each added project adds compute cost; Pro plan includes organization-level compute credits and Micro is approximately $10 per month. This is *not an account-specific price quote* and no cost action was taken. Storage quota overage and backups may add expense.

## Explicit trust boundaries / threat model

| Threat | Control required | Current evidence / gap |
|---|---|---|
| Member/browser discovers originals | Private non-exposed schema, revoke `anon`/`authenticated`, RLS/least-privilege as defense in depth; no public or client-side service keys | Not deployed. Role restrictions only simulated in local policy tests |
| Identity spoofing / forged founder grant | Strong server-side authentication, founder hardware MFA, approval signature, non-editable approval ledger, short TTL, possible two-person reviewer gate | Test fixture uses `identity_verified` boolean only; **not** real identity assurance |
| Rights overclaim / third-party plagiarism | Capture rights evidence, license scopes, attribution and per-use approval; re-check on export, preserve provenance chain | Reference policy gates implemented; no legal rights adjudication |
| Sensitive clinical, family or case history ingested | Classification quarantine by default, safe reject workflow, narrow exception with separate founder authorization and legal/privacy review | Reference gate denies entirely in this phase |
| Leaked object URLs / keys | New private bucket, server-issued short TTL scoped access, never `service_role` in browser, audit URL issuance, key rotation | Not deployed; existing audio/product buckets deliberately untouched |
| Source alteration / audit rewriting | SHA-256 each immutable version, preserve original bytes, independently signed/off-system audit anchors and periodic comparison | Local hash and chain mutation detection tested; no immutable audit anchors |
| Cross-account access (IDOR/BOLA) | Validate identity/account/source grant on every backend operation and storage read, not only frontend | Reference negative test passed; not platform verified |
| Malicious files, symlinks, traversal, oversized inputs | No repository ingestion, rooted file descriptor traversal, size and MIME/virus checks, content scanning | Local Linux reader tested; antivirus/MIME scanning and cloud object rules pending |
| Crash, ransomware or disaster | Transactional writes and durable queue, encrypted 3-2-1 backups, monitored restores, RPO/RTO targets | No durable store/backups exists; restoration **not run** |
| Unauthorized downstream publication | Explicit separate rights + editorial + departmental release approval and idempotent outbound handoff; no automatic sends | Outbound integrations intentionally absent |
| Secret leakage through public Git or CI | Separate private runtime; public-safe code/schema/synthetic fixtures only; negative-path tests, manual secret scanning, no artifact uploads | Git-tree local reject test passed; independent repository-wide secret scan pending |

## Future private schema — source-only interface

See `docs/origin_vault_schema_PROPOSAL.sql`. It specifies *draft* entity boundaries:

- **source_records** — classification, owner/account, rights evidence reference, allowed license scope, revocation status, public-safe surrogate identifier. No source body.
- **source_versions** — immutable original-object storage pointer per version and SHA-256; version metadata with retention/legal-hold status.
- **approvals** — founder-approved per-purpose grants scoped to source/version/actor/account, expiry, and revocation; signed/authenticated decision provenance is required in real deployment.
- **concept_candidates** — candidate idea, source version links, terms/limitations; review-only.
- **derivative_candidates** — five allowed formats, source/concept lineage, revision and contributions; review-only.
- **approval_decisions**, **audit_events** — distinct editorial/release decisions and append-only events with off-system audit anchors in future implementation.
- **outbox_handoffs** — future opt-in export requests only; not an auto-publishing queue. Deactivated by default.

**Policy:** `public`, `anon`, `authenticated`, and existing member/marketing/commerce identities receive **no access**. The named private schema must not be added to Data API exposed schemas. The hosted Vault must have a distinct narrow-scoped backend role; until then no access grants are issued. Avoid shared `service_role` where possible because it can bypass RLS. Auth claims in user-editable metadata are never authorization input.

## Private object storage design (not provisioned)

New bucket name to be approved separately; always `public=false`, deny listing for all browser roles; object keys are opaque UUIDs, not source titles. Treat content as confidential even when a filename appears harmless. Upload only after ingestion approval and scanned content, encrypt in transit/at rest, use organization-approved key management, never expose decryption secrets in browser code. Verify byte hashes at ingest and retrieval. Preserve prior immutable source revisions, assign retention/hold rules per legal and licensing obligations, and enforce revocation at every read/export.

Deletion requests create an audited state transition, block new derivatives, honor retention/legal holds, and purge eligible bytes and backups under a documented lifecycle. **No automatic removal or retention deadline is asserted for historical personal records.**

## Backup and recovery: acceptance before hosting

Define RPO/RTO with the founder, back up metadata plus objects plus permission state to distinct encrypted storage, record a signed manifest of source-version hashes, periodically run independent restore drills into an isolated environment, compare hashes/version/permission/audit logs, confirm that no revoked access is restored, and log test evidence. Destroy isolated restoration copies after verification. A successful `pg_dump` alone is insufficient because Supabase Storage objects and keys are separate components.

## Safe implementation / rollback

1. Human review of the proposal SQL and identity model; no application to NBJB Phase Two in this directive.
2. Founder approval of a **specific isolated non-production target**, recurring cost and backup plan.
3. Apply schema/object/RLS grant tests only in that target, verify `anon`/`authenticated` failures and trusted role access.
4. Use separately authorized synthetic sources; demonstrate lifecycle and restore; hold release gates closed.
5. Review a rollback plan, including isolation of in-flight exports, restored assets and validated backup before any drop/migration reversal. No destructive rollback SQL is authorized here.

## Reference docs (checked 2026-11-22)
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/changelog.md — CLI v3 local-by-default and branch-merge permission changes; no branch or migration commands issued.