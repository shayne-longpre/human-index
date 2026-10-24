"""Publish a pinned, source-native economics evidence pack in a new release."""

from __future__ import annotations

import argparse
import json
import shutil
import tempfile
from pathlib import Path

from .catalog import validate_release_manifest
from .core import artifact_record, write_json
from .economic_evidence import (
    MADDISON_SOURCE_ID,
    TRANSFORM_ID,
    TRANSFORM_VERSION,
    WB_SOURCE_ID,
    derive,
    verified_artifacts,
)
from .acquire_economic_sources import WORLD_BANK_INDICATORS


RELEASE_ID = "atlas-mvp-2026-10-24-r9"


def publish(base: Path, derived: Path, output: Path, source_lock: Path, economic_lock: Path) -> dict:
    if output.exists():
        raise ValueError(f"Refusing to overwrite an existing release: {output}")
    acquired = verified_artifacts(economic_lock)
    catalog = derive(economic_lock, derived)
    if len(catalog) != 1 + len(WORLD_BANK_INDICATORS):
        raise ValueError("The reviewed economics datasets are required together")
    base_manifest = json.loads((base / "manifest.json").read_text())
    if base_manifest["release_id"] != "atlas-mvp-2026-10-06-r8":
        raise ValueError("Economics publication requires the reviewed r8 base")
    output.parent.mkdir(parents=True, exist_ok=True)
    stage_parent = Path(tempfile.mkdtemp(prefix=".atlas-economics-stage-", dir=output.parent))
    staged = stage_parent / RELEASE_ID
    try:
        shutil.copytree(base, staged)
        target_dir = staged / "economics"
        target_dir.mkdir()
        outputs = {}
        for reference in catalog:
            for key in ("data_file", "download_file"):
                relative = reference[key]
                source = derived / Path(relative).name
                target = staged / relative
                shutil.copyfile(source, target)
                outputs[relative] = artifact_record(target)
            dataset = json.loads((staged / reference["data_file"]).read_text())
            if dataset["source_artifact_sha256"] != acquired[reference["source_artifact_id"]]["sha256"]:
                raise ValueError(f"Source checksum mismatch: {reference['id']}")
            if (dataset["id"] != reference["id"] or dataset["known_value_count"] != reference["known_value_count"]
                    or dataset["transformation"]["version"] != TRANSFORM_VERSION):
                raise ValueError(f"Derived dataset changed: {reference['id']}")
        manifest = base_manifest
        manifest["release_id"] = RELEASE_ID
        manifest["published_on"] = "2026-10-24"
        manifest["economic_evidence"] = {
            "selection_policy": "exact_source_year_only_no_geographic_or_release_splice",
            "interpretation": "Source-native country/economy tables. No historical-polity attribution, interpolation, Atlas-created score, or cross-source average.",
            "datasets": catalog,
        }
        manifest["source_releases"].extend([
            {
                "id": MADDISON_SOURCE_ID,
                "publisher": "Maddison Project Database, Groningen Growth and Development Centre",
                "retrieved_on": acquired["maddison_2023_workbook"]["retrieved_on"],
                "license": "CC BY 4.0; cite underlying original sources for graphical reuse",
                "source_update": "2023",
                "profile": {"published_indicator": "Real GDP per capita in 2011 international dollars", "source_supports": 169, "temporal_policy": "exact_source_year_only"},
            },
            {
                "id": WB_SOURCE_ID,
                "publisher": "World Bank, World Development Indicators",
                "retrieved_on": acquired["world_bank_economic_country_metadata"]["retrieved_on"],
                "license": "CC BY 4.0",
                "source_update": "2026-10-08",
                "profile": {"published_indicator_count": len(WORLD_BANK_INDICATORS), "support": "API nonaggregate country/territory codes", "temporal_policy": "exact_source_year_only"},
            },
        ])
        manifest["citations"].extend([
            {"label": "Maddison Project Database 2023, with original-source references retained in the published dataset", "url": "https://www.rug.nl/ggdc/historicaldevelopment/maddison/releases/maddison-project-database-2023?lang=en", "license": "CC BY 4.0"},
            {"label": "World Bank, World Development Indicators, source update 2026-10-08", "url": "https://data.worldbank.org/indicator", "license": "CC BY 4.0"},
        ])
        manifest["artifacts"].update(outputs)
        manifest["transformations"].append({
            "id": TRANSFORM_ID,
            "version": TRANSFORM_VERSION,
            "input_artifact_ids": sorted(acquired),
            "parameters": {
                "source_inputs": {key: value["sha256"] for key, value in acquired.items()},
                "null_policy": "unknown_not_zero",
                "geography": "source_native_no_crosswalk",
                "time": "exact_source_year_only",
                "cross_release_splice": "prohibited",
                "world_bank_aggregates": "excluded_using_pinned_country_metadata",
            },
            "validation": {"dataset_count": len(catalog), "known_observation_count": sum(item["known_value_count"] for item in catalog)},
            "output_artifacts": outputs,
        })
        manifest["limitations"].extend([
            "Economic evidence is a set of source-native country/economy tables, not a reconstruction of economic activity within historical borders or every human population.",
            "Maddison 2023 starts at 1 CE for a small set of supports; no economic observation is asserted for 10000 BCE–1 BCE. Its original-source sheet references are country-level candidates, not verified per-observation provenance.",
            "Economic indicators have distinct units, supports, methods, releases, and year coverage; this release does not merge them into a score or interpolate missing dates.",
        ])
        original_ids = {item["id"] for item in json.loads(source_lock.read_text())["sources"]}
        surface_ids = {item["source_artifact_id"] for item in manifest["population_surfaces"]["snapshots"]}
        validate_release_manifest(manifest, original_ids | {"atlas_reconciliation_decisions_v1"} | surface_ids | set(acquired))
        write_json(staged / "manifest.json", manifest)
        staged.replace(output)
    finally:
        if staged.exists():
            shutil.rmtree(staged)
        stage_parent.rmdir()
    return {"release_id": RELEASE_ID, "datasets": len(catalog), "known_observations": sum(item["known_value_count"] for item in catalog)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, required=True)
    parser.add_argument("--derived", type=Path, default=Path("data/derived/economics"))
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--source-lock", type=Path, default=Path("data/registry/source-lock.json"))
    parser.add_argument("--economic-lock", type=Path, default=Path("data/registry/economic-source-lock.json"))
    args = parser.parse_args()
    print(json.dumps(publish(args.base, args.derived, args.output, args.source_lock, args.economic_lock)))


if __name__ == "__main__":
    main()
