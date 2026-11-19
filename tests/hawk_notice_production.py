"""Read-only production check for corrective release 001-C. Fictional data only."""
from pathlib import Path
import hashlib
import urllib.request
import urllib.error
import ssl
import time
from html.parser import HTMLParser
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://notbrokenjustburning.com/"
RELEASE = "a5b5947e60549bd3eb9173d5e4ccf42cb0a43956"
BASELINE = "767acf7a5cfbcd913be88c6bf29c2f8da0d8439f"
import subprocess
SLUGS = ("timeline","evidence-index","documentation-checklist","communication-analyzer",
         "court-preparation","parenting-log","financial-organizer","witness-observations",
         "support-network","dashboard")
GUIDES = dict(zip(SLUGS, ("incident-timeline", *SLUGS[1:])))
class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.anchors=[]
    def handle_starttag(self,tag,attrs):
        if tag=="a":
            self.anchors.append(dict(attrs))
def fetch(path):
    url=ORIGIN+path
    request=urllib.request.Request(url,headers={"User-Agent":"NBJB-HAWK-Corrective-Release-QA/1.0","Accept-Encoding":"identity","Cache-Control":"no-cache"})
    with urllib.request.urlopen(request,timeout=20) as res:
        assert res.status==200,(path,res.status)
        assert res.url==url,(path,res.url)
        assert res.headers.get_content_type()=="text/html",(path,res.headers.get_content_type())
        body=res.read(1024*1024)
        assert body,(path,"empty")
        return body
def check(slug):
    guide="hawk-"+GUIDES[slug]+".html"
    asset="downloads/hawk-"+slug+"-offline.html"
    page=fetch(guide)
    parser=Links();parser.feed(page.decode("utf-8"))
    assert any(urljoin(ORIGIN+guide,a.get("href",""))==ORIGIN+asset and "download" in a for a in parser.anchors),(guide,"missing download link")
    body=fetch(asset)
    expected=(ROOT/asset).read_bytes()
    actual=hashlib.sha256(body).hexdigest()
    assert body==expected,(asset,"public bytes differ from approved release",actual,hashlib.sha256(expected).hexdigest())
    prior=subprocess.check_output(["git","show",BASELINE+":"+asset],cwd=ROOT)
    assert body==prior,(asset,"differs from already accepted corrective release")
    print("PUBLIC PASS",slug,len(body),"bytes SHA256",actual,flush=True)
def main():
    center=fetch("divorce-recovery.html")
    assert center==(ROOT/"divorce-recovery.html").read_bytes(),"center differs from released source"
    html=center.decode("utf-8")
    start=html.index('id="hawk-privacy-update"')
    stop=html.index("</aside>",start)
    section=html[start:stop]
    assert html.count('id="hawk-privacy-update"')==1
    assert stop<html.index('href="hawk-dashboard.html"',start)<html.index('<nav aria-label="H.A.W.K. tool guides">')
    for phrase in ("November 19, 2026","Replace the old application","export any working records","Clear Session","Keep saved JSON, original documents","preservation obligations","explicitly import your saved JSON","does not guarantee secure data erasure","readable and unencrypted","Do not upload case records to NBJB"):
        assert phrase in section,phrase
    assert section.count("<li>")==5
    print("PUBLIC PASS exact published notice, five replacement steps, record preservation, warning and placement before guide links",flush=True)
    parser=Links();parser.feed(html)
    urls={urljoin(ORIGIN+"divorce-recovery.html",a.get("href","")) for a in parser.anchors}
    for guide in GUIDES.values():
        assert ORIGIN+"hawk-"+guide+".html" in urls,guide
    print("PUBLIC PASS center and all ten guide links",flush=True)
    # Read-only public requests; no sign-in, record submission or payment.
    for path in ("","lessons.html","join.html","privacy.html"):
        fetch(path)
        print("PUBLIC PASS site route",path or "/",flush=True)
    with ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(check,SLUGS))
    print("PRODUCTION DOWNLOADS 10/10 exact byte matches",RELEASE,flush=True)
if __name__=="__main__":
    main()
