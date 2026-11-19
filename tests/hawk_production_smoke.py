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
RELEASE = "767acf7a5cfbcd913be88c6bf29c2f8da0d8439f"
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
    # Subsequent browser suite runs the actual delivered bytes in local file context.
    (ROOT/asset).write_bytes(body)
    print("PUBLIC PASS",slug,len(body),"bytes SHA256",actual,flush=True)
def main():
    center=fetch("divorce-recovery.html")
    assert center==(ROOT/"divorce-recovery.html").read_bytes(),"center differs from released source"
    parser=Links();parser.feed(center.decode("utf-8"))
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
