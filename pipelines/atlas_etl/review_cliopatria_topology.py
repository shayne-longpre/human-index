"""Run a bounded, reproducible topology-candidate audit on Cliopatria.

The output identifies geometric overlap for historian review. It does not infer
that overlap is erroneous, establish sovereignty, or authorize demographic
allocation to the source polygons.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from pyproj import Transformer
from shapely import make_valid
from shapely.geometry import box, shape
from shapely.ops import transform
from shapely.strtree import STRtree


def build_review(
    input_path: Path,
    year: int,
    bbox: tuple[float, float, float, float],
    minimum_overlap_km2: float,
) -> dict[str, Any]:
    source = json.loads(input_path.read_text(encoding="utf-8"))
    pilot_extent = box(*bbox)
    projector = Transformer.from_crs("EPSG:4326", "EPSG:6933", always_xy=True).transform
    features: list[dict[str, Any]] = []
    geometries = []
    invalid_source_geometries = 0
    repaired_geometries = 0

    for source_index, feature in enumerate(source["features"]):
        properties = feature["properties"]
        if properties.get("Type") != "POLITY":
            continue
        if not (properties["FromYear"] <= year <= properties["ToYear"]):
            continue
        geometry = shape(feature["geometry"])
        min_x, min_y, max_x, max_y = geometry.bounds
        if max_x < bbox[0] or min_x > bbox[2] or max_y < bbox[1] or min_y > bbox[3]:
            continue
        source_valid = geometry.is_valid
        if not source_valid:
            geometry = make_valid(geometry)
        if not geometry.intersects(pilot_extent):
            continue
        if not source_valid:
            invalid_source_geometries += 1
            repaired_geometries += 1
        clipped = geometry.intersection(pilot_extent)
        if clipped.is_empty:
            continue
        projected = transform(projector, clipped)
        geometries.append(projected)
        features.append(
            {
                "source_feature_index": source_index,
                "name": properties["Name"],
                "from_year": properties["FromYear"],
                "to_year": properties["ToYear"],
                "wikidata": properties.get("Wikidata") or None,
                "source_geometry_valid": source_valid,
                "clipped_area_km2": projected.area / 1_000_000,
            }
        )

    tree = STRtree(geometries)
    overlaps: list[dict[str, Any]] = []
    for left_index, left_geometry in enumerate(geometries):
        for right_index in tree.query(left_geometry, predicate="intersects"):
            right_index = int(right_index)
            if right_index <= left_index:
                continue
            intersection = left_geometry.intersection(geometries[right_index])
            overlap_km2 = intersection.area / 1_000_000
            if overlap_km2 < minimum_overlap_km2:
                continue
            smaller_area = min(left_geometry.area, geometries[right_index].area) / 1_000_000
            ratio = overlap_km2 / smaller_area if smaller_area else 0
            classification = (
                "near_containment_candidate"
                if ratio >= 0.9
                else "material_overlap_candidate"
                if ratio >= 0.1
                else "small_overlap_candidate"
            )
            overlaps.append(
                {
                    "left_source_feature_index": features[left_index]["source_feature_index"],
                    "left_name": features[left_index]["name"],
                    "right_source_feature_index": features[right_index]["source_feature_index"],
                    "right_name": features[right_index]["name"],
                    "overlap_km2": round(overlap_km2, 3),
                    "overlap_share_of_smaller_geometry": round(ratio, 6),
                    "classification": classification,
                    "review_status": "automated_candidate_historian_review_outstanding",
                }
            )

    overlaps.sort(key=lambda row: (-row["overlap_km2"], row["left_name"], row["right_name"]))
    return {
        "schema_version": "0.1.0",
        "review_status": "bounded_automated_pilot_complete_historian_review_outstanding",
        "source": {
            "id": "cliopatria-v0.2.0",
            "filename": input_path.name,
            "sha256": hashlib.sha256(input_path.read_bytes()).hexdigest(),
        },
        "pilot": {
            "requested_source_year": year,
            "bbox_wgs84": list(bbox),
            "region_label": "Mediterranean and adjacent lands pilot",
            "equal_area_crs": "EPSG:6933",
            "minimum_reported_overlap_km2": minimum_overlap_km2,
            "scope_warning": (
                "Results cover one bounded year and region. Geometric overlap can represent "
                "source intent, hierarchy, disputed alternatives, or a geometry problem."
            ),
        },
        "summary": {
            "active_intersecting_polity_features": len(features),
            "invalid_source_geometries": invalid_source_geometries,
            "geometries_repaired_for_measurement": repaired_geometries,
            "reported_overlap_candidates": len(overlaps),
            "near_containment_candidates": sum(
                row["classification"] == "near_containment_candidate" for row in overlaps
            ),
            "material_overlap_candidates": sum(
                row["classification"] == "material_overlap_candidate" for row in overlaps
            ),
        },
        "features": features,
        "overlap_candidates": overlaps,
        "publication_gate": (
            "No topology candidate is resolved and no polygon becomes statistical support "
            "without source-aware historical review and an explicit allocation contract."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--year", type=int, default=1500)
    parser.add_argument("--bbox", type=float, nargs=4, default=(-12, 20, 45, 50))
    parser.add_argument("--minimum-overlap-km2", type=float, default=100.0)
    args = parser.parse_args()
    review = build_review(args.input, args.year, tuple(args.bbox), args.minimum_overlap_km2)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(review, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
