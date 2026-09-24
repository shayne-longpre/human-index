import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from pipelines.atlas_etl.acquire_vertical_sources import (
    ARTIFACTS,
    validate_artifact,
    validate_catalog,
)


class CandidateSourceAcquisitionTests(unittest.TestCase):
    def test_catalog_has_unique_safe_targets(self) -> None:
        validate_catalog()
        self.assertEqual(len(ARTIFACTS), 19)
        self.assertTrue(all(not Path(item.relative_path).is_absolute() for item in ARTIFACTS))

    def test_payload_validation_rejects_source_error_pages(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fake_json = root / "payload.json"
            fake_json.write_text(json.dumps({"ok": True}), encoding="utf-8")
            validate_artifact(fake_json, "json")

            fake_pdf = root / "payload.pdf"
            fake_pdf.write_text("Access denied", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "Expected PDF"):
                validate_artifact(fake_pdf, "pdf")

            fake_workbook = root / "payload.xlsx"
            with zipfile.ZipFile(fake_workbook, "w") as archive:
                archive.writestr("not-a-workbook.txt", "blocked")
            with self.assertRaisesRegex(RuntimeError, "Expected XLSX"):
                validate_artifact(fake_workbook, "xlsx")


if __name__ == "__main__":
    unittest.main()
