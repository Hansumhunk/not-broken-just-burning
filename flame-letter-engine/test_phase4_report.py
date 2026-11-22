"""A machine-readable CI report must never imply provider testing or release."""
import json
from pathlib import Path
import tempfile
import unittest
from phase4_report import build, main

class PhaseFourReportTests(unittest.TestCase):
    def test_report_is_fail_closed_and_all_twenty_cases_visible(self):
        r=build()
        self.assertEqual(r["acceptance"]["case_count"],20)
        self.assertEqual(r["provider_case_passes_newly_verified"],0)
        self.assertFalse(r["provider_authenticated_in_this_run"])
        self.assertFalse(r["shutdown"]["provider_shutdown_accepted"])
        self.assertFalse(r["public_newsletter_release_authorized"])
        self.assertEqual(r["provider_mutations_executed"],0)
    def test_staging_report_contains_no_contacts(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/"phase4-readiness.json"
            main(p)
            s=p.read_text(encoding="utf-8")
            r=json.loads(s)
            self.assertEqual(r["acceptance"]["case_count"],20)
            self.assertNotIn("@",s)
            self.assertNotIn("api-key",s)
            self.assertFalse(r["live_provider_queue_clearance"])
            with self.assertRaises(RuntimeError):
                main(p)
if __name__=="__main__":unittest.main()
