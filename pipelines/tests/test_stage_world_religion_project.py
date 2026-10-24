"""Synthetic WRP staging tests; no fixture values are historical evidence."""

import csv
import json
import tempfile
import unittest
from pathlib import Path

from pipelines.atlas_etl.core import sha256
from pipelines.atlas_etl.stage_world_religion_project import stage


FIELDS = ["year", "state", "name", "chrstgen", "judref", "pop", "sumrelig", "sumreligpct",
          "dualrelig", "datatype", "sourcereliab", "recreliab", "reliabilevel", "Version", "sourcecode"]


class StageWorldReligionProjectTests(unittest.TestCase):
    def _source(self, root: Path, records: list[dict]) -> Path:
        national = root / "WRP_national.csv"
        with national.open("w", newline="", encoding="utf-8") as stream:
            writer = csv.DictWriter(stream, fieldnames=FIELDS)
            writer.writeheader()
            writer.writerows(records)
        codebook = root / "codebook.pdf"
        codebook.write_bytes(b"synthetic test codebook")
        lock = root / "lock.json"
        lock.write_text(json.dumps({
            "source_id": "world_religion_project", "release": "World Religion Data v1.1",
            "source_page": "https://example.invalid/synthetic-test",
            "files": {name: {"path": str(path), "bytes": path.stat().st_size, "sha256": sha256(path)}
                      for name, path in (("national", national), ("codebook", codebook))},
        }))
        return lock

    def test_stages_all_columns_and_preserves_blank_zero_and_dual_count(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            lock = self._source(root, [{
                "year": 1945, "state": "002", "name": "Fixture", "chrstgen": 0, "judref": "",
                "pop": 100, "sumrelig": 120, "sumreligpct": "1.2000", "dualrelig": 1,
                "datatype": 83, "sourcereliab": 99, "recreliab": 35, "reliabilevel": "Low",
                "Version": "1.1", "sourcecode": 7,
            }])
            output = root / "stage.json"
            receipt = stage(lock, output)
            staged = json.loads(output.read_text())
            self.assertEqual(staged["columns"], FIELDS)
            row = dict(zip(staged["columns"], staged["rows"][0]["cells"]))
            self.assertEqual(staged["rows"][0]["source_row"], 2)
            self.assertEqual(row["state"], "002")
            self.assertEqual(row["chrstgen"], 0)
            self.assertIsNone(row["judref"])
            self.assertEqual(row["sumreligpct"], 1.2)
            self.assertEqual(row["datatype"], 83)
            self.assertEqual(receipt["output"]["sha256"], sha256(output))
            self.assertIn("local_research_only", staged["access_class"])

    def test_rejects_duplicate_source_support_and_year(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            record = {"year": 1945, "state": "2", "name": "Fixture", "Version": "1.1", "dualrelig": 0}
            lock = self._source(root, [record, record])
            with self.assertRaisesRegex(ValueError, "Duplicate WRP"):
                stage(lock, root / "stage.json")

    def test_rejects_changed_pinned_input(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            lock = self._source(root, [{"year": 1945, "state": "2", "name": "Fixture", "Version": "1.1", "dualrelig": 0}])
            (root / "WRP_national.csv").write_text("changed")
            with self.assertRaisesRegex(ValueError, "artifact changed"):
                stage(lock, root / "stage.json")


if __name__ == "__main__":
    unittest.main()
