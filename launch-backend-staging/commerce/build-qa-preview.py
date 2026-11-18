#!/usr/bin/env python3
"""Build a local static commerce preview; no deployment or remote creation.
Requires a distinct hosted QA project reference and that project's PUBLIC key.
"""
import argparse,base64,json,os,re,shutil,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PROD="plhbvtbvtxfzulsaxuim"
def valid_key(key,ref):
    if re.fullmatch(r"sb_publishable_[A-Za-z0-9_-]+",key):return True
    try:
        payload=key.split(".")[1]
        data=json.loads(base64.urlsafe_b64decode(payload+"="*(-len(payload)%4)))
        return data.get("role")=="anon" and data.get("ref")==ref
    except Exception:return False
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--out",type=Path,required=True)
    parser.add_argument("--project-ref",required=True)
    args=parser.parse_args();ref=args.project_ref;out=args.out.resolve()
    key=os.environ.get("NBJB_QA_PUBLISHABLE_KEY","")
    if not re.fullmatch(r"[a-z0-9]{20}",ref) or ref==PROD or not valid_key(key,ref):raise SystemExit("Use separate QA ref and its publishable/anon key")
    if out==ROOT or ROOT in out.parents or out.exists():raise SystemExit("Choose a new output directory outside repository")
    # Copy only tracked site files. Exclude staging, source docs, secrets, and fixture output.
    files=subprocess.check_output(["git","ls-files","-z"],cwd=ROOT).decode().split("\0")
    out.mkdir(parents=True)
    for name in files:
        path=Path(name)
        if not name or not (len(path.parts)==1 and (path.suffix==".html" or name in {"robots.txt","favicon.ico"}) or path.parts[0] in {"assets","css","js","images"}):continue
        src=ROOT/path
        if not src.is_file() or src.is_symlink() or not src.resolve().is_relative_to(ROOT):raise SystemExit("Unexpected source file")
        dest=out/path;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest)
        if dest.suffix==".html":
            text=dest.read_text(encoding="utf-8")
            text=re.sub(r'<meta\s+name=["\']robots["\'][^>]*>',"",text,flags=re.I)
            text=re.sub(r'<head>', '<head><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">',text,count=1,flags=re.I)
            dest.write_text(text,encoding="utf-8")
    (out/"robots.txt").write_text("User-agent: *\nDisallow: /\n")
    config={"supabaseUrl":"https://"+ref+".supabase.co","supabasePublishableKey":key}
    (out/"js"/"nbjb-config.js").write_text("window.NBJBConfig=Object.freeze("+json.dumps(config)+");\nwindow.NBJBCommercePreview=Object.freeze("+json.dumps({"enabled":True,"sandboxRef":ref})+");\n")
    # Membership checkout is outside this QA lane. Keep it inert in the preview only.
    (out/"js"/"member-billing.js").write_text("/* Membership payment worker intentionally disabled in commerce QA preview. */\n")
    print("Local QA preview prepared; no hosting or production changes performed.")
if __name__=="__main__":main()
