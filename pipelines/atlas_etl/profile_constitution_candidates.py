"""Stream the pinned CCP archives into a local-only schema and coverage audit."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import zipfile
from collections import Counter
from pathlib import Path

from .core import sha256, write_json


def profile(lockfile: Path, output: Path) -> dict:
    lock = json.loads(lockfile.read_text(encoding="utf-8"))
    if lock.get("source_id") != "comparative_constitutions_project":
        raise ValueError("Expected a pinned CCP source lock")
    profiles = {}
    for name in ("chronology_v6", "characteristics_v5"):
        artifact = lock["artifacts"][name]
        path = Path(artifact["path"])
        if path.stat().st_size != artifact["bytes"] or sha256(path) != artifact["sha256"]:
            raise ValueError(f"Pinned CCP artifact changed: {name}")
        with zipfile.ZipFile(path) as archive:
            codebook = archive.read(artifact["codebook_member"])
            with archive.open(artifact["data_member"]) as binary:
                with io.TextIOWrapper(binary, encoding="utf-8-sig", newline="") as stream:
                    reader = csv.DictReader(stream)
                    columns = reader.fieldnames
                    if not columns or len(columns) != len(set(columns)) or not {"cowcode", "country", "year"}.issubset(columns):
                        raise ValueError(f"CCP {name} columns changed")
                    counts: Counter[str] = Counter()
                    supports = set()
                    keys = set()
                    duplicate_country_year = 0
                    years = []
                    for row in reader:
                        if None in row or any(value is None for value in row.values()):
                            raise ValueError(f"CCP {name} has a shifted CSV row")
                        year = int(row["year"])
                        years.append(year)
                        supports.add(row["cowcode"])
                        key = (row["cowcode"], year)
                        duplicate_country_year += key in keys
                        keys.add(key)
                        if name == "characteristics_v5":
                            for flag in ("c_inforce", "coding_available", "coding_imputed"):
                                counts[f"{flag}:{row.get(flag, '')}"] += 1
                        else:
                            counts[f"evnttype:{row.get('evnttype', '')}"] += 1
        profiles[name] = {
            "archive_sha256": artifact["sha256"],
            "data_member": artifact["data_member"],
            "codebook_member_sha256": hashlib.sha256(codebook).hexdigest(),
            "column_count": len(columns), "row_count": len(years),
            "source_support_count": len(supports),
            "first_source_year": min(years), "last_source_year": max(years),
            "duplicate_country_year_rows": duplicate_country_year,
            "source_flags": dict(sorted(counts.items())),
        }
    result = {
        "schema_version": "0.1.0", "source_id": lock["source_id"],
        "access_class": "local_research_only_not_in_public_release",
        "artifacts": profiles,
        "interpretation": "Source-native constitutional event and characteristic records; no annual gap fill, cross-source join, or inference that a constitutional provision operated in practice.",
    }
    write_json(output, result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lockfile", type=Path, default=Path("data/registry/ccp-source-lock.json"))
    parser.add_argument("--output", type=Path, default=Path("data/review/ccp-source-profile.json"))
    args = parser.parse_args()
    result = profile(args.lockfile, args.output)
    print(json.dumps({name: {key: value for key, value in item.items() if key in
                      {"column_count", "row_count", "first_source_year", "last_source_year", "duplicate_country_year_rows"}}
                      for name, item in result["artifacts"].items()}, sort_keys=True))


if __name__ == "__main__":
    main()
