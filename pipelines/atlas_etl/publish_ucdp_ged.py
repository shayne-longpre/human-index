"""Publish GED 26.1 as year-partitioned, source-native event evidence."""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import json
import shutil
import tempfile
import zipfile
from contextlib import ExitStack
from pathlib import Path

from .catalog import validate_release_manifest
from .core import ValidationError, artifact_record, write_json


RELEASE_ID = "atlas-mvp-2026-10-24-r15"
SOURCE_RELEASE_ID = "ucdp-ged-26.1"
TRANSFORM_ID = "ucdp-ged-source-native-year-slices-v1"
MEMBER = "GEDEvent_v26_1.csv"
FIELDS = (
    "id", "year", "date_start", "date_end", "date_prec", "event_clarity",
    "type_of_violence", "side_a", "side_b", "country", "where_coordinates",
    "where_prec", "latitude", "longitude", "low", "best", "high",
    "original_record_locator",
)
JSON_COLUMNS = (
    "id", "date_start", "date_end", "date_prec", "event_clarity",
    "type_of_violence", "side_a", "side_b", "country", "where_coordinates",
    "where_prec", "latitude", "longitude", "low", "best", "high", "source_row",
)


def verified_artifacts(lock_path: Path) -> dict[str, dict]:
    artifacts = {item["id"]: item for item in json.loads(lock_path.read_text())["artifacts"]}
    for artifact_id in ("ucdp_ged_26_1_csv_archive", "ucdp_ged_26_1_codebook"):
        item = artifacts[artifact_id]
        path = Path(item["path"])
        if path.stat().st_size != item["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]:
            raise ValidationError(f"Pinned UCDP GED artifact changed: {artifact_id}")
    return artifacts


def publish(base: Path, output: Path, ged_lock_path: Path, source_lock_path: Path) -> dict:
    if output.exists():
        raise ValueError(f"Refusing to overwrite existing release: {output}")
    manifest = json.loads((base / "manifest.json").read_text())
    if manifest["release_id"] != "atlas-mvp-2026-10-24-r14":
        raise ValueError("GED publication requires reviewed r14")
    artifacts = verified_artifacts(ged_lock_path)
    archive_path = Path(artifacts["ucdp_ged_26_1_csv_archive"]["path"])
    output.parent.mkdir(parents=True, exist_ok=True)
    stage_parent = Path(tempfile.mkdtemp(prefix=".atlas-ged-stage-", dir=output.parent))
    staged = stage_parent / RELEASE_ID
    try:
        shutil.copytree(base, staged)
        years = list(range(1989, 2026))
        counts = {year: 0 for year in years}
        nonmonotonic = 0
        seen_ids: set[int] = set()
        with ExitStack() as stack:
            outputs = {}
            for year in years:
                directory = staged / "conflict" / "ged"
                directory.mkdir(parents=True, exist_ok=True)
                data = stack.enter_context((directory / f"{year}.json").open("w", encoding="utf-8", newline="\n"))
                raw_download = stack.enter_context((directory / f"{year}.csv.gz").open("wb"))
                compressed = stack.enter_context(gzip.GzipFile(filename="", mode="wb", fileobj=raw_download, mtime=0))
                download = stack.enter_context(io.TextIOWrapper(compressed, encoding="utf-8", newline=""))
                data.write('{"rows":[')
                writer = csv.DictWriter(download, fieldnames=FIELDS, lineterminator="\n")
                writer.writeheader()
                outputs[year] = (data, writer)
            with zipfile.ZipFile(archive_path) as archive:
                if archive.namelist() != [MEMBER]:
                    raise ValidationError("UCDP GED archive members changed")
                with io.TextIOWrapper(archive.open(MEMBER), encoding="utf-8-sig", newline="") as text:
                    reader = csv.DictReader(text)
                    if not reader.fieldnames or any(field not in reader.fieldnames for field in FIELDS[:-1]):
                        raise ValidationError("UCDP GED source fields changed")
                    for source_row, source in enumerate(reader, 2):
                        event_id, year = int(source["id"]), int(source["year"])
                        if event_id in seen_ids or year not in outputs:
                            raise ValidationError(f"Invalid GED event ID or year at row {source_row}")
                        seen_ids.add(event_id)
                        start, end = source["date_start"], source["date_end"]
                        if not start or not end or start > end or int(start[:4]) != year or end[:4] != start[:4]:
                            raise ValidationError(f"Invalid GED date support at row {source_row}")
                        where_prec, date_prec, clarity = (int(source[field]) for field in ("where_prec", "date_prec", "event_clarity"))
                        if where_prec not in range(1, 8) or date_prec not in range(1, 6) or clarity not in (1, 2):
                            raise ValidationError(f"Invalid GED precision/clarity at row {source_row}")
                        latitude, longitude = float(source["latitude"]), float(source["longitude"])
                        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
                            raise ValidationError(f"Invalid GED representative coordinate at row {source_row}")
                        low, best, high = (int(source[field]) for field in ("low", "best", "high"))
                        if min(low, best, high) < 0:
                            raise ValidationError(f"Invalid GED fatality estimate at row {source_row}")
                        nonmonotonic += not low <= best <= high
                        row = {
                            "id": event_id, "year": year, "date_start": start, "date_end": end,
                            "date_prec": date_prec, "event_clarity": clarity,
                            "type_of_violence": int(source["type_of_violence"]),
                            "side_a": source["side_a"], "side_b": source["side_b"],
                            "country": source["country"], "where_coordinates": source["where_coordinates"],
                            "where_prec": where_prec, "latitude": latitude, "longitude": longitude,
                            "low": low, "best": best, "high": high,
                            "source_row": source_row,
                            "original_record_locator": f"{MEMBER}:row-{source_row}",
                        }
                        data, writer = outputs[year]
                        if counts[year]:
                            data.write(",")
                        data.write(json.dumps([row[field] for field in JSON_COLUMNS], ensure_ascii=False, separators=(",", ":")))
                        writer.writerow({field: row[field] for field in FIELDS})
                        counts[year] += 1
            for year in years:
                data, _ = outputs[year]
                data.write('],"columns":')
                data.write(json.dumps(JSON_COLUMNS, separators=(",", ":")))
                data.write(',"schema_version":"0.1.0","source_release_id":"ucdp-ged-26.1",')
                data.write(f'"source_row_count":{counts[year]},"support":"source_event_representative_point",')
                data.write(f'"year":{year}}}\n')
        if sum(counts.values()) != 417968 or nonmonotonic != 5075 or not all(counts.values()):
            raise ValidationError("GED row count or fatality-order audit changed")
        references = []
        output_artifacts = {}
        for year in years:
            data_file, download_file = f"conflict/ged/{year}.json", f"conflict/ged/{year}.csv.gz"
            for file in (data_file, download_file):
                output_artifacts[file] = artifact_record(staged / file)
            references.append({"year": year, "data_file": data_file, "download_file": download_file,
                               "source_row_count": counts[year]})
        manifest["release_id"] = RELEASE_ID
        manifest["conflict_event_evidence"] = {
            "selection_policy": "source_native_year_slices_no_geographic_or_population_join",
            "source_release_id": SOURCE_RELEASE_ID,
            "source_artifact_id": "ucdp_ged_26_1_csv_archive",
            "source_artifact_sha256": artifacts["ucdp_ged_26_1_csv_archive"]["sha256"],
            "codebook_artifact_id": "ucdp_ged_26_1_codebook",
            "codebook_artifact_sha256": artifacts["ucdp_ged_26_1_codebook"]["sha256"],
            "source_row_count": sum(counts.values()),
            "nonmonotonic_low_best_high_rows": nonmonotonic,
            "year_slices": references,
            "interpretation": "Locations are source representative points with where_prec 1-7; event dates have date_prec 1-5. Low/best/high are separate source estimates, not an Atlas confidence interval.",
        }
        manifest["source_releases"].append({"id": SOURCE_RELEASE_ID, "publisher": "Uppsala Conflict Data Program",
            "retrieved_on": "2026-09-23", "license": "CC BY 4.0",
            "profile": {"product": "UCDP Georeferenced Event Dataset 26.1", "rows": sum(counts.values()),
                        "first_year": years[0], "last_year": years[-1]}})
        manifest["citations"].append({"label": "UCDP Georeferenced Event Dataset 26.1",
            "url": "https://ucdp.uu.se/downloads/", "license": "CC BY 4.0"})
        manifest["artifacts"].update(output_artifacts)
        manifest["transformations"].append({"id": TRANSFORM_ID, "version": "1.0.0",
            "input_artifact_ids": ["ucdp_ged_26_1_csv_archive", "ucdp_ged_26_1_codebook"],
            "parameters": {"input_sha256": {item: artifacts[item]["sha256"] for item in
                            ("ucdp_ged_26_1_csv_archive", "ucdp_ged_26_1_codebook")},
                           "year": "source_year_no_interpolation", "location": "source_representative_point_with_precision_code",
                           "fatality_fields": "source_low_best_high_preserved_separately"},
            "validation": {"event_rows": sum(counts.values()), "unique_event_ids": len(seen_ids),
                           "nonmonotonic_low_best_high_rows": nonmonotonic},
            "output_artifacts": output_artifacts})
        manifest["limitations"].extend([
            "GED coordinates can represent exact sites, nearby areas, administrative divisions, fuzzy features, or whole countries; the source where_prec code is mandatory context.",
            "GED event dates can be intervals rather than exact days; source date_start, date_end and date_prec are preserved.",
            "5,075 GED low/best/high fatality triplets are not numerically ordered; Atlas keeps the three source estimates separate rather than interpreting them as a confidence interval.",
            "GED event records do not identify all people exposed to violence; no Atlas population or historical-border assignment is made.",
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
    return {"release_id": RELEASE_ID, "event_rows": sum(counts.values()), "year_slices": len(years),
            "nonmonotonic_low_best_high_rows": nonmonotonic}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, default=Path("apps/web/public/atlas/releases/atlas-mvp-2026-10-24-r14"))
    parser.add_argument("--output", type=Path, default=Path(f"apps/web/public/atlas/releases/{RELEASE_ID}"))
    parser.add_argument("--ged-lock", type=Path, default=Path("data/registry/candidate-source-lock.json"))
    parser.add_argument("--source-lock", type=Path, default=Path("data/registry/source-lock.json"))
    args = parser.parse_args()
    print(json.dumps(publish(args.base, args.output, args.ged_lock, args.source_lock)))


if __name__ == "__main__":
    main()
