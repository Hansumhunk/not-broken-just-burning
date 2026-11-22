-- ORIGIN VAULT — NON-EXECUTED PROPOSAL, FOR CODE REVIEW ONLY.
-- Do NOT apply to the existing NBJB Phase Two production project.
-- A separately approved isolated environment, security review, backups,
-- real identity system, key custody and founder authorization are prerequisites.
-- Names and structure only. No data and no source content are included.
BEGIN;
CREATE SCHEMA IF NOT EXISTS origin_vault_private;
REVOKE ALL ON SCHEMA origin_vault_private FROM PUBLIC, anon, authenticated;
-- Do NOT add origin_vault_private to PostgREST exposed schemas.

CREATE TABLE IF NOT EXISTS origin_vault_private.source_records (
    source_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_account_id uuid NOT NULL,
    classification text NOT NULL CHECK (classification IN (
        'public_educational_original','third_party_licensed','personal_private','clinical_legal','uncertain_rights')),
    rights_status text NOT NULL CHECK (rights_status IN ('pending','verified_original','verified_license','revoked','rejected')),
    rights_evidence_pointer text,
    attribution_pointer text,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS origin_vault_private.source_versions (
    source_id uuid NOT NULL REFERENCES origin_vault_private.source_records(source_id),
    version integer NOT NULL CHECK (version > 0),
    object_key uuid NOT NULL,
    bytes_sha256 text NOT NULL CHECK (bytes_sha256 ~ '^[a-f0-9]{64}$'),
    retained_for_hold boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (source_id, version)
);
CREATE TABLE IF NOT EXISTS origin_vault_private.approvals (
    approval_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid NOT NULL,
    source_version integer NOT NULL,
    owner_account_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    purpose text NOT NULL,
    derivative_kind text,
    department text,
    rights_evidence_pointer text NOT NULL,
    founder_verification_pointer text NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    FOREIGN KEY(source_id,source_version) REFERENCES origin_vault_private.source_versions(source_id,version)
);
CREATE TABLE IF NOT EXISTS origin_vault_private.concept_candidates (
    concept_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid NOT NULL,
    source_version integer NOT NULL,
    concept_version integer NOT NULL CHECK (concept_version > 0),
    approval_id uuid NOT NULL REFERENCES origin_vault_private.approvals(approval_id),
    status text NOT NULL DEFAULT 'candidate_review_only' CHECK (status = 'candidate_review_only'),
    FOREIGN KEY(source_id,source_version) REFERENCES origin_vault_private.source_versions(source_id,version)
);
CREATE TABLE IF NOT EXISTS origin_vault_private.derivative_candidates (
    derivative_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id uuid NOT NULL REFERENCES origin_vault_private.concept_candidates(concept_id),
    source_id uuid NOT NULL,
    source_version integer NOT NULL,
    kind text NOT NULL CHECK(kind IN ('lesson','workbook','flame_letter','short_video','course_module')),
    artifact_sha256 text CHECK (artifact_sha256 ~ '^[a-f0-9]{64}$'),
    contribution_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
    approval_id uuid NOT NULL REFERENCES origin_vault_private.approvals(approval_id),
    status text NOT NULL DEFAULT 'candidate_review_only' CHECK (status = 'candidate_review_only'),
    FOREIGN KEY(source_id,source_version) REFERENCES origin_vault_private.source_versions(source_id,version)
);
CREATE TABLE IF NOT EXISTS origin_vault_private.audit_events (
    event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_time timestamptz NOT NULL DEFAULT now(),
    actor_id uuid,
    purpose text NOT NULL,
    target_type text NOT NULL,
    target_id uuid,
    outcome text NOT NULL,
    prior_event_sha256 text,
    event_sha256 text NOT NULL
);
-- No browser/session grants and no RLS policies: DENY ALL baseline.
-- A non-browser, least-privileged backend role will be provisioned only after founder approval.
ALTER TABLE origin_vault_private.source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE origin_vault_private.source_records FORCE ROW LEVEL SECURITY;
ALTER TABLE origin_vault_private.source_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE origin_vault_private.source_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE origin_vault_private.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE origin_vault_private.approvals FORCE ROW LEVEL SECURITY;
ALTER TABLE origin_vault_private.concept_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE origin_vault_private.concept_candidates FORCE ROW LEVEL SECURITY;
ALTER TABLE origin_vault_private.derivative_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE origin_vault_private.derivative_candidates FORCE ROW LEVEL SECURITY;
ALTER TABLE origin_vault_private.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE origin_vault_private.audit_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA origin_vault_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA origin_vault_private FROM PUBLIC, anon, authenticated;
-- This proposal is deliberately NOT an executable full migration/security design:
-- no signed approvals, object bucket, backend service role, audit anchoring, immutable
-- version triggers, transactional outbox or recovery implementation is claimed.
COMMIT;