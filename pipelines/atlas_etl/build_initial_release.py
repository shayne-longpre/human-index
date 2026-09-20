"""Build the first genuine-data Atlas release from immutable raw inputs.

This command does not fetch from the network. Acquisition is intentionally a
separate, explicit action. Raw World Bank responses and pinned Natural Earth
geometry are supplied as paths, hashed, validated, and reduced to small static
artifacts for the browser.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


ELECTRICITY_INDICATOR = "EG.ELC.ACCS.ZS"
POPULATION_INDICATOR = "SP.POP.TOTL"
YEAR = 2024
RETRIEVED_ON = "2026-09-19"
WORLD_BANK_LAST_UPDATED = "2026-07-13"
NATURAL_EARTH_VERSION = "v5.1.2"

INPUT_URLS = {
    "world_bank_electricity": (
        "https://api.worldbank.org/v2/country/all/indicator/"
        "EG.ELC.ACCS.ZS?format=json&date=2000:2025&per_page=20000"
    ),
    "world_bank_population": (
        "https://api.worldbank.org/v2/country/all/indicator/"
        "SP.POP.TOTL?format=json&date=2000:2025&per_page=20000"
    ),
    "world_bank_countries": (
        "https://api.worldbank.org/v2/country?format=json&per_page=500"
    ),
    "natural_earth_admin_0": (
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
        "v5.1.2/geojson/ne_110m_admin_0_countries.geojson"
    ),
}

# Natural Earth uses KOS/KSV while the World Bank API uses XKX. This is an
# explicit display-geometry crosswalk, not a name-based statistical join.
DISPLAY_CROSSWALKS = {
    "KOS": {
        "world_bank_code": "XKX",
        "reason": "Natural Earth v5.1.2 ADM0_A3 KOS to World Bank economy XKX",
        "review_status": "explicit_release_specific_crosswalk",
    }
}


class ValidationError(RuntimeError):
    """Raised when source data do not satisfy the release contract."""


@dataclass(frozen=True)
class InputArtifact:
    key: str
    path: Path
    url: str

    def lock_record(self) -> dict[str, Any]:
        payload = self.path.read_bytes()
        return {
            "id": self.key,
            "url": self.url,
            "retrieved_on": RETRIEVED_ON,
            "bytes": len(payload),
            "sha256": hashlib.sha256(payload).hexdigest(),
        }


def _load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        handle.write("\n")


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _load_api_rows(path: Path, expected_total: int | None = None) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    payload = _load_json(path)
    if not isinstance(payload, list) or len(payload) != 2:
        raise ValidationError(f"{path} is not a two-part World Bank API response")
    metadata, rows = payload
    if metadata.get("page") != 1 or metadata.get("pages") != 1:
        raise ValidationError(f"{path} is not a complete single-page acquisition")
    if metadata.get("total") != len(rows):
        raise ValidationError(f"{path} metadata total does not equal row count")
    if expected_total is not None and len(rows) != expected_total:
        raise ValidationError(f"{path} row count changed: expected {expected_total}, got {len(rows)}")
    return metadata, rows


def _index_indicator(
    rows: Iterable[dict[str, Any]], indicator: str, valid_codes: set[str]
) -> dict[str, dict[str, Any]]:
    indexed: dict[str, dict[str, Any]] = {}
    for row in rows:
        if row.get("indicator", {}).get("id") != indicator:
            raise ValidationError(f"Unexpected indicator in {indicator} response")
        if row.get("date") != str(YEAR):
            continue
        code = row.get("countryiso3code")
        if code not in valid_codes:
            continue
        if code in indexed:
            raise ValidationError(f"Duplicate {indicator} row for {code}/{YEAR}")
        indexed[code] = row
    return indexed


def _geometry_code(properties: dict[str, Any], valid_codes: set[str]) -> str | None:
    for key in ("WB_A3", "ADM0_A3", "ISO_A3", "SOV_A3", "GU_A3", "SU_A3"):
        candidate = properties.get(key)
        if candidate in valid_codes:
            return candidate
        if candidate in DISPLAY_CROSSWALKS:
            mapped = DISPLAY_CROSSWALKS[candidate]["world_bank_code"]
            if mapped in valid_codes:
                return mapped
    return None


def _csv_bytes(rows: list[dict[str, Any]]) -> bytes:
    fields = [
        "code",
        "name",
        "region",
        "income_group",
        "year",
        "population",
        "electricity_access_percent",
        "electricity_status",
        "map_status",
    ]
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=fields, lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({field: row[field] for field in fields})
    return output.getvalue().encode("utf-8")


def build(args: argparse.Namespace) -> None:
    inputs = {
        "world_bank_electricity": InputArtifact(
            "world_bank_electricity", args.electricity, INPUT_URLS["world_bank_electricity"]
        ),
        "world_bank_population": InputArtifact(
            "world_bank_population", args.population, INPUT_URLS["world_bank_population"]
        ),
        "world_bank_countries": InputArtifact(
            "world_bank_countries", args.countries, INPUT_URLS["world_bank_countries"]
        ),
        "natural_earth_admin_0": InputArtifact(
            "natural_earth_admin_0", args.geometry, INPUT_URLS["natural_earth_admin_0"]
        ),
    }
    for artifact in inputs.values():
        if not artifact.path.is_file():
            raise ValidationError(f"Missing input artifact: {artifact.path}")

    electricity_meta, electricity_rows = _load_api_rows(args.electricity, 6890)
    population_meta, population_rows = _load_api_rows(args.population, 6890)
    _, country_rows = _load_api_rows(args.countries, 295)
    if electricity_meta.get("lastupdated") != WORLD_BANK_LAST_UPDATED:
        raise ValidationError("Electricity source update date differs from the audited retrieval")
    if population_meta.get("lastupdated") != WORLD_BANK_LAST_UPDATED:
        raise ValidationError("Population source update date differs from the audited retrieval")

    metadata = {row["id"]: row for row in country_rows}
    # World Bank identifies API aggregates with the NA/"Aggregates" region.
    country_codes = {
        code
        for code, row in metadata.items()
        if row.get("region", {}).get("id") != "NA"
        and row.get("region", {}).get("value") != "Aggregates"
    }
    if len(country_codes) != 217:
        raise ValidationError(f"Expected 217 nonaggregate entities, got {len(country_codes)}")

    electricity = _index_indicator(electricity_rows, ELECTRICITY_INDICATOR, country_codes)
    population = _index_indicator(population_rows, POPULATION_INDICATOR, country_codes)
    if set(population) != country_codes:
        raise ValidationError("Every audited entity must have a 2024 population row")

    geometries = _load_json(args.geometry)
    if geometries.get("type") != "FeatureCollection" or len(geometries.get("features", [])) != 177:
        raise ValidationError("Natural Earth input is not the audited 177-feature collection")

    matched_features: dict[str, dict[str, Any]] = {}
    for feature in geometries["features"]:
        code = _geometry_code(feature.get("properties", {}), country_codes)
        if code is None:
            continue
        if code in matched_features:
            raise ValidationError(f"Multiple display geometries resolve to World Bank code {code}")
        matched_features[code] = feature

    rows: list[dict[str, Any]] = []
    for code in sorted(country_codes):
        pop_row = population[code]
        population_value = pop_row.get("value")
        if not isinstance(population_value, (int, float)) or population_value < 0:
            raise ValidationError(f"Invalid population for {code}")
        rate_row = electricity.get(code)
        rate = None if rate_row is None else rate_row.get("value")
        if rate is not None and (not isinstance(rate, (int, float)) or not 0 <= rate <= 100):
            raise ValidationError(f"Electricity access outside [0,100] for {code}: {rate}")
        country = metadata[code]
        rows.append(
            {
                "code": code,
                "name": country["name"],
                "region": country["region"]["value"],
                "income_group": country["incomeLevel"]["value"],
                "year": YEAR,
                "population": population_value,
                "electricity_access_percent": rate,
                "electricity_status": "known" if rate is not None else "unknown",
                "map_status": "placed" if code in matched_features else "unplaced",
                "support_type": "world_bank_country_or_territory_year",
                "electricity_record_locator": (
                    f"World Bank API {ELECTRICITY_INDICATOR}/{code}/{YEAR}"
                ),
                "population_record_locator": (
                    f"World Bank API {POPULATION_INDICATOR}/{code}/{YEAR}"
                ),
            }
        )

    map_features: list[dict[str, Any]] = []
    row_by_code = {row["code"]: row for row in rows}
    for code in sorted(matched_features):
        feature = matched_features[code]
        row = row_by_code[code]
        map_features.append(
            {
                "type": "Feature",
                "id": code,
                "properties": {
                    "code": code,
                    "name": row["name"],
                    "population": row["population"],
                    "electricity_access_percent": row["electricity_access_percent"],
                    "electricity_status": row["electricity_status"],
                },
                "geometry": feature["geometry"],
            }
        )

    population_total = sum(row["population"] for row in rows)
    known_rows = [row for row in rows if row["electricity_access_percent"] is not None]
    with_access = sum(
        row["population"] * row["electricity_access_percent"] / 100 for row in known_rows
    )
    without_access = sum(
        row["population"] * (1 - row["electricity_access_percent"] / 100)
        for row in known_rows
    )
    unknown = sum(
        row["population"] for row in rows if row["electricity_access_percent"] is None
    )
    unplaced = sum(row["population"] for row in rows if row["map_status"] == "unplaced")
    if abs((with_access + without_access + unknown) - population_total) > 1e-5:
        raise ValidationError("Prevalence accounting does not conserve population")

    args.output.mkdir(parents=True, exist_ok=True)
    data_path = args.output / "data.json"
    geometry_path = args.output / "countries.geojson"
    csv_path = args.output / "view.csv"
    _write_json(
        data_path,
        {
            "schema_version": "0.1.0",
            "metric_id": "access_to_electricity",
            "effective_year": YEAR,
            "rows": rows,
        },
    )
    _write_json(geometry_path, {"type": "FeatureCollection", "features": map_features})
    csv_path.write_bytes(_csv_bytes(rows))

    input_locks = [artifact.lock_record() for artifact in inputs.values()]
    lock = {
        "schema_version": "0.1.0",
        "status": "acquired_release_lock",
        "retrieved_on": RETRIEVED_ON,
        "sources": [
            {
                **record,
                "license": (
                    "CC-BY-4.0" if record["id"].startswith("world_bank") else "public-domain"
                ),
            }
            for record in input_locks
        ],
    }
    _write_json(args.lockfile, lock)

    manifest = {
        "schema_version": "0.1.0",
        "release_id": "world-bank-electricity-2024-r1",
        "status": "genuine_data_development_release",
        "published_on": RETRIEVED_ON,
        "requested_year": YEAR,
        "effective_year": YEAR,
        "metric": {
            "id": "access_to_electricity",
            "indicator": ELECTRICITY_INDICATOR,
            "aggregation_kind": "person_prevalence",
            "unit": "percent of population",
            "support": "World Bank country or territory estimate",
            "prohibited_interpretation": "local household measurement",
        },
        "population": {
            "indicator": POPULATION_INDICATOR,
            "universe": "World Bank nonaggregate country/territory entities with 2024 population",
            "scope_label": "covered population",
        },
        "summary_validation": {
            "entities": len(rows),
            "known_condition_entities": len(known_rows),
            "population": population_total,
            "with_access": with_access,
            "without_access": without_access,
            "unknown_condition": unknown,
            "map_features": len(map_features),
            "unplaced_population": unplaced,
            "tolerance_people": 1e-5,
        },
        "display_geometry": {
            "source": "Natural Earth admin 0 countries",
            "version": NATURAL_EARTH_VERSION,
            "scale": "1:110m",
            "purpose": "display_only_not_population_accounting",
            "crosswalks": DISPLAY_CROSSWALKS,
        },
        "artifacts": {
            "data.json": {"sha256": _sha256(data_path), "bytes": data_path.stat().st_size},
            "countries.geojson": {
                "sha256": _sha256(geometry_path),
                "bytes": geometry_path.stat().st_size,
            },
            "view.csv": {"sha256": _sha256(csv_path), "bytes": csv_path.stat().st_size},
        },
        "citations": [
            {
                "label": "World Bank, Access to electricity (% of population)",
                "url": "https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS",
                "license": "CC BY 4.0",
            },
            {
                "label": "World Bank, Population, total",
                "url": "https://data.worldbank.org/indicator/SP.POP.TOTL",
                "license": "CC BY 4.0",
            },
            {
                "label": "Natural Earth vector v5.1.2",
                "url": "https://github.com/nvkelso/natural-earth-vector/releases/tag/v5.1.2",
                "license": "Public domain",
            },
        ],
        "limitations": [
            "Country/territory rates are contextual national estimates, not local household observations.",
            "The covered population universe has not yet passed full parent/territory reconciliation.",
            "The 1:110m display geometry omits some small territories; their population remains in the summary.",
        ],
    }
    _write_json(args.output / "manifest.json", manifest)

    print(
        json.dumps(
            {
                "release_id": manifest["release_id"],
                "entities": len(rows),
                "map_features": len(map_features),
                "population": population_total,
                "with_access": with_access,
                "without_access": without_access,
                "unknown_condition": unknown,
                "unplaced_population": unplaced,
            },
            indent=2,
        )
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--electricity", type=Path, required=True)
    parser.add_argument("--population", type=Path, required=True)
    parser.add_argument("--countries", type=Path, required=True)
    parser.add_argument("--geometry", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--lockfile", type=Path, required=True)
    return parser.parse_args()


if __name__ == "__main__":
    build(parse_args())
