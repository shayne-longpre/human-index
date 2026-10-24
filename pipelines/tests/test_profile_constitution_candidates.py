"""Synthetic CCP archive tests; fixture records are not historical claims."""

import csv
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from pipelines.atlas_etl.acquire_ccp import acquire
from pipelines.atlas_etl.core import sha256
from pipelines.atlas_etl.profile_constitution_candidates import profile


def csv_bytes(fields: list[str], rows: list[dict]) -> bytes:
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue().encode()


class ConstitutionProfileTests(unittest.TestCase):
    def test_preserves_source_supports_and_duplicate_years(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            artifacts = {}
            fixtures = {
                "chronology_v6": (["cowcode", "country", "year", "evnttype"], [
                    {"cowcode": 2, "country": "Fixture", "year": 1789, "evnttype": "new"},
                    {"cowcode": 2, "country": "Fixture", "year": 1789, "evnttype": "amend"},
                ]),
                "characteristics_v5": (["cowcode", "country", "year", "c_inforce", "coding_available", "coding_imputed"], [
                    {"cowcode": 2, "country": "Fixture", "year": 1900, "c_inforce": 1, "coding_available": 0, "coding_imputed": 1},
                ]),
            }
            for name, (fields, rows) in fixtures.items():
                archive_path = root / f"{name}.zip"
                with zipfile.ZipFile(archive_path, "w") as archive:
                    archive.writestr("data.csv", csv_bytes(fields, rows))
                    archive.writestr("codebook.pdf", b"synthetic fixture")
                artifacts[name] = {
                    "path": str(archive_path), "bytes": archive_path.stat().st_size,
                    "sha256": sha256(archive_path), "data_member": "data.csv", "codebook_member": "codebook.pdf",
                }
            lock = root / "lock.json"
            lock.write_text(json.dumps({"source_id": "comparative_constitutions_project", "artifacts": artifacts}))
            self.assertEqual(acquire(lock), {name: item["sha256"] for name, item in artifacts.items()})
            result = profile(lock, root / "profile.json")
            self.assertEqual(result["artifacts"]["chronology_v6"]["duplicate_country_year_rows"], 1)
            self.assertEqual(result["artifacts"]["chronology_v6"]["first_source_year"], 1789)
            self.assertEqual(result["artifacts"]["characteristics_v5"]["source_flags"]["coding_imputed:1"], 1)
            self.assertIn("local_research_only", result["access_class"])


if __name__ == "__main__":
    unittest.main()
