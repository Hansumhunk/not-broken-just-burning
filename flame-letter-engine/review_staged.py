"""Verify generated editorial artifacts before humans review them.

Content/source/HTML integrity check only. This scanner can never approve or send.
Run after the offline four-week draft generator; emits a review-only JSON report.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import re
import sys
from html import unescape

REQUIRED = ("One idea","One question","One practical tool","One action")

def inspect(root, staging):
    root=Path(root)
    staging=Path(staging)
    catalog=json.loads((root/"flame-letter-engine/catalog.json").read_text())
    manifest=json.loads((root/"flame-letter-engine/manifest.json").read_text())
    blocked=set(manifest.get("suppressedIds",[]))
    byid={x["id"]:x for x in catalog["topics"]}
    files=sorted(staging.glob("draft-*.json"))
    issues=[]
    rows=[]
    if len(files)!=4:
        issues.append("expected four review-only edition metadata files")
    for p in files:
        m=json.loads(p.read_text())
        id=m.get("id")
        topic=byid.get(m.get("topicId"))
        html_path=staging/(id+".html")
        text_path=staging/(id+".txt")
        errs=[]
        if not topic:
            errs.append("not present in approved public source catalog")
        if m.get("topicId") in blocked:
            errs.append("historical topic already held against duplication")
        if m.get("status")!="draft" or m.get("approved") is not False or m.get("sendable") is not False:
            errs.append("draft-only approval marker violated")
        if not html_path.is_file() or not text_path.is_file():
            errs.append("HTML/plain pair missing")
        if errs:
            issues.extend(f"{id}: {e}" for e in errs)
            continue
        body=text_path.read_text(encoding="utf-8")
        html=html_path.read_text(encoding="utf-8")
        actual=hashlib.sha256((body+html).encode()).hexdigest()
        if actual!=m.get("contentSha256"):
            errs.append("immutable content hash mismatch")
        if topic:
            source=root/topic["source"]
            expected="https://notbrokenjustburning.com/"+topic["source"]
            if not source.is_file() or source.is_symlink():
                errs.append("public educational source not present")
            else:
                page=source.read_text(encoding="utf-8")
                if re.search(r"""<meta[^>]+name=["']robots["'][^>]+noindex""",page,re.I):
                    errs.append("noindex source cannot be cited")
                if "<main" not in page or "<title" not in page:
                    errs.append("public source structure incomplete")
            if m.get("source")!=expected or expected not in body or f'href="{expected}"' not in html:
                errs.append("source link mismatch")
            if m.get("subject")!="The Flame Letter | "+topic["title"]:
                errs.append("editorial subject mismatch")
            for field in ("idea","question","tool","action"):
                copy=topic[field]
                if copy not in body or copy not in unescape(html):
                    errs.append("HTML/plain parity mismatch in "+field)
        for heading in REQUIRED:
            if heading not in body or f"<h2>{heading}</h2>" not in html:
                errs.append("required teaching section missing "+heading)
        for marker in (
            "NOT APPROVED TO SEND",
            "[[REPLACE_WITH_VERIFIED_BUSINESS_MAILING_ADDRESS]]",
            "{{ unsubscribe }}",
            "https://notbrokenjustburning.com/privacy.html",
            "https://notbrokenjustburning.com/support.html"
        ):
            if marker not in html or marker not in body:
                errs.append("required draft footer marker missing "+marker[:20])
        if 'lang="en"' not in html or "<h1>" not in html or "<main" not in html:
            errs.append("HTML structure/accessibility marker missing")
        if re.search(r"<script\b",html,re.I):
            errs.append("script element forbidden")
        rows.append({"edition_id":id,"topic_id":m.get("topicId"),
                     "proposed_planning_date":m.get("proposedDate"),
                     "content_sha256":m.get("contentSha256"),
                     "source_url":m.get("source"),"review_status":"HUMAN_EDITORIAL_APPROVAL_PENDING",
                     "structural_checks_passed":len(errs)==0,
                     "issue_codes":errs})
        issues.extend(f"{id}: {e}" for e in errs)
    return {"kind":"OFFLINE_EDITORIAL_REVIEW_ONLY","drafts_checked":len(rows),
            "structural_checks_pass":not issues,"editorially_approved":0,
            "provider_campaigns_created":0,"production_distribution":"DISABLED",
            "private_archive_content_included":False,
            "editions":rows,"errors":issues}

def main():
    if len(sys.argv)!=3:
        raise SystemExit("usage: review_staged.py <repo-root> <staging-dir>")
    result=inspect(sys.argv[1],sys.argv[2])
    dest=Path(sys.argv[2])/"approval-review-report.json"
    dest.write_text(json.dumps(result,indent=2,sort_keys=True)+"\n")
    print(f"Editorial structural review: {result['drafts_checked']} candidate pairs; "
          f"PASS={result['structural_checks_pass']}; human approvals=0")
    if not result["structural_checks_pass"]:
        for x in result["errors"]:print("HOLD "+x)
        raise SystemExit(1)

if __name__=="__main__":
    main()
