"""Read-only public production delivery checks. Failures are reported, not disguised as passes."""
import urllib.request
import urllib.error
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET

ORIGIN="https://notbrokenjustburning.com"
paths=["http://notbrokenjustburning.com/","https://www.notbrokenjustburning.com/",ORIGIN+"/",ORIGIN+"/robots.txt",ORIGIN+"/sitemap.xml",ORIGIN+"/css/style.css",ORIGIN+"/js/main.js",ORIGIN+"/assets/social-share.png",ORIGIN+"/divorce-recovery.html",ORIGIN+"/masculine-restoration-placeholder-wound.html"]
# Do not probe unreleased pages or protected member content.
for url in paths:
    try:
        req=urllib.request.Request(url,headers={"User-Agent":"NBJB-SEO-Release-Check/1.0","Accept-Encoding":"identity"})
        with urllib.request.urlopen(req,timeout=10) as res:
            data=res.read(1024*1024+1)
            h=res.headers
            print(f"{url} | {res.status} | final={res.url} | cache={h.get('Cache-Control','not supplied')} | content-type={h.get('Content-Type','not supplied')} | length={h.get('Content-Length','not supplied')} | encoding={h.get('Content-Encoding','identity')}")
            if url.endswith("/sitemap.xml"):
                tree=ET.fromstring(data)
                urls=[x.text for x in tree.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
                print("Live sitemap",len(urls),"unique",len(set(urls)),"all canonical HTTPS",all(x.startswith(ORIGIN+"/") for x in urls))
            if url.endswith("/robots.txt"): print("Live robots Sitemap directive present:",("Sitemap: "+ORIGIN+"/sitemap.xml").encode() in data)
            if url.endswith(".html") or url==ORIGIN+"/":
                print("Canonical expected:", (('href="'+url+'"').encode() in data and b'rel="canonical"' in data))
    except Exception as e:
        print(f"{url} | UNVERIFIED/FAILED | {type(e).__name__}: {str(e)[:180]}")
print("Hosting/CDN header observations only; no caching or redirect configuration changes.")
