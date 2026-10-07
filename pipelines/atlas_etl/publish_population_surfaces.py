"""Create a new immutable Atlas release with validated population grid snapshots."""

from __future__ import annotations

import argparse
import json
import shutil
import tempfile
from pathlib import Path

from .acquire_population_surfaces import sha256, source_url
from .catalog import validate_release_manifest
from .core import artifact_record, write_json
from .population_surface import SOURCE_IDS


RELEASE_ID = "atlas-mvp-2026-10-06-r8"
PUBLISHABLE_SOURCES = {"ghsl"}  # WorldPop derivative terms and complete raster audit remain open.
SOURCE_METADATA = {
    "ghsl": {
        "publisher": "European Commission Joint Research Centre, Global Human Settlement Layer",
        "license": "CC BY 4.0",
        "citation_url": "https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php",
        "citation_label": "European Commission JRC, GHS-POP R2023A",
    },
    "worldpop": {
        "publisher": "WorldPop, University of Southampton",
        "license": "CC BY 4.0; verify ODbL applicability for derivative reuse",
        "citation_url": "https://hub.worldpop.org/doi/10.5258/SOTON/WP00845",
        "citation_label": "WorldPop Global2 R2025A v1",
    },
}


def publish(base: Path, derived: Path, output: Path, raw: Path, source_lock: Path) -> dict:
    if output.exists():
        raise ValueError(f"Refusing to overwrite an existing release: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    source_manifest = json.loads((base / "manifest.json").read_text())
    snapshots = []
    sources_seen: set[str] = set()
    outputs: dict[str, dict] = {}
    inputs = set()
    processed = sorted(derived.glob("*.json"))
    if not processed:
        raise ValueError("No validated population surface snapshots found")
    for path in processed:
        payload = json.loads(path.read_text())
        source, year_text = path.stem.rsplit("-", 1)
        year = int(year_text)
        if source not in PUBLISHABLE_SOURCES:
            raise ValueError(f"Publication gate remains open for {source}; keep it in a separate review directory")
        if source not in SOURCE_IDS or payload["source_release_id"] != SOURCE_IDS[source] or payload["source_year"] != year:
            raise ValueError(f"Inconsistent source or year in {path}")
        if payload["transformation"]["version"] != "1.0.0":
            raise ValueError(f"Unknown transformation version in {path}")
        _, relative_path = source_url(source, year)
        source_path = raw / relative_path
        if not source_path.exists() or sha256(source_path) != payload["source_artifact"]["sha256"]:
            raise ValueError(f"Source artifact missing or changed for {path}")
        csv_path = path.with_suffix(".csv")
        if not csv_path.exists():
            raise ValueError(f"Missing CSV for {path}")
        bins = payload["cells"]
        if len(bins) != payload["transformation"]["covered_bin_count"]:
            raise ValueError(f"Coverage count mismatch in {path}")
        if len({(col, row) for col, row, _ in bins}) != len(bins):
            raise ValueError(f"Duplicate grid cell in {path}")
        total = sum(count for _, _, count in bins)
        audit = payload["transformation"]
        if abs(total - audit["published_bin_total_people"]) > 0.002:
            raise ValueError(f"Published population sum mismatch in {path}")
        if abs(audit["source_total_people"] - total - audit["unassigned_outside_grid_people"]) > 0.002:
            raise ValueError(f"Population mass is not conserved in {path}")
        input_id = f"{source}_{year}_raster"
        inputs.add(input_id)
        sources_seen.add(source)
        snapshots.append({
            "source_release_id": SOURCE_IDS[source],
            "year": year,
            "evidence_state": "projection" if source == "ghsl" and year >= 2025 else "modeled_estimate",
            "data_file": f"population-surfaces/{path.name}",
            "download_file": f"population-surfaces/{csv_path.name}",
            "source_artifact_id": input_id,
            "source_artifact_sha256": payload["source_artifact"]["sha256"],
            "source_total_people": audit["source_total_people"],
            "published_bin_total_people": audit["published_bin_total_people"],
            "unassigned_outside_grid_people": audit["unassigned_outside_grid_people"],
            "covered_bin_count": audit["covered_bin_count"],
        })
    staging_parent = Path(tempfile.mkdtemp(prefix=".atlas-population-stage-", dir=output.parent))
    staged_output = staging_parent / RELEASE_ID
    shutil.copytree(base, staged_output)
    surface_dir = staged_output / "population-surfaces"
    surface_dir.mkdir()
    for path in processed:
        for source_path in (path, path.with_suffix(".csv")):
            target = surface_dir / source_path.name
            shutil.copyfile(source_path, target)
            key = target.relative_to(staged_output).as_posix()
            outputs[key] = artifact_record(target)
    manifest = source_manifest
    manifest["release_id"] = RELEASE_ID
    manifest["published_on"] = "2026-10-06"
    manifest["default_view"] = {"metric_id": "population_total", "year": 2020}
    manifest["population_surfaces"] = {
        "grid_degrees": 1,
        "selection_policy": "exact_source_year_only_no_splice_or_interpolation",
        "default_source_release_id": SOURCE_IDS["ghsl"] if "ghsl" in sources_seen else SOURCE_IDS[sorted(sources_seen)[0]],
        "snapshots": snapshots,
        "interpretation": "Source-native modeled counts rebinned by source-pixel centre. Grid columns are display markers, not cell footprints or political population assignments.",
    }
    for source in sorted(sources_seen):
        metadata = SOURCE_METADATA[source]
        manifest["source_releases"].append({
            "id": SOURCE_IDS[source],
            "publisher": metadata["publisher"],
            "retrieved_on": "2026-10-06",
            "license": metadata["license"],
            "profile": {
                "published_years": [snapshot["year"] for snapshot in snapshots if snapshot["source_release_id"] == SOURCE_IDS[source]],
                "published_support": "source raster cells, one-degree display aggregation",
                "country_or_polity_join": "none",
            },
        })
        manifest["citations"].append({
            "label": metadata["citation_label"],
            "url": metadata["citation_url"],
            "license": metadata["license"],
        })
    manifest["artifacts"].update(outputs)
    manifest["transformations"].append({
        "id": "population-raster-centre-bin-v1",
        "version": "1.0.0",
        "input_artifact_ids": sorted(inputs),
        "parameters": {
            "grid_degrees": 1,
            "pixel_assignment": "source_pixel_centre",
            "coordinate_transform": "pyproj source CRS to EPSG:4326",
            "aggregation": "sum_counts_only_with_coverage_mask",
            "temporal_policy": "exact_source_year_only",
            "political_allocation": "none",
            "source_inputs": {snapshot["source_artifact_id"]: snapshot["source_artifact_sha256"] for snapshot in snapshots},
        },
        "validation": {
            "snapshot_count": len(snapshots),
            "all_source_totals_equal_published_bins_plus_explicit_outside_grid_residual": True,
            "no_cross_source_merging": True,
        },
        "output_artifacts": outputs,
    })
    manifest["limitations"] = [
        limitation for limitation in manifest["limitations"]
        if not limitation.startswith("Population color represents a territorial total")
    ] + [
        "Country color still represents a territorial total; when selected, grid columns separately show source-native modeled population per one-degree bin.",
        "Grid bins are aggregated by source-pixel centre and are not exact one-degree footprints or borders. No grid population is allocated to political entities.",
        "GHSL starts in 1975; this release does not spatialize earlier global population estimates. WorldPop is a separate source, not a replacement or splice.",
    ]
    original_ids = {item["id"] for item in json.loads(source_lock.read_text())["sources"]}
    validate_release_manifest(manifest, original_ids | {"atlas_reconciliation_decisions_v1"} | inputs)
    write_json(staged_output / "manifest.json", manifest)
    staged_output.replace(output)
    staging_parent.rmdir()
    return {"release_id": RELEASE_ID, "snapshots": len(snapshots), "sources": sorted(sources_seen)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, required=True)
    parser.add_argument("--derived", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--raw", type=Path, default=Path("data/raw"))
    parser.add_argument("--source-lock", type=Path, default=Path("data/registry/source-lock.json"))
    args = parser.parse_args()
    print(json.dumps(publish(args.base, args.derived, args.output, args.raw, args.source_lock)))


if __name__ == "__main__":
    main()
