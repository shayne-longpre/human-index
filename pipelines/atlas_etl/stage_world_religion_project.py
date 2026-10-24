"""Stage every WRP national source field for local research, not web publication."""

from __future__ import annotations

import argparse
import csv
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path

from .core import artifact_record, sha256, write_json

TRANSFORM_ID = "wrp-national-source-native-stage-v1"
TEXT_FIELDS = {"state", "name", "reliabilevel", "Version"}
REQUIRED_FIELDS = {"year", "state", "name", "pop", "sumrelig", "sumreligpct", "dualrelig",
                   "datatype", "sourcereliab", "recreliab", "reliabilevel", "Version", "sourcecode"}


def _source_value(field: str, raw: str) -> str | int | float | None:
    if raw == "":
        return None
    if field in TEXT_FIELDS:
        return raw
    try:
        value = Decimal(raw)
    except InvalidOperation as error:
        raise ValueError(f"WRP {field} is not a number: {raw!r}") from error
    if not value.is_finite() or value < 0:
        raise ValueError(f"WRP {field} is not finite and nonnegative: {raw!r}")
    if field.endswith("pct") or field == "total":
        return float(value)
    if value != value.to_integral_value():
        raise ValueError(f"WRP {field} is not an integer: {raw!r}")
    return int(value)


def stage(lockfile: Path, output: Path) -> dict:
    lock = json.loads(lockfile.read_text(encoding="utf-8"))
    if lock.get("source_id") != "world_religion_project" or lock.get("release") != "World Religion Data v1.1":
        raise ValueError("Expected pinned World Religion Data v1.1")
    for name in ("national", "codebook"):
        item = lock["files"][name]
        path = Path(item["path"])
        if path.stat().st_size != item["bytes"] or sha256(path) != item["sha256"]:
            raise ValueError(f"Pinned WRP {name} artifact changed")
    path = Path(lock["files"]["national"]["path"])
    with path.open(newline="", encoding="utf-8-sig") as stream:
        reader = csv.DictReader(stream)
        columns = reader.fieldnames
        if not columns or len(columns) != len(set(columns)) or not REQUIRED_FIELDS.issubset(columns):
            raise ValueError("WRP national columns changed or repeat")
        rows = []
        seen = set()
        for source_row, record in enumerate(reader, start=2):
            if None in record or any(value is None for value in record.values()):
                raise ValueError(f"WRP source row {source_row} has a shifted column count")
            year = int(record["year"])
            if year < 1945 or year > 2010 or (year - 1945) % 5:
                raise ValueError(f"Unexpected WRP year at source row {source_row}")
            if not record["state"] or not record["name"] or record["Version"] != "1.1":
                raise ValueError(f"Missing WRP identity or unexpected version at source row {source_row}")
            key = (record["state"], year)
            if key in seen:
                raise ValueError(f"Duplicate WRP state/year {key}")
            seen.add(key)
            cells = [_source_value(field, record[field]) for field in columns]
            if cells[columns.index("dualrelig")] not in (0, 1):
                raise ValueError(f"Invalid WRP dualrelig at source row {source_row}")
            rows.append({"source_row": source_row, "cells": cells})
    staged = {
        "schema_version": "0.1.0",
        "source_id": "world_religion_project",
        "source_release": lock["release"],
        "source_url": lock["source_page"],
        "source_artifact_sha256": lock["files"]["national"]["sha256"],
        "codebook_sha256": lock["files"]["codebook"]["sha256"],
        "transformation": {"id": TRANSFORM_ID, "version": "1.0.0", "parameters": {"scope": "national", "years": "source_exact"}},
        "access_class": "local_research_only_not_in_public_release",
        "statistical_support": "source COW state code; not Atlas border geometry",
        "value_policy": "All source columns retained in original order. Empty cells become null; numeric zero remains zero. Counts, subgroup counts, percentages and totals are not summed or merged.",
        "source_method": "Source-authored reconciliation and imputation; datatype and reliability codes retained without Atlas reinterpretation.",
        "columns": columns,
        "rows": rows,
    }
    write_json(output, staged)
    receipt = {
        "schema_version": "0.1.0", "access_class": staged["access_class"],
        "input_artifacts": [
            {"id": "wrp-national-v1.1", "sha256": staged["source_artifact_sha256"]},
            {"id": "wrp-codebook-v1.1", "sha256": staged["codebook_sha256"]},
        ],
        "transformation": staged["transformation"],
        "output": artifact_record(output),
        "row_count": len(rows), "column_count": len(columns),
    }
    write_json(output.with_suffix(".receipt.json"), receipt)
    return receipt


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lockfile", type=Path, default=Path("data/registry/religion-source-lock.json"))
    parser.add_argument("--output", type=Path, default=Path("data/derived/religion/wrp-national-v1.1.json"))
    args = parser.parse_args()
    print(json.dumps(stage(args.lockfile, args.output), sort_keys=True))


if __name__ == "__main__":
    main()
