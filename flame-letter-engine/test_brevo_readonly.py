"""Brevo read-only adapter tests with synthetic fixtures; no network or credentials."""
import importlib.util
from pathlib import Path
import os
import unittest
from unittest.mock import patch

loc=Path(__file__).with_name("brevo_readonly.py")
spec=importlib.util.spec_from_file_location("brevo_readonly",loc)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
BrevoReadOnly, ProviderHold=mod.BrevoReadOnly,mod.ProviderHold

class ReadOnlyTests(unittest.TestCase):
    def setUp(self):
        self.calls=[]
        def transport(path):
            self.calls.append(path)
            if path=="/v3/account":
                return {"companyName":"Synthetic NBJB", "plan":[{"type":"free"}],
                        "email":"private@test.invalid","secret":"secret", "relay":{"enabled":True}}
            if path=="/v3/emailCampaigns?limit=50&offset=0":
                return {"count":31,"campaigns":[
                    {"id":6,"name":"Weekly synthetic","subject":"Boundaries in daily life",
                     "status":"draft","htmlContent":"PRIVATE BODY",
                     "recipients":{"lists":[4]},"replyTo":"founder@test.invalid"}]}
            if path=="/v3/emailCampaigns/6?statistics=globalStats&excludeHtmlContent=true":
                return {"id":6,"name":"Weekly synthetic","subject":"Boundaries in daily life",
                        "status":"draft","statistics":{"globalStats":{
                             "sent":1,"unsubscriptions":1,"uniqueOpens":1,
                             "uniqueClicks":0,"privateStats":"secret"
                        }},"htmlContent":"PRIVATE BODY","recipients":{"lists":[4]}}
            if path=="/v3/contacts/lists?limit=50&offset=0":
                return {"lists":[{"id":4,"name":"NBJB synthetic test","totalSubscribers":1,
                                  "totalBlacklisted":1,"contacts":[{"email":"secret@test.invalid"}]}]}
            if path=="/v3/contacts/lists/4":
                return {"id":4,"name":"NBJB synthetic test","totalSubscribers":1,
                        "totalBlacklisted":1,"contacts":[{"email":"secret@test.invalid"}]}
            if path=="/v3/contacts/2":
                return {"id":2,"email":"founder@test.invalid","emailBlacklisted":True,
                        "smtpBlacklistSender":["x"],"attributes":{"FIRSTNAME":"DoNotReturn"}}
            raise AssertionError("unsanctioned endpoint " + path)
        self.adapter=BrevoReadOnly(transport)

    def test_account_redacts_sensitive_information(self):
        d=self.adapter.account()
        self.assertEqual(d["verified_scope"],"account_metadata_only")
        self.assertNotIn("private@test.invalid",repr(d))
        self.assertNotIn("secret",repr(d))

    def test_campaign_inventory_metadata_only(self):
        d=self.adapter.campaigns()
        self.assertEqual(d["count"],31)
        self.assertEqual(d["campaigns"][0]["id"],6)
        self.assertNotIn("PRIVATE BODY",repr(d))
        self.assertNotIn("recipients",repr(d))
        self.assertNotIn("founder@test.invalid",repr(d))

    def test_campaign_statistics_are_aggregated(self):
        d=self.adapter.campaign(6)
        self.assertEqual(d["globalStats"]["unsubscriptions"],1)
        self.assertNotIn("privateStats",repr(d))
        self.assertNotIn("PRIVATE BODY",repr(d))

    def test_list_aggregates_do_not_include_contacts(self):
        self.assertEqual(self.adapter.lists()["lists"][0]["totalBlacklisted"],1)
        self.assertNotIn("contacts",repr(self.adapter.lists()))
        self.assertNotIn("secret@test.invalid",repr(self.adapter.list_summary(4)))

    def test_founder_only_marketing_blocklist_without_identity(self):
        d=self.adapter.founder_test_suppression(2)
        self.assertEqual(d["email_campaign_blocklisted"],True)
        self.assertTrue(d["contact_identity_redacted"])
        self.assertEqual(d["transactional_permission"],"not established by this endpoint")
        self.assertNotIn("test.invalid",repr(d))

    def test_no_post_or_mutation_api_exposed(self):
        for name in ("post","send","schedule","put","delete","update_contact"):
            self.assertFalse(hasattr(self.adapter,name))
        self.assertTrue(all(path.startswith("/v3/") for path in self.calls))

    def test_query_and_path_injection_denied(self):
        for value in ("1?x=1","-2","https://evil.invalid/1","0","1/../2"):
            with self.assertRaises(ProviderHold):self.adapter.campaign(value)
            with self.assertRaises(ProviderHold):self.adapter.founder_test_suppression(value)
        with self.assertRaises(ProviderHold):self.adapter.lists(offset=-1)

    def test_environment_live_gate_denies_without_authorization(self):
        with patch.dict(os.environ,{},clear=True):
            with self.assertRaisesRegex(ProviderHold,"not authorized"):
                BrevoReadOnly.from_private_environment()
        with patch.dict(os.environ,{"NBJB_BREVO_READ_ONLY_AUTHORIZED":"yes"},clear=True):
            with self.assertRaisesRegex(ProviderHold,"key unavailable"):
                BrevoReadOnly.from_private_environment()

    def test_retrieved_provider_data_cannot_authorize_dispatch(self):
        with self.assertRaisesRegex(ProviderHold,"cannot authorize dispatch"):
            self.adapter.build_dispatch_snapshot(campaign=self.adapter.campaign(6))

    def test_missing_marketing_blocklist_field_fails_closed(self):
        adapter=BrevoReadOnly(lambda route:{"id":2,"email":"not-required"})
        with self.assertRaisesRegex(ProviderHold,"suppression state absent"):
            adapter.founder_test_suppression(2)

if __name__=="__main__":
    unittest.main()
