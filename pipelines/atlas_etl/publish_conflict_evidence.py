"""Publish source-native UCDP 26.1 conflict-year and country-year tables."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import shutil
import tempfile
import zipfile
from pathlib import Path

from .catalog import validate_release_manifest
from .core import ValidationError, artifact_record, write_json


RELEASE_ID = "atlas-mvp-2026-10-24-r14"
TRANSFORM_ID = "ucdp-source-native-conflict-tables-v1"


def verified_archive(lock: dict, artifact_id: str) -> zipfile.ZipFile:
    record = next(item for item in lock["artifacts"] if item["id"] == artifact_id)
    path = Path(record["path"])
    if path.stat().st_size != record["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != record["sha256"]:
        raise ValidationError(f"Source artifact differs from acquisition lock: {artifact_id}")
    return zipfile.ZipFile(path)


def read_member(lock: dict, artifact_id: str, expected_member: str) -> list[dict[str, str]]:
    with verified_archive(lock, artifact_id) as archive:
        if archive.namelist() != [expected_member]:
            raise ValidationError(f"Unexpected UCDP archive members for {artifact_id}")
        text = io.TextIOWrapper(archive.open(expected_member), encoding="utf-8-sig", newline="")
        return list(csv.DictReader(text))


def derive(acd_lock: dict, cy_lock: dict) -> dict[str, dict]:
    acd_rows = read_member(acd_lock, "ucdp_prio_armed_conflict_26_1_csv_archive", "UcdpPrioConflict_v26_1.csv")
    if len(acd_rows) != 2816:
        raise ValidationError("Unexpected UCDP/PRIO ACD 26.1 row count")
    acd = []
    acd_keys = set()
    for source_row, row in enumerate(acd_rows, 2):
        conflict_id, year = int(row["conflict_id"]), int(row["year"])
        key = (conflict_id, year)
        intensity = int(row["intensity_level"])
        if key in acd_keys or not 1946 <= year <= 2025 or intensity not in (1, 2) or row["version"] != "26.1":
            raise ValidationError(f"Invalid UCDP/PRIO ACD row {source_row}")
        acd_keys.add(key)
        acd.append({"conflict_id": conflict_id, "year": year, "location": row["location"],
                    "side_a": row["side_a"], "side_b": row["side_b"],
                    "gwno_loc": row["gwno_loc"], "type_of_conflict": int(row["type_of_conflict"]),
                    "intensity_level": intensity, "original_record_locator": f"UcdpPrioConflict_v26_1.csv:row-{source_row}"})
    cy_rows = read_member(cy_lock, "ucdp_organized_violence_cy_26_1_zip", "OrganizedViolenceCYDataSet26_1.csv")
    if len(cy_rows) != 7132:
        raise ValidationError("Unexpected UCDP OrganizedViolenceCY 26.1 row count")
    cy = []
    cy_keys = set()
    nonmonotonic = 0
    for source_row, row in enumerate(cy_rows, 2):
        country_id, year = int(row["country_id"]), int(row["year"])
        key = (country_id, year)
        if key in cy_keys or not 1989 <= year <= 2025 or row["Version"] != "26.1":
            raise ValidationError(f"Invalid UCDP country-year row {source_row}")
        cy_keys.add(key)
        values = {field: int(row[field]) for field in (
            "sb_exist", "ns_exist", "os_exist", "sb_total_deaths_best", "ns_total_deaths_best", "os_total_deaths_best",
            "cumulative_total_deaths_in_orgvio_best", "cumulative_total_deaths_in_orgvio_low", "cumulative_total_deaths_in_orgvio_high",
        )}
        if any(values[field] not in (0, 1) for field in ("sb_exist", "ns_exist", "os_exist")) or any(value < 0 for value in values.values()):
            raise ValidationError(f"Invalid UCDP country-year value {source_row}")
        nonmonotonic += not (values["cumulative_total_deaths_in_orgvio_low"] <= values["cumulative_total_deaths_in_orgvio_best"] <= values["cumulative_total_deaths_in_orgvio_high"])
        cy.append({"country_id": country_id, "country": row["country"], "year": year,
                   "original_record_locator": f"OrganizedViolenceCYDataSet26_1.csv:row-{source_row}", **values})
    if nonmonotonic != 4:
        raise ValidationError("UCDP country-year fatality ordering audit changed")
    return {
        "acd": {"schema_version": "0.1.0", "source_release_id": "ucdp-prio-acd-26.1",
                "support": "source_conflict_year_not_event_location_or_population_exposure",
                "years": sorted({row["year"] for row in acd}), "rows": acd,
                "source_row_count": len(acd)},
        "cy": {"schema_version": "0.1.0", "source_release_id": "ucdp-organized-violence-cy-26.1",
               "support": "source_Gleditsch_Ward_country_year_within_borders_no_modern_country_join",
               "years": sorted({row["year"] for row in cy}), "rows": cy,
               "source_row_count": len(cy), "nonmonotonic_low_best_high_rows": nonmonotonic},
    }


def publish(base: Path, output: Path, acd_lock_path: Path, cy_lock_path: Path, source_lock_path: Path) -> dict:
    if output.exists():
        raise ValueError(f"Refusing to overwrite existing release: {output}")
    acd_lock = json.loads(acd_lock_path.read_text())
    cy_lock = json.loads(cy_lock_path.read_text())
    for lock in (acd_lock, cy_lock):
        for item in lock["artifacts"]:
            path = Path(item["path"])
            if path.stat().st_size != item["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]:
                raise ValidationError(f"Pinned UCDP artifact changed: {item['id']}")
    datasets = derive(acd_lock, cy_lock)
    manifest = json.loads((base / "manifest.json").read_text())
    if manifest["release_id"] != "atlas-mvp-2026-10-24-r13":
        raise ValueError("Conflict publication requires reviewed r13")
    output.parent.mkdir(parents=True, exist_ok=True)
    stage_parent = Path(tempfile.mkdtemp(prefix=".atlas-conflict-stage-", dir=output.parent))
    staged = stage_parent / RELEASE_ID
    try:
        shutil.copytree(base, staged)
        outputs = {}
        references = []
        for key, source_artifact in (("acd", "ucdp_prio_armed_conflict_26_1_csv_archive"), ("cy", "ucdp_organized_violence_cy_26_1_zip")):
            dataset = datasets[key]
            data_file, csv_file = f"conflict/ucdp-{key}-26.1.json", f"conflict/ucdp-{key}-26.1.csv"
            write_json(staged / data_file, dataset)
            fields = list(dataset["rows"][0])
            with (staged / csv_file).open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
                writer.writeheader()
                writer.writerows(dataset["rows"])
            for file in (data_file, csv_file):
                outputs[file] = artifact_record(staged / file)
            lock = acd_lock if key == "acd" else cy_lock
            artifact = next(item for item in lock["artifacts"] if item["id"] == source_artifact)
            references.append({"kind": key, "source_release_id": dataset["source_release_id"],
                               "source_artifact_id": source_artifact, "source_artifact_sha256": artifact["sha256"],
                               "data_file": data_file, "download_file": csv_file,
                               "source_row_count": dataset["source_row_count"], "available_years": dataset["years"]})
        manifest["release_id"] = RELEASE_ID
        manifest["conflict_evidence"] = {"selection_policy": "source_native_exact_year_no_geographic_join",
                                         "interpretation": "ACD conflict-years and OrganizedViolenceCY border-based country-years are distinct UCDP 26.1 products; neither is a person-exposure estimate or an Atlas conflict score.",
                                         "datasets": references}
        for key, label in (("acd", "UCDP/PRIO Armed Conflict Dataset 26.1"), ("cy", "UCDP OrganizedViolenceCY 26.1")):
            dataset = datasets[key]
            manifest["source_releases"].append({"id": dataset["source_release_id"], "publisher": "Uppsala Conflict Data Program",
                "retrieved_on": "2026-09-23" if key == "acd" else "2026-10-24", "license": "CC BY 4.0",
                "profile": {"product": label, "rows": dataset["source_row_count"], "first_year": dataset["years"][0], "last_year": dataset["years"][-1]}})
            manifest["citations"].append({"label": label, "url": "https://ucdp.uu.se/downloads/", "license": "CC BY 4.0"})
        manifest["artifacts"].update(outputs)
        inputs = {item["id"]: item["sha256"] for lock in (acd_lock, cy_lock) for item in lock["artifacts"]}
        manifest["transformations"].append({"id": TRANSFORM_ID, "version": "1.0.0",
            "input_artifact_ids": list(inputs), "parameters": {"input_sha256": inputs,
                "time": "exact_source_year_only", "geography": "source_native_no_crosswalk",
                "fatality_low_best_high": "separate_source_estimates_not_confidence_interval"},
            "validation": {"acd_rows": 2816, "country_year_rows": 7132,
                           "country_year_nonmonotonic_low_best_high": datasets["cy"]["nonmonotonic_low_best_high_rows"]},
            "output_artifacts": outputs})
        manifest["limitations"].extend([
            "UCDP/PRIO ACD rows are source conflict-years, not a complete absence-of-violence panel or a political-border overlay.",
            "UCDP OrganizedViolenceCY country-years use Gleditsch-Ward supports and GED-derived within-border estimates; zeros have UCDP's inclusion-threshold meaning, not proof of peace.",
            "Four OrganizedViolenceCY rows have low/best/high fatality estimates out of numerical order; the three fields are retained independently, never rendered as a confidence interval.",
            "The UCDP GED event archive remains acquired but unpublished pending event-location semantics and the separate 5,075 nonmonotonic event-bound review.",
        ])
        original_ids = {item["id"] for item in json.loads(source_lock_path.read_text())["sources"]}
        original_ids.update(item for transformation in manifest["transformations"] for item in transformation["input_artifact_ids"])
        validate_release_manifest(manifest, original_ids)
        write_json(staged / "manifest.json", manifest)
        staged.replace(output)
    finally:
        if staged.exists():
            shutil.rmtree(staged)
        stage_parent.rmdir()
    return {"release_id": RELEASE_ID, "acd_rows": 2816, "country_year_rows": 7132,
            "nonmonotonic_country_year_fatality_estimate_rows": 4}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, default=Path("apps/web/public/atlas/releases/atlas-mvp-2026-10-24-r13"))
    parser.add_argument("--output", type=Path, default=Path(f"apps/web/public/atlas/releases/{RELEASE_ID}"))
    parser.add_argument("--acd-lock", type=Path, default=Path("data/registry/candidate-source-lock.json"))
    parser.add_argument("--cy-lock", type=Path, default=Path("data/registry/ucdp-country-year-lock.json"))
    parser.add_argument("--source-lock", type=Path, default=Path("data/registry/source-lock.json"))
    args = parser.parse_args()
    print(json.dumps(publish(args.base, args.output, args.acd_lock, args.cy_lock, args.source_lock)))


if __name__ == "__main__":
    main()
