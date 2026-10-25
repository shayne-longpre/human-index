"""Audit the pinned UCDP GED 26.1 event archive before publication."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import zipfile
from collections import Counter
from pathlib import Path

from .core import ValidationError, write_json


MEMBER = "GEDEvent_v26_1.csv"
EXPECTED_FIELDS = (
    "id", "year", "code_status", "type_of_violence", "where_prec", "where_coordinates",
    "latitude", "longitude", "country", "country_id", "event_clarity", "date_prec",
    "date_start", "date_end", "best", "high", "low",
)


def profile(lock_path: Path, output: Path) -> dict:
    lock = json.loads(lock_path.read_text())
    artifacts = {item["id"]: item for item in lock["artifacts"]}
    for artifact_id in ("ucdp_ged_26_1_csv_archive", "ucdp_ged_26_1_codebook"):
        artifact = artifacts[artifact_id]
        path = Path(artifact["path"])
        if path.stat().st_size != artifact["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != artifact["sha256"]:
            raise ValidationError(f"Pinned GED artifact changed: {artifact_id}")

    archive_path = Path(artifacts["ucdp_ged_26_1_csv_archive"]["path"])
    counts: Counter[str] = Counter()
    years: Counter[int] = Counter()
    where_precision: Counter[int] = Counter()
    date_precision: Counter[int] = Counter()
    clarity: Counter[int] = Counter()
    code_status: Counter[str] = Counter()
    event_ids: set[str] = set()
    fatality_examples = []
    with zipfile.ZipFile(archive_path) as archive:
        if archive.namelist() != [MEMBER]:
            raise ValidationError("GED archive members changed")
        with io.TextIOWrapper(archive.open(MEMBER), encoding="utf-8-sig", newline="") as text:
            reader = csv.DictReader(text)
            if not reader.fieldnames or any(field not in reader.fieldnames for field in EXPECTED_FIELDS):
                raise ValidationError("GED CSV required fields changed")
            for line, row in enumerate(reader, 2):
                event_id = row["id"]
                if not event_id or event_id in event_ids:
                    raise ValidationError(f"Missing or duplicate GED event ID at row {line}")
                event_ids.add(event_id)
                year = int(row["year"])
                years[year] += 1
                where_precision[int(row["where_prec"])] += 1
                date_precision[int(row["date_prec"])] += 1
                clarity[int(row["event_clarity"])] += 1
                code_status[row["code_status"]] += 1
                counts["rows"] += 1
                if not row["latitude"] or not row["longitude"]:
                    counts["missing_coordinates"] += 1
                else:
                    lat, lon = float(row["latitude"]), float(row["longitude"])
                    if not -90 <= lat <= 90 or not -180 <= lon <= 180:
                        counts["invalid_coordinates"] += 1
                start, end = row["date_start"], row["date_end"]
                if not start or not end or start > end:
                    counts["invalid_date_range"] += 1
                elif start[:4] != end[:4]:
                    counts["cross_year_date_ranges"] += 1
                if start and int(start[:4]) != year:
                    counts["year_differs_from_start"] += 1
                low, best, high = (int(row[field]) for field in ("low", "best", "high"))
                if any(value < 0 for value in (low, best, high)):
                    counts["negative_fatality_estimates"] += 1
                if not low <= best <= high:
                    counts["nonmonotonic_fatality_triplets"] += 1
                    if len(fatality_examples) < 5:
                        fatality_examples.append({"id": event_id, "row": line, "low": low, "best": best, "high": high})

    report = {
        "status": "acquired_profiled_publication_review",
        "source_release_id": "ucdp-ged-26.1",
        "source_artifact_sha256": artifacts["ucdp_ged_26_1_csv_archive"]["sha256"],
        "codebook_sha256": artifacts["ucdp_ged_26_1_codebook"]["sha256"],
        "source_rows": counts["rows"], "unique_event_ids": len(event_ids),
        "year_range": [min(years), max(years)],
        "rows_by_year": dict(sorted(years.items())),
        "where_precision_counts": dict(sorted(where_precision.items())),
        "date_precision_counts": dict(sorted(date_precision.items())),
        "event_clarity_counts": dict(sorted(clarity.items())),
        "code_status_counts": dict(sorted(code_status.items())),
        "audits": {key: counts[key] for key in (
            "missing_coordinates", "invalid_coordinates", "invalid_date_range",
            "cross_year_date_ranges", "year_differs_from_start", "negative_fatality_estimates",
            "nonmonotonic_fatality_triplets")},
        "nonmonotonic_examples": fatality_examples,
        "publication_rules": [
            "preserve_source_event_id_year_date_start_date_end_and_date_precision",
            "render_coordinates_as_representative_for_where_precision_above_1",
            "retain_low_best_high_as_independent_source_estimates_not_guaranteed_numeric_interval",
            "do_not_join_event_country_or_point_to_Atlas_polygons_or_population",
            "no_missing_event_means_zero_violence_inference",
        ],
    }
    write_json(output, report)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lock", type=Path, default=Path("data/registry/candidate-source-lock.json"))
    parser.add_argument("--output", type=Path, default=Path("data/review/ucdp-ged-26.1-profile.json"))
    args = parser.parse_args()
    print(json.dumps(profile(args.lock, args.output)))


if __name__ == "__main__":
    main()
