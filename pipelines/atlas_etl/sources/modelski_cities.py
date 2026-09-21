"""Validated adapter for the pinned Modelski ancient-city population table."""

from __future__ import annotations

import csv
import hashlib
from pathlib import Path
from typing import Any

from ..core import ValidationError, load_json


SOURCE_ID = "reba-modelski-ancient-v2"
SOURCE_ARTICLE_URL = "https://doi.org/10.1038/sdata.2016.34"
SOURCE_DATA_URL = "https://doi.org/10.6084/m9.figshare.2059497.v2"
SOURCE_DOWNLOAD_URL = "https://ndownloader.figshare.com/files/5356132"
SOURCE_FILE_ID = 5356132
SOURCE_FILE_SHA256 = "71beafaacbdeb8d8fc156951521e9a14e20d6704b0d77be5528511c52fad3e1d"


def _atlas_year(column: str) -> int:
    era, value = column.split("_", maxsplit=1)
    year = int(value)
    if year < 1:
        raise ValidationError(f"Invalid Modelski date column: {column}")
    if era == "BC":
        return 1 - year
    if era == "AD":
        return year
    raise ValidationError(f"Unsupported Modelski date column: {column}")


class ModelskiAncientCitiesAdapter:
    """Publish source values as sparse exact-date city points, without interpolation."""

    def __init__(self, data_path: Path, metadata_path: Path) -> None:
        metadata = load_json(metadata_path)
        if metadata.get("id") != 2059497 or metadata.get("version") != 2:
            raise ValidationError("Unexpected Figshare article/version for Modelski ancient cities")
        if metadata.get("license", {}).get("name") != "CC BY 4.0":
            raise ValidationError("Modelski ancient-city artifact is not marked CC BY 4.0")
        files = {entry.get("id"): entry for entry in metadata.get("files", [])}
        expected = files.get(SOURCE_FILE_ID)
        if expected is None or expected.get("name") != "modelskiAncientV2.csv":
            raise ValidationError("Pinned Modelski V2 CSV is absent from Figshare metadata")
        payload_hash = hashlib.sha256(data_path.read_bytes()).hexdigest()
        if payload_hash != SOURCE_FILE_SHA256:
            raise ValidationError("Modelski ancient-city CSV checksum differs from the audited file")

        with data_path.open(encoding="cp1252", newline="") as handle:
            reader = csv.DictReader(handle)
            self._fieldnames = reader.fieldnames or []
            self._rows = list(reader)
        self._year_columns = [field for field in self._fieldnames if field.startswith(("BC_", "AD_"))]
        self._years = sorted(_atlas_year(field) for field in self._year_columns)
        self._column_by_year = {_atlas_year(field): field for field in self._year_columns}
        self._validate()

    def _validate(self) -> None:
        required = {"City", "OtherName", "Country", "Latitude", "Longitude", "Certainty"}
        if not required.issubset(self._fieldnames):
            raise ValidationError("Modelski ancient-city CSV lacks required identity fields")
        if len(self._rows) != 154:
            raise ValidationError(f"Expected 154 Modelski city rows, got {len(self._rows)}")
        if self._years[0] != -3699 or self._years[-1] != 1000 or len(self._years) != 41:
            raise ValidationError("Unexpected Modelski ancient-city temporal support")
        identities: set[tuple[str, str, str]] = set()
        observations = 0
        for row in self._rows:
            identity = (row["City"].strip(), row["Latitude"], row["Longitude"])
            if not identity[0] or identity in identities:
                raise ValidationError(f"Missing or duplicate Modelski city identity: {identity}")
            identities.add(identity)
            latitude = float(row["Latitude"])
            longitude = float(row["Longitude"])
            if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
                raise ValidationError(f"Invalid Modelski coordinates for {identity[0]}")
            if row["Certainty"] not in {"1", "2", "3"}:
                raise ValidationError(f"Unexpected Modelski certainty code for {identity[0]}")
            for column in self._year_columns:
                raw = row[column].strip()
                if not raw:
                    continue
                value = int(raw)
                if value <= 0:
                    raise ValidationError(f"Nonpositive Modelski population for {identity[0]}/{column}")
                observations += 1
        if observations != 621:
            raise ValidationError(f"Expected 621 Modelski observations, got {observations}")

    @staticmethod
    def _city_id(row: dict[str, str]) -> str:
        identity = "|".join((row["City"].strip(), row["Latitude"], row["Longitude"]))
        return f"modelski-{hashlib.sha256(identity.encode('utf-8')).hexdigest()[:12]}"

    def dataset(self) -> dict[str, Any]:
        cities: list[dict[str, Any]] = []
        observations: list[dict[str, Any]] = []
        for row in self._rows:
            city_id = self._city_id(row)
            city_name = row["City"].strip()
            cities.append(
                {
                    "id": city_id,
                    "name": city_name,
                    "other_name": row["OtherName"].strip() or None,
                    "modern_country_label": row["Country"].strip(),
                    "latitude": float(row["Latitude"]),
                    "longitude": float(row["Longitude"]),
                    "geocode_certainty_code": row["Certainty"],
                }
            )
            for year in self._years:
                column = self._column_by_year[year]
                raw = row[column].strip()
                if raw:
                    observations.append(
                        {
                            "city_id": city_id,
                            "year": year,
                            "population": int(raw),
                            "status": "published_estimate",
                            "original_record_locator": f'Modelski Ancient V2 / row "{city_name}" / column "{column}"',
                        }
                    )
        return {
            "schema_version": "0.4.0",
            "layer_id": "historical_city_population_points",
            "source_release_id": SOURCE_ID,
            "temporal_policy": "exact_only",
            "spatial_support": "source_geocoded_city_point_not_extent",
            "years": self._years,
            "cities": cities,
            "observations": observations,
        }

    def profile(self) -> dict[str, Any]:
        dataset = self.dataset()
        by_year = {
            str(year): sum(observation["year"] == year for observation in dataset["observations"])
            for year in self._years
        }
        return {
            "cities": len(dataset["cities"]),
            "observations": len(dataset["observations"]),
            "years": self._years,
            "observations_by_year": by_year,
            "geocode_certainty_code_counts": {
                code: sum(city["geocode_certainty_code"] == code for city in dataset["cities"])
                for code in ("1", "2", "3")
            },
        }
