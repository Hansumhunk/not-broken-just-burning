"""Private-input inventory reconciliation logic; no provider access or content export.

This reusable engine accepts an owner-supplied, LOCAL inventory (metadata only).
When 31 historic records are unavailable it reports UNKNOWN, never UNIQUE.
No private archive, subject text or campaign IDs are committed by this module.
"""
from __future__ import annotations
from collections import Counter
import re

EXPECTED = {"welcome":6, "weekly":12, "free":4, "plus":4, "product":5}
STOPWORDS = {"a","an","and","are","as","at","be","can","do","for","from","how",
             "in","is","it","not","of","on","or","the","this","to","under",
             "when","with","you","your","one","still","that","what","was"}

def tokens(text):
    words = [w.lower() for w in re.findall(r"[a-zA-Z]{3,}",str(text))]
    normalized = {w[:-3]+"y" if w.endswith("ies") else w.rstrip("s")
                  for w in words if w not in STOPWORDS}
    return normalized

def compare(catalog, historical):
    if not isinstance(catalog,list) or not isinstance(historical,list):
        raise ValueError("catalog/inventory must be lists")
    count=Counter(x.get("kind") for x in historical if isinstance(x,dict))
    full=all(count[k]==v for k,v in EXPECTED.items()) and sum(count.values())==31
    ids=[str(x.get("id")) for x in historical]
    if len(ids)!=len(set(ids)):
        raise ValueError("duplicate historical inventory id")
    result=[]
    for candidate in catalog:
        words=tokens(candidate.get("title",""))
        overlaps=[]
        for x in historical:
            if not isinstance(x,dict) or x.get("kind")!="weekly":
                continue
            other=tokens(x.get("subject",""))
            shared=sorted(words & other)
            union=words | other
            score=round(len(shared)/len(union),3) if union else 0
            if score>=0.30 or len(shared)>=2:
                overlaps.append({"historical_id":str(x.get("id")),
                                 "classification":"possible_subject_overlap",
                                 "shared_terms":shared,"jaccard":score})
        result.append({
            "candidate_id":str(candidate.get("id")),
            "source":candidate.get("source"),
            "subject":candidate.get("title"),
            "inventory_complete":full,
            "editorial_disposition":"HOLD_POSSIBLE_OVERLAP" if overlaps else (
                "REVIEW_REQUIRED_INVENTORY_COMPLETE" if full else "UNKNOWN_PRIVATE_INVENTORY_MISSING"),
            "potential_overlaps":overlaps,
            "automatic_uniqueness_approval":False
        })
    return {"historical_counts":{k:count[k] for k in EXPECTED},
            "expected_counts":EXPECTED,
            "historical_inventory_complete":full,
            "candidates":result,
            "provider_scheduling_authorized":False,
            "note":"Content bodies and genuine approval/provenance cannot be verified from subject metadata alone."}
