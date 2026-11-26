# Origin Vault — department handoff contracts v0.1 (design only)

**Status:** no live API, no queues, no source content exports, no production integrations.

## Required shared envelope for a future approved handoff

```json
{
  "contract_version": "0.1-proposal",
  "derivative_id": "synthetic-derivative-id",
  "derivative_version": 1,
  "derivative_kind": "lesson",
  "source_lineage": [{"source_id":"synthetic-source-id", "version":1, "sha256":"<sha256-hex>"}],
  "candidate_sha256": "<sha256-hex>",
  "rights_evidence_ref": "opaque-approval-proof-id",
  "founder_source_permission_id": "opaque-source-grant-id",
  "editorial_decision_id": "opaque-review-id",
  "department_release_permission_id": "opaque-department-grant-id",
  "permitted_purpose": "education_handoff",
  "destination": "educational_platform",
  "expires_at": "RFC3339 timestamp",
  "revocation_epoch": 0,
  "attribution_ref": "opaque-attribution-id-or-null",
  "contribution_labels": ["original-source", "human-edit", "ai-assisted"],
  "review_only": true,
  "idempotency_key": "scoped-unique-id"
}
```

All identifiers are synthetic and opaque in this example. Evidence refs are not proof by themselves; they refer to a protected verified decision record. **An envelope never directly grants read access to Vault originals.** Contents are handed off in the future only by a separate server-side authorization check, with explicit target permission, expiry and version matching. The current policy reference cannot send this object anywhere.

| Department | Allowed future payload | Independently required gate | Forbidden by default |
|---|---|---|---|
| **Educational Platform** | Editorial-approved teaching manuscript + public-safe attribution, checksum and scope | Rights, original-source permission, editorial approval, exact lesson target acceptance | Founder journal, raw legal/clinical source, source-object URL, unpublished private context |
| **Eternal Flame Engine (PR #268)** | Approved newsletter **draft** with approved attribution and provenance IDs | Separate Flame Letter editorial and Brevo consent, suppression, double opt-in, sender and marketing release | Automatic campaign activation, raw source data, subscriber lists |
| **Revenue Forge** | Founder-cleared commercial manuscript candidate, scope/license record and digest | Commercial rights, editorial approval, SKU/price, independent secure fulfillment and checkout QA gates | Automatic product listing, sale, purchase entitlement or download |
| **Content & Social** | Explicitly approved excerpt or video script candidate with public attribution | Per-channel publishing authorization, review of potentially identifying excerpts and platform policy | Unapproved personal case narratives or automatic posting |
| **Executive Command Hub** | Counts by status, risk category, approvals needed, unresolved conflicts, hash/lineage coverage | Metadata-view authorization, aggregate-only redaction | Original-source bodies, private titles, personal identifiers or full journal snippets |

### Lifecycle invariants

1. **Source permission → concept permission → derivative format permission → editorial approval → department-specific release permission** are independently evaluated. A draft is not an approved product.
2. Any rights revocation, expired permission, changed source hash/version, failed editorial approval or invalid account identity blocks the handoff until explicitly reapproved.
3. Workers never receive broad Vault credentials. A recipient may accept a content payload only after checking its own permissions and idempotency key; it cannot pull arbitrary originals.
4. Audit records include IDs, actor, purpose, decision, timestamp, version and checksum, but do not indiscriminately log contents or confidential names.
5. External AI services and public search indexing are separate forbidden purposes until individually authorized; no default analytics capture of private source content.
6. All outbound actions and billing/marketing operations remain deactivated in this phase.