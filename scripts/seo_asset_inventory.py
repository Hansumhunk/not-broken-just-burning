"""Public source asset and delivery inventory; no member data or tracking."""
from pathlib import Path
from html.parser import HTMLParser
import re
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parents[1]
sitemap=ET.parse(ROOT/"sitemap.xml")
pages=[urlsplit(n.text).path.lstrip("/") or "index.html" for n in sitemap.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
class Page(HTMLParser):
    def __init__(self): super().__init__(convert_charrefs=True); self.images=[]; self.styles=[]; self.scripts=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="img": self.images.append(a)
        if tag=="link" and a.get("rel")=="stylesheet": self.styles.append(a.get("href",""))
        if tag=="script" and a.get("src"): self.scripts.append(a["src"])
def local_size(src):
    u=urlsplit(src)
    if u.netloc or u.scheme: return None
    p=ROOT/u.path.lstrip("/")
    return p.stat().st_size if p.is_file() else None
images=[]; missing_dimensions=[]; missing_alt=[]; css=set(); js=set()
for name in pages:
    file=ROOT/name
    if not file.is_file(): print("Missing sitemap source:",name); continue
    p=Page();p.feed(file.read_text(encoding="utf-8"))
    css.update(p.styles);js.update(p.scripts)
    for a in p.images:
        src=a.get("src",""); size=local_size(src)
        images.append((name,src,size,a.get("loading","unspecified")))
        if not a.get("width") or not a.get("height"): missing_dimensions.append((name,src))
        if "alt" not in a: missing_alt.append((name,src))
print("Sitemap pages",len(pages),"image instances",len(images),"missing dimensions",len(missing_dimensions),"missing alt",len(missing_alt))
for row in missing_dimensions[:50]: print("Dimension candidate",*row)
for row in missing_alt[:50]: print("Alt candidate",*row)
for row in sorted(images,key=lambda x:x[2] or 0,reverse=True)[:15]: print("Image",*row)
for label,files in (("CSS",css),("JS",js)):
    for src in sorted(files):
        size=local_size(src)
        if size is not None: print(label,src,size,"bytes")
for file in sorted((ROOT/"assets").rglob("*"),key=lambda p:p.stat().st_size if p.is_file() else 0,reverse=True)[:15]:
    if file.is_file(): print("Asset",file.relative_to(ROOT),file.stat().st_size,"bytes")
print("Source bytes only; HTTP transfer size and caching require production verification. Review CSS background images separately.")
