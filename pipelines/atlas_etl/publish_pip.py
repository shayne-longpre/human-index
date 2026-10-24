"""Extend immutable r9 with source-native PIP national survey tables."""

from __future__ import annotations

import argparse
import json
import shutil
import tempfile
from pathlib import Path

from .catalog import validate_release_manifest
from .core import artifact_record, write_json
from .economic_evidence import TRANSFORM_VERSION
from .pip_evidence import SOURCE_ID, TRANSFORM_ID, derive


RELEASE_ID = "atlas-mvp-2026-10-24-r10"


def publish(base: Path, derived: Path, output: Path, source_lock: Path, pip_lock: Path) -> dict:
    if output.exists():
        raise ValueError(f"Refusing to overwrite an existing release: {output}")
    lock = json.loads(pip_lock.read_text())
    catalog = derive(pip_lock, derived)
    if len(catalog) != 5:
        raise ValueError("Five PIP indicators are required together")
    original = json.loads((base / "manifest.json").read_text())
    if original["release_id"] != "atlas-mvp-2026-10-24-r9":
        raise ValueError("PIP publication requires r9")
    output.parent.mkdir(parents=True, exist_ok=True)
    stage_parent = Path(tempfile.mkdtemp(prefix=".atlas-pip-stage-", dir=output.parent))
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
        manifest = original
        manifest["release_id"] = RELEASE_ID
        manifest["economic_evidence"]["datasets"].extend(catalog)
        manifest["economic_evidence"]["interpretation"] += " PIP national survey records preserve multiple surveys in a country-year and distinguish income from consumption welfare."
        manifest["source_releases"].append({
            "id": SOURCE_ID, "publisher": "World Bank, Poverty and Inequality Platform",
            "retrieved_on": lock["retrieved_on"], "license": lock["license"],
            "source_update": lock["version"],
            "profile": {"source_rows": lock["source_rows"], "published_indicator_count": len(catalog),
                        "temporal_policy": "exact_national_survey_reporting_year_only"},
        })
        manifest["citations"].append({
            "label": f"World Bank, Poverty and Inequality Platform, version {lock['version']}",
            "url": "https://pip.worldbank.org/about", "license": "CC BY 4.0",
        })
        manifest["artifacts"].update(outputs)
        manifest["transformations"].append({
            "id": TRANSFORM_ID, "version": TRANSFORM_VERSION,
            "input_artifact_ids": ["pip_20260922_surveys_3usd"],
            "parameters": {"source_sha256": lock["sha256"], "reporting_level": "national",
                           "poverty_line_2021_ppp_usd_per_day": 3,
                           "survey_selection": "all_national_rows_keep_duplicate_country_years",
                           "time": "exact_reporting_year_only", "cross_release_splice": "prohibited"},
            "validation": {"dataset_count": len(catalog),
                           "known_observation_count": sum(item["known_value_count"] for item in catalog)},
            "output_artifacts": outputs,
        })
        manifest["limitations"].append(
            "PIP survey Gini and decile shares use country-specific income or consumption welfare; they are not WDI Gini, wealth inequality, or one uniform global welfare concept. Multiple surveys in one country-year remain separate."
        )
        original_ids = {item["id"] for item in json.loads(source_lock.read_text())["sources"]}
        original_input_ids = {id for transform in original["transformations"] for id in transform["input_artifact_ids"]}
        validate_release_manifest(manifest, original_ids | original_input_ids | {"pip_20260922_surveys_3usd"})
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
    parser.add_argument("--base", type=Path, default=Path("apps/web/public/atlas/releases/atlas-mvp-2026-10-24-r9"))
    parser.add_argument("--derived", type=Path, default=Path("data/derived/pip"))
    parser.add_argument("--output", type=Path, default=Path("apps/web/public/atlas/releases/atlas-mvp-2026-10-24-r10"))
    parser.add_argument("--source-lock", type=Path, default=Path("data/registry/source-lock.json"))
    parser.add_argument("--pip-lock", type=Path, default=Path("data/registry/pip-source-lock.json"))
    args = parser.parse_args()
    print(json.dumps(publish(args.base, args.derived, args.output, args.source_lock, args.pip_lock)))


if __name__ == "__main__":
    main()
