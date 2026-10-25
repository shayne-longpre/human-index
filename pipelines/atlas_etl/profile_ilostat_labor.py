"""Profile the pinned ILOSTAT labor table without mixing source definitions."""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
from collections import Counter
from pathlib import Path

from .core import ValidationError, write_json


def profile(lock_path: Path, output: Path) -> dict:
    lock = json.loads(lock_path.read_text())
    table = lock["table"]
    paths = {}
    for artifact in lock["artifacts"]:
        path = Path(artifact["path"])
        if path.stat().st_size != artifact["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != artifact["sha256"]:
            raise ValidationError(f"Pinned ILOSTAT artifact changed: {artifact['id']}")
        paths[path.name] = path
    with paths["table_of_contents_en.csv"].open(encoding="utf-8-sig", newline="") as handle:
        toc = next((row for row in csv.DictReader(handle) if row["id"] == table), None)
    if not toc or not toc["indicator.label"].startswith("Employment-to-population ratio by sex and age"):
        raise ValidationError("Current ILOSTAT table metadata changed")
    with paths["source_en.csv"].open(encoding="utf-8-sig", newline="") as handle:
        source_labels = {(row["ref_area"], row["source"]): row["source.label"] for row in csv.DictReader(handle)}
    counts = Counter()
    years: Counter[int] = Counter()
    ref_areas: set[str] = set()
    source_codes: set[tuple[str, str]] = set()
    source_prefix: Counter[str] = Counter()
    sex: Counter[str] = Counter()
    age: Counter[str] = Counter()
    status: Counter[str] = Counter()
    with gzip.open(paths[f"{table}.csv.gz"], "rt", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != ["ref_area", "source", "indicator", "sex", "classif1", "time", "obs_value",
                                 "obs_status", "note_classif", "note_indicator", "note_source"]:
            raise ValidationError("ILOSTAT table columns changed")
        for line, row in enumerate(reader, 2):
            if row["indicator"] != table.removesuffix("_A"):
                raise ValidationError(f"Unexpected ILOSTAT indicator at row {line}")
            year = int(row["time"])
            years[year] += 1
            ref_areas.add(row["ref_area"])
            source_key = (row["ref_area"], row["source"])
            source_codes.add(source_key)
            label = source_labels.get(source_key)
            source_prefix[label.split(" - ", 1)[0] if label else "unmatched_dictionary_code"] += 1
            sex[row["sex"]] += 1
            age[row["classif1"]] += 1
            status[row["obs_status"] or "blank"] += 1
            counts["rows"] += 1
            if row["obs_value"] == "":
                counts["blank_values"] += 1
            else:
                value = float(row["obs_value"])
                if not 0 <= value <= 100:
                    counts["out_of_rate_range"] += 1
            if year > 2026:
                counts["post_2026_rows"] += 1
    if counts["rows"] != int(toc["n.records"]):
        raise ValidationError("ILOSTAT row count differs from matching table of contents")
    report = {
        "status": "acquired_profiled",
        "source_table": table,
        "source_lock_sha256": hashlib.sha256(lock_path.read_bytes()).hexdigest(),
        "table_metadata": {key: toc[key] for key in ("indicator.label", "rep_var.label", "last.update", "n.records", "n.ref_area", "database.label")},
        "rows": counts["rows"], "ref_areas": len(ref_areas), "source_codes": len(source_codes),
        "year_range": [min(years), max(years)],
        "rows_by_year": dict(sorted(years.items())),
        "source_label_prefix_rows": dict(sorted(source_prefix.items())),
        "sex_rows": dict(sorted(sex.items())), "age_rows": dict(sorted(age.items())),
        "obs_status_rows": dict(sorted(status.items())),
        "blank_values": counts["blank_values"], "out_of_rate_range": counts["out_of_rate_range"],
        "post_2026_rows": counts["post_2026_rows"],
        "publication_gates": [
            "keep_previous_ICLS13_and_current_ICLS19_definitions_in_separate_source_series",
            "compare_dated_support_of_two_acquired_tables_before_publication",
            "separate_direct_source_rows_from_ILO_modeled_estimates_and_duplicate_survey_years",
            "select_total_sex_and_reviewed_age_universe_without_discarding_source_dimensions",
            "separate_country_territory_and_aggregate_support_and_future_dates",
        ],
    }
    write_json(output, report)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lock", type=Path, default=Path("data/registry/ilostat-labor-lock.json"))
    parser.add_argument("--output", type=Path, default=Path("data/review/ilostat-labor-profile.json"))
    args = parser.parse_args()
    print(json.dumps(profile(args.lock, args.output)))


if __name__ == "__main__":
    main()
