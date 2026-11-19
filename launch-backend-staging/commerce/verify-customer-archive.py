#!/usr/bin/env python3
"""Offline customer-only asset intake check. Never uploads or activates anything."""
import argparse,hashlib,json,zipfile
from pathlib import Path
MANIFEST=Path(__file__).with_name("inventory-release-candidate.json")
def verify(path,record):
    if path.name!=record["archive"]["filename"] or path.stat().st_size!=record["archive"]["bytes"]:raise ValueError("archive_name_or_size")
    if hashlib.sha256(path.read_bytes()).hexdigest()!=record["archive"]["sha256"]:raise ValueError("archive_checksum")
    expected={x["filename"]:x for x in record["allowedContents"]}
    with zipfile.ZipFile(path) as z:
        members=z.infolist()
        if len(members)!=len(expected) or {x.filename for x in members}!=set(expected):raise ValueError("unexpected_archive_members")
        for x in members:
            e=expected[x.filename]
            if x.is_dir() or x.flag_bits&1 or x.file_size!=e["bytes"]:raise ValueError("member_size_or_type")
            with z.open(x) as f:
                data=f.read(e["bytes"]+1)
            if not data.startswith(b"%PDF-") or len(data)!=e["bytes"] or hashlib.sha256(data).hexdigest()!=e["sha256"]:raise ValueError("member_checksum_or_type")
    return True
def main():
    p=argparse.ArgumentParser();p.add_argument("--manifest",type=Path,required=True,help="Explicit versioned inventory manifest; no implicit historical selection");p.add_argument("--slug",required=True);p.add_argument("--file",required=True,type=Path);a=p.parse_args()
    m=json.loads(a.manifest.read_text());record=next((x for x in m["products"] if x["slug"]==a.slug),None)
    if not record:raise SystemExit("Unknown SKU")
    verify(a.file,record)
    print("Customer-only archive verified locally. Release authorization remains separate; nothing uploaded.")
if __name__=="__main__":main()
