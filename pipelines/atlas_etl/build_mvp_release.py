"""Publish the two-metric Atlas MVP from validated immutable inputs."""

from __future__ import annotations

import argparse
import csv
import io
import json
from pathlib import Path
from typing import Any

from .core import InputArtifact, ValidationError, artifact_record, write_json
from .geography import (
    DISPLAY_CROSSWALKS,
    NATURAL_EARTH_URL,
    NATURAL_EARTH_VERSION,
    build_display_geometry,
)
from .sources.world_bank import (
    ELECTRICITY_INDICATOR,
    POPULATION_INDICATOR,
    SOURCE_URLS,
    WORLD_BANK_LAST_UPDATED,
    WORLD_REFERENCE_CODE,
    WorldBankAdapter,
)


RETRIEVED_ON = "2026-09-20"
RELEASE_ID = "world-bank-mvp-2026-09-20-r1"
UNIVERSE_ID = "world-bank-nonaggregate-economies-v1"


def _csv_bytes(rows: list[dict[str, Any]], fields: list[str]) -> bytes:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=fields, lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({field: row[field] for field in fields})
    return output.getvalue().encode("utf-8")


def _metric_definition(metric_id: str, years: list[int], data_file: str, download: str) -> dict[str, Any]:
    shared = {
        "available_years": years,
        "temporal_policy": "exact_only",
        "data_file": data_file,
        "download_file": download,
        "population_universe_id": UNIVERSE_ID,
        "support_type": "world_bank_country_or_territory_year",
    }
    if metric_id == "population_total":
        return {
            **shared,
            "id": metric_id,
            "label": "Population",
            "taxonomy_ids": ["population_and_settlement"],
            "indicator": POPULATION_INDICATOR,
            "aggregation_kind": "population_total",
            "unit": "people",
            "definition": "Resident population total for the statistical territory and year.",
            "display_scale": {
                "transform": "log1p",
                "fixed_domain": [10_000, 2_000_000_000],
                "scale_version": "population-country-total-v1",
            },
            "safe_summary": "Population represented by the declared World Bank statistical universe.",
            "prohibited_interpretations": [
                "local population density",
                "gridded settlement reconstruction",
            ],
        }
    if metric_id == "access_to_electricity":
        return {
            **shared,
            "id": metric_id,
            "label": "Electricity access",
            "taxonomy_ids": ["material_conditions", "infrastructure_access"],
            "indicator": ELECTRICITY_INDICATOR,
            "aggregation_kind": "person_prevalence",
            "unit": "percent of population",
            "definition": "Share of the population with access to electricity.",
            "display_scale": {
                "transform": "linear",
                "fixed_domain": [0, 100],
                "bins": [0, 20, 40, 60, 80, 100],
                "scale_version": "electricity-sequential-v1",
            },
            "safe_summary": "Estimated population with, without, or unknown access in the covered universe.",
            "prohibited_interpretations": [
                "local household measurement",
                "electricity reliability",
                "electricity affordability",
                "electricity consumption",
            ],
        }
    raise KeyError(metric_id)


def build(args: argparse.Namespace) -> None:
    inputs = [
        InputArtifact(
            "world_bank_population",
            args.population,
            SOURCE_URLS["world_bank_population"],
            RETRIEVED_ON,
            "CC-BY-4.0",
        ),
        InputArtifact(
            "world_bank_electricity",
            args.electricity,
            SOURCE_URLS["world_bank_electricity"],
            RETRIEVED_ON,
            "CC-BY-4.0",
        ),
        InputArtifact(
            "world_bank_countries",
            args.countries,
            SOURCE_URLS["world_bank_countries"],
            RETRIEVED_ON,
            "CC-BY-4.0",
        ),
        InputArtifact(
            "natural_earth_admin_0",
            args.geometry,
            NATURAL_EARTH_URL,
            "2026-09-19",
            "public-domain",
        ),
    ]
    for artifact in inputs:
        if not artifact.path.is_file():
            raise ValidationError(f"Missing input artifact: {artifact.path}")

    adapter = WorldBankAdapter(
        population=args.population,
        electricity=args.electricity,
        countries=args.countries,
    )
    codes = adapter.nonaggregate_codes()
    metadata = adapter.entities()
    entity_names = {code: metadata[code]["name"] for code in codes}
    geometry, placed_codes = build_display_geometry(
        args.geometry, valid_codes=codes, entity_names=entity_names
    )

    entities = [
        {
            "code": code,
            "name": metadata[code]["name"],
            "region": metadata[code]["region"]["value"],
            "income_group": metadata[code]["incomeLevel"]["value"],
            "support_type": "world_bank_country_or_territory",
            "map_status": "placed" if code in placed_codes else "unplaced",
        }
        for code in sorted(codes)
    ]

    population = adapter.series(POPULATION_INDICATOR)
    electricity = adapter.series(ELECTRICITY_INDICATOR)
    population_years = adapter.years(POPULATION_INDICATOR)
    electricity_years = adapter.years(ELECTRICITY_INDICATOR, require_known=True)
    if population_years != list(range(1960, 2026)):
        raise ValidationError("Population release does not cover every year from 1960 through 2025")
    if electricity_years != list(range(1990, 2025)):
        raise ValidationError("Electricity observations do not cover every year from 1990 through 2024")

    population_rows: list[dict[str, Any]] = []
    population_summaries: list[dict[str, Any]] = []
    for year in population_years:
        known_total = 0
        known_entities = 0
        unplaced_population = 0
        for code in sorted(codes):
            value = population.get((code, year))
            if value is not None:
                known_total += value
                known_entities += 1
                if code not in placed_codes:
                    unplaced_population += value
            population_rows.append(
                {
                    "code": code,
                    "year": year,
                    "value": value,
                    "status": "known" if value is not None else "unknown",
                    "original_record_locator": adapter.record_locator(
                        POPULATION_INDICATOR, code, year
                    ),
                }
            )
        world_reference = population.get((WORLD_REFERENCE_CODE, year))
        if world_reference is None:
            raise ValidationError(f"World reference population is missing for {year}")
        residual = world_reference - known_total
        if residual < 0:
            raise ValidationError(f"Covered population exceeds WLD reference in {year}")
        population_summaries.append(
            {
                "year": year,
                "covered_population": known_total,
                "known_entities": known_entities,
                "missing_population_entities": len(codes) - known_entities,
                "world_reference_population": world_reference,
                "reference_residual": residual,
                "unplaced_population": unplaced_population,
            }
        )

    electricity_rows: list[dict[str, Any]] = []
    electricity_download_rows: list[dict[str, Any]] = []
    electricity_summaries: list[dict[str, Any]] = []
    for year in electricity_years:
        with_access = 0.0
        without_access = 0.0
        unknown_condition = 0
        covered_population = 0
        known_condition_entities = 0
        for code in sorted(codes):
            rate = electricity.get((code, year))
            pop = population.get((code, year))
            electricity_rows.append(
                {
                    "code": code,
                    "year": year,
                    "value_percent": rate,
                    "status": "known" if rate is not None else "unknown",
                    "original_record_locator": adapter.record_locator(
                        ELECTRICITY_INDICATOR, code, year
                    ),
                }
            )
            if pop is None:
                raise ValidationError(
                    f"Electricity year {year} lacks a population weight for {code}"
                )
            electricity_download_rows.append(
                {
                    "code": code,
                    "year": year,
                    "value_percent": rate,
                    "status": "known" if rate is not None else "unknown",
                    "population": pop,
                    "population_status": "known",
                    "original_record_locator": adapter.record_locator(
                        ELECTRICITY_INDICATOR, code, year
                    ),
                    "population_record_locator": adapter.record_locator(
                        POPULATION_INDICATOR, code, year
                    ),
                }
            )
            covered_population += pop
            if rate is None:
                unknown_condition += pop
            else:
                known_condition_entities += 1
                with_access += pop * rate / 100
                without_access += pop * (1 - rate / 100)
        if abs(with_access + without_access + unknown_condition - covered_population) > 1e-5:
            raise ValidationError(f"Electricity accounting does not conserve population in {year}")
        electricity_summaries.append(
            {
                "year": year,
                "population": covered_population,
                "known_condition_entities": known_condition_entities,
                "with_access": with_access,
                "without_access": without_access,
                "unknown_condition": unknown_condition,
            }
        )

    args.output.mkdir(parents=True, exist_ok=True)
    entities_path = args.output / "entities.json"
    population_path = args.output / "population.json"
    electricity_path = args.output / "electricity.json"
    geometry_path = args.output / "countries.geojson"
    population_csv_path = args.output / "population.csv"
    electricity_csv_path = args.output / "electricity.csv"

    write_json(entities_path, {"schema_version": "0.2.0", "entities": entities})
    write_json(
        population_path,
        {
            "schema_version": "0.2.0",
            "metric_id": "population_total",
            "years": population_years,
            "observations": population_rows,
            "summaries": population_summaries,
        },
    )
    write_json(
        electricity_path,
        {
            "schema_version": "0.2.0",
            "metric_id": "access_to_electricity",
            "years": electricity_years,
            "observations": electricity_rows,
            "summaries": electricity_summaries,
        },
    )
    write_json(geometry_path, geometry)
    population_csv_path.write_bytes(
        _csv_bytes(
            population_rows,
            ["code", "year", "value", "status", "original_record_locator"],
        )
    )
    electricity_csv_path.write_bytes(
        _csv_bytes(
            electricity_download_rows,
            [
                "code",
                "year",
                "value_percent",
                "status",
                "population",
                "population_status",
                "original_record_locator",
                "population_record_locator",
            ],
        )
    )

    artifacts = {
        path.name: artifact_record(path)
        for path in (
            entities_path,
            population_path,
            electricity_path,
            geometry_path,
            population_csv_path,
            electricity_csv_path,
        )
    }
    write_json(
        args.lockfile,
        {
            "schema_version": "0.2.0",
            "status": "acquired_release_lock",
            "sources": [artifact.lock_record() for artifact in inputs],
        },
    )

    residuals = [summary["reference_residual"] for summary in population_summaries]
    manifest = {
        "schema_version": "0.2.0",
        "release_id": RELEASE_ID,
        "status": "genuine_data_development_release",
        "published_on": RETRIEVED_ON,
        "default_view": {"metric_id": "population_total", "year": 2024},
        "taxonomies": [
            {
                "id": "human_conditions_v1",
                "families": [
                    {"id": "population_and_settlement", "label": "Population & settlement"},
                    {"id": "material_conditions", "label": "Material conditions"},
                    {"id": "infrastructure_access", "label": "Infrastructure access"},
                ],
            }
        ],
        "metrics": [
            _metric_definition(
                "population_total", population_years, "population.json", "population.csv"
            ),
            _metric_definition(
                "access_to_electricity",
                electricity_years,
                "electricity.json",
                "electricity.csv",
            ),
        ],
        "population_universes": [
            {
                "id": UNIVERSE_ID,
                "label": "World Bank nonaggregate country/territory entities",
                "entity_count": len(codes),
                "inclusion_rule": "country metadata region is not Aggregates",
                "excluded_aggregate_count": len(adapter.aggregate_codes()),
                "reference_aggregate": WORLD_REFERENCE_CODE,
                "review_status": "aggregate_reconciled_parent_relations_not_source_coded",
                "reference_residual_range": [min(residuals), max(residuals)],
                "scope_label": "covered population",
                "notes": [
                    "WLD is a reference only and is never added to entity totals.",
                    "The nonnegative residual is preserved and not assigned to an inferred territory.",
                    "The World Bank country API does not encode parent/dependency relations; the release does not claim a fully reconciled world partition.",
                ],
            }
        ],
        "display_geometry": {
            "source": "Natural Earth admin 0 countries",
            "version": NATURAL_EARTH_VERSION,
            "scale": "1:110m",
            "purpose": "display_only_not_population_accounting",
            "feature_count": len(placed_codes),
            "crosswalks": DISPLAY_CROSSWALKS,
        },
        "source_releases": [
            {
                "id": f"world-bank-wdi-{WORLD_BANK_LAST_UPDATED}",
                "publisher": "World Bank",
                "source_update": WORLD_BANK_LAST_UPDATED,
                "retrieved_on": RETRIEVED_ON,
                "license": "CC BY 4.0",
                "profile": adapter.profile(),
            },
            {
                "id": "natural-earth-v5.1.2",
                "publisher": "Natural Earth",
                "retrieved_on": "2026-09-19",
                "license": "Public domain",
            },
        ],
        "alternative_sources": [
            {
                "id": "un-wpp-2024",
                "role": "more detailed direct population expansion source",
                "status": "documented_not_ingested",
                "coverage": "1950-2100 estimates and projections; age/sex detail available",
                "reason_deferred": "requires a separate release, scenario, license, and territory crosswalk audit before merging",
                "url": "https://population.un.org/wpp/",
            },
            {
                "id": "hyde-3.5",
                "role": "deep-time gridded population candidate",
                "status": "blocked",
                "reason_deferred": "authorized archive access and artifact terms unresolved",
                "url": "https://public.yoda.uu.nl/geo/UU01/F45D44.html",
            },
        ],
        "transformations": [
            {
                "id": "world-bank-mvp-normalize-v1",
                "version": "1.0.0",
                "input_artifact_ids": [artifact.id for artifact in inputs],
                "parameters": {
                    "universe_id": UNIVERSE_ID,
                    "population_years": [1960, 2025],
                    "electricity_years": [1990, 2024],
                    "no_interpolation": True,
                },
                "output_artifacts": artifacts,
                "validation": {
                    "population_summaries": len(population_summaries),
                    "electricity_summaries": len(electricity_summaries),
                    "prevalence_mass_conservation": "passed_all_years",
                    "world_reference_residual_nonnegative": "passed_all_years",
                },
            }
        ],
        "artifacts": artifacts,
        "citations": [
            {
                "label": "World Bank, Population, total",
                "url": "https://data.worldbank.org/indicator/SP.POP.TOTL",
                "license": "CC BY 4.0",
            },
            {
                "label": "World Bank, Access to electricity (% of population)",
                "url": "https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS",
                "license": "CC BY 4.0",
            },
            {
                "label": "Natural Earth vector v5.1.2",
                "url": "https://github.com/nvkelso/natural-earth-vector/releases/tag/v5.1.2",
                "license": "Public domain",
            },
        ],
        "limitations": [
            "Population color represents a territorial total, not local density or a gridded settlement reconstruction.",
            "Electricity values are national or territorial estimates, not local household observations.",
            "The covered universe is reconciled to WLD with an explicit residual but lacks source-coded parent/dependency relations.",
            "The 1:110m display geometry omits some small territories; their population remains in summaries.",
        ],
    }
    write_json(args.output / "manifest.json", manifest)
    print(
        json.dumps(
            {
                "release_id": RELEASE_ID,
                "entities": len(codes),
                "map_features": len(placed_codes),
                "population_years": [population_years[0], population_years[-1]],
                "electricity_years": [electricity_years[0], electricity_years[-1]],
                "artifacts_bytes": sum(record["bytes"] for record in artifacts.values()),
            },
            indent=2,
        )
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--population", type=Path, required=True)
    parser.add_argument("--electricity", type=Path, required=True)
    parser.add_argument("--countries", type=Path, required=True)
    parser.add_argument("--geometry", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--lockfile", type=Path, required=True)
    return parser.parse_args()


if __name__ == "__main__":
    build(parse_args())
