#!/usr/bin/env python3
"""Serve the generated static QA preview only on localhost over HTTPS."""
import argparse,ssl,re
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
ROOT=Path(__file__).resolve().parents[2]
def main():
    p=argparse.ArgumentParser();p.add_argument("--dir",required=True,type=Path);p.add_argument("--cert",required=True,type=Path);p.add_argument("--key",required=True,type=Path);p.add_argument("--port",type=int,default=8443);a=p.parse_args()
    directory=a.dir.resolve()
    if directory==ROOT or ROOT in directory.parents or not directory.is_dir():raise SystemExit("Serve only generated directory outside checkout")
    for c in (a.cert,a.key):
        if c.resolve().is_relative_to(directory):raise SystemExit("TLS credentials must be outside served directory")
    cfg=(directory/"js/nbjb-config.js").read_text()
    if "NBJBCommercePreview" not in cfg or "plhbvtbvtxfzulsaxuim" in cfg or not re.search(r"https://[a-z0-9]{20}\.supabase\.co",cfg):raise SystemExit("QA config required")
    if (directory/"launch-backend-staging").exists():raise SystemExit("Refusing staging directory under preview")
    class QuietHandler(SimpleHTTPRequestHandler):
        def list_directory(self,path):
            self.send_error(403,"Directory listings disabled");return None
        def end_headers(self):
            self.send_header("Cache-Control","no-store");self.send_header("X-Robots-Tag","noindex, nofollow");self.send_header("Referrer-Policy","no-referrer");super().end_headers()
        def log_message(self,format,*args):pass
    server=ThreadingHTTPServer(("127.0.0.1",a.port),partial(QuietHandler,directory=str(directory)))
    tls=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);tls.load_cert_chain(a.cert,a.key)
    server.socket=tls.wrap_socket(server.socket,server_side=True)
    print(f"Local QA preview: https://localhost:{a.port}/store.html",flush=True);server.serve_forever()
if __name__=="__main__":main()
