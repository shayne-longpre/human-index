"""Synthetic-only contract tests for source-native V-Dem extraction."""

import csv
import json
import tempfile
import unittest
from pathlib import Path

import pandas as pd

from pipelines.atlas_etl.institutional_evidence import extract


def frame() -> pd.DataFrame:
    return pd.DataFrame([
        {"country_name": "Fixture A", "country_text_id": "FAA", "country_id": 1.0, "year": 1800.0,
         "historical": 1.0, "histname": "Earlier Fixture A", "project": 1.0,
         "v2x_suffr": 0.0, "v2lgbicam": 0.0, "v2clrelig_ord": 0.0, "v2csrlgrep_ord": None},
        {"country_name": "Fixture A", "country_text_id": "FAA", "country_id": 1.0, "year": 1801.0,
         "historical": 1.0, "histname": "Earlier Fixture A", "project": 1.0,
         "v2x_suffr": None, "v2lgbicam": 2.0, "v2clrelig_ord": 4.0, "v2csrlgrep_ord": 1.0},
    ])


class InstitutionalEvidenceTests(unittest.TestCase):
    def test_zero_and_missing_are_not_conflated(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            catalog = extract(frame(), output, "a" * 64)
            self.assertEqual(len(catalog), 4)
            suffrage = json.loads((output / "vdem16-v2x_suffr.json").read_text())
            self.assertEqual(suffrage["observations"], [["1", 1800, 0.0, 1]])
            self.assertEqual(suffrage["source_rows"], [["1", 1800, 1], ["1", 1801, 2]])
            self.assertEqual(suffrage["available_years"], [1800])
            with (output / "vdem16-v2x_suffr.csv").open() as stream:
                rows = list(csv.DictReader(stream))
            self.assertEqual((rows[0]["value_status"], rows[0]["value"]), ("known", "0.0"))
            self.assertEqual((rows[1]["value_status"], rows[1]["value"]), ("unknown", ""))
            self.assertEqual(rows[0]["original_record_locator"], "vdem.RData::vdem[1]::v2x_suffr")

    def test_duplicate_country_year_rejected(self):
        duplicate = frame()
        duplicate.loc[1, "year"] = 1800.0
        with tempfile.TemporaryDirectory() as directory, self.assertRaisesRegex(ValueError, "Duplicate V-Dem"):
            extract(duplicate, Path(directory), "a" * 64)

    def test_unknown_ordinal_code_rejected(self):
        invalid = frame()
        invalid.loc[0, "v2clrelig_ord"] = 9.0
        with tempfile.TemporaryDirectory() as directory, self.assertRaisesRegex(ValueError, "Unknown category"):
            extract(invalid, Path(directory), "a" * 64)
