"""Adapter for the pinned UN World Population Prospects 2024 medium variant.

The source-native Country/Area universe remains separate from the World Bank
universe. Estimates and projections are also preserved as observation states;
this module never concatenates WPP values into another population series.
"""

from __future__ import annotations

import csv
import gzip
import hashlib
from collections import Counter
from decimal import Decimal
from pathlib import Path
from typing import Any

from ..core import ValidationError


SOURCE_ID = "un-wpp-2024-medium-demographic-indicators"
SOURCE_URL = (
    "https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/"
    "CSV_FILES/WPP2024_Demographic_Indicators_Medium.csv.gz"
)
SOURCE_SHA256 = "286ac36bb1415e2e1ade03acfef0a29f0e4c087e2f78e38c48f50c5df89082bc"
SOURCE_LICENSE = "CC BY 3.0 IGO"
SOURCE_TERMS_URL = "https://population.un.org/wpp/downloads"
UNIVERSE_ID = "un-wpp-2024-country-area-medium-v1"
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


def population_in_people(raw_value: str, *, locator: str) -> int:
    """Convert source thousands without silently truncating fractional people."""
    people = Decimal(raw_value) * 1000
    if people != people.to_integral_value():
        raise ValidationError(
            f"WPP value cannot be converted exactly from thousands to people: {locator}"
        )
    return int(people)


class Wpp2024MediumAudit:
    """Validate, profile, and publish the source-native WPP medium table."""

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
            "review_status": "acquired_profiled_and_fixture_published",
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
                "population_unit": "thousands_of_people_converted_to_people",
                "population_reference_date": "1 July",
                "official_dataset_page": SOURCE_TERMS_URL,
                "license": SOURCE_LICENSE,
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
            "publication_decisions": [
                "publish_only_LocTypeName_Country_Area_rows",
                "exclude_2101_boundary_rows_outside_the_official_projection_horizon",
                "preserve_estimate_and_medium_projection_evidence_states",
                "keep_the_WPP_source_native_universe_separate_from_World_Bank",
                "preserve_the_signed_world_reference_rounding_residual",
            ],
        }

    def dataset(self, placed_codes: set[str]) -> dict[str, Any]:
        """Build the 1950–2100 country/area series with explicit source states."""
        location_names: dict[str, str] = {}
        country_rows: list[dict[str, str]] = []
        world_by_year: dict[int, int] = {}

        with gzip.open(self.path, mode="rt", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            fieldnames = reader.fieldnames or []
            missing_columns = (IDENTITY_COLUMNS | {POPULATION_COLUMN}) - set(fieldnames)
            if missing_columns:
                raise ValidationError(
                    f"WPP bulk file lacks required columns: {sorted(missing_columns)}"
                )
            for row in reader:
                year = int(row["Time"])
                if not 1950 <= year <= 2100:
                    continue
                location_names[row["LocID"].strip()] = row["Location"].strip()
                raw_population = row[POPULATION_COLUMN].strip()
                if not raw_population:
                    raise ValidationError(
                        f"Missing WPP July population for {row['Location']}/{year}"
                    )
                people = population_in_people(
                    raw_population,
                    locator=f"{row['Location']}/{year}",
                )
                if row["Location"].strip() == "World":
                    world_by_year[year] = people
                if row["LocTypeName"].strip() == "Country/Area":
                    country_rows.append(row)

        years = list(range(1950, 2101))
        if set(world_by_year) != set(years):
            raise ValidationError("WPP world reference does not cover 1950 through 2100")

        entity_rows: dict[str, dict[str, Any]] = {}
        observations: list[dict[str, Any]] = []
        totals = {year: 0 for year in years}
        mapped_totals = {year: 0 for year in years}
        counts = {year: 0 for year in years}
        seen: set[tuple[str, int]] = set()
        for row in country_rows:
            code = row["ISO3_code"].strip()
            year = int(row["Time"])
            key = (code, year)
            if not code or key in seen:
                raise ValidationError(f"Invalid or duplicate WPP country/area key: {key}")
            seen.add(key)
            value = population_in_people(
                row[POPULATION_COLUMN].strip(),
                locator=f"{code}/{year}",
            )
            if value <= 0:
                raise ValidationError(f"Nonpositive WPP population for {code}/{year}")
            evidence_state = "estimate" if year <= ESTIMATE_END_YEAR else "medium_projection"
            entity_rows.setdefault(
                code,
                {
                    "code": code,
                    "name": row["Location"].strip(),
                    "region": location_names.get(row["ParentID"].strip(), "UN parent area"),
                    "income_group": "Not classified in this WPP artifact",
                    "support_type": "un_wpp_country_or_area",
                    "map_status": "placed" if code in placed_codes else "unplaced",
                    "source_location_id": row["LocID"].strip(),
                },
            )
            totals[year] += value
            counts[year] += 1
            if code in placed_codes:
                mapped_totals[year] += value
            observations.append(
                {
                    "code": code,
                    "year": year,
                    "value": value,
                    "status": "known",
                    "evidence_state": evidence_state,
                    "source_location_id": row["LocID"].strip(),
                    "original_record_locator": (
                        f"{self.path.name}#LocID={row['LocID'].strip()};Time={year};"
                        f"Variant=Medium;column={POPULATION_COLUMN}"
                    ),
                }
            )

        if len(entity_rows) != 237 or set(counts.values()) != {237}:
            raise ValidationError("WPP Country/Area universe is not 237 complete annual series")

        observations.sort(key=lambda row: (row["year"], row["code"]))
        summaries = [
            {
                "year": year,
                "evidence_state": (
                    "estimate" if year <= ESTIMATE_END_YEAR else "medium_projection"
                ),
                "source_country_area_count": counts[year],
                "total_population": totals[year],
                "world_reference_population": world_by_year[year],
                "world_reference_rounding_residual": world_by_year[year] - totals[year],
                "mapped_population": mapped_totals[year],
                "unplaced_population": totals[year] - mapped_totals[year],
            }
            for year in years
        ]
        return {
            "schema_version": "0.1.0",
            "metric_id": "population_outlook",
            "source_release_id": SOURCE_ID,
            "population_universe_id": UNIVERSE_ID,
            "variant": "Medium",
            "reference_date": "1 July",
            "source_unit": "thousands of people",
            "published_unit": "people",
            "estimate_years": [1950, ESTIMATE_END_YEAR],
            "projection_years": [PROJECTION_START_YEAR, 2100],
            "years": years,
            "entities": [entity_rows[code] for code in sorted(entity_rows)],
            "observations": observations,
            "summaries": summaries,
        }
