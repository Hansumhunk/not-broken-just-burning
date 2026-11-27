#!/usr/bin/env python3
"""First-party, GET-only production check. No accounts, mail, cookies or writes."""
import sys
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from urllib.parse import urlparse
from xml.etree import ElementTree as ET
ORIGIN="https://notbrokenjustburning.com"
PAGE="/first-seven-days.html"
class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links=[]; self.ids=[]; self.canon=[]; self.robots=[]; self.h1=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get("id"):self.ids.append(a["id"])
        if tag=="h1":self.h1+=1
        if tag in ("a","link","script"):
            url=a.get("href") or a.get("src")
            if url:self.links.append(url)
        if tag=="link" and a.get("rel")=="canonical":self.canon.append(a.get("href"))
        if tag=="meta" and a.get("name","").lower()=="robots":self.robots.append(a.get("content","").lower())
def get(path):
    req=Request(ORIGIN+path,headers={"User-Agent":"NBJB-Release-Qualification/1.0","Cache-Control":"no-cache"})
    try:
        with urlopen(req,timeout=20) as rsp:
            status=rsp.status; final=rsp.geturl(); content_type=rsp.headers.get("Content-Type",""); data=rsp.read(1048576)
    except (HTTPError,URLError,TimeoutError,OSError) as exc:
        raise AssertionError(f"GET {path} failed: {type(exc).__name__}: {exc}") from exc
    assert status==200, f"{path} HTTP {status}"
    assert urlparse(final).netloc==urlparse(ORIGIN).netloc, f"unexpected redirect host {final}"
    print(f"PASS HTTP GET {path}: {status}, {len(data)} bytes, {content_type}")
    return data,content_type
def main():
    raw,ctype=get(PAGE)
    assert "html" in ctype.lower(), "HTML MIME type missing"
    p=Document();p.feed(raw.decode("utf-8"))
    assert p.canon==[ORIGIN+PAGE], f"canonical mismatch: {p.canon}"
    assert p.h1==1, f"expected 1 H1, got {p.h1}"
    assert not any("noindex" in x for x in p.robots), "page is noindex"
    for n in range(1,8):assert f"day-{n}-title" in p.ids,f"Day {n} missing"
    print("PASS PUBLIC PAGE: self-canonical, indexable, seven days, one H1")
    for path in ("/css/first-seven-days.css","/js/first-seven-days.js"):
        assert path[1:] in p.links or path in p.links, f"missing asset link {path}"
        data,ct=get(path)
        assert len(data)>400, f"asset {path} unexpectedly empty"
    raw,ct=get("/sitemap.xml")
    locs=[n.text for n in ET.fromstring(raw).iter() if n.tag.endswith("loc")]
    assert locs.count(ORIGIN+PAGE)==1, f"sitemap must have one page URL; count={locs.count(ORIGIN+PAGE)}"
    print(f"PASS SITEMAP: {len(locs)} entries, one expected URL")
    for path in ("/index.html","/join.html","/path.html","/support.html","/lesson-clarity-before-certainty.html"):
        assert path[1:] in p.links or path in p.links, f"navigation href absent: {path}"
        get(path)
    print("PASS FIRST SEVEN DAYS: PUBLIC URL, NAVIGATION, ASSETS, CANONICAL, SITEMAP")
if __name__=="__main__":
    try:main()
    except Exception as exc:
        print(f"BLOCKING FAILURE: {exc}",file=sys.stderr)
        sys.exit(1)
