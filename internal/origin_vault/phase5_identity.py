"""Offline synthetic Ed25519 assertion verifier for *future* founder IdP integration.

This deliberately does not accept browser metadata as verified authority and is
NOT a complete OIDC/JWT implementation. Only after an actual privileged IdP has
been selected and independently configured should production integration occur.
"""
from __future__ import annotations
import base64
import json
from dataclasses import dataclass
from typing import Any
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from .durable import canonical
from .policy import AccessDenied


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode('ascii')


def _decode(s: str) -> bytes:
    if not isinstance(s,str) or not s or len(s)>4096 or any(c not in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_' for c in s):
        raise AccessDenied('invalid test assertion encoding')
    return base64.urlsafe_b64decode(s+'='*(-len(s)%4))


@dataclass(frozen=True)
class VerifiedSyntheticIdentity:
    actor_id: str
    account_id: str
    role: str
    session_id: str
    expires_at: int
    proof_method: str


class PinnedAssertionVerifier:
    """Demonstration of pinned fake IdP key, MFA freshness and session blocklist."""
    def __init__(self, *, expected_issuer: str, expected_audience: str, key_id: str,
                 public_key: Ed25519PublicKey, trusted_actor: str, trusted_account: str):
        if not all(isinstance(x,str) and x for x in (expected_issuer,expected_audience,key_id,trusted_actor,trusted_account)):
            raise ValueError('pinned test identity parameters required')
        self.issuer=expected_issuer;self.audience=expected_audience;self.key_id=key_id
        self.public_key=public_key;self.actor=trusted_actor;self.account=trusted_account
        self._revoked_jti:set[str]=set()

    def revoke_session(self, jti: str) -> None:
        if not jti: raise AccessDenied('missing session')
        self._revoked_jti.add(jti)

    def verify(self, token: str, *, now: int, required_role: str='vault_steward',
               max_session_seconds: int=900, max_mfa_age_seconds: int=300) -> VerifiedSyntheticIdentity:
        try:
            if not isinstance(token,str) or len(token)>8192 or token.count('.')!=2:
                raise AccessDenied('invalid assertion format')
            head_b,payload_b,sig_b=token.split('.')
            head=json.loads(_decode(head_b));p=json.loads(_decode(payload_b))
            if head!={'alg':'EdDSA','typ':'JWT','kid':self.key_id}:
                raise AccessDenied('untrusted issuer key or algorithm')
            self.public_key.verify(_decode(sig_b),(head_b+'.'+payload_b).encode('ascii'))
            fields={'iss','aud','sub','account_id','role','jti','iat','exp','auth_time','mfa_time','amr'}
            if set(p)!=fields: raise AccessDenied('incorrect assertion claims')
            if p['iss']!=self.issuer or p['aud']!=self.audience or p['sub']!=self.actor or p['account_id']!=self.account or p['role']!=required_role:
                raise AccessDenied('wrong issuer, audience, actor, account or role')
            if not all(type(p[k]) is int for k in ('iat','exp','auth_time','mfa_time')):
                raise AccessDenied('invalid session timestamps')
            if not (p['iat']<=now<p['exp']<=p['iat']+max_session_seconds) or p['auth_time']>now or not now-max_mfa_age_seconds<=p['mfa_time']<=now:
                raise AccessDenied('expired or stale session / MFA')
            if type(p['amr']) is not list or 'webauthn' not in p['amr']:
                raise AccessDenied('strong MFA required')
            if not isinstance(p['jti'],str) or not p['jti'] or p['jti'] in self._revoked_jti:
                raise AccessDenied('revoked or missing test session')
            return VerifiedSyntheticIdentity(p['sub'],p['account_id'],p['role'],p['jti'],p['exp'],'simulated-pinned-Ed25519-webauthn-claim')
        except (InvalidSignature,ValueError,TypeError,UnicodeDecodeError,KeyError,OverflowError,json.JSONDecodeError) as exc:
            raise AccessDenied('untrusted synthetic assertion') from exc