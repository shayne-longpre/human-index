"""Profile the pinned CShapes 2.0 Gleditsch-Ward GeoJSON for comparison use."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import date
from pathlib import Path
from typing import Any

from shapely.geometry import shape


SOURCE_URL = "https://icr.ethz.ch/data/cshapes/CShapes-2.0.geojson"
CODEBOOK_URL = "https://icr.ethz.ch/data/cshapes/CShapes-2.0_Codebook.pdf"
LICENSE = "CC BY-NC-SA 4.0"
EXPECTED_FIELDS = {
    "cntry_name", "area", "capname", "caplong", "caplat", "gwcode",
    "gwsdate", "gwsyear", "gwsmonth", "gwsday", "gwedate", "gweyear",
    "gwemonth", "gweday", "cap_geom",
}


def row_date(properties: dict[str, Any], prefix: str) -> date:
    return date(
        int(properties[f"gw{prefix}year"]),
        int(properties[f"gw{prefix}month"]),
        int(properties[f"gw{prefix}day"]),
    )


def build_profile(input_path: Path, codebook_path: Path) -> dict[str, Any]:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    features = payload.get("features", [])
    fields = {key for feature in features for key in feature.get("properties", {})}
    if not features or not EXPECTED_FIELDS.issubset(fields):
        raise ValueError("CShapes artifact is empty or lacks expected Gleditsch-Ward fields")

    starts: list[date] = []
    ends: list[date] = []
    geometry_types: Counter[str] = Counter()
    codes: set[int] = set()
    names: set[str] = set()
    invalid_geometries = 0
    nonpositive_source_areas = 0
    inverted_periods = 0
    periods: list[tuple[date, date, int]] = []
    for feature in features:
        properties = feature["properties"]
        start = row_date(properties, "s")
        end = row_date(properties, "e")
        starts.append(start)
        ends.append(end)
        periods.append((start, end, int(properties["gwcode"])))
        codes.add(int(properties["gwcode"]))
        names.add(str(properties["cntry_name"]))
        geometry = shape(feature["geometry"])
        geometry_types[geometry.geom_type] += 1
        invalid_geometries += not geometry.is_valid
        nonpositive_source_areas += float(properties["area"]) <= 0
        inverted_periods += start > end

    snapshots = []
    for year in (1886, 1900, 1950, 2000, 2019):
        requested = date(year, 1, 1)
        active = [(code, start, end) for start, end, code in periods if start <= requested <= end]
        snapshots.append(
            {
                "date": requested.isoformat(),
                "active_features": len(active),
                "active_gw_codes": len({code for code, _, _ in active}),
            }
        )

    return {
        "schema_version": "0.1.0",
        "review_status": "acquired_profiled_comparison_only_not_published",
        "source": {
            "id": "cshapes-2.0-gleditsch-ward",
            "url": SOURCE_URL,
            "codebook_url": CODEBOOK_URL,
            "license": LICENSE,
            "coding_universe": "Gleditsch-Ward",
        },
        "artifacts": {
            "geojson": {
                "filename": input_path.name,
                "bytes": input_path.stat().st_size,
                "sha256": hashlib.sha256(input_path.read_bytes()).hexdigest(),
            },
            "codebook": {
                "filename": codebook_path.name,
                "bytes": codebook_path.stat().st_size,
                "sha256": hashlib.sha256(codebook_path.read_bytes()).hexdigest(),
            },
        },
        "profile": {
            "features": len(features),
            "fields": sorted(fields),
            "unique_gw_codes": len(codes),
            "unique_names": len(names),
            "start_date": min(starts).isoformat(),
            "end_date": max(ends).isoformat(),
            "geometry_types": dict(sorted(geometry_types.items())),
            "invalid_geometries": invalid_geometries,
            "nonpositive_source_areas": nonpositive_source_areas,
            "inverted_periods": inverted_periods,
            "snapshot_spike": snapshots,
        },
        "publication_blockers": [
            "confirm_product_use_is_compatible_with_noncommercial_sharealike_terms_or_obtain_permission",
            "repair_or_explicitly_exclude_11_invalid_geometries_with_recorded_provenance",
            "audit_dates_names_and_undefined_borders_against_the_codebook_and_cited_sources",
            "the_downloaded_GeoJSON_omits_status_ruledby_border_definition_and_feature_ids_described_in_the_codebook",
            "compare_1886_2019_coverage_and_overlaps_with_Cliopatria_before_any_layer_precedence_decision",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--codebook", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    profile = build_profile(args.input, args.codebook)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(profile, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
