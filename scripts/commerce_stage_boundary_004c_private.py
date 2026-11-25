#!/usr/bin/env python3
"""Founder-authorized Boundary Builder 004-C PRIVATE Supabase Storage staging.

This utility NEVER sends a buyer ZIP to GitHub or any public site. It runs only
when an owner already has the exact file and a scoped, locally held production
service key. No extra projects, secrets, file overwrites, price changes or orders.
Without service credentials it performs only local ZIP/hash verification.
"""
import argparse
import hashlib
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

SOURCE_NAME="NBJB-BB-001_v1.4_Customer_Package_004C_RELEASE_LOCKED.zip"
EXPECTED_SIZE=739982
EXPECTED_HASH="c3031e9de5d66ba0d4185efceff67321a669b472fd264728ff911b06c372c123"
MEMBERS={
 "boundary_customer_v1.4.pdf":(806653,"5d08013c5c59c31c7d9373f79046f51596800b99579e091134bd12be2d84c33f"),
 "boundary_print_v1.4.pdf":(361242,"c3e5b2f39027146b06b10ce0ba9a6d5b7ab600b601ccd059f755adb02aaa6d7d")
}
REF="plhbvtbvtxfzulsaxuim"
ORIGIN="https://"+REF+".supabase.co"
BUCKET="nbjb-private-products"
KEY="boundary-builder-workbook/v1.4/NBJB-BB-001_v1.4_customer.zip"
STORAGE=ORIGIN+"/storage/v1"
OBJECT=urllib.parse.quote(KEY,safe="/")
BLOB_AUTH=STORAGE+"/object/authenticated/"+BUCKET+"/"+OBJECT
BLOB_PUBLIC=STORAGE+"/object/public/"+BUCKET+"/"+OBJECT

def digest(blob):
 return hashlib.sha256(blob).hexdigest()

def verify_local(p):
 if not p.is_file() or p.name!=SOURCE_NAME:raise RuntimeError("APPROVED_FILENAME_REQUIRED")
 b=p.read_bytes()
 if len(b)!=EXPECTED_SIZE or digest(b)!=EXPECTED_HASH:raise RuntimeError("RELEASE_HASH_OR_SIZE_MISMATCH")
 import io
 with zipfile.ZipFile(io.BytesIO(b)) as z:
  if set(z.namelist())!=set(MEMBERS) or z.testzip() is not None:raise RuntimeError("ZIP_INTEGRITY_OR_MANIFEST_MISMATCH")
  for name,(size,h) in MEMBERS.items():
   item=z.read(name)
   if len(item)!=size or digest(item)!=h:raise RuntimeError("PDF_HASH_OR_SIZE_MISMATCH")
 print("APPROVED_PRIVATE_004C_ZIP_LOCAL_BYTES_VERIFIED",flush=True)
 return b

class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  # Never forward a privileged Storage credential to another host.
  return None

def request(url,method="GET",blob=None,key=None,headers=None):
 if not url.startswith(ORIGIN+"/storage/v1/"):raise RuntimeError("NON_PRODUCTION_STORAGE_ORIGIN_ABORT")
 h={"Cache-Control":"no-store"}
 if key:h.update({"Authorization":"Bearer "+key,"apikey":key})
 if headers:h.update(headers)
 try:
  with urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url,data=blob,headers=h,method=method),timeout=45) as res:
   return res.status,res.read()
 except urllib.error.HTTPError as ex:
  return ex.code,ex.read(1000)
 except (urllib.error.URLError,TimeoutError):
  raise RuntimeError("STORAGE_NETWORK_FAILURE")

def verify_bucket(key):
 status,blob=request(STORAGE+"/bucket/"+BUCKET,key=key)
 if status!=200:raise RuntimeError("CANNOT_VERIFY_PRIVATE_BUCKET")
 try:o=json.loads(blob)
 except Exception:raise RuntimeError("INVALID_BUCKET_METADATA")
 if o.get("id")!=BUCKET or o.get("public") is not False:
  raise RuntimeError("BUCKET_MUST_BE_PRIVATE")
 print("BUCKET_PRIVACY_VERIFIED",flush=True)

def verify_remote(key):
 status,blob=request(BLOB_AUTH,key=key)
 if status!=200:raise RuntimeError("PRIVATE_REMOTE_DOWNLOAD_NOT_VERIFIED")
 if len(blob)!=EXPECTED_SIZE or digest(blob)!=EXPECTED_HASH:
  raise RuntimeError("REMOTE_OBJECT_SHA256_MISMATCH")
 anon_status,_=request(BLOB_PUBLIC,key=None)
 if anon_status==200:raise RuntimeError("CRITICAL_ANONYMOUS_ACCESS_UNEXPECTEDLY_ALLOWED")
 print("PRIVATE_REMOTE_BYTES_SHA256_VERIFIED; PUBLIC_ROUTE_DENIED",flush=True)
 print("UNOWNED_AUTHENTICATED_ACCOUNT_TEST_STILL_REQUIRED",flush=True)

def main():
 parser=argparse.ArgumentParser(description="Secure, no-overwrite private Boundary Builder 004-C staging")
 parser.add_argument("--source",type=Path,required=True,help="Exact local owner-only release ZIP")
 group=parser.add_mutually_exclusive_group()
 group.add_argument("--upload",action="store_true",help="Write only if private target does not exist; verify readback")
 group.add_argument("--verify-remote",action="store_true",help="Read-only remote byte/anon access verification")
 args=parser.parse_args()
 blob=verify_local(args.source)
 if not (args.upload or args.verify_remote):
  print("LOCAL_ONLY_NO_STORAGE_WRITE",flush=True)
  return
 # This key is supplied only in the running operator's private environment.
 # Never store, copy to a public workflow, include in a URL, or print it.
 secret=os.environ.get("NBJB_COMMERCE_SERVICE_ROLE_KEY","")
 if not secret:
  raise RuntimeError("BLOCKED_PRIVATE_SERVICE_ROLE_CREDENTIAL_NOT_AVAILABLE")
 verify_bucket(secret)
 if args.upload:
  status,_=request(BLOB_AUTH,method="HEAD",key=secret)
  if status==200:raise RuntimeError("TARGET_EXISTS_USE_VERIFY_REMOTE_NO_OVERWRITE")
  if status!=404:raise RuntimeError("TARGET_EXISTENCE_CANNOT_BE_ESTABLISHED_ABORT")
  status,_=request(STORAGE+"/object/"+BUCKET+"/"+OBJECT,method="POST",blob=blob,key=secret,
      headers={"Content-Type":"application/zip","x-upsert":"false"})
  if status not in (200,201):
   raise RuntimeError("PRIVATE_UPLOAD_FAILED_STATUS_"+str(status))
  print("PRIVATE_OBJECT_UPLOADED_NO_OVERWRITE",flush=True)
 verify_remote(secret)

if __name__=="__main__":
 try:main()
 except Exception as exc:
  print("STAGING_STOPPED "+str(exc).splitlines()[0][:140],file=sys.stderr)
  sys.exit(1)
