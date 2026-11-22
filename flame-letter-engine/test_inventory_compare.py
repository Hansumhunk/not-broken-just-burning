"""Local inventory reconciliation tests. Synthetic historical titles only."""
import importlib.util
import json
from pathlib import Path
import unittest

DIR=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("inventory_compare",DIR/"inventory_compare.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class InventoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        catalog=json.loads((DIR/"catalog.json").read_text())["topics"]
        held=set(json.loads((DIR/"manifest.json").read_text())["suppressedIds"])
        cls.first_four=[{"id":x["id"],"title":x["title"],"source":x["source"]}
                        for x in catalog if x["id"] not in held][:4]

    def full(self):
        data=[]
        for kind,ct in mod.EXPECTED.items():
            for i in range(ct):
                data.append({"id":kind+"-"+str(i+1),"kind":kind,
                             "subject":kind+" synthetic teaching "+str(i+1)})
        return data

    def test_missing_private_inventory_does_not_falsely_pass_edition_uniqueness(self):
        d=mod.compare(self.first_four,[])
        self.assertFalse(d["historical_inventory_complete"])
        self.assertEqual(len(d["candidates"]),4)
        self.assertTrue(all(x["editorial_disposition"]=="UNKNOWN_PRIVATE_INVENTORY_MISSING"
                            for x in d["candidates"]))
        self.assertTrue(all(x["automatic_uniqueness_approval"] is False
                            for x in d["candidates"]))

    def test_complete_31_metadata_rows_still_require_editorial_approval(self):
        d=mod.compare(self.first_four,self.full())
        self.assertTrue(d["historical_inventory_complete"])
        self.assertEqual(d["historical_counts"],mod.EXPECTED)
        self.assertTrue(all(x["editorial_disposition"]=="REVIEW_REQUIRED_INVENTORY_COMPLETE"
                            for x in d["candidates"]))
        self.assertFalse(d["provider_scheduling_authorized"])

    def test_detects_plausible_overlap_against_weekly_subject(self):
        old=self.full()
        old[6]["subject"]="A Boundary Can Hurt and Still Be Necessary"
        d=mod.compare(self.first_four,old)
        self.assertEqual(d["candidates"][0]["editorial_disposition"],"HOLD_POSSIBLE_OVERLAP")
        self.assertEqual(d["candidates"][0]["potential_overlaps"][0]["historical_id"],"weekly-1")

    def test_non_weekly_subject_does_not_equate_to_a_duplicated_weekly_edition(self):
        old=self.full()
        old[0]["subject"]="A Boundary Can Hurt and Still Be Necessary"
        d=mod.compare(self.first_four,old)
        self.assertEqual(d["candidates"][0]["editorial_disposition"],"REVIEW_REQUIRED_INVENTORY_COMPLETE")

    def test_missing_single_weekly_row_remains_incomplete(self):
        old=self.full()
        old=[x for x in old if x["id"]!="weekly-12"]
        d=mod.compare(self.first_four,old)
        self.assertFalse(d["historical_inventory_complete"])
        self.assertEqual(d["historical_counts"]["weekly"],11)

    def test_duplicate_historical_ids_are_rejected(self):
        old=self.full()
        old[-1]["id"]=old[0]["id"]
        with self.assertRaisesRegex(ValueError,"duplicate"):
            mod.compare(self.first_four,old)

    def test_overlapping_identical_titles_are_not_auto_approved(self):
        old=self.full()
        old[6]["subject"]=self.first_four[2]["title"]
        d=mod.compare(self.first_four,old)
        self.assertFalse(d["candidates"][2]["automatic_uniqueness_approval"])
        self.assertEqual(d["candidates"][2]["editorial_disposition"],"HOLD_POSSIBLE_OVERLAP")

if __name__=="__main__":
    unittest.main()
