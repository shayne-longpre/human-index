"""Validated adapter for the pinned World Bank GDP-per-capita retrieval.

This stays separate from the MVP World Bank adapter because a candidate economic
indicator should not silently become part of the population/electricity source
bundle. Both adapters can still share the same source-native entity universe.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from ..core import ValidationError
from .world_bank import WORLD_BANK_LAST_UPDATED, _api_response


GDP_PER_CAPITA_INDICATOR = "NY.GDP.PCAP.KD"
GDP_PER_CAPITA_SOURCE_URL = (
    "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.KD"
    "?format=json&date=1960:2025&per_page=20000"
)
WORLD_BANK_COUNTRIES_URL = (
    "https://api.worldbank.org/v2/country?format=json&per_page=500"
)
SOURCE_RELEASE_ID = f"world-bank-wdi-economics-{WORLD_BANK_LAST_UPDATED}"


class WorldBankEconomicsAdapter:
    """Expose one source-native economic series without cross-source splicing."""

    def __init__(self, *, gdp_per_capita: Path, countries: Path) -> None:
        self._series_meta, self._rows = _api_response(gdp_per_capita)
        self._country_meta, country_rows = _api_response(countries)
        self._entities = {row["id"]: row for row in country_rows}
        self._values: dict[tuple[str, int], float | None] = {}
        self._validate_and_index()

    def _validate_and_index(self) -> None:
        if self._series_meta.get("lastupdated") != WORLD_BANK_LAST_UPDATED:
            raise ValidationError("GDP-per-capita update date differs from the audited retrieval")
        if len(self._entities) != 295:
            raise ValidationError(f"Expected 295 country metadata rows, got {len(self._entities)}")
        if len(self.nonaggregate_codes()) != 217:
            raise ValidationError(
                f"Expected 217 nonaggregate entities, got {len(self.nonaggregate_codes())}"
            )

        for row in self._rows:
            if row.get("indicator", {}).get("id") != GDP_PER_CAPITA_INDICATOR:
                raise ValidationError("Unexpected indicator in GDP-per-capita response")
            code = row.get("countryiso3code")
            if code not in self._entities:
                continue
            key = (code, int(row["date"]))
            if key in self._values:
                raise ValidationError(f"Duplicate GDP-per-capita observation for {key[0]}/{key[1]}")
            value = row.get("value")
            if value is not None and (not isinstance(value, (int, float)) or value < 0):
                raise ValidationError(f"Invalid GDP-per-capita value for {key[0]}/{key[1]}")
            self._values[key] = float(value) if value is not None else None

    def nonaggregate_codes(self) -> set[str]:
        return {
            code
            for code, row in self._entities.items()
            if row.get("region", {}).get("id") != "NA"
            and row.get("region", {}).get("value") != "Aggregates"
        }

    def series(self) -> dict[tuple[str, int], float | None]:
        return dict(self._values)

    def years(self, *, require_known: bool = False) -> list[int]:
        codes = self.nonaggregate_codes()
        return sorted(
            {
                year
                for (code, year), value in self._values.items()
                if code in codes and (not require_known or value is not None)
            }
        )

    def profile(self) -> dict[str, Any]:
        codes = self.nonaggregate_codes()
        years = self.years(require_known=True)
        return {
            "source_update": WORLD_BANK_LAST_UPDATED,
            "indicator": GDP_PER_CAPITA_INDICATOR,
            "source_unit": "constant 2015 US dollars per person",
            "rows": len(self._rows),
            "nonaggregate_entities": len(codes),
            "excluded_aggregate_entities": len(self._entities) - len(codes),
            "observation_years": years,
            "known_by_year": {
                str(year): sum(self._values.get((code, year)) is not None for code in codes)
                for year in years
            },
        }

    @staticmethod
    def record_locator(code: str, year: int) -> str:
        return f"World Bank API {GDP_PER_CAPITA_INDICATOR}/{code}/{year}"
