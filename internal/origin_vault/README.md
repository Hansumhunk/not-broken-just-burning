# Origin Vault Phase 2 — isolated policy reference (new work)

**Status:** non-production, synthetic-only; **not** the recovered Phase 1 Python/SQLite prototype.
**Coordination:** NBJB GitHub Issue #269. Founder Directive 003-B (2026-11-22).

This directory contains fail-closed *reference gates* for source classification, rights and per-purpose permission, local candidate-file safety, concept and derivative **metadata** lineage, and tamper-evident (not immutable) audit chaining. It intentionally does **not** implement a hosted Vault, password/auth provider, encrypted durable store, real source ingestion, outbound file export, newsletter send, commercial publication, or secure backup engine.

## Run, without dependencies

At repository root, with Python 3.11+ on Linux:

```bash
python -m unittest discover -s tests -p 'test_origin_vault_phase2.py' -v
```

Test evidence: 51/51 passed locally on 2026-11-22, using synthetic identifiers/bytes. The pre-existing ten Phase 1 prototype tests were **not** recovered or re-executed. No public source or founder-private material has been imported.

## What the code enforces

- Classifications: `public_educational_original`, `third_party_licensed`, `personal_private`, `clinical_legal`, `uncertain_rights`. All except the first two are **unconditionally blocked** at this stage.
- Verified rights evidence and, where applicable, scoped license plus attribution must exist independently of a hash.
- Founder's per-source, per-account, per-actor, per-purpose grant must be current and unrevoked. The identity/approval booleans in unit tests are **not verified real identities or signatures**.
- Five derivative kinds are separately authorized: `lesson`, `workbook`, `flame_letter`, `short_video`, `course_module`.
- Both concepts and derivatives are metadata-only and `candidate_review_only`. There is no publishing primitive.
- Local candidate reads use POSIX `openat`-style file-descriptor traversal with `O_NOFOLLOW`, regular-file and size checks, rejecting git working trees, symlinks, absolute paths and traversal. Not Windows-compatible, and **not** a substitute for hardening object storage, antivirus scanning or content moderation.
- The audit chain detects local mutation but **can be re-written by an attacker with full storage control**; a trustworthy timestamp and off-system signed anchors remain future work.

## Separate unfinished gates

1. Recover the original artifact and ten tests, inspect its SQLite layout and reconcile these gates; do not automatically overwrite it.
2. Implement real founder identity, review/signature flow, owner authorization, rights adjudication and multi-person separation of duties.
3. Design and test encrypted private storage, immutable version history, safe retention/revocation, independently anchored audit, backup/restore, and deletion/legal holds.
4. Test isolation across real Supabase identity contexts and disabled browser roles in a separately approved non-production environment.
5. Subject each departmental handoff to a separate editorial/release/consent/payment gate. No automated connectors have been built.

**Never add actual vault data, personal journals, legal/clinical records, provenance register contents, real source documents or secret credentials to public GitHub, including issues, PR text and CI artifacts.**