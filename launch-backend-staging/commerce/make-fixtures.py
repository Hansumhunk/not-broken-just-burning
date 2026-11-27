#!/usr/bin/env python3
"""Create unmistakably synthetic one-page QA PDFs outside the repository.
No manuscript, personal information, paid asset, or external package is used.
"""
import argparse
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]

def pdf(title,version):
    assert re.fullmatch(r"[A-Za-z0-9 -]+", title+version)
    lines = ["NBJB DIGITAL COMMERCE QA - SYNTHETIC FIXTURE",title,version,
             "NOT A COMMERCIAL PRODUCT. NOT FOR SALE.",
             "This document verifies private storage, download and replacement.",
             "Contains no customer information or educational manuscript."]
    stream = "BT /F1 16 Tf 50 740 Td " + " ".join(
        ("0 -32 Td " if i else "")+"("+line+") Tj" for i,line in enumerate(lines))+" ET"
    data = stream.encode("ascii")
    objects = [b"<< /Type /Catalog /Pages 2 0 R >>",
               b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
               b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
               b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
               b"<< /Length "+str(len(data)).encode()+b" >>\nstream\n"+data+b"\nendstream"]
    result=bytearray(b"%PDF-1.4\n")
    offsets=[0]
    for n,obj in enumerate(objects,1):
        offsets.append(len(result));result.extend(f"{n} 0 obj\n".encode()+obj+b"\nendobj\n")
    xref=len(result)
    result.extend(b"xref\n0 6\n0000000000 65535 f \n")
    for offset in offsets[1:]:result.extend(f"{offset:010d} 00000 n \n".encode())
    result.extend(f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    assert result[xref:xref+4]==b"xref" and all(result[o:o+7].startswith(str(n).encode()+b" 0 obj") for n,o in enumerate(offsets[1:],1))
    return bytes(result)

if __name__=="__main__":
    a=argparse.ArgumentParser();a.add_argument("--out",required=True,type=Path);args=a.parse_args()
    out=args.out.resolve()
    if out==ROOT or ROOT in out.parents:raise SystemExit("Output must be outside the repository")
    for slug,title,version in [("boundary-builder-workbook","Boundary Builder","v1"),("forge-workbook","Forge","v1"),("forge-workbook","Forge correction","v2")]:
        path=out/slug/version/"qa.pdf";path.parent.mkdir(parents=True,exist_ok=True)
        with path.open("xb") as file:file.write(pdf(title,version))
    print("Created three synthetic QA fixtures outside the repository.")
