"""Origin Vault Phase 2: isolated, synthetic-only reference authorization engine.

NEW work. This is NOT the recovered Phase 1 SQLite prototype, a hosted Vault,
cryptographic proof of rights, or an identity provider. No source bodies are stored.
No publication, external AI submission, email, payments, or deployment features.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path, PurePosixPath
from typing import Literal
import json
import os
import stat

RIGHTS = frozenset({"original_verified", "license_verified"})
KINDS = frozenset({"lesson", "workbook", "flame_letter", "short_video", "course_module"})
PUBLIC_POTENTIAL = frozenset({"public_educational_original", "third_party_licensed"})
RESTRICTED = frozenset({"personal_private", "clinical_legal", "uncertain_rights"})
PURPOSES = frozenset({"ingest", "concept", "derivative", "preview", "controlled_export",
                      "education_handoff", "newsletter_handoff", "commerce_handoff",
                      "social_handoff", "executive_aggregate"})
ROLE_PURPOSES = {
    "vault_steward": frozenset({"ingest", "concept", "derivative", "preview", "controlled_export", "executive_aggregate"}),
    "editor": frozenset({"concept", "derivative", "preview", "education_handoff", "newsletter_handoff", "commerce_handoff", "social_handoff"}),
    "reviewer": frozenset({"preview", "executive_aggregate"}),
    "department_worker": frozenset(),
}

class AccessDenied(PermissionError):
    """A request is rejected rather than proceeding with missing or ambiguous evidence."""

@dataclass(frozen=True)
class Actor:
    actor_id: str
    role: str
    account_id: str
    identity_verified: bool = False  # test harness only: real identity provider is NOT integrated

@dataclass(frozen=True)
class Source:
    source_id: str
    account_id: str
    classification: str
    rights: str
    rights_evidence_ref: str
    rights_verified: bool
    sha256_hex: str
    version: int = 1
    license_purposes: frozenset[str] = frozenset()
    attribution_required: bool = False
    attribution_ref: str = ""
    revoked: bool = False

@dataclass(frozen=True)
class Approval:
    approval_id: str
    source_id: str
    account_id: str
    actor_id: str
    purpose: str
    approved_by_founder: bool
    rights_evidence_ref: str
    expires_at: datetime
    derivative_kind: str | None = None
    department: str | None = None
    revoked: bool = False

@dataclass(frozen=True)
class Concept:
    concept_id: str
    source_id: str
    source_sha256: str
    approval_id: str
    status: Literal["candidate_review_only"] = "candidate_review_only"

@dataclass(frozen=True)
class Derivative:
    derivative_id: str
    concept_id: str
    source_id: str
    source_sha256: str
    kind: str
    approval_id: str
    contributions: tuple[str, ...] = ("source_grounded", "template_assisted")
    status: Literal["candidate_review_only"] = "candidate_review_only"


def _fail(message: str) -> None:
    raise AccessDenied(message)


def _valid_sha256(v: str) -> bool:
    return isinstance(v, str) and len(v) == 64 and all(c in '0123456789abcdef' for c in v)


def authorize(actor: Actor, source: Source, approval: Approval, purpose: str,
              *, derivative_kind: str | None = None, department: str | None = None,
              now: datetime | None = None) -> None:
    """Fail-closed decision; does NOT establish real-world rights/identity or execute any action.

    Each operation needs a separate grant bound to source, actor, account, purpose.
    Release/marketing/commerce operations are intentionally absent from PURPOSES.
    """
    if purpose not in PURPOSES:
        _fail("purpose not supported")
    if not actor.identity_verified or not actor.actor_id or not actor.account_id:
        _fail("identity unverified")
    if actor.role not in ROLE_PURPOSES or purpose not in ROLE_PURPOSES[actor.role]:
        _fail("role not permitted")
    if not source.source_id or not source.account_id:
        _fail("source identity or account missing")
    if source.classification in RESTRICTED or source.classification not in PUBLIC_POTENTIAL:
        _fail("source classification restricted or unknown")
    if source.rights not in RIGHTS or not source.rights_verified or not source.rights_evidence_ref:
        _fail("rights/licensing unverified")
    if source.classification == "public_educational_original" and source.rights != "original_verified":
        _fail("original classification requires verified original rights")
    if source.classification == "third_party_licensed":
        if source.rights != "license_verified" or purpose not in source.license_purposes:
            _fail("license does not permit requested purpose")
        if source.attribution_required and not source.attribution_ref:
            _fail("attribution evidence missing")
    if source.revoked or not _valid_sha256(source.sha256_hex) or source.version < 1:
        _fail("source integrity/version/revocation fails")
    if (approval.revoked or not approval.approved_by_founder or not approval.approval_id
        or approval.source_id != source.source_id or approval.actor_id != actor.actor_id
        or approval.account_id != source.account_id or actor.account_id != source.account_id
        or approval.purpose != purpose or approval.rights_evidence_ref != source.rights_evidence_ref):
        _fail("individual source, account or purpose approval missing")
    t = now or datetime.now(timezone.utc)
    if t.tzinfo is None or approval.expires_at.tzinfo is None or approval.expires_at <= t:
        _fail("approval expired or time invalid")
    if purpose == "derivative":
        if derivative_kind not in KINDS or approval.derivative_kind != derivative_kind:
            _fail("derivative format not authorized")
    elif derivative_kind is not None:
        _fail("unexpected derivative format")
    if purpose.endswith("handoff"):
        expected = {"education_handoff":"educational_platform",
                    "newsletter_handoff":"eternal_flame",
                    "commerce_handoff":"revenue_forge",
                    "social_handoff":"content_social"}[purpose]
        if approval.department != expected or department != expected:
            _fail("department mismatch")
        # A separate downstream release authorization is always mandatory.
        # No outbound connector is implemented here.
    elif department is not None:
        _fail("unexpected department")


class CandidateRegistry:
    """Memory-only test registry with metadata lineage, no underlying document bodies."""
    def __init__(self) -> None:
        self.sources: dict[str, Source] = {}
        self.hash_index: set[str] = set()
        self.concepts: dict[str, Concept] = {}
        self.derivatives: dict[str, Derivative] = {}

    def register(self, actor: Actor, source: Source, grant: Approval) -> None:
        authorize(actor, source, grant, "ingest")
        if not source.source_id or source.source_id in self.sources or source.sha256_hex in self.hash_index:
            _fail("duplicate source or identifier")
        self.sources[source.source_id] = source
        self.hash_index.add(source.sha256_hex)

    def make_concept(self, actor: Actor, source_id: str, grant: Approval, concept_id: str) -> Concept:
        if source_id not in self.sources or not concept_id or concept_id in self.concepts:
            _fail("invalid or duplicate concept")
        source = self.sources[source_id]
        authorize(actor, source, grant, "concept")
        concept = Concept(concept_id, source_id, source.sha256_hex, grant.approval_id)
        self.concepts[concept_id] = concept
        return concept

    def make_derivative(self, actor: Actor, concept_id: str, grant: Approval,
                        derivative_id: str, kind: str) -> Derivative:
        concept = self.concepts.get(concept_id)
        if concept is None or not derivative_id or derivative_id in self.derivatives:
            _fail("invalid or duplicate derivative")
        source = self.sources[concept.source_id]
        if source.sha256_hex != concept.source_sha256:
            _fail("concept source lineage mismatch")
        authorize(actor, source, grant, "derivative", derivative_kind=kind)
        candidate = Derivative(derivative_id, concept_id, source.source_id,
                               source.sha256_hex, kind, grant.approval_id)
        self.derivatives[derivative_id] = candidate
        return candidate


def verify_source_bytes(source: Source, candidate: bytes) -> bool:
    return isinstance(candidate, bytes) and sha256(candidate).hexdigest() == source.sha256_hex


def _inside_git_tree(root: Path) -> bool:
    return any((p / '.git').exists() for p in (root, *root.parents))


def secure_read_candidate(root: Path, relative_path: str, max_bytes: int = 1_000_000) -> bytes:
    """POSIX/Linux local-only symlink-resistant read. No file writes, no public repo reads.

    Directory-relative O_NOFOLLOW traversal limits symlink and traversal attacks. Not a
    replacement for a hosted object-store verifier or a Windows security implementation.
    """
    if not isinstance(relative_path, str) or not relative_path:
        _fail("unsafe path")
    root = Path(root)
    p = PurePosixPath(relative_path)
    if (p.is_absolute()
        or '\\' in relative_path or any(x in ('', '.', '..') for x in relative_path.split('/'))):
        _fail("unsafe path")
    if not root.is_dir() or root.is_symlink() or _inside_git_tree(root.resolve()):
        _fail("root invalid or inside Git repository")
    if max_bytes <= 0 or max_bytes > 8_000_000:
        _fail("invalid size policy")
    flags_d = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    flags_f = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
    handles: list[int] = []
    try:
        fd = os.open(root, flags_d)
        handles.append(fd)
        for part in p.parts[:-1]:
            fd = os.open(part, flags_d, dir_fd=fd)
            handles.append(fd)
        source_fd = os.open(p.parts[-1], flags_f, dir_fd=fd)
        handles.append(source_fd)
        metadata = os.fstat(source_fd)
        if not stat.S_ISREG(metadata.st_mode) or metadata.st_size > max_bytes:
            _fail("non-file or oversized input")
        data = b''
        while len(data) <= max_bytes:
            part = os.read(source_fd, min(65536, max_bytes + 1 - len(data)))
            if not part:
                break
            data += part
        if len(data) > max_bytes:
            _fail("oversized input")
        return data
    except (OSError, ValueError) as exc:
        raise AccessDenied("unsafe or inaccessible source") from exc
    finally:
        for handle in reversed(handles):
            os.close(handle)


@dataclass
class AuditChain:
    """Local hash chain detects accidental edits; NOT immutable/a cryptographic timestamp."""
    rows: list[dict[str, str]] = field(default_factory=list)

    @staticmethod
    def _digest(seq: int, prior: str, action: str, reference: str) -> str:
        body = json.dumps({"seq":seq,"prev":prior,"action":action,"ref":reference},
                          sort_keys=True, separators=(',', ':'))
        return sha256(body.encode('utf-8')).hexdigest()

    def append(self, action: str, synthetic_ref: str) -> None:
        if not action or not synthetic_ref:
            _fail("empty audit fields")
        prior = self.rows[-1]['hash'] if self.rows else '0' * 64
        index = len(self.rows) + 1
        self.rows.append({"seq":str(index), "prev":prior, "action":action,
                          "ref":synthetic_ref, "hash":self._digest(index, prior, action, synthetic_ref)})

    def verify(self) -> bool:
        prior = '0' * 64
        for index, row in enumerate(self.rows, 1):
            if row.get('seq') != str(index) or row.get('prev') != prior:
                return False
            h = self._digest(index, prior, row.get('action', ''), row.get('ref', ''))
            if row.get('hash') != h:
                return False
            prior = h
        return True