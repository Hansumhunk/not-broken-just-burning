"""Brevo read-only inspection boundary for Eternal Flame Engine.

GET-only allowlisted API, no campaign sends or mutations. No auth/session on GitHub.
Live mode must be configured in a private server environment by a future owner-approved
integration; development tests use injected fixtures. Never log raw provider payloads,
email addresses, contacts, tokens, tracking URLs or HTML campaign bodies.
"""
from __future__ import annotations

import os
import re
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

class ProviderHold(RuntimeError):
    pass

_NUM = re.compile(r"^[1-9][0-9]{0,15}$")
_PROJECTION = {
    "account": ("companyName", "plan", "relay"),
    "campaign": ("id", "name", "subject", "status", "type", "createdAt", "scheduledAt"),
    "list": ("id", "name", "totalSubscribers", "totalBlacklisted", "uniqueSubscribers"),
}
_LIMIT = 50

def _numeric(value, label):
    if not _NUM.fullmatch(str(value)):
        raise ProviderHold("invalid " + label)
    return str(value)

def _projection(obj, fields):
    if not isinstance(obj, dict):
        raise ProviderHold("unexpected provider response")
    return {key: obj[key] for key in fields if key in obj and obj[key] is not None}

def _safe_campaign(c):
    # Provider subjects/titles are business editorial metadata; never return content/recipients.
    return _projection(c, _PROJECTION["campaign"])

class BrevoReadOnly:
    def __init__(self, transport):
        if not callable(transport):
            raise ProviderHold("read-only transport required")
        self._get = transport

    @classmethod
    def from_private_environment(cls):
        """Never configured on public CI; available for future privately authorized reads."""
        if os.environ.get("NBJB_BREVO_READ_ONLY_AUTHORIZED") != "yes":
            raise ProviderHold("authenticated Brevo inspection not authorized in this environment")
        key = os.environ.get("NBJB_BREVO_READONLY_KEY")
        if not key or len(key) < 12:
            raise ProviderHold("private read-only provider key unavailable")
        def transport(route):
            if not route.startswith("/v3/"):
                raise ProviderHold("unexpected API path")
            request = Request("https://api.brevo.com" + route,
                              headers={"api-key": key, "Accept": "application/json"},
                              method="GET")
            try:
                with urlopen(request, timeout=8) as response:
                    body = response.read(200_001)
                    if len(body) > 200_000:
                        raise ProviderHold("provider response too large; abort")
                    return json.loads(body)
            except (HTTPError, URLError, TimeoutError, ValueError) as exc:
                # Do not echo provider headers or raw response bodies.
                raise ProviderHold("Brevo read-only request unavailable") from None
        return cls(transport)

    def account(self):
        raw = self._get("/v3/account")
        data = _projection(raw, _PROJECTION["account"])
        # No claim this proves today's available campaign send quota.
        return {"verified_scope": "account_metadata_only", "data": data}

    def campaigns(self, *, offset=0):
        if type(offset) is not int or offset < 0 or offset > 100000:
            raise ProviderHold("invalid campaign page offset")
        raw = self._get(f"/v3/emailCampaigns?limit={_LIMIT}&offset={offset}")
        if not isinstance(raw,dict) or not isinstance(raw.get("campaigns"),list):
            raise ProviderHold("unexpected campaign list")
        entries = [_safe_campaign(x) for x in raw["campaigns"]]
        return {"verified_scope":"read_only_campaign_metadata",
                "count":raw.get("count") if type(raw.get("count")) is int else None,
                "offset":offset,"campaigns":entries}

    def campaign(self, campaign_id):
        key=_numeric(campaign_id,"campaign id")
        raw=self._get(f"/v3/emailCampaigns/{key}?statistics=globalStats&excludeHtmlContent=true")
        result=_safe_campaign(raw)
        stats=raw.get("statistics") if isinstance(raw,dict) else None
        # Whitelist only explicitly aggregated counters; no links, devices or recipient data.
        if isinstance(stats,dict) and isinstance(stats.get("globalStats"),dict):
            result["globalStats"]={k:v for k,v in stats["globalStats"].items()
                                   if k in ("sent","delivered","hardBounces","softBounces",
                                            "complaints","unsubscriptions","uniqueOpens","uniqueClicks")
                                   and type(v) is int}
        return result

    def lists(self, *, offset=0):
        if type(offset) is not int or offset < 0 or offset > 100000:
            raise ProviderHold("invalid list offset")
        raw=self._get(f"/v3/contacts/lists?limit={_LIMIT}&offset={offset}")
        if not isinstance(raw,dict) or not isinstance(raw.get("lists"),list):
            raise ProviderHold("unexpected list response")
        return {"verified_scope":"list_aggregates_only",
                "lists":[_projection(x,_PROJECTION["list"]) for x in raw["lists"]]}

    def list_summary(self, list_id):
        key=_numeric(list_id,"list id")
        return _projection(self._get(f"/v3/contacts/lists/{key}"),_PROJECTION["list"])

    def founder_test_suppression(self, test_contact_id):
        """Only an owner-authorized numeric test contact. Never returns contact identity."""
        key=_numeric(test_contact_id,"test contact id")
        raw=self._get(f"/v3/contacts/{key}")
        if not isinstance(raw,dict) or type(raw.get("emailBlacklisted")) is not bool:
            raise ProviderHold("marketing suppression state absent")
        return {"verified_scope":"marketing_suppression_only",
                "email_campaign_blocklisted":raw["emailBlacklisted"],
                "transactional_permission": "not established by this endpoint",
                "contact_identity_redacted":True}

    def build_dispatch_snapshot(self, **_):
        # Read-only existence of a campaign/contact never implies the full negative
        # suppression, queue, DOI, active welcome and quota assurances passed.
        raise ProviderHold("cannot authorize dispatch from read-only aggregate responses")
