"""Validated, display-only Cliopatria snapshot adapter.

This module deliberately does not allocate population to historical polygons.
It builds small source-native context snapshots and records simplification.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Any, Iterable

from ..core import ValidationError


SOURCE_ID = "cliopatria-v0.2.0"
SOURCE_URL = (
    "https://raw.githubusercontent.com/Seshat-Global-History-Databank/"
    "cliopatria/v0.2.0/cliopatria.geojson.zip"
)
SOURCE_LICENSE_URL = (
    "https://raw.githubusercontent.com/Seshat-Global-History-Databank/"
    "cliopatria/v0.2.0/LICENSE.md"
)

SNAPSHOT_SOURCE_YEARS = [
    -3400,
    -3000,
    -2500,
    -2000,
    -1500,
    -1000,
    -500,
    -1,
    100,
    300,
    500,
    750,
    1000,
    1200,
    1400,
    1500,
    1600,
    1700,
    1750,
    1800,
    1850,
    1900,
    1914,
    1920,
    1930,
    1940,
    1945,
    1950,
    1960,
    1970,
    1980,
    1990,
    2000,
    2010,
    2020,
    2024,
]


def source_year_to_astronomical(source_year: int) -> int:
    """Convert sampled nonzero Cliopatria years to Atlas astronomical years.

    The source archive contains zero endpoints despite its README describing
    negative BCE and positive CE years. We therefore never sample source year
    zero. Its exact interval-boundary meaning remains quarantined.
    """

    if source_year == 0:
        raise ValidationError("Cliopatria source year zero is not verified")
    return source_year + 1 if source_year < 0 else source_year


def _distance(point: list[float], start: list[float], end: list[float]) -> float:
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    if dx == 0 and dy == 0:
        return math.hypot(point[0] - start[0], point[1] - start[1])
    t = max(0.0, min(1.0, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)))
    projection = [start[0] + t * dx, start[1] + t * dy]
    return math.hypot(point[0] - projection[0], point[1] - projection[1])


def _simplify_open(points: list[list[float]], tolerance: float) -> list[list[float]]:
    if len(points) <= 2:
        return points
    furthest_index = 0
    furthest_distance = 0.0
    for index in range(1, len(points) - 1):
        distance = _distance(points[index], points[0], points[-1])
        if distance > furthest_distance:
            furthest_index = index
            furthest_distance = distance
    if furthest_distance <= tolerance:
        return [points[0], points[-1]]
    left = _simplify_open(points[: furthest_index + 1], tolerance)
    right = _simplify_open(points[furthest_index:], tolerance)
    return left[:-1] + right


def _simplify_ring(ring: list[list[float]], tolerance: float) -> list[list[float]]:
    if len(ring) < 4:
        raise ValidationError("Cliopatria polygon ring has fewer than four positions")
    rounded = [[round(float(position[0]), 4), round(float(position[1]), 4)] for position in ring]
    open_ring = rounded[:-1] if rounded[0] == rounded[-1] else rounded
    simplified = _simplify_open(open_ring + [open_ring[0]], tolerance)
    if simplified[0] != simplified[-1]:
        simplified.append(simplified[0])
    if len(simplified) < 4:
        return rounded if rounded[0] == rounded[-1] else rounded + [rounded[0]]
    return simplified


def _simplify_geometry(geometry: dict[str, Any], tolerance: float) -> dict[str, Any]:
    kind = geometry.get("type")
    coordinates = geometry.get("coordinates")
    if kind == "Polygon":
        result = [_simplify_ring(ring, tolerance) for ring in coordinates]
    elif kind == "MultiPolygon":
        result = [[_simplify_ring(ring, tolerance) for ring in polygon] for polygon in coordinates]
    else:
        raise ValidationError(f"Unsupported Cliopatria geometry type: {kind}")
    return {"type": kind, "coordinates": result}


def _exterior_rings(geometry: dict[str, Any]) -> Iterable[list[list[float]]]:
    if geometry["type"] == "Polygon":
        yield geometry["coordinates"][0]
    else:
        for polygon in geometry["coordinates"]:
            yield polygon[0]


def _ring_area_and_centroid(ring: list[list[float]]) -> tuple[float, list[float]]:
    twice_area = 0.0
    cx = 0.0
    cy = 0.0
    for start, end in zip(ring, ring[1:]):
        cross = start[0] * end[1] - end[0] * start[1]
        twice_area += cross
        cx += (start[0] + end[0]) * cross
        cy += (start[1] + end[1]) * cross
    if abs(twice_area) < 1e-12:
        xs = [position[0] for position in ring]
        ys = [position[1] for position in ring]
        return 0.0, [(min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2]
    return abs(twice_area) / 2, [cx / (3 * twice_area), cy / (3 * twice_area)]


def _label_position(geometry: dict[str, Any]) -> list[float]:
    rings = list(_exterior_rings(geometry))
    return max((_ring_area_and_centroid(ring) for ring in rings), key=lambda item: item[0])[1]


def _feature_id(properties: dict[str, Any], geometry: dict[str, Any]) -> str:
    identity = {
        "name": properties["Name"],
        "from": properties["FromYear"],
        "to": properties["ToYear"],
        "type": properties["Type"],
        "wikidata": properties.get("Wikidata") or "",
        "geometry": geometry,
    }
    digest = hashlib.sha256(
        json.dumps(identity, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return f"cliopatria-{digest[:20]}"


class CliopatriaAdapter:
    def __init__(self, path: Path) -> None:
        with path.open(encoding="utf-8") as handle:
            payload = json.load(handle)
        if payload.get("type") != "FeatureCollection" or not isinstance(payload.get("features"), list):
            raise ValidationError("Cliopatria artifact is not a GeoJSON FeatureCollection")
        self.path = path
        self._features: list[dict[str, Any]] = payload["features"]
        self._validate()

    def _validate(self) -> None:
        required = {"Name", "FromYear", "ToYear", "Area", "Type"}
        for index, feature in enumerate(self._features):
            properties = feature.get("properties") or {}
            missing = required.difference(properties)
            if missing:
                raise ValidationError(f"Cliopatria feature {index} lacks {sorted(missing)}")
            if properties["Type"] not in {"POLITY", "RELATION"}:
                raise ValidationError(f"Cliopatria feature {index} has unknown type {properties['Type']}")
            if properties["FromYear"] > properties["ToYear"]:
                raise ValidationError(f"Cliopatria feature {index} has an inverted date interval")
            if feature.get("geometry", {}).get("type") not in {"Polygon", "MultiPolygon"}:
                raise ValidationError(f"Cliopatria feature {index} has unsupported geometry")

    def profile(self) -> dict[str, Any]:
        types: dict[str, int] = {}
        for feature in self._features:
            kind = feature["properties"]["Type"]
            types[kind] = types.get(kind, 0) + 1
        return {
            "features": len(self._features),
            "types": types,
            "from_year": min(feature["properties"]["FromYear"] for feature in self._features),
            "to_year": max(feature["properties"]["ToYear"] for feature in self._features),
            "source_year_zero_endpoints": sum(
                feature["properties"]["FromYear"] == 0 or feature["properties"]["ToYear"] == 0
                for feature in self._features
            ),
        }

    def snapshot(self, source_year: int, tolerance: float = 0.08) -> dict[str, Any]:
        atlas_year = source_year_to_astronomical(source_year)
        eligible = [
            feature
            for feature in self._features
            if feature["properties"]["Type"] == "POLITY"
            and feature["properties"]["FromYear"] <= source_year <= feature["properties"]["ToYear"]
        ]
        published: list[dict[str, Any]] = []
        for feature in sorted(
            eligible, key=lambda item: float(item["properties"]["Area"]), reverse=True
        ):
            source_properties = feature["properties"]
            geometry = _simplify_geometry(feature["geometry"], tolerance)
            label = _label_position(geometry)
            source_feature_id = _feature_id(source_properties, feature["geometry"])
            published.append(
                {
                    "type": "Feature",
                    "id": source_feature_id,
                    "properties": {
                        "name": source_properties["Name"],
                        "feature_kind": "polity",
                        "source_feature_id": source_feature_id,
                        "source_release_id": SOURCE_ID,
                        "source_from_year": source_properties["FromYear"],
                        "source_to_year": source_properties["ToYear"],
                        "area_km2": round(float(source_properties["Area"]), 3),
                        "wikipedia": source_properties.get("Wikipedia") or None,
                        "wikidata": source_properties.get("Wikidata") or None,
                        "seshat_id": source_properties.get("SeshatID") or None,
                        "evidence_status": "published_contestable_reconstruction",
                        "precision_class": f"source_native_simplified_{tolerance}_degree_display",
                        "label_position": [round(label[0], 4), round(label[1], 4)],
                        "show_label": False,
                    },
                    "geometry": geometry,
                }
            )
        label_positions: list[list[float]] = []
        for feature in published:
            properties = feature["properties"]
            if len(label_positions) >= 10 or properties["area_km2"] < 20_000:
                continue
            position = properties["label_position"]
            collides = any(
                abs(position[0] - existing[0]) < 40 and abs(position[1] - existing[1]) < 13
                for existing in label_positions
            )
            if not collides:
                properties["show_label"] = True
                label_positions.append(position)
        return {
            "type": "FeatureCollection",
            "source_release_id": SOURCE_ID,
            "source_year": source_year,
            "atlas_year": atlas_year,
            "feature_count": len(published),
            "excluded_feature_types": ["RELATION"],
            "dating_status": "snapshot_year_verified; source year-zero endpoints quarantined",
            "geometry_method": f"source native with Douglas-Peucker {tolerance} degree display simplification",
            "features": published,
        }
