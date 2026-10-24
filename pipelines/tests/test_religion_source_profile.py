"""Synthetic fixtures for the review-only World Religion Project profile."""

import csv
import json
import tempfile
import unittest
from pathlib import Path

from pipelines.atlas_etl.core import sha256
from pipelines.atlas_etl.profile_religion_candidates import profile


class ReligionSourceProfileTests(unittest.TestCase):
    def test_source_years_and_dual_religion_remain_review_flags(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            national = root / "WRP_national.csv"
            with national.open("w", newline="") as stream:
                writer = csv.DictWriter(stream, fieldnames=["year", "state", "name", "chrstgen", "islmgen", "nonrelig", "pop", "dualrelig", "Version", "sourcecode"])
                writer.writeheader()
                writer.writerow({"year": 1945, "state": 1, "name": "Fixture", "pop": 100, "dualrelig": 1, "Version": "1.1", "sourcecode": 7})
                writer.writerow({"year": 1950, "state": 1, "name": "Fixture", "pop": 101, "dualrelig": 0, "Version": "1.1", "sourcecode": 7})
            codebook = root / "codebook.pdf"
            codebook.write_bytes(b"%PDF-synthetic fixture")
            lock = root / "lock.json"
            lock.write_text(json.dumps({
                "source_id": "world_religion_project",
                "release": "World Religion Data v1.1",
                "publication_status": "review_only_republication_terms_unresolved",
                "files": {key: {"path": str(path), "bytes": path.stat().st_size, "sha256": sha256(path)}
                          for key, path in (("national", national), ("codebook", codebook))},
            }))
            result = profile(lock, root / "profile.json")
            self.assertEqual(result["source_rows"], 2)
            self.assertEqual(result["year_counts"], {"1945": 1, "1950": 1})
            self.assertEqual(result["dual_religion_rows"], 1)
            self.assertEqual(result["duplicate_state_year_keys"], 0)
            self.assertIn("review_only", result["publication_status"])


if __name__ == "__main__":
    unittest.main()
