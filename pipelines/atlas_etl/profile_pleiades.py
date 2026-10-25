"""Profile the pinned Pleiades v4.1 GIS evidence without publishing it."""

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
    files = {}
    for artifact in lock["artifacts"]:
        path = Path(artifact["path"])
        if path.stat().st_size != artifact["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != artifact["sha256"]:
            raise ValidationError(f"Pleiades input differs from lock: {path}")
        files[path.name] = path
    def rows(name: str) -> list[dict[str, str]]:
        with files[name].open(encoding="utf-8-sig", newline="") as handle:
            return list(csv.DictReader(handle))
    places, names, points = rows("places.csv"), rows("names.csv"), rows("location_points.csv")
    ids = {row["id"] for row in places}
    if len(ids) != len(places):
        raise ValidationError("Duplicate Pleiades place ID")

    def date_profile(records: list[dict[str, str]]) -> dict:
        bounds = Counter()
        invalid_zero = 0
        for row in records:
            lower, upper = row["year_after_which"], row["year_before_which"]
            bounds["both" if lower and upper else "lower_only" if lower else "upper_only" if upper else "neither"] += 1
            invalid_zero += lower == "0" or upper == "0"
        return {"date_bound_states": dict(bounds), "source_year_zero_records": invalid_zero}

    report = {
        "version": lock["version"], "source_lock_sha256": hashlib.sha256(lock_path.read_bytes()).hexdigest(),
        "status": "acquired_profiled",
        "places": {"rows": len(places), "with_representative_point": sum(bool(row["representative_latitude"] and row["representative_longitude"]) for row in places),
                   "location_precision": dict(Counter(row["location_precision"] or "unspecified" for row in places))},
        "names": {"rows": len(names), "unique_place_ids": len({row["place_id"] for row in names}),
                  "orphan_place_ids": len({row["place_id"] for row in names} - ids),
                  "association_certainty": dict(Counter(row["association_certainty"] or "unspecified" for row in names)),
                  **date_profile(names)},
        "location_points": {"rows": len(points), "unique_place_ids": len({row["place_id"] for row in points}),
                            "orphan_place_ids": len({row["place_id"] for row in points} - ids),
                            "location_precision": dict(Counter(row["location_precision"] or "unspecified" for row in points)),
                            **date_profile(points)},
        "publication_gates": [
            "year_after_which_and_year_before_which_are_termini_not_continuous_validity_intervals",
            "rough_representative_points_may_be_bbox_centroids_and_cannot_be_shown_as_precise_sites",
            "place_names_and_location_points_require_reviewed_join_and_certainty_presentation",
            "gazetteer_place_records_are_not_historical_polity_borders",
        ],
    }
    write_json(output, report)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lock", type=Path, default=Path("data/registry/pleiades-source-lock.json"))
    parser.add_argument("--output", type=Path, default=Path("data/review/pleiades-v4.1-profile.json"))
    args = parser.parse_args()
    print(json.dumps(profile(args.lock, args.output)))


if __name__ == "__main__":
    main()
