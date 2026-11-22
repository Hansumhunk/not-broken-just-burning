#!/usr/bin/env python3
"""Offline archive guard tests. Synthetic data only."""
import importlib.util, tempfile, zipfile, hashlib, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("guard",Path(__file__).with_name("verify-customer-archive.py"))
guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard)
def entry(name,payload):return {"filename":name,"bytes":len(payload),"sha256":hashlib.sha256(payload).hexdigest()}
class ArchiveTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.path=Path(self.temp.name)/"SKU_v1_customer.zip"
        self.payloads={"customer.pdf":b"%PDF-1.4 fixture","print.pdf":b"%PDF-1.4 fixture2"}
    def tearDown(self):self.temp.cleanup()
    def create(self,members):
        with zipfile.ZipFile(self.path,"w") as z:
            for name,data in members:z.writestr(name,data)
        return {"archive":entry(self.path.name,self.path.read_bytes()),"allowedContents":[entry(n,p) for n,p in self.payloads.items()]}
    def test_approved_shape(self):
        rec=self.create(self.payloads.items());self.assertTrue(guard.verify(self.path,rec))
    def test_internal_or_other_sku(self):
        for name in ["internal.docx","other-sku.pdf","../print.pdf","catalog.zip"]:
            rec=self.create([*self.payloads.items(),(name,b"secret synthetic")])
            with self.assertRaises(ValueError):guard.verify(self.path,rec)
    def test_member_tampered_even_if_outer_hash_recomputed(self):
        rec=self.create([("customer.pdf",b"%PDF-1.4 altered"),("print.pdf",self.payloads["print.pdf"])])
        with self.assertRaises(ValueError):guard.verify(self.path,rec)
    def test_whole_archive_hash_and_name(self):
        rec=self.create(self.payloads.items());rec["archive"]["sha256"]="0"*64
        with self.assertRaises(ValueError):guard.verify(self.path,rec)
        rec=self.create(self.payloads.items());rec["archive"]["filename"]="other.zip"
        with self.assertRaises(ValueError):guard.verify(self.path,rec)
if __name__=="__main__":unittest.main()
