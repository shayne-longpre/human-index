"""Extend immutable r10 with seven source-native PWT 11 measures."""

from __future__ import annotations

import argparse
import json
import shutil
import tempfile
from pathlib import Path

from .catalog import validate_release_manifest
from .core import artifact_record, write_json
from .economic_evidence import TRANSFORM_VERSION
from .pwt_evidence import SOURCE_ID, TRANSFORM_ID, derive


RELEASE_ID = "atlas-mvp-2026-10-24-r11"


def publish(base: Path, derived: Path, output: Path, source_lock: Path, pwt_lock: Path) -> dict:
    if output.exists():
        raise ValueError(f"Refusing to overwrite an existing release: {output}")
    lock = json.loads(pwt_lock.read_text())
    catalog = derive(pwt_lock, derived)
    if len(catalog) != 7:
        raise ValueError("Seven PWT source-native measures are required together")
    manifest = json.loads((base / "manifest.json").read_text())
    if manifest["release_id"] != "atlas-mvp-2026-10-24-r10":
        raise ValueError("PWT publication requires reviewed r10")
    output.parent.mkdir(parents=True, exist_ok=True)
    stage_parent = Path(tempfile.mkdtemp(prefix=".atlas-pwt-stage-", dir=output.parent))
    staged = stage_parent / RELEASE_ID
    try:
        shutil.copytree(base, staged)
        outputs = {}
        for reference in catalog:
            for field in ("data_file", "download_file"):
                relative = reference[field]
                target = staged / relative
                shutil.copyfile(derived / Path(relative).name, target)
                outputs[relative] = artifact_record(target)
        manifest["release_id"] = RELEASE_ID
        manifest["economic_evidence"]["datasets"].extend(catalog)
        manifest["economic_evidence"]["interpretation"] += " PWT 11 real output, employment, hours, TFP, capital stock and labor-share measures remain source-native and separate from Maddison/WDI."
        manifest["source_releases"].append({
            "id": SOURCE_ID, "publisher": "Penn World Table, Groningen Growth and Development Centre",
            "retrieved_on": lock["retrieved_on"], "license": "CC BY 4.0",
            "source_update": "11.0 (published 2025-10-07)",
            "profile": {"source_rows": catalog[0]["source_row_count"],
                        "source_supports": 185, "published_indicator_count": len(catalog),
                        "temporal_policy": "exact_source_year_only"},
        })
        manifest["citations"].append({
            "label": "Penn World Table 11.0; Feenstra, Inklaar and Timmer (2015)",
            "url": "https://www.rug.nl/ggdc/productivity/pwt/?lang=en", "license": "CC BY 4.0",
        })
        manifest["artifacts"].update(outputs)
        manifest["transformations"].append({
            "id": TRANSFORM_ID, "version": TRANSFORM_VERSION,
            "input_artifact_ids": ["pwt_11_workbook"],
            "parameters": {"source_sha256": lock["sha256"],
                           "sheet": "Data", "legend_sheet": "Legend",
                           "selection": "seven_unaltered_source_variables_all_source_country_years",
                           "missing": "unknown_not_zero", "cross_source_splice": "prohibited"},
            "validation": {"dataset_count": len(catalog),
                           "known_observation_count": sum(item["known_value_count"] for item in catalog)},
            "output_artifacts": outputs,
        })
        manifest["limitations"].append(
            "PWT TFP is a model-based productivity level (USA=1), not output per labor-hour; employment and hours are separate inputs, not an Atlas-derived labor-productivity series. Country supports are not historical polities."
        )
        original_ids = {item["id"] for item in json.loads(source_lock.read_text())["sources"]}
        input_ids = {id for item in manifest["transformations"] for id in item["input_artifact_ids"]}
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
    parser.add_argument("--base", type=Path, default=Path("apps/web/public/atlas/releases/atlas-mvp-2026-10-24-r10"))
    parser.add_argument("--derived", type=Path, default=Path("data/derived/pwt"))
    parser.add_argument("--output", type=Path, default=Path("apps/web/public/atlas/releases/atlas-mvp-2026-10-24-r11"))
    parser.add_argument("--source-lock", type=Path, default=Path("data/registry/source-lock.json"))
    parser.add_argument("--pwt-lock", type=Path, default=Path("data/registry/pwt-source-lock.json"))
    args = parser.parse_args()
    print(json.dumps(publish(args.base, args.derived, args.output, args.source_lock, args.pwt_lock)))


if __name__ == "__main__":
    main()
