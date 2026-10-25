"""Profile pinned OWID long-run life expectancy and its source-mix gate."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

from .core import ValidationError, write_json


def profile(lock_path: Path, output: Path) -> dict:
    lock = json.loads(lock_path.read_text())
    paths = {}
    for item in lock["artifacts"]:
        path = Path(item["path"])
        if path.stat().st_size != item["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]:
            raise ValidationError(f"OWID artifact differs from lock: {item['id']}")
        paths[path.name] = path
    metadata = json.loads(paths["life-expectancy.metadata.json"].read_text())
    with paths["life-expectancy.csv"].open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != ["Entity", "Code", "Year", "Life expectancy"]:
            raise ValidationError("OWID chart columns changed")
        rows = list(reader)
    years = Counter(int(row["Year"]) for row in rows)
    report = {"status": "acquired_profiled_not_released", "source_lock_sha256": hashlib.sha256(lock_path.read_bytes()).hexdigest(),
              "metadata_downloaded_on": metadata.get("dateDownloaded"),
              "source_mix": metadata["columns"]["Period life expectancy at birth"]["citationShort"],
              "rows": len(rows), "entities": len({row["Entity"] for row in rows}),
              "nonempty_codes": len({row["Code"] for row in rows if row["Code"]}),
              "rows_without_code": sum(not row["Code"] for row in rows),
              "year_range": [min(years), max(years)], "rows_before_1950": sum(count for year, count in years.items() if year < 1950),
              "rows_1800": years[1800], "rows_1900": years[1900],
              "publication_gates": ["audit_underlying_HMD_and_Zijdeman_reuse_terms",
                                    "retain_OWID_source_specific_row_lineage_and_source_switch",
                                    "separate_country_territory_and_region_support",
                                    "do_not_interpret_period_life_expectancy_as_personal_age_at_death"]}
    write_json(output, report)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lock", type=Path, default=Path("data/registry/owid-life-expectancy-lock.json"))
    parser.add_argument("--output", type=Path, default=Path("data/review/owid-life-expectancy-profile.json"))
    args = parser.parse_args()
    print(json.dumps(profile(args.lock, args.output)))


if __name__ == "__main__":
    main()
