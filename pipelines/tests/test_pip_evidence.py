"""Synthetic fixtures only; no test data represent historical observations."""

from __future__ import annotations

import csv
import json
import tempfile
import unittest
from pathlib import Path

from pipelines.atlas_etl.acquire_economic_sources import sha256
from pipelines.atlas_etl.pip_evidence import SOURCE_ID, derive


class PipEvidenceTests(unittest.TestCase):
    def test_duplicate_surveys_remain_separate_and_subnational_is_not_national(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            raw = root / "raw.csv"
            fields = ["region_name", "country_name", "country_code", "reporting_year",
                      "reporting_level", "survey_acronym", "survey_year", "welfare_type",
                      "poverty_line", "headcount", "poverty_gap", "gini", "decile1",
                      "decile10", "is_interpolated", "estimation_type"]
            with raw.open("w", newline="") as stream:
                writer = csv.DictWriter(stream, fieldnames=fields)
                writer.writeheader()
                for index in range(2000):
                    writer.writerow({"region_name": "Synthetic", "country_name": "Synthetic place",
                                     "country_code": "SYN", "reporting_year": "2000",
                                     "reporting_level": "national", "survey_acronym": f"S{index}",
                                     "survey_year": "2000", "welfare_type": "income",
                                     "poverty_line": "3", "headcount": "0", "poverty_gap": "0.1",
                                     "gini": "0.4", "decile1": "0.02", "decile10": "0.3",
                                     "is_interpolated": "FALSE", "estimation_type": "survey"})
                writer.writerow({"region_name": "Synthetic", "country_name": "Synthetic place",
                                 "country_code": "SYN", "reporting_year": "2000",
                                 "reporting_level": "urban", "survey_acronym": "urban",
                                 "survey_year": "2000", "welfare_type": "income",
                                 "poverty_line": "3", "headcount": "0.5", "poverty_gap": "0.1",
                                 "gini": "0.4", "decile1": "0.02", "decile10": "0.3",
                                 "is_interpolated": "FALSE", "estimation_type": "survey"})
            lockfile = root / "lock.json"
            lockfile.write_text(json.dumps({"id": SOURCE_ID, "path": str(raw), "sha256": sha256(raw),
                                            "bytes": raw.stat().st_size, "source_rows": 2001}))
            catalog = derive(lockfile, root / "out")
            self.assertEqual(len(catalog), 5)
            self.assertEqual(catalog[0]["known_value_count"], 2000)
            dataset = json.loads((root / "out/pip-headcount-2021-ppp.json").read_text())
            self.assertEqual(len(dataset["observations"]), 2000)
            self.assertEqual(len({row[0] for row in dataset["observations"]}), 2000)
            self.assertEqual(dataset["observations"][0][2], 0.0)
            self.assertEqual(dataset["known_by_year"]["2000"], 2000)
            self.assertEqual(len((root / "out/pip-headcount-2021-ppp.csv").read_text().splitlines()), 2002)

    def test_source_checksum_mismatch_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            lockfile = Path(directory) / "lock.json"
            raw = Path(directory) / "raw.csv"
            raw.write_text("changed")
            lockfile.write_text(json.dumps({"id": SOURCE_ID, "path": str(raw),
                                            "sha256": "0" * 64, "bytes": 7, "source_rows": 1}))
            with self.assertRaisesRegex(ValueError, "changed or missing"):
                derive(lockfile, Path(directory) / "out")
