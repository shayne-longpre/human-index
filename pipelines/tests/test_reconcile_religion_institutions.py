"""Synthetic records exercise candidate matching; none are historical evidence."""

import csv
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from pipelines.atlas_etl.core import artifact_record, sha256, write_json
from pipelines.atlas_etl.reconcile_religion_institutions import reconcile
from pipelines.atlas_etl.stage_ccp_religion import stage


def _csv(fields: list[str], records: list[dict]) -> str:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    writer.writerows(records)
    return output.getvalue()


class ReligionInstitutionsReconciliationTests(unittest.TestCase):
    def test_stages_source_codes_and_preserves_duplicate_candidates(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            artifacts = {}
            for name, fields, records in (
                ("characteristics_v5", ["cowcode", "country", "year", "systid", "c_inforce", "coding_available", "coding_imputed", "freerel", "seprel"], [
                    {"cowcode": "002", "country": "Fixture A", "year": "2000", "systid": "1", "c_inforce": "1", "coding_available": "1", "coding_imputed": "0", "freerel": "1", "seprel": ""},
                    {"cowcode": "002", "country": "Fixture A", "year": "2000", "systid": "2", "c_inforce": "1", "coding_available": "1", "coding_imputed": "1", "freerel": "2", "seprel": "2"},
                ]),
                ("chronology_v6", ["cowcode", "country", "year", "systid", "evntid", "evnttype"], [
                    {"cowcode": "002", "country": "Fixture A", "year": "2000", "systid": "2", "evntid": "3", "evnttype": "new"},
                ]),
            ):
                path = root / f"{name}.zip"
                with zipfile.ZipFile(path, "w") as archive:
                    archive.writestr("data.csv", _csv(fields, records))
                    archive.writestr("codebook.pdf", b"synthetic fixture")
                artifacts[name] = {"path": str(path), "bytes": path.stat().st_size,
                                   "sha256": sha256(path), "data_member": "data.csv", "codebook_member": "codebook.pdf"}
            lock = root / "lock.json"
            write_json(lock, {"source_id": "comparative_constitutions_project", "source_page": "https://example.invalid/test", "artifacts": artifacts})
            ccp_path = root / "ccp.json"
            stage(lock, ccp_path)
            ccp = json.loads(ccp_path.read_text())
            self.assertEqual(ccp["sections"]["characteristics_v5"]["rows"][0]["cells"][-1], None)

            wrp_path = root / "wrp.json"
            write_json(wrp_path, {"source_id": "world_religion_project", "columns": ["state", "year", "name"], "rows": [
                {"source_row": 2, "cells": ["2", 2000, "Fixture A"]},
                {"source_row": 3, "cells": ["2", 2005, "Fixture A"]},
            ]})
            write_json(wrp_path.with_suffix(".receipt.json"), {"output": artifact_record(wrp_path)})
            output = root / "candidates.json"
            receipt = reconcile(wrp_path, ccp_path, output)
            result = json.loads(output.read_text())
            self.assertEqual(receipt["candidate_count"], 1)
            self.assertEqual([item["source_row"] for item in result["candidates"][0]["ccp"]], [2, 3])
            self.assertEqual(result["candidates"][0]["disposition"], "same_code_year_candidate_support_not_reviewed")
            self.assertEqual(result["wrp_source_row_count"], 2)
            ccp_path.write_text(json.dumps({"source_id": "comparative_constitutions_project"}))
            with self.assertRaisesRegex(ValueError, "checksum disagrees"):
                reconcile(wrp_path, ccp_path, root / "invalid.json")


if __name__ == "__main__":
    unittest.main()
