"""Publish pinned ILOSTAT tables and Pleiades GIS records without cross-source joins."""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import json
import shutil
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

from .catalog import validate_release_manifest
from .core import ValidationError, artifact_record, write_json


RELEASE_ID = "atlas-mvp-2026-10-24-r16"
LABOR_COLUMNS = ("ref_area", "source", "indicator", "sex", "classif1", "time", "obs_value",
                 "obs_status", "note_classif", "note_indicator", "note_source", "source_row")
PLACE_FIELDS = ("id", "title", "uri", "representative_latitude", "representative_longitude",
                "location_precision", "source_row")
NAME_FIELDS = ("place_id", "id", "title", "uri", "association_certainty", "name_type",
               "attested_form", "language_tag", "year_after_which", "year_before_which", "source_row")
POINT_FIELDS = ("place_id", "id", "title", "uri", "association_certainty", "location_precision",
                "accuracy_radius", "year_after_which", "year_before_which", "geometry_wkt", "source_row")


def verified_lock(path: Path) -> tuple[dict, dict[str, Path]]:
    lock = json.loads(path.read_text())
    files = {}
    for item in lock["artifacts"]:
        source = Path(item["path"])
        if source.stat().st_size != item["bytes"] or hashlib.sha256(source.read_bytes()).hexdigest() != item["sha256"]:
            raise ValidationError(f"Pinned source artifact changed: {item['id']}")
        files[source.name] = source
    return lock, files


def csv_rows(path: Path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        yield from enumerate(csv.DictReader(handle), 2)


def publish_labor(staged: Path, lock_path: Path, manifest: dict) -> dict:
    lock, files = verified_lock(lock_path)
    table = lock["table"]
    release_id = f"ilostat-{table.lower()}-2026-10-23"
    target = staged / "labor" / table.lower()
    target.mkdir(parents=True)
    source_table = files[f"{table}.csv.gz"]
    shutil.copyfile(source_table, target / "source.csv.gz")
    dictionaries = {}
    for name, code, label in (("ref_area_en.csv", "ref_area", "ref_area.label"),
                              ("source_en.csv", "source", "source.label"),
                              ("sex_en.csv", "sex", "sex.label"),
                              ("classif1_en.csv", "classif1", "classif1.label"),
                              ("obs_status_en.csv", "obs_status", "obs_status.label")):
        if name == "source_en.csv":
            dictionaries["source"] = {f"{row['ref_area']}:{row['source']}": row[label]
                                      for _, row in csv_rows(files[name])}
        else:
            dictionaries[code] = {row[code]: row[label] for _, row in csv_rows(files[name])}
    write_json(target / "dictionary.json", dictionaries)
    by_year: dict[int, list[list[str | int]]] = defaultdict(list)
    full_count = 0
    withheld = Counter()
    blank = 0
    source_kinds = Counter()
    with gzip.open(source_table, "rt", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if tuple(reader.fieldnames or ()) != LABOR_COLUMNS[:-1]:
            raise ValidationError(f"Unexpected ILOSTAT columns for {table}")
        for source_row, row in enumerate(reader, 2):
            if row["indicator"] != table.removesuffix("_A"):
                raise ValidationError(f"Unexpected indicator at {table}:row-{source_row}")
            year = int(row["time"])
            value = row["obs_value"]
            if value and not 0 <= float(value) <= 100:
                raise ValidationError(f"Invalid percentage at {table}:row-{source_row}")
            blank += not bool(value)
            source_label = dictionaries["source"].get(f"{row['ref_area']}:{row['source']}")
            if source_label is None or row["ref_area"] not in dictionaries["ref_area"] \
                    or row["sex"] not in dictionaries["sex"] or row["classif1"] not in dictionaries["classif1"]:
                raise ValidationError(f"Missing ILOSTAT dictionary entry at {table}:row-{source_row}")
            source_kinds[source_label.split(" - ", 1)[0]] += 1
            full_count += 1
            if year > 2025:
                withheld[year] += 1
                continue
            by_year[year].append([*(row[field] for field in LABOR_COLUMNS[:-1]), source_row])
    expected = 321631 if table == "EMP_DWAP_SEX_AGE_RT_A" else 7679
    if full_count != expected or not by_year:
        raise ValidationError(f"ILOSTAT {table} row-count audit changed")
    slices = []
    files_out = [f"labor/{table.lower()}/source.csv.gz", f"labor/{table.lower()}/dictionary.json"]
    for year, rows in sorted(by_year.items()):
        relative = f"labor/{table.lower()}/{year}.json"
        write_json(staged / relative, {"schema_version": "0.1.0", "source_release_id": release_id,
                 "source_table": table, "year": year, "columns": LABOR_COLUMNS, "rows": rows})
        slices.append({"year": year, "data_file": relative, "source_row_count": len(rows)})
        files_out.append(relative)
    output_artifacts = {file: artifact_record(staged / file) for file in files_out}
    manifest["artifacts"].update(output_artifacts)
    source_item = next(item for item in lock["artifacts"] if item["path"].endswith(f"{table}.csv.gz"))
    reference = {"source_release_id": release_id, "source_table": table,
                 "source_artifact_id": source_item["id"], "source_artifact_sha256": source_item["sha256"],
                 "source_lock_sha256": hashlib.sha256(lock_path.read_bytes()).hexdigest(),
                 "definition": "previous_ICLS13" if table == "EMP_DWAP_SEX_AGE_RT_A" else "current_ICLS19",
                 "dictionary_file": f"labor/{table.lower()}/dictionary.json",
                 "download_file": f"labor/{table.lower()}/source.csv.gz", "source_row_count": full_count,
                 "published_row_count": sum(len(rows) for rows in by_year.values()),
                 "blank_value_count": blank, "withheld_year_rows": dict(sorted(withheld.items())),
                 "source_kind_rows": dict(sorted(source_kinds.items())), "year_slices": slices}
    manifest["source_releases"].append({"id": release_id, "publisher": "International Labour Organization",
        "retrieved_on": source_item["retrieved_on"], "license": "CC BY 4.0",
        "source_update": "2026-10-23", "profile": {"table": table, "rows": full_count,
        "published_rows_through_2025": reference["published_row_count"]}})
    manifest["transformations"].append({"id": f"{release_id}-source-year-slices-v1", "version": "1.0.0",
        "input_artifact_ids": [item["id"] for item in lock["artifacts"]],
        "parameters": {"input_lock_sha256": reference["source_lock_sha256"],
            "year_policy": "exact_year_through_2025; later source rows retained only in complete CSV",
            "source_policy": "preserve source, sex, age, status, notes and duplicate survey rows; no model splice"},
        "validation": {"source_rows": full_count, "published_rows": reference["published_row_count"],
            "withheld_rows": sum(withheld.values()), "blank_values": blank},
        "output_artifacts": output_artifacts})
    return reference


def publish_pleiades(staged: Path, lock_path: Path, manifest: dict) -> dict:
    lock, files = verified_lock(lock_path)
    target = staged / "places" / "pleiades-v4.1"
    target.mkdir(parents=True)
    release_id = "pleiades-gis-v4.1-selected-exports"
    definitions = (("places", PLACE_FIELDS), ("names", NAME_FIELDS), ("location_points", POINT_FIELDS))
    counts = {}
    ids: set[str] = set()
    missing_points = rough_points = 0
    files_out = []
    for name, fields in definitions:
        source = files[f"{name}.csv"]
        rows = []
        for source_row, row in csv_rows(source):
            if name == "places":
                if row["id"] in ids:
                    raise ValidationError(f"Duplicate Pleiades place {row['id']}")
                ids.add(row["id"])
                if bool(row["representative_latitude"]) != bool(row["representative_longitude"]):
                    raise ValidationError(f"Incomplete Pleiades coordinate at row {source_row}")
                if row["representative_latitude"]:
                    lat, lon = float(row["representative_latitude"]), float(row["representative_longitude"])
                    if not -90 <= lat <= 90 or not -180 <= lon <= 180:
                        raise ValidationError(f"Invalid Pleiades coordinate at row {source_row}")
                else:
                    missing_points += 1
                rough_points += row["location_precision"] == "rough"
            elif row["place_id"] not in ids:
                raise ValidationError(f"Orphan Pleiades {name} at row {source_row}")
            if name != "places":
                for field in ("year_after_which", "year_before_which"):
                    if row[field] and int(row[field]) == 0:
                        raise ValidationError(f"Pleiades source year zero at row {source_row}")
            rows.append([*(row[field] for field in fields[:-1]), source_row])
        counts[name] = len(rows)
        relative_json = f"places/pleiades-v4.1/{name}.json"
        write_json(staged / relative_json, {"schema_version": "0.1.0", "source_release_id": release_id,
                   "kind": name, "columns": fields, "rows": rows})
        with (target / f"{name}.csv.gz").open("wb") as raw:
            with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as compressed:
                with io.TextIOWrapper(compressed, encoding="utf-8", newline="") as text:
                    writer = csv.writer(text, lineterminator="\n")
                    writer.writerow(fields)
                    writer.writerows(rows)
        files_out.extend([relative_json, f"places/pleiades-v4.1/{name}.csv.gz"])
    if counts != {"places": 41480, "names": 38862, "location_points": 25038}:
        raise ValidationError("Pleiades v4.1 row-count audit changed")
    output_artifacts = {file: artifact_record(staged / file) for file in files_out}
    manifest["artifacts"].update(output_artifacts)
    reference = {"source_release_id": release_id,
                 "source_lock_sha256": hashlib.sha256(lock_path.read_bytes()).hexdigest(),
                 "source_artifacts": {item["id"]: item["sha256"] for item in lock["artifacts"]},
                 "selection_policy": "source_native_place_id_join_no_temporal_validity_or_polity_join",
                 "row_counts": counts, "rough_representative_points": rough_points,
                 "unlocated_places": missing_points,
                 "files": {name: {"data_file": f"places/pleiades-v4.1/{name}.json",
                                   "download_file": f"places/pleiades-v4.1/{name}.csv.gz"}
                           for name, _ in definitions}}
    manifest["source_releases"].append({"id": release_id, "publisher": "Pleiades contributors",
        "retrieved_on": "2026-10-24", "license": "CC BY 3.0",
        "profile": {"selected_gis_exports": list(counts), "rows": counts}})
    manifest["transformations"].append({"id": "pleiades-v4.1-source-native-place-join-v1",
        "version": "1.0.0", "input_artifact_ids": [item["id"] for item in lock["artifacts"]],
        "parameters": {"input_lock_sha256": reference["source_lock_sha256"],
            "join": "place_id to places.id only; no name or location validity inferred",
            "dates": "raw signed no-year-zero source termini, never continuous validity",
            "geometry": "representative points disclosed with precision; no event or polity map join",
            "download": "all rows, selected published fields only; full upstream CSV remains in ignored raw storage"},
        "validation": {**counts, "rough_representative_points": rough_points,
            "unlocated_places": missing_points, "orphan_names_or_points": 0},
        "output_artifacts": output_artifacts})
    return reference


def publish(base: Path, output: Path, labor_locks: tuple[Path, Path], places_lock: Path,
            source_lock: Path) -> dict:
    if output.exists():
        raise ValueError(f"Refusing to overwrite existing release: {output}")
    manifest = json.loads((base / "manifest.json").read_text())
    if manifest["release_id"] != "atlas-mvp-2026-10-24-r15":
        raise ValidationError("Labor and place publication requires reviewed r15")
    output.parent.mkdir(parents=True, exist_ok=True)
    stage_parent = Path(tempfile.mkdtemp(prefix=".atlas-labor-places-stage-", dir=output.parent))
    staged = stage_parent / RELEASE_ID
    try:
        shutil.copytree(base, staged)
        labor = [publish_labor(staged, path, manifest) for path in labor_locks]
        places = publish_pleiades(staged, places_lock, manifest)
        manifest["release_id"] = RELEASE_ID
        manifest["labor_evidence"] = {"selection_policy": "source_native_exact_year_no_definition_or_geography_splice",
            "interpretation": "Employment-to-population rates retain source, sex, age, status and notes; no universal total or global average.",
            "tables": labor}
        manifest["ancient_place_evidence"] = places
        manifest["citations"].extend([
            {"label": "ILOSTAT bulk employment-to-population annual tables (2026-10-23)",
             "url": "https://ilostat.ilo.org/data/bulk/", "license": "CC BY 4.0"},
            {"label": "Pleiades Datasets v4.1 selected GIS exports",
             "url": "https://pleiades.stoa.org/downloads", "license": "CC BY 3.0"},
        ])
        manifest["limitations"].extend([
            "ILOSTAT previous ICLS13 and current ICLS19 employment definitions are not spliced; repeated area/year survey rows remain separate and no global labor rate is calculated.",
            "ILOSTAT source rows after 2025 remain in the complete source CSV but are withheld from the observed-year browser pending method review.",
            "Pleiades name and location year-after/region-before fields are termini, not continuous periods of validity; rough or missing representative locations are not mapped as exact sites.",
        ])
        original_ids = {item["id"] for item in json.loads(source_lock.read_text())["sources"]}
        original_ids.update(item for transformation in manifest["transformations"] for item in transformation["input_artifact_ids"])
        validate_release_manifest(manifest, original_ids)
        write_json(staged / "manifest.json", manifest)
        staged.replace(output)
    finally:
        if staged.exists():
            shutil.rmtree(staged)
        stage_parent.rmdir()
    return {"release_id": RELEASE_ID, "labor": [(item["source_table"], item["published_row_count"]) for item in labor],
            "places": places["row_counts"]}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, default=Path("apps/web/public/atlas/releases/atlas-mvp-2026-10-24-r15"))
    parser.add_argument("--output", type=Path, default=Path(f"apps/web/public/atlas/releases/{RELEASE_ID}"))
    parser.add_argument("--ilostat-old-lock", type=Path, default=Path("data/registry/ilostat-labor-lock.json"))
    parser.add_argument("--ilostat-current-lock", type=Path, default=Path("data/registry/ilostat-current-lock.json"))
    parser.add_argument("--pleiades-lock", type=Path, default=Path("data/registry/pleiades-source-lock.json"))
    parser.add_argument("--source-lock", type=Path, default=Path("data/registry/source-lock.json"))
    args = parser.parse_args()
    print(json.dumps(publish(args.base, args.output, (args.ilostat_old_lock, args.ilostat_current_lock),
                             args.pleiades_lock, args.source_lock)))


if __name__ == "__main__":
    main()
