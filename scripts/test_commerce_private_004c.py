"""Offline, synthetic-only controls for private checkout-disabled 004-C staging."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location("stage",Path(__file__).with_name("commerce_stage_boundary_004c_private.py"))
stage=importlib.util.module_from_spec(spec)
spec.loader.exec_module(stage)

class PrivateAssetStagingTests(unittest.TestCase):
 def test_exact_private_bucket_and_version(self):
  self.assertEqual(stage.REF,"plhbvtbvtxfzulsaxuim")
  self.assertEqual(stage.BUCKET,"nbjb-private-products")
  self.assertEqual(stage.EXPECTED_SIZE,739982)
  self.assertEqual(stage.EXPECTED_HASH,"c3031e9de5d66ba0d4185efceff67321a669b472fd264728ff911b06c372c123")
  self.assertIn("/v1.4/",stage.KEY)
  self.assertTrue(stage.BLOB_AUTH.startswith(stage.ORIGIN+"/storage/v1/object/authenticated/"))
 def test_reject_wrong_file_before_any_request(self):
  with tempfile.TemporaryDirectory() as root:
   p=Path(root)/stage.SOURCE_NAME
   p.write_bytes(b"synthetic wrong bytes; never a real product")
   with patch.object(stage,"request",side_effect=AssertionError("NO_NETWORK")):
    with self.assertRaisesRegex(RuntimeError,"RELEASE_HASH_OR_SIZE_MISMATCH"):
     stage.verify_local(p)
 def test_reject_path_with_unapproved_name(self):
  with tempfile.TemporaryDirectory() as root:
   p=Path(root)/"historical-v1.3.zip"
   p.write_bytes(b"synthetic")
   with self.assertRaisesRegex(RuntimeError,"APPROVED_FILENAME_REQUIRED"):
    stage.verify_local(p)
 def test_reject_non_target_origin(self):
  with self.assertRaisesRegex(RuntimeError,"NON_PRODUCTION_STORAGE_ORIGIN_ABORT"):
   stage.request("https://example.com/storage/v1/object/bad",key="fake_synthetic_credential")
 def test_reject_public_bucket(self):
  with patch.object(stage,"request",return_value=(200,b'{"id":"nbjb-private-products","public":true}')):
   with self.assertRaisesRegex(RuntimeError,"BUCKET_MUST_BE_PRIVATE"):
    stage.verify_bucket("fake_synthetic_credential")
 def test_accept_private_bucket(self):
  with patch.object(stage,"request",return_value=(200,b'{"id":"nbjb-private-products","public":false}')):
   stage.verify_bucket("fake_synthetic_credential")
 def test_no_redirect_ever(self):
  handler=stage.NoRedirect()
  self.assertIsNone(handler.redirect_request(None,None,302,"Location",{},"https://example.com/"))
if __name__=="__main__":unittest.main()
