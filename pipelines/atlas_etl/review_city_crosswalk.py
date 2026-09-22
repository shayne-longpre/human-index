"""Generate conservative, unreviewed cross-source historical-city candidates.

Candidate generation reduces manual work; it never establishes identity and it
never merges observations. The tracked output preserves source-row locators and
explicitly labels every pair as awaiting review.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass
from itertools import combinations
from pathlib import Path
from typing import Any


IDENTITY_COLUMNS = {"City", "OtherName", "Country", "Latitude", "Longitude", "Certainty"}
SERIES = {
    "modelski_ancient_v2": "modelskiAncientV2.csv",
    "chandler_v2": "chandlerV2.csv",
    "modelski_modern_v2": "modelskiModernV2.csv",
}


def normalize_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).casefold().strip()
    return re.sub(r"[^\w]+", " ", normalized).strip()


def parse_coordinate(value: str) -> float:
    return float("".join(value.split()))


def atlas_year(column: str) -> int:
    era, value = column.split("_", maxsplit=1)
    year = int(value)
    return 1 - year if era == "BC" else year


@dataclass(frozen=True)
class CityRow:
    series_id: str
    source_row: int
    city: str
    other_name: str
    country: str
    latitude: float
    longitude: float
    certainty: str
    first_year: int | None
    last_year: int | None
    observation_count: int
    zero_observation_count: int
    record_sha256: str

    @property
    def record_id(self) -> str:
        return f"{self.series_id}:row-{self.source_row}"

    @property
    def normalized_name(self) -> str:
        return normalize_name(self.city)

    @property
    def coordinate_key(self) -> tuple[float, float]:
        return (round(self.latitude, 5), round(self.longitude, 5))

    def summary(self) -> dict[str, Any]:
        return {
            "record_id": self.record_id,
            "source_row": self.source_row,
            "city": self.city,
            "other_name": self.other_name or None,
            "country_label": self.country,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "certainty_code": self.certainty,
            "first_observation_year": self.first_year,
            "last_observation_year": self.last_year,
            "observation_count": self.observation_count,
            "zero_observation_count": self.zero_observation_count,
            "record_sha256": self.record_sha256,
        }


def read_series(series_id: str, path: Path) -> list[CityRow]:
    rows: list[CityRow] = []
    with path.open(encoding="cp1252", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []
        if not IDENTITY_COLUMNS.issubset(fieldnames):
            raise ValueError(f"{path} lacks required identity columns")
        year_columns = [name for name in fieldnames if name.startswith(("BC_", "AD_"))]
        for source_row, raw in enumerate(reader, start=2):
            populated_years: list[int] = []
            zero_count = 0
            for column in year_columns:
                value = raw[column].strip()
                if not value:
                    continue
                populated_years.append(atlas_year(column))
                if float(value) == 0:
                    zero_count += 1
            canonical = json.dumps(raw, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            rows.append(
                CityRow(
                    series_id=series_id,
                    source_row=source_row,
                    city=raw["City"].strip(),
                    other_name=raw["OtherName"].strip(),
                    country=raw["Country"].strip(),
                    latitude=parse_coordinate(raw["Latitude"]),
                    longitude=parse_coordinate(raw["Longitude"]),
                    certainty=raw["Certainty"].strip(),
                    first_year=min(populated_years) if populated_years else None,
                    last_year=max(populated_years) if populated_years else None,
                    observation_count=len(populated_years),
                    zero_observation_count=zero_count,
                    record_sha256=hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
                )
            )
    return rows


def candidate_pairs(left: list[CityRow], right: list[CityRow]) -> list[dict[str, Any]]:
    by_name: dict[str, list[CityRow]] = {}
    by_coordinate: dict[tuple[float, float], list[CityRow]] = {}
    for row in right:
        by_name.setdefault(row.normalized_name, []).append(row)
        by_coordinate.setdefault(row.coordinate_key, []).append(row)

    pairs: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for left_row in left:
        candidates = {
            row.record_id: row
            for row in (
                by_name.get(left_row.normalized_name, [])
                + by_coordinate.get(left_row.coordinate_key, [])
            )
        }
        for right_row in candidates.values():
            key = (left_row.record_id, right_row.record_id)
            if key in seen:
                continue
            seen.add(key)
            same_name = left_row.normalized_name == right_row.normalized_name
            same_coordinate = left_row.coordinate_key == right_row.coordinate_key
            if same_name and same_coordinate:
                basis = "exact_normalized_primary_name_and_rounded_coordinate"
            elif same_name:
                basis = "exact_normalized_primary_name_only"
            else:
                basis = "rounded_coordinate_only"
            temporal_overlap = (
                left_row.first_year is not None
                and right_row.first_year is not None
                and max(left_row.first_year, right_row.first_year)
                <= min(left_row.last_year or left_row.first_year, right_row.last_year or right_row.first_year)
            )
            pairs.append(
                {
                    "candidate_id": f"{left_row.record_id}__{right_row.record_id}",
                    "review_status": "unreviewed_candidate",
                    "candidate_basis": basis,
                    "temporal_coverage_overlaps": temporal_overlap,
                    "left_record_id": left_row.record_id,
                    "right_record_id": right_row.record_id,
                }
            )
    return sorted(pairs, key=lambda row: row["candidate_id"])


def build_review(input_dir: Path) -> dict[str, Any]:
    series_rows = {
        series_id: read_series(series_id, input_dir / filename)
        for series_id, filename in SERIES.items()
    }
    candidates: list[dict[str, Any]] = []
    pair_counts: dict[str, int] = {}
    for left_id, right_id in combinations(SERIES, 2):
        matches = candidate_pairs(series_rows[left_id], series_rows[right_id])
        pair_counts[f"{left_id}__{right_id}"] = len(matches)
        candidates.extend(matches)
    referenced_record_ids = {
        candidate[side]
        for candidate in candidates
        for side in ("left_record_id", "right_record_id")
    }
    candidate_records = {
        row.record_id: row.summary()
        for rows in series_rows.values()
        for row in rows
        if row.record_id in referenced_record_ids
    }

    return {
        "schema_version": "0.1.0",
        "review_status": "candidate_generation_complete_human_review_outstanding",
        "method": {
            "name_normalization": "Unicode NFKC, casefold, punctuation-to-space, whitespace collapse",
            "coordinate_comparison": "latitude and longitude rounded to 5 decimal places",
            "automatic_merge": False,
            "candidate_review_requirements": [
                "confirm_place_identity_with_source_evidence",
                "confirm_city_or_settlement_definition_compatibility",
                "retain_both_source_series_if_same_date_values_disagree",
            ],
            "warning": (
                "A candidate is not an identity decision. Names and coordinates can refer to "
                "different settlement concepts, extents, or periods."
            ),
        },
        "series": {
            series_id: {
                "filename": SERIES[series_id],
                "sha256": hashlib.sha256((input_dir / SERIES[series_id]).read_bytes()).hexdigest(),
                "rows": len(rows),
                "rows_with_zero_observations": sum(row.zero_observation_count > 0 for row in rows),
            }
            for series_id, rows in series_rows.items()
        },
        "candidate_counts_by_series_pair": pair_counts,
        "candidate_records": dict(sorted(candidate_records.items())),
        "candidates": sorted(candidates, key=lambda row: row["candidate_id"]),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    review = build_review(args.input_dir)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(review, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
