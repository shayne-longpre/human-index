"""Publish source-native population rasters as exact-count, one-degree map bins.

Every source pixel is assigned by its centre to one geographic bin. This is a
display aggregation, not a political allocation or an interpolated time series.
The source raster is never modified; the JSON records its hash and the small
floating-point summation residual.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import zipfile
from pathlib import Path

import numpy as np
import rasterio
from pyproj import Geod, Transformer
from rasterio.windows import Window

from .acquire_population_surfaces import source_url


TRANSFORM_VERSION = "1.0.0"
SOURCE_IDS = {"ghsl": "ghsl-ghs-pop-r2023a", "worldpop": "worldpop-global2-r2025a-v1"}
GRID_WIDTH = 360
GRID_HEIGHT = 180


def geographic_bin_areas_km2() -> list[float]:
    geod = Geod(ellps="WGS84")
    areas = []
    for row in range(GRID_HEIGHT):
        north = 90 - row
        south = north - 1
        area, _ = geod.polygon_area_perimeter([0, 1, 1, 0], [south, south, north, north])
        areas.append(abs(area) / 1_000_000)
    return areas


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def raster_uri(path: Path) -> tuple[str, str]:
    if path.suffix.lower() != ".zip":
        return str(path.resolve()), path.name
    with zipfile.ZipFile(path) as archive:
        tiffs = [name for name in archive.namelist() if name.lower().endswith(".tif")]
    if len(tiffs) != 1:
        raise ValueError(f"Expected one source TIFF in {path}, found {len(tiffs)}")
    return f"zip://{path.resolve()}!{tiffs[0]}", tiffs[0]


def aggregate_raster(path: Path, source: str, year: int) -> dict:
    if source not in SOURCE_IDS:
        raise ValueError(f"Unknown source {source}")
    uri, member = raster_uri(path)
    counts = np.zeros(GRID_HEIGHT * GRID_WIDTH, dtype=np.float64)
    coverage = np.zeros(GRID_HEIGHT * GRID_WIDTH, dtype=np.uint64)
    source_total_parts: list[float] = []
    source_positive_pixels = 0
    unassigned_pixels = 0
    unassigned_population_parts: list[float] = []

    with rasterio.open(uri) as raster:
        if raster.count != 1 or raster.crs is None or raster.nodata is None:
            raise ValueError("Expected one georeferenced band with explicit NODATA")
        if source == "ghsl" and (raster.crs.to_string() != "ESRI:54009" or raster.res[0] != 1000):
            raise ValueError("GHSL raster is not the pinned 1 km Mollweide product")
        if source == "worldpop" and raster.crs.to_epsg() != 4326:
            raise ValueError("WorldPop raster is not the expected geographic product")
        transformer = Transformer.from_crs(raster.crs, "EPSG:4326", always_xy=True)
        # Strip reads keep peak memory bounded even for global high-resolution rasters.
        for top in range(0, raster.height, 128):
            height = min(128, raster.height - top)
            block = raster.read(1, window=Window(0, top, raster.width, height))
            if not np.all(np.isfinite(block)):
                raise ValueError(f"Nonfinite source raster value in rows {top}:{top + height}")
            valid = block != raster.nodata
            if not np.any(valid):
                continue
            row, col = np.nonzero(valid)
            values = block[row, col].astype(np.float64)
            if np.any(values < 0):
                raise ValueError(f"Negative population outside NODATA in rows {top}:{top + height}")
            source_total_parts.append(float(np.sum(values, dtype=np.float64)))
            source_positive_pixels += int(np.count_nonzero(values))
            x = raster.transform.c + raster.transform.a * (col.astype(np.float64) + 0.5)
            y = raster.transform.f + raster.transform.e * (row.astype(np.float64) + top + 0.5)
            longitude, latitude = transformer.transform(x, y)
            grid_col = np.floor(np.nan_to_num(longitude, nan=-1000, posinf=-1000, neginf=-1000) + 180).astype(np.int32)
            grid_row = np.floor(90 - np.nan_to_num(latitude, nan=-1000, posinf=-1000, neginf=-1000)).astype(np.int32)
            inside = (
                np.isfinite(longitude) & np.isfinite(latitude)
                & (grid_col >= 0) & (grid_col < GRID_WIDTH)
                & (grid_row >= 0) & (grid_row < GRID_HEIGHT)
            )
            unassigned_pixels += int(np.count_nonzero(~inside))
            if np.any(~inside):
                unassigned_population_parts.append(float(np.sum(values[~inside], dtype=np.float64)))
            indices = grid_row[inside] * GRID_WIDTH + grid_col[inside]
            counts += np.bincount(indices, weights=values[inside], minlength=counts.size)
            coverage += np.bincount(indices, minlength=coverage.size).astype(np.uint64)

        source_total = math.fsum(source_total_parts)
        unassigned_population = math.fsum(unassigned_population_parts)
        grid_total = float(np.sum(counts, dtype=np.float64))
        arithmetic_residual = source_total - grid_total - unassigned_population
        if abs(arithmetic_residual) > max(0.001, source_total * 1e-10):
            raise ValueError(f"Population mass check failed: residual {arithmetic_residual}")
        cells = [
            [index % GRID_WIDTH, index // GRID_WIDTH, float(value)]
            for index, value in enumerate(counts)
            if coverage[index] > 0
        ]
        return {
            "schema_version": "0.1.0",
            "source_release_id": SOURCE_IDS[source],
            "source_year": year,
            "statistical_support": "source_raster_cells_rebinned_by_centre_to_1_degree_geographic_cells",
            "display_geometry": "1_degree_bin_centres_not_footprints",
            "cell_area_km2_by_row": geographic_bin_areas_km2(),
            "source_artifact": {
                "filename": path.name,
                "archive_member": member,
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
                "crs": raster.crs.to_string(),
                "width": raster.width,
                "height": raster.height,
                "nodata": raster.nodata,
            },
            "transformation": {
                "id": "population-raster-centre-bin-v1",
                "version": TRANSFORM_VERSION,
                "grid_degrees": 1,
                "area_method": "WGS84_ellipsoid_geodesic_1_degree_bin_area",
                "temporal_policy": "exact_source_year_only",
                "political_allocation": "none",
                "source_positive_pixels": source_positive_pixels,
                "source_total_people": source_total,
                "published_bin_total_people": grid_total,
                "unassigned_outside_grid_people": unassigned_population,
                "unassigned_outside_grid_pixels": unassigned_pixels,
                "floating_point_residual_people": arithmetic_residual,
                "covered_bin_count": len(cells),
                "known_zero_bin_count": sum(1 for cell in cells if cell[2] == 0),
                "no_data_bin_count": counts.size - len(cells),
            },
            "cells": cells,
        }


def publish(path: Path, source: str, year: int, output: Path) -> dict:
    payload = aggregate_raster(path, source, year)
    output.mkdir(parents=True, exist_ok=True)
    stem = f"{source}-{year}"
    (output / f"{stem}.json").write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    with (output / f"{stem}.csv").open("w", newline="") as stream:
        writer = csv.writer(stream, lineterminator="\n")
        writer.writerow(["source_release_id", "source_year", "longitude_center", "latitude_center", "population_people", "bin_area_km2", "population_per_km2_of_bin"])
        for col, row, count in payload["cells"]:
            area = payload["cell_area_km2_by_row"][row]
            writer.writerow([payload["source_release_id"], year, col - 179.5, 89.5 - row, count, area, count / area])
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", choices=sorted(SOURCE_IDS), required=True)
    dates = parser.add_mutually_exclusive_group(required=True)
    dates.add_argument("--year", type=int)
    dates.add_argument("--years", type=int, nargs="+")
    parser.add_argument("--input", type=Path)
    parser.add_argument("--raw-root", type=Path, default=Path("data/raw"))
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    for year in args.years or [args.year]:
        if args.input is not None and args.years is not None:
            raise ValueError("--input is only valid for one year")
        if args.input is None:
            _, relative_path = source_url(args.source, year)
            path = args.raw_root / relative_path
        else:
            path = args.input
        payload = publish(path, args.source, year, args.output)
        print(json.dumps({"source": args.source, "year": year, **payload["transformation"]}), flush=True)


if __name__ == "__main__":
    main()
