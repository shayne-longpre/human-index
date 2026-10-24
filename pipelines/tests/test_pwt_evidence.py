"""Synthetic source-integrity fixtures; never published as PWT observations."""

from __future__ import annotations

import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from pipelines.atlas_etl.acquire_pwt import acquire
from pipelines.atlas_etl.pwt_evidence import derive


class PwtEvidenceTests(unittest.TestCase):
    def test_existing_pinned_workbook_is_not_replaced(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            raw = Path(directory) / "synthetic.xlsx"
            with zipfile.ZipFile(raw, "w") as archive:
                archive.writestr("xl/workbook.xml", "synthetic")
                archive.writestr("[Content_Types].xml", "synthetic")
            lockfile = Path(directory) / "lock.json"
            first = acquire(raw, lockfile, "2026-01-01")
            second = acquire(raw, lockfile, "2026-02-01")
            self.assertEqual(first["sha256"], second["sha256"])
            self.assertEqual(second["retrieved_on"], "2026-01-01")
            raw.write_text("changed")
            with self.assertRaisesRegex(ValueError, "changed"):
                acquire(raw, lockfile, "2026-03-01")

    def test_derive_fails_on_source_checksum_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            raw = Path(directory) / "raw.xlsx"
            raw.write_text("not a workbook")
            lockfile = Path(directory) / "lock.json"
            lockfile.write_text(json.dumps({"id": "penn-world-table-11.0-workbook",
                                            "path": str(raw), "bytes": raw.stat().st_size,
                                            "sha256": "0" * 64}))
            with self.assertRaisesRegex(ValueError, "changed or missing"):
                derive(lockfile, Path(directory) / "out")
