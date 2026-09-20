"""Adapter for the U.S. Census historical world-population comparison table."""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from typing import Any

from ..core import ValidationError


SOURCE_ID = "us-census-historical-world-population-2026-09-20"
SOURCE_URL = (
    "https://www.census.gov/data/tables/time-series/demo/international-programs/"
    "historical-est-worldpop.html"
)

_SOURCE_COLUMNS = {
    "biraben": (3, None),
    "durand": (4, 5),
    "haub": (6, None),
    "mcevedy_and_jones": (7, None),
    "thomlinson": (8, 9),
    "un_1973": (10, 11),
    "un_1999": (12, None),
    "uscb": (13, None),
}


class _TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tables: list[list[list[str]]] = []
        self._table_depth = 0
        self._rows: list[list[str]] = []
        self._row: list[str] | None = None
        self._cell: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        del attrs
        if tag == "table":
            self._table_depth += 1
            if self._table_depth == 1:
                self._rows = []
        elif self._table_depth == 1 and tag == "tr":
            self._row = []
        elif self._table_depth == 1 and tag in {"td", "th"}:
            self._cell = []

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        if self._table_depth == 1 and tag in {"td", "th"} and self._cell is not None:
            assert self._row is not None
            self._row.append(" ".join("".join(self._cell).split()))
            self._cell = None
        elif self._table_depth == 1 and tag == "tr" and self._row:
            self._rows.append(self._row)
            self._row = None
        elif tag == "table" and self._table_depth:
            if self._table_depth == 1:
                self.tables.append(self._rows)
            self._table_depth -= 1


def _millions(value: str) -> int | None:
    if not value:
        return None
    try:
        return int(float(value.replace(",", "")) * 1_000_000)
    except ValueError as cause:
        raise ValidationError(f"Invalid historical population value: {value!r}") from cause


def _astronomical_year(label: str) -> int:
    amount, era = label.split()
    year = int(amount)
    if year < 1:
        raise ValidationError(f"Invalid historical population year: {label}")
    if era == "BC":
        return 1 - year
    if era == "AD":
        return year
    raise ValidationError(f"Unsupported historical population era: {label}")


class UsCensusHistoricalPopulationAdapter:
    def __init__(self, path: Path) -> None:
        parser = _TableParser()
        parser.feed(path.read_text(encoding="utf-8"))
        candidates = [
            table
            for table in parser.tables
            if table and table[0][:3] == ["Year", "Summary", "Biraben"]
        ]
        if len(candidates) != 1:
            raise ValidationError(
                f"Expected one U.S. Census historical population table, found {len(candidates)}"
            )
        rows = [row for row in candidates[0] if len(row) == 14 and row[0][:1].isdigit()]
        if not rows:
            raise ValidationError("U.S. Census historical population table has no data rows")
        self.path = path
        self._rows = rows

    def observations(self) -> list[dict[str, Any]]:
        observations: list[dict[str, Any]] = []
        seen_years: set[int] = set()
        for row in self._rows:
            year = _astronomical_year(row[0])
            if year in seen_years:
                raise ValidationError(f"Duplicate historical population year: {row[0]}")
            seen_years.add(year)
            lower = _millions(row[1])
            upper = _millions(row[2])
            if lower is None:
                raise ValidationError(f"Historical population row lacks summary lower value: {row[0]}")
            if upper is not None and upper < lower:
                raise ValidationError(f"Historical population range is inverted: {row[0]}")

            estimates: dict[str, dict[str, int]] = {}
            for source, (lower_index, upper_index) in _SOURCE_COLUMNS.items():
                source_lower = _millions(row[lower_index])
                source_upper = _millions(row[upper_index]) if upper_index is not None else None
                if source_lower is not None:
                    estimate = {"lower": source_lower}
                    if source_upper is not None:
                        estimate["upper"] = source_upper
                    estimates[source] = estimate

            observations.append(
                {
                    "year": year,
                    "source_year_label": row[0].replace("BC", "BCE").replace("AD", "CE"),
                    "lower": lower,
                    "upper": upper,
                    "status": "source_disagreement_range" if upper is not None else "point_estimate",
                    "source_method": "historical_estimate_compilation",
                    "statistical_support": "world",
                    "estimates": estimates,
                    "original_record_locator": f'U.S. Census historical world population table / row "{row[0]}"',
                }
            )
        return sorted(observations, key=lambda observation: observation["year"])

    def profile(self) -> dict[str, Any]:
        observations = self.observations()
        return {
            "rows": len(observations),
            "first_year": observations[0]["source_year_label"],
            "last_year": observations[-1]["source_year_label"],
            "range_rows": sum(observation["upper"] is not None for observation in observations),
            "named_estimate_series": sorted(_SOURCE_COLUMNS),
        }
