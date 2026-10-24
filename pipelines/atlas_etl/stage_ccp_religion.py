"""Stage a narrow, source-native CCP religion-policy slice for local review."""

from __future__ import annotations

import argparse
import csv
import io
import json
import zipfile
from pathlib import Path

from .core import artifact_record, sha256, write_json

TRANSFORM_ID = "ccp-religion-source-native-stage-v1"
CHARACTERISTIC_FIELDS = (
    "cowcode", "country", "year", "systid", "c_inforce",
    "coding_available", "coding_imputed", "freerel", "seprel",
)
CHRONOLOGY_FIELDS = ("cowcode", "country", "year", "systid", "evntid", "evnttype")


def _rows(archive: zipfile.ZipFile, member: str, fields: tuple[str, ...]) -> list[dict]:
    with archive.open(member) as binary:
        with io.TextIOWrapper(binary, encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            if not reader.fieldnames or not set(fields).issubset(reader.fieldnames):
                raise ValueError(f"CCP source fields changed in {member}")
            result = []
            for source_row, record in enumerate(reader, start=2):
                if None in record or any(value is None for value in record.values()):
                    raise ValueError(f"Shifted CCP source row {source_row}")
                if not record["cowcode"] or not record["year"]:
                    raise ValueError(f"Missing CCP support or year at row {source_row}")
                result.append({"source_row": source_row, "cells": [record[field] or None for field in fields]})
            return result


def stage(lockfile: Path, output: Path) -> dict:
    lock = json.loads(lockfile.read_text(encoding="utf-8"))
    if lock.get("source_id") != "comparative_constitutions_project":
        raise ValueError("Expected pinned CCP source lock")
    sections = {}
    inputs = []
    for name, fields in (("characteristics_v5", CHARACTERISTIC_FIELDS), ("chronology_v6", CHRONOLOGY_FIELDS)):
        artifact = lock["artifacts"][name]
        path = Path(artifact["path"])
        if path.stat().st_size != artifact["bytes"] or sha256(path) != artifact["sha256"]:
            raise ValueError(f"Pinned CCP {name} archive changed")
        with zipfile.ZipFile(path) as archive:
            if artifact["codebook_member"] not in archive.namelist():
                raise ValueError(f"Missing CCP {name} codebook")
            rows = _rows(archive, artifact["data_member"], fields)
        sections[name] = {"columns": list(fields), "rows": rows,
                          "source_archive_sha256": artifact["sha256"],
                          "source_member": artifact["data_member"]}
        inputs.append({"id": name, "sha256": artifact["sha256"]})
    staged = {
        "schema_version": "0.1.0", "source_id": lock["source_id"],
        "access_class": "local_research_only_not_in_public_release",
        "source_url": lock["source_page"],
        "transformation": {"id": TRANSFORM_ID, "version": "1.0.0",
                           "parameters": {"fields": {name: section["columns"] for name, section in sections.items()},
                                          "temporal_policy": "exact_source_year_no_fill"}},
        "interpretation": "Source codes retained as text. FREEREL 1/2 describe a coded written provision, not enforcement. Coding availability and imputation remain separate source flags. Chronology preserves same-year events.",
        "sections": sections,
    }
    write_json(output, staged)
    receipt = {"schema_version": "0.1.0", "access_class": staged["access_class"],
               "input_artifacts": inputs, "transformation": staged["transformation"],
               "output": artifact_record(output),
               "row_counts": {name: len(section["rows"]) for name, section in sections.items()}}
    write_json(output.with_suffix(".receipt.json"), receipt)
    return receipt


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lockfile", type=Path, default=Path("data/registry/ccp-source-lock.json"))
    parser.add_argument("--output", type=Path, default=Path("data/derived/institutions/ccp-religion-local.json"))
    args = parser.parse_args()
    print(json.dumps(stage(args.lockfile, args.output), sort_keys=True))


if __name__ == "__main__":
    main()
