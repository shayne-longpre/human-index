"""Small declarative catalog and reference checks for Atlas releases.

Taxonomy families organize discovery. They do not change a metric's meaning or
authorize observations from different sources to be combined. That authority
lives in each metric contract and its recorded transformation.
"""

from __future__ import annotations

from typing import Any

from .core import ValidationError
from .sources.world_bank import (
    ELECTRICITY_INDICATOR,
    LIFE_EXPECTANCY_INDICATOR,
    POPULATION_INDICATOR,
)
from .sources.world_bank_economics import GDP_PER_CAPITA_INDICATOR


WORLD_BANK_UNIVERSE_ID = "world-bank-nonaggregate-economies-v1"
WPP_UNIVERSE_ID = "un-wpp-2024-country-area-medium-v1"
LIFE_EXPECTANCY_BINS = [0, 50, 60, 70, 80, 90, 130]


def taxonomy_catalog() -> list[dict[str, Any]]:
    return [
        {
            "id": "human_conditions_v1",
            "families": [
                {"id": "population_and_settlement", "label": "Population & settlement"},
                {"id": "material_conditions", "label": "Material conditions"},
                {"id": "economic_activity", "label": "Economic activity"},
                {"id": "infrastructure_access", "label": "Infrastructure access"},
                {"id": "health_and_survival", "label": "Health & survival"},
            ],
        }
    ]


def metric_definition(
    metric_id: str,
    years: list[int],
    data_file: str,
    download_file: str,
    source_release_ids: list[str],
) -> dict[str, Any]:
    shared = {
        "available_years": years,
        "temporal_policy": "exact_only",
        "data_file": data_file,
        "download_file": download_file,
        "source_release_ids": source_release_ids,
        "population_universe_id": WORLD_BANK_UNIVERSE_ID,
        "support_type": "world_bank_country_or_territory_year",
    }
    if metric_id == "population_total":
        return {
            **shared,
            "population_universe_id": None,
            "population_universe_periods": [
                {
                    "start_year": years[0],
                    "end_year": 1950,
                    "population_universe_id": "us-census-historical-world-v1",
                },
                {
                    "start_year": 1960,
                    "end_year": 2025,
                    "population_universe_id": WORLD_BANK_UNIVERSE_ID,
                },
            ],
            "id": metric_id,
            "label": "Population",
            "taxonomy_ids": ["population_and_settlement"],
            "indicator": f"U.S. Census historical comparison / World Bank {POPULATION_INDICATOR}",
            "aggregation_kind": "population_total",
            "unit": "people",
            "support_type": "date_specific_world_or_country_territory",
            "definition": "Global historical population estimate or range through 1950; resident territorial population total from 1960 onward.",
            "display_scale": {
                "transform": "log1p",
                "fixed_domain": [10_000, 2_000_000_000],
                "scale_version": "population-country-total-v1",
            },
            "safe_summary": "Published population evidence at its date-specific world or territorial support.",
            "prohibited_interpretations": [
                "local population density",
                "gridded settlement reconstruction",
            ],
        }
    if metric_id == "population_outlook":
        return {
            **shared,
            "population_universe_id": WPP_UNIVERSE_ID,
            "id": metric_id,
            "label": "UN population outlook",
            "taxonomy_ids": ["population_and_settlement"],
            "indicator": "WPP 2024 total population as of 1 July, Medium variant",
            "aggregation_kind": "population_total",
            "unit": "people",
            "support_type": "un_wpp_country_or_area_year",
            "definition": (
                "UN WPP 2024 July population: estimates for 1950–2023 and the "
                "Medium projection for 2024–2100, kept visibly distinct."
            ),
            "display_scale": {
                "transform": "log1p",
                "fixed_domain": [10_000, 2_000_000_000],
                "scale_version": "population-country-total-v1",
            },
            "safe_summary": "UN country/area population estimates and Medium projections at exact annual dates.",
            "prohibited_interpretations": [
                "observed census counts",
                "statistical confidence intervals",
                "local population density",
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
    if metric_id == "life_expectancy_at_birth":
        return {
            **shared,
            "id": metric_id,
            "label": "Life expectancy",
            "taxonomy_ids": ["health_and_survival"],
            "indicator": LIFE_EXPECTANCY_INDICATOR,
            "aggregation_kind": "context_distribution",
            "unit": "years",
            "definition": "Period life expectancy at birth for the national or territorial population in the stated year.",
            "display_scale": {
                "transform": "linear",
                "fixed_domain": [45, 90],
                "bins": LIFE_EXPECTANCY_BINS,
                "scale_version": "life-expectancy-context-v1",
            },
            "safe_summary": "Population living in territories grouped by their published national mean life expectancy.",
            "prohibited_interpretations": [
                "an individual lifespan prediction",
                "a person-level distribution",
                "a global life-table estimate",
            ],
        }
    if metric_id == "gdp_per_capita_constant_2015_usd":
        return {
            **shared,
            "id": metric_id,
            "label": "GDP per person",
            "taxonomy_ids": ["material_conditions", "economic_activity"],
            "indicator": GDP_PER_CAPITA_INDICATOR,
            "aggregation_kind": "context_fact",
            "unit": "constant 2015 US$/person",
            "definition": (
                "Territorial GDP divided by midyear population, expressed in constant "
                "2015 US dollars for the stated World Bank economy and year."
            ),
            "display_scale": {
                "transform": "log1p",
                "fixed_domain": [200, 250_000],
                "scale_version": "gdp-per-capita-constant-2015-usd-v1",
            },
            "safe_summary": (
                "Source-published territorial GDP per capita; Atlas reports coverage "
                "without constructing a global average."
            ),
            "prohibited_interpretations": [
                "individual income",
                "household wealth",
                "a purchasing-power-parity measure",
                "a welfare ranking",
            ],
        }
    raise ValidationError(f"Unknown published metric: {metric_id}")


def validate_release_manifest(
    manifest: dict[str, Any], input_artifact_ids: set[str]
) -> None:
    def unique(kind: str, ids: list[str]) -> set[str]:
        values = set(ids)
        if len(values) != len(ids):
            raise ValidationError(f"Duplicate {kind} id")
        return values

    metrics = manifest["metrics"]
    metric_ids = unique("metric", [metric["id"] for metric in metrics])
    family_ids = unique(
        "taxonomy family",
        [
            family["id"]
            for taxonomy in manifest["taxonomies"]
            for family in taxonomy["families"]
        ],
    )
    universe_ids = unique(
        "population universe",
        [universe["id"] for universe in manifest["population_universes"]],
    )
    source_ids = unique(
        "source release", [source["id"] for source in manifest["source_releases"]]
    )
    unique(
        "transformation",
        [transformation["id"] for transformation in manifest["transformations"]],
    )

    artifacts = manifest["artifacts"]
    for metric in metrics:
        if len(set(metric["taxonomy_ids"])) != len(metric["taxonomy_ids"]):
            raise ValidationError(f"Metric {metric['id']} repeats a taxonomy family")
        if not set(metric["taxonomy_ids"]).issubset(family_ids):
            raise ValidationError(f"Metric {metric['id']} has an unknown taxonomy family")
        if not metric["source_release_ids"]:
            raise ValidationError(f"Metric {metric['id']} has no source release")
        if len(set(metric["source_release_ids"])) != len(metric["source_release_ids"]):
            raise ValidationError(f"Metric {metric['id']} repeats a source release")
        if not set(metric["source_release_ids"]).issubset(source_ids):
            raise ValidationError(f"Metric {metric['id']} has an unknown source release")
        primary_universe = metric["population_universe_id"]
        periods = metric.get("population_universe_periods", [])
        if primary_universe is not None and periods:
            raise ValidationError(
                f"Metric {metric['id']} has both primary and date-specific population universes"
            )
        if primary_universe is None and not periods:
            raise ValidationError(f"Metric {metric['id']} has no population universe")
        for index, period in enumerate(periods):
            if period["start_year"] > period["end_year"]:
                raise ValidationError(
                    f"Metric {metric['id']} has an inverted population-universe period"
                )
            if index and period["start_year"] <= periods[index - 1]["end_year"]:
                raise ValidationError(
                    f"Metric {metric['id']} has overlapping population-universe periods"
                )
        referenced_universes = ({primary_universe} if primary_universe is not None else set()) | {
            period["population_universe_id"]
            for period in periods
        }
        if not referenced_universes.issubset(universe_ids):
            raise ValidationError(f"Metric {metric['id']} has an unknown population universe")
        if primary_universe is None:
            for year in metric["available_years"]:
                matches = [
                    period
                    for period in periods
                    if period["start_year"] <= year <= period["end_year"]
                ]
                if len(matches) != 1:
                    raise ValidationError(
                        f"Metric {metric['id']} does not resolve one population universe for {year}"
                    )
        for filename in (metric["data_file"], metric["download_file"]):
            if filename not in artifacts:
                raise ValidationError(f"Metric {metric['id']} has a missing artifact: {filename}")

    default_view = manifest["default_view"]
    if default_view["metric_id"] not in metric_ids:
        raise ValidationError("Default view metric is not published")
    default_metric = next(metric for metric in metrics if metric["id"] == default_view["metric_id"])
    if default_view["year"] not in default_metric["available_years"]:
        raise ValidationError("Default view year is not supported")

    layers = (
        manifest["deep_time_population"],
        manifest["historical_context"],
        manifest["historical_cities"],
    )
    if not {layer["source_release_id"] for layer in layers}.issubset(source_ids):
        raise ValidationError("A published layer has an unknown source release")

    reconciliation = manifest["reconciliation"]
    if reconciliation["data_file"] not in artifacts:
        raise ValidationError("Reconciliation decision set is not a published artifact")
    if (
        manifest["historical_context"]["reconciliation_decision_set_id"]
        != reconciliation["decision_set_id"]
        or manifest["historical_cities"]["reconciliation_decision_set_id"]
        != reconciliation["decision_set_id"]
    ):
        raise ValidationError("Published layers disagree on reconciliation decision set")

    for transformation in manifest["transformations"]:
        if not set(transformation["input_artifact_ids"]).issubset(input_artifact_ids):
            raise ValidationError(
                f"Transformation {transformation['id']} has an unknown input artifact"
            )
        for filename, output in transformation["output_artifacts"].items():
            if artifacts.get(filename) != output:
                raise ValidationError(
                    f"Transformation {transformation['id']} disagrees with artifact {filename}"
                )
