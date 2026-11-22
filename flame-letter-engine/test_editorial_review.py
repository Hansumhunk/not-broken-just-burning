"""No-approval editorial gate tests. Generator runs entirely locally."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from review_staged import inspect

ROOT=Path(__file__).resolve().parent.parent

class DraftAcceptanceTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.out=Path(self.tmp.name)/"drafts"
        run=subprocess.run(["node",str(ROOT/"scripts/flame_letter_editorial.mjs"),
                            "--as-of=2026-11-21","--weeks=4","--out="+str(self.out)],
                           cwd=str(ROOT),capture_output=True,text=True,timeout=15)
        if run.returncode:
            self.fail("offline draft generator did not run: "+run.stderr[:300])

    def tearDown(self):
        self.tmp.cleanup()

    def _file(self,suffix):
        return sorted(self.out.glob("draft-*"+suffix))[0]

    def test_01_four_review_candidates_structurally_valid_but_not_approved(self):
        r=inspect(ROOT,self.out)
        self.assertTrue(r["structural_checks_pass"],r["errors"])
        self.assertEqual(r["drafts_checked"],4)
        self.assertEqual(r["editorially_approved"],0)
        self.assertEqual(r["provider_campaigns_created"],0)
        self.assertEqual(r["production_distribution"],"DISABLED")

    def test_02_tampered_html_hash_fails_closed(self):
        f=self._file(".html")
        f.write_text(f.read_text()+"\nUnapproved extra sentence.")
        r=inspect(ROOT,self.out)
        self.assertFalse(r["structural_checks_pass"])
        self.assertTrue(any("immutable content hash mismatch" in x for x in r["errors"]))

    def test_03_missing_unsubscribe_placeholder_fails(self):
        f=self._file(".txt")
        f.write_text(f.read_text().replace("{{ unsubscribe }}",""))
        r=inspect(ROOT,self.out)
        self.assertFalse(r["structural_checks_pass"])
        self.assertTrue(any("footer marker" in x for x in r["errors"]))

    def test_04_misleading_approval_flag_is_rejected(self):
        f=self._file(".json")
        d=json.loads(f.read_text())
        d["approved"]=True
        f.write_text(json.dumps(d))
        r=inspect(ROOT,self.out)
        self.assertFalse(r["structural_checks_pass"])
        self.assertTrue(any("draft-only approval marker" in x for x in r["errors"]))

    def test_05_source_redirect_mismatch_is_rejected(self):
        f=self._file(".json")
        d=json.loads(f.read_text())
        d["source"]="https://outside.invalid/tampered.html"
        f.write_text(json.dumps(d))
        r=inspect(ROOT,self.out)
        self.assertFalse(r["structural_checks_pass"])
        self.assertTrue(any("source link mismatch" in x for x in r["errors"]))

if __name__=="__main__":
    unittest.main()
