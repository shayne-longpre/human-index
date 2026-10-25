"""Publish pinned Reba companion city series without merging their estimates."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
import tempfile
from pathlib import Path

from .catalog import validate_release_manifest
from .core import ValidationError, artifact_record, write_json


RELEASE_ID = "atlas-mvp-2026-10-24-r13"
TRANSFORM_ID = "reba-city-companions-source-native-v1"
SOURCES = (
    ("chandler_v2", "reba-chandler-v2", "chandlerV2.csv", "chandler.metadata.json", 2059494, 3, 5407640, "5b8df64e46988b216988eef18b46ebc2cba57ecc1adc8a5c2e1e6d5b78068031", 1597),
    ("modelski_modern_v2", "reba-modelski-modern-v2", "modelskiModernV2.csv", "modelski-modern.metadata.json", 2059500, 3, 5407637, "927ee6a9122be6aded1a2f71ff5bb6f36312aae6a778574af47f4e8c65265726", 293),
)


def atlas_year(column: str) -> int:
    era, number = column.split("_", 1)
    value = int(number)
    if value < 1 or era not in {"BC", "AD"}:
        raise ValidationError(f"Invalid source date column {column}")
    return 1 - value if era == "BC" else value


def verify_inputs(lock_path: Path) -> dict[str, dict]:
    lock = json.loads(lock_path.read_text())
    artifacts = {item["id"]: item for item in lock["artifacts"]}
    for item in artifacts.values():
        path = Path(item["path"])
        if path.stat().st_size != item["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]:
            raise ValidationError(f"City companion input differs from acquisition lock: {item['id']}")
    return artifacts


def derive(raw_root: Path, decisions_path: Path, companion_lock_path: Path) -> list[dict]:
    verify_inputs(companion_lock_path)
    decisions = json.loads(decisions_path.read_text())
    if decisions["summary"]["city_dispositions"] != {
        "accepted_same_place": 336, "rejected_distinct_place": 15, "unresolved_identity": 2,
    }:
        raise ValidationError("The reviewed city identity decisions changed")
    clusters = {record: (item["canonical_place_id"], len(item["source_record_ids"]))
                for item in decisions["place_clusters"] for record in item["source_record_ids"]}
    datasets = []
    for prefix, source_id, filename, metadata_name, article_id, version, file_id, expected_hash, expected_rows in SOURCES:
        path = raw_root / filename
        metadata = json.loads((raw_root / metadata_name).read_text())
        if metadata.get("id") != article_id or metadata.get("version") != version or metadata.get("license", {}).get("name") != "CC BY 4.0":
            raise ValidationError(f"Unexpected Figshare metadata for {filename}")
        if not any(item.get("id") == file_id and item.get("name") == filename for item in metadata.get("files", [])):
            raise ValidationError(f"Exact file missing from Figshare metadata: {filename}")
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected_hash:
            raise ValidationError(f"Pinned source checksum mismatch: {filename}")
        with path.open(encoding="cp1252", newline="") as handle:
            reader = csv.DictReader(handle)
            fields = reader.fieldnames or []
            rows = list(reader)
        required = {"City", "OtherName", "Country", "Latitude", "Longitude", "Certainty"}
        if not required.issubset(fields) or len(rows) != expected_rows:
            raise ValidationError(f"Source schema or row count changed: {filename}")
        date_columns = [field for field in fields if field.startswith(("BC_", "AD_"))]
        if not date_columns or len(set(map(atlas_year, date_columns))) != len(date_columns):
            raise ValidationError(f"Invalid source date columns: {filename}")
        cities = []
        observations = []
        quarantined = []
        seen_ids = set()
        for row_number, row in enumerate(rows, 2):
            record_id = f"{prefix}:row-{row_number}"
            if record_id in seen_ids:
                raise ValidationError(f"Duplicate source row {record_id}")
            seen_ids.add(record_id)
            name = row["City"].strip()
            latitude = float(row["Latitude"].strip())
            longitude = float(row["Longitude"].strip())
            if not name or not -90 <= latitude <= 90 or not -180 <= longitude <= 180 or row["Certainty"] not in {"1", "2", "3"}:
                raise ValidationError(f"Invalid source point {record_id}")
            identity = clusters.get(record_id)
            city_id = f"{prefix}-{row_number}"
            cities.append({"id": city_id, "source_release_id": source_id, "source_record_id": record_id,
                           "name": name, "other_name": row["OtherName"].strip() or None,
                           "modern_country_label": row["Country"].strip(), "latitude": latitude,
                           "longitude": longitude, "geocode_certainty_code": row["Certainty"],
                           "canonical_place_id": identity[0] if identity else None,
                           "reconciliation_status": "linked_across_sources" if identity else "source_record_only",
                           "linked_source_record_count": identity[1] if identity else 1})
            for column in date_columns:
                raw = row[column].strip()
                if not raw:
                    continue
                value = int(raw)
                locator = f'{filename} / row {row_number} / column {column}'
                if value == 0:
                    quarantined.append({"source_record_id": record_id, "year": atlas_year(column),
                                        "status": "source_zero_unresolved", "original_record_locator": locator})
                elif value < 0:
                    raise ValidationError(f"Negative population at {locator}")
                else:
                    observations.append({"city_id": city_id, "year": atlas_year(column), "population": value,
                                         "status": "published_estimate", "original_record_locator": locator})
        if prefix == "chandler_v2" and len(quarantined) != 2:
            raise ValidationError("Expected exactly two unresolved Chandler zero cells")
        if prefix == "modelski_modern_v2" and len(quarantined) != 0:
            raise ValidationError("Unexpected Modelski Modern zero cell")
        datasets.append({"schema_version": "0.5.0", "layer_id": "historical_city_population_points",
                         "source_release_id": source_id, "temporal_policy": "exact_only",
                         "spatial_support": "source_geocoded_city_point_not_extent",
                         "reconciliation_decision_set_id": decisions["decision_set_id"],
                         "years": sorted({item["year"] for item in observations}), "cities": cities,
                         "observations": observations, "quarantined_cells": quarantined})
    return datasets


def publish(base: Path, raw_root: Path, decisions_path: Path, output: Path, source_lock: Path, companion_lock: Path) -> dict:
    if output.exists():
        raise ValueError(f"Refusing to overwrite existing release: {output}")
    inputs = verify_inputs(companion_lock)
    datasets = derive(raw_root, decisions_path, companion_lock)
    manifest = json.loads((base / "manifest.json").read_text())
    if manifest["release_id"] != "atlas-mvp-2026-10-24-r12":
        raise ValueError("Companion publication requires reviewed r12")
    output.parent.mkdir(parents=True, exist_ok=True)
    stage_parent = Path(tempfile.mkdtemp(prefix=".atlas-city-stage-", dir=output.parent))
    staged = stage_parent / RELEASE_ID
    try:
        shutil.copytree(base, staged)
        outputs = {}
        references = []
        for dataset, source in zip(datasets, SOURCES, strict=True):
            prefix, source_id, filename, metadata_name, *_ = source
            data_file = f"cities/{prefix}.json"
            csv_file = f"cities/{prefix}.csv"
            target = staged / data_file
            write_json(target, dataset)
            city_by_id = {city["id"]: city for city in dataset["cities"]}
            with (staged / csv_file).open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=["source_release_id", "source_record_id", "city", "year", "population", "status", "original_record_locator", "canonical_place_id", "latitude", "longitude"])
                writer.writeheader()
                for observation in dataset["observations"]:
                    city = city_by_id[observation["city_id"]]
                    writer.writerow({"source_release_id": source_id, "source_record_id": city["source_record_id"],
                                     "city": city["name"], "year": observation["year"],
                                     "population": observation["population"], "status": observation["status"],
                                     "original_record_locator": observation["original_record_locator"],
                                     "canonical_place_id": city["canonical_place_id"],
                                     "latitude": city["latitude"], "longitude": city["longitude"]})
                for cell in dataset["quarantined_cells"]:
                    city = next(item for item in dataset["cities"] if item["source_record_id"] == cell["source_record_id"])
                    writer.writerow({"source_release_id": source_id, "source_record_id": city["source_record_id"],
                                     "city": city["name"], "year": cell["year"], "population": "",
                                     "status": cell["status"], "original_record_locator": cell["original_record_locator"],
                                     "canonical_place_id": city["canonical_place_id"],
                                     "latitude": city["latitude"], "longitude": city["longitude"]})
            for relative in (data_file, csv_file):
                outputs[relative] = artifact_record(staged / relative)
            references.append({"source_release_id": source_id, "data_file": data_file,
                               "download_file": csv_file, "source_artifact_sha256": source[7],
                               "city_count": len(dataset["cities"]), "observation_count": len(dataset["observations"]),
                               "quarantined_zero_cells": len(dataset["quarantined_cells"])})
            manifest["source_releases"].append({"id": source_id, "publisher": "Meredith Reba / Figshare; underlying city compilation",
                                                "retrieved_on": "2026-09-20", "license": "CC BY 4.0",
                                                "profile": {"source_rows": len(dataset["cities"]),
                                                            "published_estimates": len(dataset["observations"]),
                                                            "quarantined_zero_cells": len(dataset["quarantined_cells"])}})
            manifest["citations"].append({"label": f"Reba et al. historical urban population, {filename}",
                                          "url": f"https://doi.org/10.6084/m9.figshare.{source[4]}.v{source[5]}",
                                          "license": "CC BY 4.0"})
        manifest["release_id"] = RELEASE_ID
        manifest["historical_city_companions"] = references
        manifest["artifacts"].update(outputs)
        manifest["transformations"].append({"id": TRANSFORM_ID, "version": "1.0.0",
            "input_artifact_ids": ["reba_chandler_v2_csv", "reba_chandler_v2_metadata", "reba_modelski_modern_v2_csv", "reba_modelski_modern_v2_metadata", "reconciliation_decisions_v1"],
            "parameters": {"time": "exact_source_year_only", "city_identity": "reviewed_links_do_not_merge_values",
                           "zero_policy": "quarantine_two_chandler_zero_cells", "geography": "source_geocoded_points_not_extents",
                           "input_sha256": {key: value["sha256"] for key, value in inputs.items()}},
            "validation": {"source_series": 2, "published_estimates": sum(len(item["observations"]) for item in datasets),
                           "quarantined_zero_cells": sum(len(item["quarantined_cells"]) for item in datasets)},
            "output_artifacts": outputs})
        manifest["alternative_sources"] = [item for item in manifest["alternative_sources"] if item["id"] != "reba-chandler-and-modelski-modern"]
        manifest["limitations"].append("Chandler and Modelski companion estimates are separate source series. A shared place link never averages or replaces values, and the two Chandler zero cells remain quarantined as unresolved source codes.")
        original_ids = {item["id"] for item in json.loads(source_lock.read_text())["sources"]}
        original_ids.update(item for transformation in manifest["transformations"]
                            for item in transformation["input_artifact_ids"])
        validate_release_manifest(manifest, original_ids)
        write_json(staged / "manifest.json", manifest)
        staged.replace(output)
    finally:
        if staged.exists():
            shutil.rmtree(staged)
        stage_parent.rmdir()
    return {"release_id": RELEASE_ID, "sources_added": 2, "observations_added": sum(len(item["observations"]) for item in datasets), "quarantined_zero_cells": 2}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, default=Path("apps/web/public/atlas/releases/atlas-mvp-2026-10-24-r12"))
    parser.add_argument("--raw-root", type=Path, default=Path("data/raw/reba_cities/2016"))
    parser.add_argument("--decisions", type=Path, default=Path("data/decisions/reconciliation-decisions-v1.json"))
    parser.add_argument("--output", type=Path, default=Path(f"apps/web/public/atlas/releases/{RELEASE_ID}"))
    parser.add_argument("--source-lock", type=Path, default=Path("data/registry/source-lock.json"))
    parser.add_argument("--companion-lock", type=Path, default=Path("data/registry/city-companion-source-lock.json"))
    args = parser.parse_args()
    print(json.dumps(publish(args.base, args.raw_root, args.decisions, args.output, args.source_lock, args.companion_lock)))


if __name__ == "__main__":
    main()
