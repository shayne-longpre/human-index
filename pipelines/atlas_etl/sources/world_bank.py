"""Validated adapter for one pinned World Bank API retrieval."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from ..core import ValidationError, load_json


POPULATION_INDICATOR = "SP.POP.TOTL"
ELECTRICITY_INDICATOR = "EG.ELC.ACCS.ZS"
WORLD_REFERENCE_CODE = "WLD"
WORLD_BANK_LAST_UPDATED = "2026-07-13"

SOURCE_URLS = {
    "world_bank_population": (
        "https://api.worldbank.org/v2/country/all/indicator/"
        "SP.POP.TOTL?format=json&date=1960:2025&per_page=20000"
    ),
    "world_bank_electricity": (
        "https://api.worldbank.org/v2/country/all/indicator/"
        "EG.ELC.ACCS.ZS?format=json&date=1990:2025&per_page=20000"
    ),
    "world_bank_countries": (
        "https://api.worldbank.org/v2/country?format=json&per_page=500"
    ),
}


def _api_response(path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    payload = load_json(path)
    if not isinstance(payload, list) or len(payload) != 2:
        raise ValidationError(f"{path} is not a two-part World Bank API response")
    metadata, rows = payload
    if metadata.get("page") != 1 or metadata.get("pages") != 1:
        raise ValidationError(f"{path} is not a complete single-page acquisition")
    if metadata.get("total") != len(rows):
        raise ValidationError(f"{path} metadata total does not equal row count")
    return metadata, rows


class WorldBankAdapter:
    """Expose native World Bank entities and observations through stable methods."""

    def __init__(self, *, population: Path, electricity: Path, countries: Path) -> None:
        self._population_meta, self._population_rows = _api_response(population)
        self._electricity_meta, self._electricity_rows = _api_response(electricity)
        self._country_meta, country_rows = _api_response(countries)
        self._entities = {row["id"]: row for row in country_rows}
        self._series_cache: dict[str, dict[tuple[str, int], float | int | None]] = {}
        self._validate_release()

    def _validate_release(self) -> None:
        for label, metadata in (
            ("population", self._population_meta),
            ("electricity", self._electricity_meta),
        ):
            if metadata.get("lastupdated") != WORLD_BANK_LAST_UPDATED:
                raise ValidationError(
                    f"{label} source update date differs from the audited retrieval"
                )
        if len(self._entities) != 295:
            raise ValidationError(f"Expected 295 country metadata rows, got {len(self._entities)}")
        if len(self.nonaggregate_codes()) != 217:
            raise ValidationError(
                f"Expected 217 nonaggregate entities, got {len(self.nonaggregate_codes())}"
            )
        self.series(POPULATION_INDICATOR)
        self.series(ELECTRICITY_INDICATOR)

    def nonaggregate_codes(self) -> set[str]:
        return {
            code
            for code, row in self._entities.items()
            if row.get("region", {}).get("id") != "NA"
            and row.get("region", {}).get("value") != "Aggregates"
        }

    def entities(self) -> dict[str, dict[str, Any]]:
        return {code: self._entities[code] for code in self.nonaggregate_codes()}

    def aggregate_codes(self) -> set[str]:
        return set(self._entities) - self.nonaggregate_codes()

    def series(self, indicator_id: str) -> dict[tuple[str, int], float | int | None]:
        if indicator_id in self._series_cache:
            return self._series_cache[indicator_id]
        if indicator_id == POPULATION_INDICATOR:
            rows = self._population_rows
        elif indicator_id == ELECTRICITY_INDICATOR:
            rows = self._electricity_rows
        else:
            raise KeyError(f"World Bank indicator was not acquired: {indicator_id}")

        indexed: dict[tuple[str, int], float | int | None] = {}
        for row in rows:
            if row.get("indicator", {}).get("id") != indicator_id:
                raise ValidationError(f"Unexpected indicator in {indicator_id} response")
            code = row.get("countryiso3code")
            # Some API aggregate rows have an empty ISO3 field. They cannot be
            # stable statistical supports and are excluded before indexing.
            if code not in self._entities:
                continue
            year = int(row["date"])
            key = (code, year)
            if key in indexed:
                raise ValidationError(f"Duplicate {indicator_id} observation for {code}/{year}")
            value = row.get("value")
            if value is not None and not isinstance(value, (int, float)):
                raise ValidationError(f"Non-numeric value for {indicator_id}/{code}/{year}")
            if indicator_id == POPULATION_INDICATOR and value is not None and value < 0:
                raise ValidationError(f"Negative population for {code}/{year}")
            if (
                indicator_id == ELECTRICITY_INDICATOR
                and value is not None
                and not 0 <= value <= 100
            ):
                raise ValidationError(f"Electricity rate outside [0,100] for {code}/{year}")
            indexed[key] = value
        self._series_cache[indicator_id] = indexed
        return indexed

    def years(self, indicator_id: str, *, require_known: bool = False) -> list[int]:
        codes = self.nonaggregate_codes()
        values = self.series(indicator_id)
        years = {
            year
            for (code, year), value in values.items()
            if code in codes and (not require_known or value is not None)
        }
        return sorted(years)

    def profile(self) -> dict[str, Any]:
        codes = self.nonaggregate_codes()
        population = self.series(POPULATION_INDICATOR)
        electricity = self.series(ELECTRICITY_INDICATOR)
        return {
            "source_update": WORLD_BANK_LAST_UPDATED,
            "metadata_entities": len(self._entities),
            "nonaggregate_entities": len(codes),
            "excluded_aggregate_entities": len(self.aggregate_codes()),
            "population_rows": len(self._population_rows),
            "population_years": self.years(POPULATION_INDICATOR),
            "population_known_by_year": {
                str(year): sum(population.get((code, year)) is not None for code in codes)
                for year in self.years(POPULATION_INDICATOR)
            },
            "electricity_rows": len(self._electricity_rows),
            "electricity_observation_years": self.years(
                ELECTRICITY_INDICATOR, require_known=True
            ),
            "electricity_known_by_year": {
                str(year): sum(electricity.get((code, year)) is not None for code in codes)
                for year in self.years(ELECTRICITY_INDICATOR)
            },
        }

    @staticmethod
    def record_locator(indicator_id: str, code: str, year: int) -> str:
        return f"World Bank API {indicator_id}/{code}/{year}"
