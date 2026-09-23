"""Publish the compact Atlas MVP from validated immutable inputs."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import zipfile
from pathlib import Path
from typing import Any, BinaryIO

from .catalog import (
    LIFE_EXPECTANCY_BINS,
    WORLD_BANK_UNIVERSE_ID,
    WPP_UNIVERSE_ID,
    metric_definition,
    taxonomy_catalog,
    validate_release_manifest,
)
from .core import InputArtifact, ValidationError, artifact_record, load_json, sha256, write_json
from .geography import (
    DISPLAY_CROSSWALKS,
    NATURAL_EARTH_URL,
    NATURAL_EARTH_VERSION,
    build_display_geometry,
)
from .sources.world_bank import (
    ELECTRICITY_INDICATOR,
    LIFE_EXPECTANCY_INDICATOR,
    POPULATION_INDICATOR,
    SOURCE_URLS,
    WORLD_BANK_LAST_UPDATED,
    WORLD_REFERENCE_CODE,
    WorldBankAdapter,
)
from .sources.modelski_cities import (
    SOURCE_ARTICLE_URL as MODELSKI_ARTICLE_URL,
    SOURCE_DATA_URL as MODELSKI_DATA_URL,
    SOURCE_DOWNLOAD_URL as MODELSKI_DOWNLOAD_URL,
    SOURCE_ID as MODELSKI_SOURCE_ID,
    ModelskiAncientCitiesAdapter,
)
from .sources.cliopatria import (
    SNAPSHOT_SOURCE_YEARS,
    SOURCE_ID as CLIOPATRIA_SOURCE_ID,
    SOURCE_LICENSE_URL as CLIOPATRIA_LICENSE_URL,
    SOURCE_URL as CLIOPATRIA_URL,
    CliopatriaAdapter,
)
from .sources.us_census_population import (
    SOURCE_ID as HISTORICAL_POPULATION_SOURCE_ID,
    SOURCE_URL as HISTORICAL_POPULATION_URL,
    UsCensusHistoricalPopulationAdapter,
)
from .sources.un_wpp import (
    SOURCE_ID as WPP_SOURCE_ID,
    SOURCE_LICENSE as WPP_SOURCE_LICENSE,
    SOURCE_TERMS_URL as WPP_SOURCE_TERMS_URL,
    SOURCE_URL as WPP_SOURCE_URL,
    Wpp2024MediumAudit,
)


RETRIEVED_ON = "2026-09-20"
PUBLISHED_ON = "2026-09-22"
WPP_RETRIEVED_ON = "2026-09-21"
RELEASE_ID = "atlas-mvp-2026-09-22-r6"
CLIOPATRIA_GEOMETRY_MEMBER = "cliopatria_polities_only.geojson"


def _csv_bytes(rows: list[dict[str, Any]], fields: list[str]) -> bytes:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=fields, lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({field: row[field] for field in fields})
    return output.getvalue().encode("utf-8")


def _stream_sha256(handle: BinaryIO) -> str:
    digest = hashlib.sha256()
    while chunk := handle.read(1024 * 1024):
        digest.update(chunk)
    return digest.hexdigest()


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
            "world_bank_life_expectancy",
            args.life_expectancy,
            SOURCE_URLS["world_bank_life_expectancy"],
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
        InputArtifact(
            "us_census_historical_world_population",
            args.historical_population,
            HISTORICAL_POPULATION_URL,
            RETRIEVED_ON,
            "U.S. government public data; underlying estimates attributed in source table",
        ),
        InputArtifact(
            "cliopatria_v0_2_0_archive",
            args.cliopatria_archive,
            CLIOPATRIA_URL,
            RETRIEVED_ON,
            "CC-BY-4.0",
        ),
        InputArtifact(
            "cliopatria_v0_2_0_license",
            args.cliopatria_license,
            CLIOPATRIA_LICENSE_URL,
            RETRIEVED_ON,
            "CC-BY-4.0",
        ),
        InputArtifact(
            "modelski_ancient_v2_csv",
            args.historical_cities,
            MODELSKI_DOWNLOAD_URL,
            RETRIEVED_ON,
            "CC-BY-4.0",
        ),
        InputArtifact(
            "modelski_ancient_v2_metadata",
            args.historical_cities_metadata,
            "https://api.figshare.com/v2/articles/2059497",
            RETRIEVED_ON,
            "CC-BY-4.0",
        ),
        InputArtifact(
            "un_wpp_2024_medium_demographic_indicators",
            args.un_wpp,
            WPP_SOURCE_URL,
            WPP_RETRIEVED_ON,
            WPP_SOURCE_LICENSE,
        ),
    ]
    for artifact in inputs:
        if not artifact.path.is_file():
            raise ValidationError(f"Missing input artifact: {artifact.path}")
    if not args.cliopatria_geometry.is_file():
        raise ValidationError(f"Missing extracted Cliopatria geometry: {args.cliopatria_geometry}")
    if not args.reconciliation_decisions.is_file():
        raise ValidationError(f"Missing reconciliation decisions: {args.reconciliation_decisions}")
    reconciliation = load_json(args.reconciliation_decisions)
    if reconciliation.get("status") != "complete_for_all_current_candidates_with_unresolved_history_preserved":
        raise ValidationError("Reconciliation decision set is not complete for current candidates")
    with args.cliopatria_geometry.open("rb") as handle:
        cliopatria_geometry_sha256 = _stream_sha256(handle)
    with zipfile.ZipFile(args.cliopatria_archive) as archive:
        if CLIOPATRIA_GEOMETRY_MEMBER not in archive.namelist():
            raise ValidationError(
                f"Cliopatria archive lacks {CLIOPATRIA_GEOMETRY_MEMBER}"
            )
        with archive.open(CLIOPATRIA_GEOMETRY_MEMBER) as handle:
            cliopatria_archive_member_sha256 = _stream_sha256(handle)
    if cliopatria_geometry_sha256 != cliopatria_archive_member_sha256:
        raise ValidationError("Extracted Cliopatria geometry does not match the pinned archive member")
    if reconciliation["inputs"]["cliopatria"]["sha256"] != cliopatria_geometry_sha256:
        raise ValidationError("Reconciliation decisions target a different Cliopatria artifact")

    adapter = WorldBankAdapter(
        population=args.population,
        electricity=args.electricity,
        life_expectancy=args.life_expectancy,
        countries=args.countries,
    )
    historical_population_adapter = UsCensusHistoricalPopulationAdapter(
        args.historical_population
    )
    cliopatria_adapter = CliopatriaAdapter(args.cliopatria_geometry, reconciliation)
    cities_adapter = ModelskiAncientCitiesAdapter(
        args.historical_cities, args.historical_cities_metadata
    )
    wpp_adapter = Wpp2024MediumAudit(args.un_wpp)
    wpp_profile = wpp_adapter.profile()
    codes = adapter.nonaggregate_codes()
    metadata = adapter.entities()
    entity_names = {code: metadata[code]["name"] for code in codes}
    geometry, placed_codes = build_display_geometry(
        args.geometry, valid_codes=codes, entity_names=entity_names
    )
    wpp_dataset = wpp_adapter.dataset(placed_codes)

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
    life_expectancy = adapter.series(LIFE_EXPECTANCY_INDICATOR)
    population_years = adapter.years(POPULATION_INDICATOR)
    electricity_years = adapter.years(ELECTRICITY_INDICATOR, require_known=True)
    life_expectancy_years = adapter.years(LIFE_EXPECTANCY_INDICATOR, require_known=True)
    if population_years != list(range(1960, 2026)):
        raise ValidationError("Population release does not cover every year from 1960 through 2025")
    if electricity_years != list(range(1990, 2025)):
        raise ValidationError("Electricity observations do not cover every year from 1990 through 2024")
    if life_expectancy_years != list(range(1960, 2025)):
        raise ValidationError("Life expectancy observations do not cover every year from 1960 through 2024")

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

    life_expectancy_rows: list[dict[str, Any]] = []
    life_expectancy_download_rows: list[dict[str, Any]] = []
    life_expectancy_summaries: list[dict[str, Any]] = []
    for year in life_expectancy_years:
        covered_population = 0
        unknown_condition_population = 0
        missing_population_entities = 0
        known_condition_entities = 0
        bin_populations = [0 for _ in range(len(LIFE_EXPECTANCY_BINS) - 1)]
        for code in sorted(codes):
            value = life_expectancy.get((code, year))
            pop = population.get((code, year))
            life_expectancy_rows.append(
                {
                    "code": code,
                    "year": year,
                    "value_years": value,
                    "status": "known" if value is not None else "unknown",
                    "original_record_locator": adapter.record_locator(
                        LIFE_EXPECTANCY_INDICATOR, code, year
                    ),
                }
            )
            life_expectancy_download_rows.append(
                {
                    "code": code,
                    "year": year,
                    "value_years": value,
                    "status": "known" if value is not None else "unknown",
                    "population": pop,
                    "population_status": "known" if pop is not None else "unknown",
                    "original_record_locator": adapter.record_locator(
                        LIFE_EXPECTANCY_INDICATOR, code, year
                    ),
                    "population_record_locator": adapter.record_locator(
                        POPULATION_INDICATOR, code, year
                    ),
                }
            )
            if pop is None:
                missing_population_entities += 1
                continue
            covered_population += pop
            if value is None:
                unknown_condition_population += pop
                continue
            known_condition_entities += 1
            bin_index = next(
                (
                    index
                    for index, (lower, upper) in enumerate(
                        zip(LIFE_EXPECTANCY_BINS, LIFE_EXPECTANCY_BINS[1:])
                    )
                    if lower <= value < upper
                ),
                None,
            )
            if bin_index is None:
                raise ValidationError(f"Life expectancy is outside published bins for {code}/{year}")
            bin_populations[bin_index] += pop
        if sum(bin_populations) + unknown_condition_population != covered_population:
            raise ValidationError(f"Life expectancy accounting does not conserve population in {year}")
        life_expectancy_summaries.append(
            {
                "year": year,
                "population": covered_population,
                "known_condition_entities": known_condition_entities,
                "missing_population_entities": missing_population_entities,
                "unknown_condition_population": unknown_condition_population,
                "bins": [
                    {
                        "lower_inclusive": lower,
                        "upper_exclusive": upper,
                        "population": bin_populations[index],
                    }
                    for index, (lower, upper) in enumerate(
                        zip(LIFE_EXPECTANCY_BINS, LIFE_EXPECTANCY_BINS[1:])
                    )
                ],
            }
        )

    args.output.mkdir(parents=True, exist_ok=True)
    entities_path = args.output / "entities.json"
    population_path = args.output / "population.json"
    electricity_path = args.output / "electricity.json"
    life_expectancy_path = args.output / "life-expectancy.json"
    geometry_path = args.output / "countries.geojson"
    population_csv_path = args.output / "population.csv"
    electricity_csv_path = args.output / "electricity.csv"
    life_expectancy_csv_path = args.output / "life-expectancy.csv"
    historical_population_path = args.output / "historical-population.json"
    historical_population_csv_path = args.output / "historical-population.csv"
    historical_context_index_path = args.output / "historical-context.json"
    historical_cities_path = args.output / "historical-cities.json"
    historical_cities_csv_path = args.output / "historical-cities.csv"
    population_outlook_path = args.output / "population-outlook.json"
    population_outlook_csv_path = args.output / "population-outlook.csv"
    reconciliation_path = args.output / "reconciliation.json"

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
    write_json(
        life_expectancy_path,
        {
            "schema_version": "0.4.0",
            "metric_id": "life_expectancy_at_birth",
            "years": life_expectancy_years,
            "observations": life_expectancy_rows,
            "summaries": life_expectancy_summaries,
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
    life_expectancy_csv_path.write_bytes(
        _csv_bytes(
            life_expectancy_download_rows,
            [
                "code",
                "year",
                "value_years",
                "status",
                "population",
                "population_status",
                "original_record_locator",
                "population_record_locator",
            ],
        )
    )

    historical_population_observations = historical_population_adapter.observations()
    write_json(
        historical_population_path,
        {
            "schema_version": "0.3.0",
            "metric_id": "population_total",
            "statistical_support": "world",
            "source_release_id": HISTORICAL_POPULATION_SOURCE_ID,
            "temporal_policy": "exact_only",
            "observations": historical_population_observations,
        },
    )
    historical_population_csv_path.write_bytes(
        _csv_bytes(
            [
                {
                    "year": observation["year"],
                    "source_year_label": observation["source_year_label"],
                    "lower": observation["lower"],
                    "upper": observation["upper"],
                    "status": observation["status"],
                    "statistical_support": observation["statistical_support"],
                    "original_record_locator": observation["original_record_locator"],
                }
                for observation in historical_population_observations
            ],
            [
                "year",
                "source_year_label",
                "lower",
                "upper",
                "status",
                "statistical_support",
                "original_record_locator",
            ],
        )
    )

    historical_cities = cities_adapter.dataset()
    place_by_record = {
        record_id: cluster["canonical_place_id"]
        for cluster in reconciliation["place_clusters"]
        for record_id in cluster["source_record_ids"]
    }
    cluster_size = {
        cluster["canonical_place_id"]: len(cluster["source_record_ids"])
        for cluster in reconciliation["place_clusters"]
    }
    for city in historical_cities["cities"]:
        canonical_place_id = place_by_record.get(city["source_record_id"])
        city["canonical_place_id"] = canonical_place_id
        city["reconciliation_status"] = (
            "linked_across_sources" if canonical_place_id else "source_record_only"
        )
        city["linked_source_record_count"] = (
            cluster_size[canonical_place_id] if canonical_place_id else 1
        )
    historical_cities["reconciliation_decision_set_id"] = reconciliation["decision_set_id"]
    write_json(historical_cities_path, historical_cities)
    cities_by_id = {city["id"]: city for city in historical_cities["cities"]}
    historical_cities_csv_path.write_bytes(
        _csv_bytes(
            [
                {
                    **observation,
                    "name": cities_by_id[observation["city_id"]]["name"],
                    "other_name": cities_by_id[observation["city_id"]]["other_name"],
                    "modern_country_label": cities_by_id[observation["city_id"]]["modern_country_label"],
                    "latitude": cities_by_id[observation["city_id"]]["latitude"],
                    "longitude": cities_by_id[observation["city_id"]]["longitude"],
                    "geocode_certainty_code": cities_by_id[observation["city_id"]]["geocode_certainty_code"],
                    "source_record_id": cities_by_id[observation["city_id"]]["source_record_id"],
                    "canonical_place_id": cities_by_id[observation["city_id"]]["canonical_place_id"],
                    "reconciliation_status": cities_by_id[observation["city_id"]]["reconciliation_status"],
                    "linked_source_record_count": cities_by_id[observation["city_id"]]["linked_source_record_count"],
                }
                for observation in historical_cities["observations"]
            ],
            [
                "city_id",
                "name",
                "other_name",
                "modern_country_label",
                "latitude",
                "longitude",
                "geocode_certainty_code",
                "source_record_id",
                "canonical_place_id",
                "reconciliation_status",
                "linked_source_record_count",
                "year",
                "population",
                "status",
                "original_record_locator",
            ],
        )
    )
    write_json(population_outlook_path, wpp_dataset)
    write_json(reconciliation_path, reconciliation)
    population_outlook_csv_path.write_bytes(
        _csv_bytes(
            wpp_dataset["observations"],
            [
                "code",
                "year",
                "value",
                "status",
                "evidence_state",
                "source_location_id",
                "original_record_locator",
            ],
        )
    )

    history_directory = args.output / "history"
    history_directory.mkdir(parents=True, exist_ok=True)
    historical_snapshots: list[dict[str, Any]] = []
    historical_snapshot_paths: list[Path] = []
    for source_year in SNAPSHOT_SOURCE_YEARS:
        snapshot = cliopatria_adapter.snapshot(source_year)
        era = "bce" if source_year < 0 else "ce"
        filename = f"cliopatria-{abs(source_year)}-{era}.geojson"
        snapshot_path = history_directory / filename
        write_json(snapshot_path, snapshot)
        historical_snapshot_paths.append(snapshot_path)
        historical_snapshots.append(
            {
                "atlas_year": snapshot["atlas_year"],
                "source_year": source_year,
                "file": f"history/{filename}",
                "feature_count": snapshot["feature_count"],
                "quality": snapshot["quality"],
            }
        )
    write_json(
        historical_context_index_path,
        {
            "schema_version": "0.4.0",
            "source_release_id": CLIOPATRIA_SOURCE_ID,
            "feature_kind": "political_context_not_statistical_support",
            "selection_policy": "latest published snapshot not after requested date",
            "source_profile": cliopatria_adapter.profile(),
            "reconciliation_decision_set_id": reconciliation["decision_set_id"],
            "snapshots": historical_snapshots,
        },
    )

    artifact_paths = [
            entities_path,
            population_path,
            electricity_path,
            life_expectancy_path,
            geometry_path,
            population_csv_path,
            electricity_csv_path,
            life_expectancy_csv_path,
            historical_population_path,
            historical_population_csv_path,
            historical_context_index_path,
            historical_cities_path,
            historical_cities_csv_path,
            population_outlook_path,
            population_outlook_csv_path,
            reconciliation_path,
            *historical_snapshot_paths,
    ]

    def artifact_key(path: Path) -> str:
        return path.relative_to(args.output).as_posix()

    artifacts = {
        artifact_key(path): artifact_record(path)
        for path in artifact_paths
    }
    modern_artifacts = {
        artifact_key(path): artifacts[artifact_key(path)]
        for path in [
            entities_path,
            population_path,
            electricity_path,
            life_expectancy_path,
            geometry_path,
            population_csv_path,
            electricity_csv_path,
            life_expectancy_csv_path,
        ]
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
    historical_years = [
        observation["year"] for observation in historical_population_observations
    ]
    population_metric_years = sorted(set(historical_years + population_years))
    manifest = {
        "schema_version": "0.5.0",
        "release_id": RELEASE_ID,
        "status": "genuine_data_development_release",
        "published_on": PUBLISHED_ON,
        "default_view": {"metric_id": "population_total", "year": 2024},
        "taxonomies": taxonomy_catalog(),
        "metrics": [
            metric_definition(
                "population_total",
                population_metric_years,
                "population.json",
                "population.csv",
                [
                    HISTORICAL_POPULATION_SOURCE_ID,
                    f"world-bank-wdi-{WORLD_BANK_LAST_UPDATED}",
                ],
            ),
            metric_definition(
                "population_outlook",
                wpp_dataset["years"],
                population_outlook_path.name,
                population_outlook_csv_path.name,
                [WPP_SOURCE_ID],
            ),
            metric_definition(
                "access_to_electricity",
                electricity_years,
                "electricity.json",
                "electricity.csv",
                [f"world-bank-wdi-{WORLD_BANK_LAST_UPDATED}"],
            ),
            metric_definition(
                "life_expectancy_at_birth",
                life_expectancy_years,
                "life-expectancy.json",
                "life-expectancy.csv",
                [f"world-bank-wdi-{WORLD_BANK_LAST_UPDATED}"],
            ),
        ],
        "population_universes": [
            {
                "id": WORLD_BANK_UNIVERSE_ID,
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
            },
            {
                "id": "us-census-historical-world-v1",
                "label": "U.S. Census historical world-population comparison",
                "entity_count": 1,
                "inclusion_rule": "published summary row for the world at an exact table date",
                "excluded_aggregate_count": 0,
                "reference_aggregate": "not_applicable",
                "review_status": "source_disagreement_ranges_preserved",
                "reference_residual_range": [0, 0],
                "scope_label": "historical global estimate",
                "notes": [
                    "The support is the world as a whole, not historical or modern territories.",
                    "Lower and upper values are disagreement among published sources, not confidence intervals.",
                    "No interpolation or population-by-polity allocation is published.",
                ],
            },
            {
                "id": WPP_UNIVERSE_ID,
                "label": "UN WPP 2024 Country/Area series, Medium variant",
                "entity_count": len(wpp_dataset["entities"]),
                "inclusion_rule": "LocTypeName equals Country/Area; regional and special aggregates excluded",
                "excluded_aggregate_count": wpp_profile["profile"]["location_ids"] - len(wpp_dataset["entities"]),
                "reference_aggregate": "World",
                "review_status": "source_native_country_area_partition_with_rounding_residual_preserved",
                "reference_residual_range": [
                    min(summary["world_reference_rounding_residual"] for summary in wpp_dataset["summaries"]),
                    max(summary["world_reference_rounding_residual"] for summary in wpp_dataset["summaries"]),
                ],
                "scope_label": "UN Country/Area population",
                "notes": [
                    "The World row is a reconciliation reference and is never added to Country/Area totals.",
                    "The signed residual is only source rounding from thousand-person values and is preserved.",
                    "This source-native universe is not merged with the World Bank universe or historical polities.",
                ],
            },
        ],
        "display_geometry": {
            "source": "Natural Earth admin 0 countries",
            "version": NATURAL_EARTH_VERSION,
            "scale": "1:110m",
            "purpose": "display_only_not_population_accounting",
            "feature_count": len(placed_codes),
            "crosswalks": DISPLAY_CROSSWALKS,
        },
        "deep_time_population": {
            "data_file": historical_population_path.name,
            "download_file": historical_population_csv_path.name,
            "source_release_id": HISTORICAL_POPULATION_SOURCE_ID,
            "statistical_support": "world",
            "available_years": historical_years,
            "coverage": "10000 BCE to 1950 CE at published comparison-table dates",
            "interpretation": "historical estimate or cross-source range; not assigned to polities or modern territories",
        },
        "historical_context": {
            "index_file": historical_context_index_path.name,
            "source_release_id": CLIOPATRIA_SOURCE_ID,
            "coverage": "3400 BCE to 2024 CE",
            "purpose": "display_only_not_population_accounting",
            "snapshot_count": len(historical_snapshots),
            "selection_policy": "latest published snapshot not after requested date",
            "excluded_feature_types": ["RELATION"],
            "reconciliation_decision_set_id": reconciliation["decision_set_id"],
        },
        "historical_cities": {
            "data_file": historical_cities_path.name,
            "download_file": historical_cities_csv_path.name,
            "source_release_id": MODELSKI_SOURCE_ID,
            "coverage": "3700 BCE to 1000 CE at 41 sparse source dates",
            "temporal_policy": "exact_only",
            "spatial_support": "source geocoded city points, not urban extents",
            "interpretation": "published city estimates; not a complete urban census or world-population denominator",
            "reconciliation_decision_set_id": reconciliation["decision_set_id"],
        },
        "reconciliation": {
            "decision_set_id": reconciliation["decision_set_id"],
            "data_file": reconciliation_path.name,
            "status": reconciliation["status"],
            "city_candidates": reconciliation["summary"]["city_candidates"],
            "border_candidates": reconciliation["summary"]["border_candidates"],
            "unresolved_city_identities": reconciliation["summary"]["city_dispositions"].get("unresolved_identity", 0),
            "unresolved_border_overlaps": reconciliation["summary"]["border_dispositions"].get("unresolved_overlap", 0),
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
            {
                "id": HISTORICAL_POPULATION_SOURCE_ID,
                "publisher": "U.S. Census Bureau",
                "retrieved_on": RETRIEVED_ON,
                "license": "U.S. government public data; underlying estimates attributed",
                "profile": historical_population_adapter.profile(),
            },
            {
                "id": CLIOPATRIA_SOURCE_ID,
                "publisher": "Seshat Global History Databank",
                "retrieved_on": RETRIEVED_ON,
                "license": "CC BY 4.0",
                "profile": {
                    **cliopatria_adapter.profile(),
                    "published_snapshot_count": len(historical_snapshots),
                    "relations_excluded_from_release": True,
                },
            },
            {
                "id": MODELSKI_SOURCE_ID,
                "publisher": "Meredith Reba / Figshare; underlying Modelski compilation",
                "retrieved_on": RETRIEVED_ON,
                "license": "CC BY 4.0",
                "profile": cities_adapter.profile(),
            },
            {
                "id": WPP_SOURCE_ID,
                "publisher": "United Nations, Department of Economic and Social Affairs, Population Division",
                "retrieved_on": WPP_RETRIEVED_ON,
                "license": WPP_SOURCE_LICENSE,
                "profile": wpp_profile,
            },
        ],
        "alternative_sources": [
            {
                "id": "hyde-3.5",
                "role": "deep-time gridded population candidate",
                "status": "blocked",
                "reason_deferred": "authorized archive access and artifact terms unresolved",
                "url": "https://public.yoda.uu.nl/geo/UU01/F45D44.html",
            },
            {
                "id": "reba-chandler-and-modelski-modern",
                "role": "additional historical city population series",
                "status": "documented_not_ingested",
                "coverage": "2250 BCE to 2000 CE across companion tables",
                "reason_deferred": "Identity decisions are recorded, but publishing companion estimates still requires a same-date disagreement view, two zero-cell decisions, and review of two unresolved identity pairs",
                "url": "https://doi.org/10.1038/sdata.2016.34",
            },
        ],
        "transformations": [
            {
                "id": "atlas-reconciliation-decisions-v1",
                "version": "1.0.0",
                "input_artifact_ids": ["atlas_reconciliation_decisions_v1"],
                "parameters": {
                    "decision_set_id": reconciliation["decision_set_id"],
                    "decision_source_sha256": sha256(args.reconciliation_decisions),
                    "source_input_hashes": reconciliation["inputs"],
                    "observation_merge": "none",
                    "population_allocation": "none",
                },
                "output_artifacts": {
                    artifact_key(reconciliation_path): artifacts[artifact_key(reconciliation_path)],
                },
                "validation": reconciliation["summary"],
            },
            {
                "id": "world-bank-mvp-normalize-v1",
                "version": "1.0.0",
                "input_artifact_ids": [artifact.id for artifact in inputs[:5]],
                "parameters": {
                    "universe_id": WORLD_BANK_UNIVERSE_ID,
                    "population_years": [1960, 2025],
                    "electricity_years": [1990, 2024],
                    "life_expectancy_years": [1960, 2024],
                    "life_expectancy_bins": LIFE_EXPECTANCY_BINS,
                    "no_interpolation": True,
                },
                "output_artifacts": modern_artifacts,
                "validation": {
                    "population_summaries": len(population_summaries),
                    "electricity_summaries": len(electricity_summaries),
                    "life_expectancy_summaries": len(life_expectancy_summaries),
                    "prevalence_mass_conservation": "passed_all_years",
                    "context_distribution_mass_conservation": "passed_all_years",
                    "world_reference_residual_nonnegative": "passed_all_years",
                },
            },
            {
                "id": "us-census-historical-population-parse-v1",
                "version": "1.0.0",
                "input_artifact_ids": ["us_census_historical_world_population"],
                "parameters": {
                    "unit_conversion": "millions_to_people",
                    "date_conversion": "BCE/CE labels to astronomical years",
                    "no_interpolation": True,
                    "source_disagreement_ranges_preserved": True,
                },
                "output_artifacts": {
                    artifact_key(historical_population_path): artifacts[artifact_key(historical_population_path)],
                    artifact_key(historical_population_csv_path): artifacts[artifact_key(historical_population_csv_path)],
                },
                "validation": historical_population_adapter.profile(),
            },
            {
                "id": "cliopatria-display-snapshots-v2",
                "version": "2.0.0",
                "input_artifact_ids": [
                    "cliopatria_v0_2_0_archive",
                    "cliopatria_v0_2_0_license",
                    "atlas_reconciliation_decisions_v1",
                ],
                "parameters": {
                    "feature_types": ["POLITY"],
                    "excluded_feature_types": ["RELATION"],
                    "archive_member": CLIOPATRIA_GEOMETRY_MEMBER,
                    "archive_member_sha256": cliopatria_archive_member_sha256,
                    "snapshot_source_years": SNAPSHOT_SOURCE_YEARS,
                    "simplification_tolerance_degrees": 0.08,
                    "population_assignment": "none",
                    "source_year_zero": "quarantined_not_sampled",
                    "reconciliation_decision_set_id": reconciliation["decision_set_id"],
                    "source_declared_composites_render_as_outlines": True,
                    "unresolved_overlaps_preserved": True,
                },
                "output_artifacts": {
                    artifact_key(path): artifacts[artifact_key(path)]
                    for path in [historical_context_index_path, *historical_snapshot_paths]
                },
                "validation": {
                    **cliopatria_adapter.profile(),
                    "published_snapshots": len(historical_snapshots),
                    "all_snapshots_nonempty": all(
                        snapshot["feature_count"] > 0 for snapshot in historical_snapshots
                    ),
                },
            },
            {
                "id": "modelski-ancient-city-points-v2",
                "version": "2.0.0",
                "input_artifact_ids": [
                    "modelski_ancient_v2_csv",
                    "modelski_ancient_v2_metadata",
                    "atlas_reconciliation_decisions_v1",
                ],
                "parameters": {
                    "date_conversion": "BC/AD columns to astronomical years",
                    "temporal_policy": "exact_only",
                    "no_interpolation": True,
                    "spatial_support": "source point coordinates",
                    "population_assignment_to_polities": "none",
                    "reconciliation_decision_set_id": reconciliation["decision_set_id"],
                    "cross_source_identity_only": True,
                    "source_observation_merge": "none",
                },
                "output_artifacts": {
                    artifact_key(historical_cities_path): artifacts[artifact_key(historical_cities_path)],
                    artifact_key(historical_cities_csv_path): artifacts[artifact_key(historical_cities_csv_path)],
                },
                "validation": cities_adapter.profile(),
            },
            {
                "id": "un-wpp-2024-medium-population-v1",
                "version": "1.0.0",
                "input_artifact_ids": ["un_wpp_2024_medium_demographic_indicators"],
                "parameters": {
                    "location_type": "Country/Area",
                    "indicator": "TPopulation1July",
                    "source_unit": "thousands of people",
                    "published_unit": "people",
                    "published_years": [1950, 2100],
                    "estimate_years": [1950, 2023],
                    "medium_projection_years": [2024, 2100],
                    "excluded_artifact_boundary_year": 2101,
                    "no_cross_source_splice": True,
                    "no_interpolation": True,
                },
                "output_artifacts": {
                    artifact_key(population_outlook_path): artifacts[artifact_key(population_outlook_path)],
                    artifact_key(population_outlook_csv_path): artifacts[artifact_key(population_outlook_csv_path)],
                },
                "validation": {
                    "country_area_entities": len(wpp_dataset["entities"]),
                    "annual_observations": len(wpp_dataset["observations"]),
                    "annual_summaries": len(wpp_dataset["summaries"]),
                    "country_area_plus_rounding_residual_equals_world": "passed_all_years",
                    "mapped_plus_unplaced_equals_country_area_total": "passed_all_years",
                },
            },
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
                "label": "World Bank, Life expectancy at birth, total (years)",
                "url": "https://data.worldbank.org/indicator/SP.DYN.LE00.IN",
                "license": "CC BY 4.0",
            },
            {
                "label": "Natural Earth vector v5.1.2",
                "url": "https://github.com/nvkelso/natural-earth-vector/releases/tag/v5.1.2",
                "license": "Public domain",
            },
            {
                "label": "U.S. Census Bureau, Historical Estimates of World Population",
                "url": HISTORICAL_POPULATION_URL,
                "license": "U.S. government public data; underlying estimates attributed",
            },
            {
                "label": "Cliopatria v0.2.0",
                "url": "https://github.com/Seshat-Global-History-Databank/cliopatria/tree/v0.2.0",
                "license": "CC BY 4.0",
            },
            {
                "label": "Modelski Ancient Period Data v2",
                "url": MODELSKI_DATA_URL,
                "license": "CC BY 4.0",
            },
            {
                "label": "Reba et al., Spatializing 6,000 years of global urbanization",
                "url": MODELSKI_ARTICLE_URL,
                "license": "CC BY 4.0",
            },
            {
                "label": "UN World Population Prospects 2024, Online Edition",
                "url": WPP_SOURCE_TERMS_URL,
                "license": WPP_SOURCE_LICENSE,
            },
        ],
        "limitations": [
            "Population color represents a territorial total, not local density or a gridded settlement reconstruction.",
            "Electricity values are national or territorial estimates, not local household observations.",
            "Life expectancy is a national or territorial period mean; the population distribution groups people by territorial context and is not a person-level lifespan distribution.",
            "The covered universe is reconciled to WLD with an explicit residual but lacks source-coded parent/dependency relations.",
            "The 1:110m display geometry omits some small territories; their population remains in summaries.",
            "Pre-1960 historical population is a global estimate or source-disagreement range and is not spatially allocated.",
            "Cliopatria polygons and labels are contestable historical context, simplified for display, and never used as population supports.",
            "Only selected Cliopatria snapshot years are published; the effective boundary date is shown separately from the requested date.",
            "Ancient-city points appear only at exact published dates; coordinates are source geocodes, modern-country labels are descriptive metadata, and city estimates are not summed as total urban or world population.",
            "UN WPP values are modeled population estimates through 2023 and Medium projections from 2024; projection scenarios are not confidence intervals.",
            "WPP Country/Area supports are shown on available modern Natural Earth display geometry and are not claims about historical political borders.",
            "The reconciliation decision set links source records and annotates source-declared hierarchy but never merges observations, edits source geometry, or assigns population to political features.",
            "Twenty bounded 1500 CE border overlaps and two coordinate-only city identities remain explicitly unresolved because current source evidence does not adjudicate them.",
        ],
    }
    validate_release_manifest(
        manifest,
        {artifact.id for artifact in inputs} | {"atlas_reconciliation_decisions_v1"},
    )
    write_json(args.output / "manifest.json", manifest)
    print(
        json.dumps(
            {
                "release_id": RELEASE_ID,
                "entities": len(codes),
                "map_features": len(placed_codes),
                "population_years": [population_years[0], population_years[-1]],
                "historical_population_dates": len(historical_population_observations),
                "electricity_years": [electricity_years[0], electricity_years[-1]],
                "life_expectancy_years": [life_expectancy_years[0], life_expectancy_years[-1]],
                "historical_context_snapshots": len(historical_snapshots),
                "historical_city_observations": len(historical_cities["observations"]),
                "wpp_population_years": [wpp_dataset["years"][0], wpp_dataset["years"][-1]],
                "wpp_country_area_entities": len(wpp_dataset["entities"]),
                "reconciliation_city_decisions": reconciliation["summary"]["city_candidates"],
                "reconciliation_border_decisions": reconciliation["summary"]["border_candidates"],
                "artifacts_bytes": sum(record["bytes"] for record in artifacts.values()),
            },
            indent=2,
        )
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--population", type=Path, required=True)
    parser.add_argument("--electricity", type=Path, required=True)
    parser.add_argument("--life-expectancy", type=Path, required=True)
    parser.add_argument("--countries", type=Path, required=True)
    parser.add_argument("--geometry", type=Path, required=True)
    parser.add_argument("--historical-population", type=Path, required=True)
    parser.add_argument("--cliopatria-archive", type=Path, required=True)
    parser.add_argument("--cliopatria-geometry", type=Path, required=True)
    parser.add_argument("--cliopatria-license", type=Path, required=True)
    parser.add_argument("--historical-cities", type=Path, required=True)
    parser.add_argument("--historical-cities-metadata", type=Path, required=True)
    parser.add_argument("--un-wpp", type=Path, required=True)
    parser.add_argument("--reconciliation-decisions", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--lockfile", type=Path, required=True)
    return parser.parse_args()


if __name__ == "__main__":
    build(parse_args())
