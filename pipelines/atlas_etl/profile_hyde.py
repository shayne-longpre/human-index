"""Profile one pinned HYDE 3.5 baseline population bundle without publishing it."""

from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from pathlib import Path
from typing import Any


EXPECTED_MEMBERS = {
    "popc_10000BC.asc",
    "popd_10000BC.asc",
    "urbc_10000BC.asc",
    "rurc_10000BC.asc",
    "uopp_10000BC.asc",
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def profile_ascii_grid(archive: zipfile.ZipFile, member: str) -> dict[str, Any]:
    with archive.open(member) as binary:
        header: dict[str, float] = {}
        for _ in range(6):
            key, value = binary.readline().decode("ascii").split()
            header[key.lower()] = float(value)
        nodata = header["nodata_value"]
        populated_cells = 0
        nodata_cells = 0
        value_sum = 0.0
        minimum: float | None = None
        maximum: float | None = None
        for line in binary:
            for token in line.split():
                value = float(token)
                if value == nodata:
                    nodata_cells += 1
                    continue
                populated_cells += 1
                value_sum += value
                minimum = value if minimum is None else min(minimum, value)
                maximum = value if maximum is None else max(maximum, value)
    expected_cells = int(header["ncols"] * header["nrows"])
    if populated_cells + nodata_cells != expected_cells:
        raise ValueError("HYDE grid cell count disagrees with its header")
    return {
        "header": {
            "ncols": int(header["ncols"]),
            "nrows": int(header["nrows"]),
            "xllcorner": header["xllcorner"],
            "yllcorner": header["yllcorner"],
            "cellsize_degrees": header["cellsize"],
            "nodata_value": nodata,
        },
        "populated_cells": populated_cells,
        "nodata_cells": nodata_cells,
        "minimum_inhabitants_per_cell": minimum,
        "maximum_inhabitants_per_cell": maximum,
        "sum_inhabitants": value_sum,
        "sum_status": "profile_only_requires_source_total_and_mask_reconciliation",
    }


def build_profile(license_path: Path, readme_path: Path, sample_path: Path) -> dict[str, Any]:
    readme = readme_path.read_text(encoding="utf-8-sig")
    license_text = license_path.read_text(encoding="utf-8-sig")
    with zipfile.ZipFile(sample_path) as archive:
        members = set(archive.namelist())
        if members != EXPECTED_MEMBERS:
            raise ValueError(f"Unexpected HYDE 10,000 BCE population members: {sorted(members)}")
        population_grid = profile_ascii_grid(archive, "popc_10000BC.asc")

    return {
        "schema_version": "0.1.0",
        "review_status": "documentation_and_one_baseline_population_bundle_profiled_not_published",
        "source": {
            "id": "hyde-3.5-march-2025",
            "scenario": "baseline",
            "sample_year": "10000 BCE",
            "provider_directory": "https://geo.public.data.uu.nl/vault-hyde/hyde35_c9_apr2025%5B1749214444%5D/",
        },
        "artifacts": {
            "license": {"filename": license_path.name, "bytes": license_path.stat().st_size, "sha256": digest(license_path)},
            "readme": {"filename": readme_path.name, "bytes": readme_path.stat().st_size, "sha256": digest(readme_path)},
            "population_sample": {"filename": sample_path.name, "bytes": sample_path.stat().st_size, "sha256": digest(sample_path)},
        },
        "documented_semantics": {
            "resolution": "5 arc minutes",
            "population_count_unit": "inhabitants per grid cell",
            "population_density_unit": "inhabitants per square kilometre per grid cell",
            "scenarios": ["baseline", "lower", "upper"],
            "sample_bundle_members": sorted(EXPECTED_MEMBERS),
            "readme_mentions_extension_to_2025": "Extension of the database to year 2025" in readme,
            "readme_coverage_sentence_still_ends_2023": "10,000 BCE to 2023 CE" in readme,
        },
        "population_count_grid_profile": population_grid,
        "terms_conflict": {
            "archive_license_file": "CC BY-NC 4.0" if "Attribution-NonCommercial 4.0" in license_text else "unrecognized",
            "readme_statement": "CC BY 3.0" if "CC BY 3.0" in readme else "unrecognized",
            "status": "provider_clarification_required",
        },
        "publication_blockers": [
            "resolve_archive_license_CC_BY_NC_4_0_vs_readme_CC_BY_3_0_conflict_with_provider",
            "confirm_product_use_if_noncommercial_restriction_controls",
            "reconcile_readme_2023_coverage_sentence_with_directory_and_extension_to_2025",
            "acquire_general_masks_country_codes_and_selected_baseline_lower_upper_series",
            "validate_grid_population_totals_nodata_land_masks_and_scenario_semantics_before_spatial_publication",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--license", type=Path, required=True)
    parser.add_argument("--readme", type=Path, required=True)
    parser.add_argument("--sample", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    profile = build_profile(args.license, args.readme, args.sample)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(profile, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
