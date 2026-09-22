"""Audit adapter for the pinned UN World Population Prospects 2024 bulk file.

This module deliberately profiles the official artifact without turning it into
an Atlas release. Country/area selection, territorial crosswalks, and the UI
distinction between estimates and projections remain publication gates.
"""

from __future__ import annotations

import csv
import gzip
import hashlib
from collections import Counter
from pathlib import Path
from typing import Any

from ..core import ValidationError


SOURCE_ID = "un-wpp-2024-medium-demographic-indicators"
SOURCE_URL = (
    "https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/"
    "CSV_FILES/WPP2024_Demographic_Indicators_Medium.csv.gz"
)
SOURCE_SHA256 = "286ac36bb1415e2e1ade03acfef0a29f0e4c087e2f78e38c48f50c5df89082bc"
ESTIMATE_END_YEAR = 2023
PROJECTION_START_YEAR = 2024

IDENTITY_COLUMNS = {
    "LocID",
    "ISO3_code",
    "LocTypeName",
    "ParentID",
    "Location",
    "Variant",
    "Time",
}
POPULATION_COLUMN = "TPopulation1July"


class Wpp2024MediumAudit:
    """Validate and profile the source-native WPP medium-variant table."""

    def __init__(self, path: Path) -> None:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != SOURCE_SHA256:
            raise ValidationError(
                f"WPP artifact checksum differs from the pinned file: {digest}"
            )
        self.path = path
        self.sha256 = digest

    def profile(self) -> dict[str, Any]:
        location_types: Counter[str] = Counter()
        years: Counter[int] = Counter()
        variants: Counter[str] = Counter()
        location_ids: set[str] = set()
        iso3_codes: set[str] = set()
        seen_keys: set[tuple[str, int, str]] = set()
        duplicate_keys = 0
        missing_population = 0
        nonpositive_population = 0
        row_count = 0

        with gzip.open(self.path, mode="rt", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            fieldnames = reader.fieldnames or []
            missing_columns = (IDENTITY_COLUMNS | {POPULATION_COLUMN}) - set(fieldnames)
            if missing_columns:
                raise ValidationError(
                    f"WPP bulk file lacks required columns: {sorted(missing_columns)}"
                )

            for row in reader:
                row_count += 1
                year = int(row["Time"])
                variant = row["Variant"].strip()
                location_id = row["LocID"].strip()
                key = (location_id, year, variant)
                if key in seen_keys:
                    duplicate_keys += 1
                seen_keys.add(key)
                years[year] += 1
                variants[variant] += 1
                location_types[row["LocTypeName"].strip() or "(blank)"] += 1
                location_ids.add(location_id)
                if row["ISO3_code"].strip():
                    iso3_codes.add(row["ISO3_code"].strip())
                raw_population = row[POPULATION_COLUMN].strip()
                if not raw_population:
                    missing_population += 1
                elif float(raw_population) <= 0:
                    nonpositive_population += 1

        # This demographic-indicators artifact includes 2101 boundary rows even
        # though the official projection horizon is described as 2100. Preserve
        # and flag them; publication decides column-by-column whether they are
        # required for an interval or should be excluded.
        if not years or min(years) != 1950 or max(years) != 2101:
            raise ValidationError("Unexpected WPP time coverage")
        if set(variants) != {"Medium"}:
            raise ValidationError(f"Unexpected variants in medium file: {sorted(variants)}")

        return {
            "schema_version": "0.1.0",
            "review_status": "acquired_and_profiled_not_published",
            "source_id": SOURCE_ID,
            "source_url": SOURCE_URL,
            "artifact": {
                "filename": self.path.name,
                "bytes": self.path.stat().st_size,
                "sha256": self.sha256,
            },
            "source_semantics": {
                "estimate_years": [1950, ESTIMATE_END_YEAR],
                "official_projection_years": [PROJECTION_START_YEAR, 2100],
                "artifact_years": [1950, 2101],
                "variant": "Medium",
                "population_column": POPULATION_COLUMN,
                "population_unit": "requires_exact_bulk_metadata_confirmation",
                "official_dataset_page": "https://population.un.org/wpp/",
                "official_dataset_description": (
                    "Estimates and projections are distinct source products and must remain "
                    "visibly distinct in Atlas."
                ),
            },
            "profile": {
                "rows": row_count,
                "columns": len(fieldnames),
                "location_ids": len(location_ids),
                "iso3_codes": len(iso3_codes),
                "location_type_rows": dict(sorted(location_types.items())),
                "rows_by_period": {
                    "estimates_1950_2023": sum(
                        count for year, count in years.items() if year <= ESTIMATE_END_YEAR
                    ),
                    "projections_2024_2100": sum(
                        count
                        for year, count in years.items()
                        if PROJECTION_START_YEAR <= year <= 2100
                    ),
                    "boundary_rows_2101": years[2101],
                },
                "duplicate_location_year_variant_keys": duplicate_keys,
                "missing_population_values": missing_population,
                "nonpositive_population_values": nonpositive_population,
            },
            "publication_gates": [
                "verify_bulk_artifact_license_and_population_unit_from_source_metadata",
                "select_country_area_rows_without_regional_or_special_aggregates",
                "review_parent_dependent_territory_and_historical_entity_crosswalks",
                "publish_estimates_and_projections_as_visibly_distinct evidence_states",
                "define_overlap_policy_with_existing_world_bank_population_release",
                "audit_2101_boundary_rows_against_each_selected_indicator_definition",
            ],
        }
