"""Extend immutable r11 with V-Dem v16 source-native institutional evidence."""

from __future__ import annotations

import argparse
import json
import shutil
import tempfile
from pathlib import Path

from .catalog import validate_release_manifest
from .core import artifact_record, write_json
from .institutional_evidence import SOURCE_ID, TRANSFORM_ID, TRANSFORM_VERSION, derive


RELEASE_ID = "atlas-mvp-2026-10-24-r12"


def publish(base: Path, derived: Path, output: Path, source_lock: Path, candidate_lock: Path) -> dict:
    if output.exists():
        raise ValueError(f"Refusing to overwrite an existing release: {output}")
    catalog = derive(candidate_lock, derived)
    if len(catalog) != 4:
        raise ValueError("Four reviewed V-Dem variables are required")
    manifest = json.loads((base / "manifest.json").read_text())
    if manifest["release_id"] != "atlas-mvp-2026-10-24-r11":
        raise ValueError("Institutional publication requires reviewed r11")
    lock = json.loads(candidate_lock.read_text())
    inputs = {item["id"]: item for item in lock["artifacts"]}
    output.parent.mkdir(parents=True, exist_ok=True)
    stage_parent = Path(tempfile.mkdtemp(prefix=".atlas-institutions-stage-", dir=output.parent))
    staged = stage_parent / RELEASE_ID
    try:
        shutil.copytree(base, staged)
        outputs = {}
        for reference in catalog:
            for field in ("data_file", "download_file"):
                relative = reference[field]
                target = staged / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(derived / Path(relative).name, target)
                outputs[relative] = artifact_record(target)
        manifest["release_id"] = RELEASE_ID
        manifest["institutional_evidence"] = {
            "selection_policy": "exact_source_year_only_no_geographic_or_release_splice",
            "interpretation": "V-Dem source-native country-year tables for legal suffrage, chamber structure, and government treatment of religious practice and organizations. Not religious composition, an Atlas judgement, or a historical-border join.",
            "datasets": catalog,
        }
        manifest["source_releases"].append({
            "id": SOURCE_ID, "publisher": "Varieties of Democracy (V-Dem) Project",
            "retrieved_on": lock.get("retrieved_on", "2026-09-23"),
            "license": "CC BY-SA 4.0 for this V-Dem-derived evidence; retain attribution and share-alike terms",
            "source_update": "v16 (March 2026)",
            "profile": {"country_year_rows": 28092, "source_supports": 202,
                        "published_variable_count": len(catalog), "temporal_policy": "exact_source_year_only"},
        })
        manifest["citations"].append({
            "label": "V-Dem Country-Year Dataset v16 (2026), codebook v16 and suggested citation",
            "url": "https://v-dem.net/data/the-v-dem-dataset/", "license": "CC BY-SA 4.0",
        })
        manifest["artifacts"].update(outputs)
        manifest["transformations"].append({
            "id": TRANSFORM_ID, "version": TRANSFORM_VERSION,
            "input_artifact_ids": ["vdem_v16_country_year_rdata", "vdem_v16_codebook"],
            "parameters": {"source_sha256": inputs["vdem_v16_country_year_rdata"]["sha256"],
                           "codebook_sha256": inputs["vdem_v16_codebook"]["sha256"],
                           "source_object": "vdem", "selection": list(reference["source_variable"] for reference in catalog),
                           "missing": "unknown_not_zero", "geography": "source_native_no_crosswalk",
                           "time": "exact_source_year_only"},
            "validation": {"dataset_count": len(catalog), "source_rows_per_dataset": 28092,
                           "known_observation_count": sum(item["known_value_count"] for item in catalog)},
            "output_artifacts": outputs,
        })
        manifest["limitations"].extend([
            "V-Dem country-year coding units are not joined to Cliopatria historical borders, modern population weights, or a global institutional score.",
            "V-Dem ordinal religion-policy categories are source-authored expert-model outputs, not direct measures of each person's rights or religious identity.",
            "Religious composition is not yet published: Pew needs account/terms review, Seshat Equinox contains conflicting license notices, and WRP/ARDA require reuse review.",
        ])
        original_ids = {item["id"] for item in json.loads(source_lock.read_text())["sources"]}
        input_ids = {item for transformation in manifest["transformations"] for item in transformation["input_artifact_ids"]}
        validate_release_manifest(manifest, original_ids | input_ids)
        write_json(staged / "manifest.json", manifest)
        staged.replace(output)
    finally:
        if staged.exists():
            shutil.rmtree(staged)
        stage_parent.rmdir()
    return {"release_id": RELEASE_ID, "datasets_added": len(catalog),
            "known_values_added": sum(item["known_value_count"] for item in catalog)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, default=Path("apps/web/public/atlas/releases/atlas-mvp-2026-10-24-r11"))
    parser.add_argument("--derived", type=Path, default=Path("data/derived/institutions"))
    parser.add_argument("--output", type=Path, default=Path("apps/web/public/atlas/releases/atlas-mvp-2026-10-24-r12"))
    parser.add_argument("--source-lock", type=Path, default=Path("data/registry/source-lock.json"))
    parser.add_argument("--candidate-lock", type=Path, default=Path("data/registry/candidate-source-lock.json"))
    args = parser.parse_args()
    print(json.dumps(publish(args.base, args.derived, args.output, args.source_lock, args.candidate_lock)))


if __name__ == "__main__":
    main()
