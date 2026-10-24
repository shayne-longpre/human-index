"""Boundary tests for source-native economics ingestion."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from pipelines.atlas_etl.acquire_economic_sources import fetch, sha256, world_bank_response
from pipelines.atlas_etl.economic_evidence import _value, verified_artifacts


class EconomicEvidenceTests(unittest.TestCase):
    def test_missing_is_not_zero_and_negative_inflation_is_valid(self) -> None:
        self.assertIsNone(_value(None))
        self.assertEqual(_value(0), 0.0)
        self.assertEqual(_value(-2.3, allow_negative=True), -2.3)
        with self.assertRaises(ValueError):
            _value(-2.3)
        with self.assertRaises(ValueError):
            _value(True)

    def test_incomplete_api_response_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "response.json"
            path.write_text(json.dumps([{"pages": 2}, [{"indicator": {"id": "SI.POV.GINI"}}]]))
            with self.assertRaisesRegex(ValueError, "Incomplete"):
                world_bank_response(path, "SI.POV.GINI")

    def test_existing_source_file_is_never_overwritten_and_pin_is_checked(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            raw = Path(directory) / "source.json"
            raw.write_text("original")
            fetch("https://invalid.example/not-contacted", raw)
            self.assertEqual(raw.read_text(), "original")
            lock = Path(directory) / "lock.json"
            lock.write_text(json.dumps({"artifacts": [{"id": "source", "path": str(raw), "sha256": sha256(raw), "bytes": raw.stat().st_size}]}))
            self.assertIn("source", verified_artifacts(lock))
            raw.write_text("changed")
            with self.assertRaisesRegex(ValueError, "changed or missing"):
                verified_artifacts(lock)


if __name__ == "__main__":
    unittest.main()
