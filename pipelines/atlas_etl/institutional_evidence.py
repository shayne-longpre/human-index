"""Extract a bounded set of source-native V-Dem v16 country-year variables."""

from __future__ import annotations

import argparse
import csv
import json
import math
from collections import Counter
from pathlib import Path

import pandas as pd
import pyreadr

from .core import sha256, write_json


SOURCE_ID = "vdem-country-year-v16"
TRANSFORM_ID = "vdem-source-native-institutions-v1"
TRANSFORM_VERSION = "1.0.0"
FIELDS = {
    "v2x_suffr": {
        "domain": "government_institutions", "label": "Legal suffrage among statutory adults",
        "unit": "fraction (0–1)", "kind": "fraction", "codebook_page": 50,
        "meaning": "De-jure right to vote in national elections among adult citizens as defined by statute; not actual voting or de-facto access.",
    },
    "v2lgbicam": {
        "domain": "government_institutions", "label": "Legislature chambers",
        "unit": "source category", "kind": "ordinal", "codes": {0: "No chamber", 1: "One chamber", 2: "Two or more chambers"},
        "codebook_page": 164,
        "meaning": "Source-coded number of legislative chambers; country-year aggregation uses the source's minimum within the year.",
    },
    "v2clrelig_ord": {
        "domain": "religion_policy", "label": "Freedom of religion, V-Dem ordinal category",
        "unit": "source category", "kind": "ordinal",
        "codes": {0: "Not respected", 1: "Weakly respected", 2: "Somewhat respected", 3: "Mostly respected", 4: "Fully respected"},
        "codebook_page": 205,
        "meaning": "Source-authored ordinal version of an expert-coded freedom-of-religion indicator; not a share of people or religious affiliation.",
    },
    "v2csrlgrep_ord": {
        "domain": "religion_policy", "label": "Religious-organization repression, V-Dem ordinal category",
        "unit": "source category", "kind": "ordinal",
        "codes": {0: "Severe", 1: "Substantial", 2: "Moderate", 3: "Weak", 4: "None"},
        "codebook_page": 224,
        "meaning": "Source-authored ordinal version of an expert-coded government repression indicator; higher categories mean less repression, not a population percentage.",
    },
}
REQUIRED = {"country_name", "country_text_id", "country_id", "year", "historical", "histname", "project", *FIELDS}


def _integer(value: object, label: str) -> int:
    if pd.isna(value) or not isinstance(value, (int, float)) or not math.isfinite(value) or int(value) != value:
        raise ValueError(f"Invalid V-Dem {label}: {value!r}")
    return int(value)


def extract(frame: pd.DataFrame, output: Path, source_hash: str, *, expected_rows: int | None = None) -> list[dict]:
    """Emit exact-year tables; absent frame rows are never manufactured."""
    if not REQUIRED.issubset(frame.columns):
        raise ValueError(f"V-Dem columns missing: {sorted(REQUIRED - set(frame.columns))}")
    if expected_rows is not None and len(frame) != expected_rows:
        raise ValueError("Pinned V-Dem row count changed")
    supports: dict[str, dict] = {}
    seen: set[tuple[str, int]] = set()
    rows = []
    for row_number, values in enumerate(frame[list(REQUIRED)].to_dict("records"), start=1):
        code = str(_integer(values["country_id"], "country ID"))
        year = _integer(values["year"], "year")
        text_id, name = values["country_text_id"], values["country_name"]
        if not isinstance(text_id, str) or not text_id or not isinstance(name, str) or not name or not 1789 <= year <= 2025:
            raise ValueError(f"Invalid V-Dem support at row {row_number}")
        support = {"code": code, "source_text_id": text_id, "name": name}
        if code in supports and supports[code] != support:
            raise ValueError(f"V-Dem support identity changed for {code}")
        supports[code] = support
        if (code, year) in seen:
            raise ValueError(f"Duplicate V-Dem country ID and year: {code}, {year}")
        seen.add((code, year))
        historical = _integer(values["historical"], "historical flag")
        project = _integer(values["project"], "project flag")
        if historical not in (0, 1) or project not in (0, 1, 2):
            raise ValueError(f"Unrecognized V-Dem flags at row {row_number}")
        rows.append((code, year, row_number, historical, project, values))

    output.mkdir(parents=True, exist_ok=True)
    catalog = []
    for field, spec in FIELDS.items():
        observations = []
        counts: Counter[int] = Counter()
        dataset_id = f"vdem16-{field}"
        csv_path = output / f"{dataset_id}.csv"
        with csv_path.open("w", newline="", encoding="utf-8") as stream:
            writer = csv.writer(stream, lineterminator="\n")
            writer.writerow(["source_release_id", "variable", "country_id", "country_text_id", "country_name", "year", "value", "value_status", "historical", "histname", "project", "original_record_locator"])
            for code, year, row_number, historical, project, values in rows:
                raw = values[field]
                value = None if pd.isna(raw) else float(raw)
                if value is not None:
                    if not math.isfinite(value):
                        raise ValueError(f"Invalid {field} at V-Dem row {row_number}")
                    if spec["kind"] == "fraction" and not 0 <= value <= 1:
                        raise ValueError(f"Fraction outside 0–1 for {field} at row {row_number}")
                    if spec["kind"] == "ordinal" and (not value.is_integer() or int(value) not in spec["codes"]):
                        raise ValueError(f"Unknown category for {field} at row {row_number}")
                    observations.append([code, year, value, row_number])
                    counts[year] += 1
                writer.writerow([SOURCE_ID, field, code, values["country_text_id"], values["country_name"], year,
                                 "" if value is None else value, "unknown" if value is None else "known", historical,
                                 "" if pd.isna(values["histname"]) else values["histname"], project,
                                 f"vdem.RData::vdem[{row_number}]::{field}"])
        years = sorted(counts)
        dataset = {
            "schema_version": "0.1.0", "id": dataset_id, "domain": spec["domain"],
            "source_release_id": SOURCE_ID, "source_artifact_id": "vdem_v16_country_year_rdata",
            "source_artifact_sha256": source_hash, "source_variable": field, "label": spec["label"],
            "unit": spec["unit"], "kind": spec["kind"], "category_labels": spec.get("codes"),
            "codebook_page": spec["codebook_page"], "meaning": spec["meaning"],
            "support_type": "V-Dem country coding unit; no automatic historical border or population join",
            "temporal_policy": "exact_source_year_only",
            "transformation": {"id": TRANSFORM_ID, "version": TRANSFORM_VERSION,
                               "policy": "source_value_and_missingness_preserved_no_imputation_or_geographic_crosswalk"},
            "source_citation_url": "https://v-dem.net/data/the-v-dem-dataset/",
            "source_supports": sorted(supports.values(), key=lambda item: int(item["code"])),
            "source_rows": [[code, year, row_number] for code, year, row_number, *_ in rows],
            "source_row_count": len(rows), "known_value_count": len(observations),
            "available_years": years, "known_by_year": {str(year): counts[year] for year in years},
            "observations": observations,
        }
        write_json(output / f"{dataset_id}.json", dataset)
        catalog.append({key: dataset[key] for key in ("id", "domain", "source_release_id", "source_artifact_id",
                                                     "source_artifact_sha256", "source_variable", "label", "unit", "kind",
                                                     "available_years", "source_row_count", "known_value_count")}
                       | {"data_file": f"institutions/{dataset_id}.json", "download_file": f"institutions/{dataset_id}.csv"})
    return catalog


def derive(lockfile: Path, output: Path) -> list[dict]:
    lock = json.loads(lockfile.read_text())
    artifacts = {item["id"]: item for item in lock["artifacts"]}
    source = artifacts["vdem_v16_country_year_rdata"]
    codebook = artifacts["vdem_v16_codebook"]
    for item in (source, codebook):
        path = Path(item["path"])
        if path.stat().st_size != item["bytes"] or sha256(path) != item["sha256"]:
            raise ValueError(f"Pinned V-Dem artifact changed: {item['id']}")
    loaded = pyreadr.read_r(source["path"])
    if set(loaded) != {"vdem"}:
        raise ValueError("Unexpected V-Dem RData objects")
    return extract(loaded["vdem"], output, source["sha256"], expected_rows=28092)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lockfile", type=Path, default=Path("data/registry/candidate-source-lock.json"))
    parser.add_argument("--output", type=Path, default=Path("data/derived/institutions"))
    args = parser.parse_args()
    catalog = derive(args.lockfile, args.output)
    print(json.dumps({"datasets": len(catalog), "known_values": sum(item["known_value_count"] for item in catalog)}))


if __name__ == "__main__":
    main()
