"""Stage source-native Seshat religion and institution rows for local review only."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import zipfile
from pathlib import Path

import openpyxl

from .core import artifact_record, sha256, write_json

WORKBOOK_MEMBER = "seshatdb-Equinox_Data-ed8f570/Equinox_on_GitHub_June9_2022.xlsx"
DIRECT_SECTIONS = {"Religion and Normative Ideology", "Institutional Variables"}
RELIGION_COMPLEXITY_VARIABLES = {"Religious levels", "Sacred Texts", "Religious literature"}
TRANSFORM_ID = "seshat-equinox-source-native-institutions-stage-v1"


def relevant(section: object, variable: object, government_variables: set[str]) -> bool:
    return section in DIRECT_SECTIONS or variable in government_variables or variable in RELIGION_COMPLEXITY_VARIABLES


def stage(lockfile: Path, output: Path) -> dict:
    lock = json.loads(lockfile.read_text(encoding="utf-8"))
    candidate = next((item for item in lock["artifacts"] if item["id"] == "seshat_equinox_v1_archive"), None)
    if candidate is None:
        raise ValueError("Missing pinned Seshat Equinox archive")
    path = Path(candidate["path"])
    if path.stat().st_size != candidate["bytes"] or sha256(path) != candidate["sha256"]:
        raise ValueError("Pinned Seshat archive changed")
    with zipfile.ZipFile(path) as archive:
        workbook_bytes = archive.read(WORKBOOK_MEMBER)
    workbook = openpyxl.load_workbook(io.BytesIO(workbook_bytes), read_only=True, data_only=True)
    try:
        variables = []
        for source_row, cells in enumerate(workbook["Variables"].values, start=1):
            if source_row == 1 or not cells[0]:
                continue
            values = list(cells[:6])
            variables.append({"source_row": source_row, "cells": values})
        government_variables = {item["cells"][0] for item in variables if item["cells"][4] == "government"}
        source = workbook["Equinox2020_CanonDat"]
        rows = iter(source.values)
        columns = list(next(rows))
        expected = ["NGA", "Polity", "Section", "Subsection", "Variable", "Value.From", "Value.To",
                    "Date.From", "Date.To", "Fact.Type", "Value.Note", "Date.Note"]
        if columns != expected:
            raise ValueError("Seshat canonical column contract changed")
        selected = []
        for source_row, cells in enumerate(rows, start=2):
            if not relevant(cells[2], cells[4], government_variables):
                continue
            values = list(cells[:len(columns)])
            if any(value is not None and not isinstance(value, (str, int, float, bool)) for value in values):
                raise ValueError(f"Unrecognized Seshat cell type at row {source_row}")
            selected.append({"source_row": source_row, "cells": values})
    finally:
        workbook.close()
    staged = {
        "schema_version": "0.1.0", "source_id": "seshat", "source_release": "Equinox v1",
        "source_archive_sha256": candidate["sha256"],
        "source_workbook_sha256": hashlib.sha256(workbook_bytes).hexdigest(),
        "source_member": WORKBOOK_MEMBER,
        "access_class": "local_research_only_license_conflict_no_public_release",
        "transformation": {"id": TRANSFORM_ID, "version": "1.0.0", "parameters": {
            "direct_sections": sorted(DIRECT_SECTIONS),
            "government_category": "government", "religion_complexity_variables": sorted(RELIGION_COMPLEXITY_VARIABLES),
        }},
        "value_policy": "Exact source cell values and blanks retained; no sentinel recoding, date conversion, inference, or polity crosswalk.",
        "columns": columns, "rows": selected,
        "variable_metadata_columns": ["Variable", "ShortName", "Section", "Subsection", "Category", "VarNumber"],
        "variable_metadata": variables,
    }
    write_json(output, staged)
    receipt = {
        "schema_version": "0.1.0", "access_class": staged["access_class"],
        "input_artifacts": [
            {"id": candidate["id"], "sha256": candidate["sha256"]},
            {"id": "Equinox_on_GitHub_June9_2022.xlsx", "sha256": staged["source_workbook_sha256"]},
        ],
        "transformation": staged["transformation"], "output": artifact_record(output),
        "selected_canonical_rows": len(selected), "variable_metadata_rows": len(variables),
    }
    write_json(output.with_suffix(".receipt.json"), receipt)
    return receipt


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lockfile", type=Path, default=Path("data/registry/candidate-source-lock.json"))
    parser.add_argument("--output", type=Path, default=Path("data/derived/institutions/seshat-equinox-local.json"))
    args = parser.parse_args()
    print(json.dumps(stage(args.lockfile, args.output), sort_keys=True))


if __name__ == "__main__":
    main()
