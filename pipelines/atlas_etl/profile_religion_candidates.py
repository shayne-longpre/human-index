"""Read-only profile of the pinned WRP national source, not a publication adapter."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path

from .core import sha256, write_json


def profile(lockfile: Path, output: Path) -> dict:
    lock = json.loads(lockfile.read_text())
    if lock["source_id"] != "world_religion_project" or lock["publication_status"] != "review_only_republication_terms_unresolved":
        raise ValueError("Not a reviewed WRP candidate lock")
    for item in lock["files"].values():
        path = Path(item["path"])
        if path.stat().st_size != item["bytes"] or sha256(path) != item["sha256"]:
            raise ValueError(f"Pinned WRP artifact changed: {path}")
    path = Path(lock["files"]["national"]["path"])
    with path.open(newline="", encoding="utf-8-sig") as stream:
        reader = csv.DictReader(stream)
        expected = {"year", "state", "name", "chrstgen", "islmgen", "nonrelig", "pop", "dualrelig", "Version", "sourcecode"}
        if reader.fieldnames is None or not expected.issubset(reader.fieldnames):
            raise ValueError("WRP national schema changed")
        years: Counter[int] = Counter()
        state_ids = set()
        keys = set()
        duplicate_keys = 0
        versions: Counter[str] = Counter()
        source_codes: Counter[str] = Counter()
        dual_religion_rows = 0
        blank_population_rows = 0
        total_rows = 0
        for row in reader:
            year = int(row["year"])
            if year < 1945 or year > 2010 or (year - 1945) % 5:
                raise ValueError(f"Unexpected WRP source year {year}")
            key = (row["state"], year)
            duplicate_keys += key in keys
            keys.add(key)
            state_ids.add(row["state"])
            years[year] += 1
            versions[row["Version"]] += 1
            source_codes[row["sourcecode"]] += 1
            dual_religion_rows += row["dualrelig"] not in ("", "0")
            blank_population_rows += not row["pop"]
            total_rows += 1
    result = {
        "schema_version": "0.1.0", "source_id": "world_religion_project",
        "release": lock["release"], "national_csv_sha256": lock["files"]["national"]["sha256"],
        "codebook_sha256": lock["files"]["codebook"]["sha256"],
        "source_rows": total_rows, "state_ids": len(state_ids),
        "year_counts": {str(year): years[year] for year in sorted(years)},
        "duplicate_state_year_keys": duplicate_keys,
        "versions": dict(versions), "source_code_count": len(source_codes),
        "dual_religion_rows": dual_religion_rows, "blank_population_rows": blank_population_rows,
        "publication_status": "review_only_republication_terms_and_source_imputation_not_resolved",
        "interpretation": "Source-produced state-level adherence estimates at five-year dates. The source itself imputes missing cases and uses its own religion tree. Counts, percentages, subfamilies, and global aggregates must not be summed together or spliced with Pew/ARDA.",
    }
    write_json(output, result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lockfile", type=Path, default=Path("data/registry/religion-source-lock.json"))
    parser.add_argument("--output", type=Path, default=Path("data/review/religion-source-profile.json"))
    args = parser.parse_args()
    result = profile(args.lockfile, args.output)
    print(json.dumps({"source_rows": result["source_rows"], "state_ids": result["state_ids"],
                      "years": len(result["year_counts"]), "status": result["publication_status"]}))


if __name__ == "__main__":
    main()
