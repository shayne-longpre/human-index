"""Publish PIP's national survey records without choosing among duplicate surveys."""

from __future__ import annotations

import argparse
import csv
import json
import math
from collections import Counter
from pathlib import Path

from .acquire_economic_sources import sha256
from .economic_evidence import TRANSFORM_VERSION


FIELDS = {
    "headcount": ("Poverty headcount at $3/day, PIP survey", "fraction of surveyed population"),
    "poverty_gap": ("Poverty gap at $3/day, PIP survey", "fraction of poverty line"),
    "gini": ("Welfare Gini, PIP survey", "Gini coefficient, 0–1"),
    "decile1": ("Bottom decile welfare share, PIP survey", "fraction of total surveyed welfare"),
    "decile10": ("Top decile welfare share, PIP survey", "fraction of total surveyed welfare"),
}
SOURCE_ID = "world-bank-pip-20260922-2021-surveys"
TRANSFORM_ID = "pip-source-native-survey-table-v1"


def _read(lockfile: Path) -> tuple[dict, list[dict[str, str]]]:
    lock = json.loads(lockfile.read_text())
    path = Path(lock["path"])
    if lock["id"] != SOURCE_ID or sha256(path) != lock["sha256"] or path.stat().st_size != lock["bytes"]:
        raise ValueError("Pinned PIP artifact changed or missing")
    with path.open(newline="", encoding="utf-8") as stream:
        rows = list(csv.DictReader(stream))
    if len(rows) != lock["source_rows"]:
        raise ValueError("PIP source row count changed")
    for index, row in enumerate(rows, 2):
        if (row["reporting_level"] not in {"national", "urban", "rural"}
                or row["welfare_type"] not in {"income", "consumption"}
                or not row["country_code"] or not row["country_name"]
                or not row["survey_acronym"] or not row["survey_year"]
                or not row["reporting_year"].isdigit()):
            raise ValueError(f"Invalid PIP survey scope at CSV row {index}")
    return lock, rows


def derive(lockfile: Path, output: Path) -> list[dict]:
    lock, rows = _read(lockfile)
    output.mkdir(parents=True, exist_ok=True)
    catalog = []
    national = [(index, row) for index, row in enumerate(rows, 2) if row["reporting_level"] == "national"]
    if len(national) < 2000 or any(
        row["is_interpolated"] != "FALSE" or row["estimation_type"] != "survey"
        for _, row in national
    ):
        raise ValueError("PIP survey selection changed")
    if any(row["poverty_line"] != "3" for row in rows):
        raise ValueError("PIP poverty line changed")
    for field, (label, unit) in FIELDS.items():
        supports = []
        observations = []
        counts: Counter[int] = Counter()
        for source_row, row in national:
            year = int(row["reporting_year"])
            value = float(row[field]) if row[field] else None
            if value is not None and (not math.isfinite(value) or not 0 <= value <= 1):
                raise ValueError(f"Invalid PIP {field} at CSV row {source_row}")
            support_id = f"PIP:{source_row}"
            supports.append({
                "code": support_id,
                "name": f"{row['country_name']} · {row['survey_acronym']} ({row['survey_year']})",
                "region": row["region_name"],
                "country_code": row["country_code"],
                "welfare_type": row["welfare_type"],
                "reporting_year": year,
            })
            if value is not None:
                observations.append([support_id, year, value, source_row])
                counts[year] += 1
        dataset_id = f"pip-{field.replace('_', '-')}-2021-ppp"
        dataset = {
            "schema_version": "0.1.0", "id": dataset_id,
            "source_release_id": SOURCE_ID, "source_artifact_id": "pip_20260922_surveys_3usd",
            "source_artifact_sha256": lock["sha256"], "source_sheet": "PIP API CSV",
            "indicator": field, "label": label, "unit": unit,
            "support_type": "PIP national household survey record; multiple surveys per country-year retained",
            "observation_grain": "survey_record", "temporal_policy": "exact_source_year_only",
            "transformation": {"id": TRANSFORM_ID, "version": TRANSFORM_VERSION,
                               "policy": "unaltered_national_survey_values; subnational_rows_in_CSV; no_selection_among_duplicate_country_year_surveys"},
            "source_note": "PIP reports survey welfare as income or consumption (shown per row). National surveys only are listed. Poverty uses the 2021-PPP $3/day line. These are not interchangeable with WDI or WID inequality definitions.",
            "source_citation_url": "https://pip.worldbank.org/about",
            "source_supports": supports, "source_references": [],
            "source_row_count": len(rows), "known_value_count": len(observations),
            "available_years": sorted(counts),
            "known_by_year": {str(year): counts[year] for year in sorted(counts)},
            "observations": observations,
        }
        json_path = output / f"{dataset_id}.json"
        csv_path = output / f"{dataset_id}.csv"
        json_path.write_text(json.dumps(dataset, separators=(",", ":"), ensure_ascii=False) + "\n")
        with csv_path.open("w", newline="", encoding="utf-8") as stream:
            writer = csv.writer(stream, lineterminator="\n")
            writer.writerow(["source_release_id", "indicator", "country_code", "country_name", "reporting_year", "survey_year", "survey_acronym", "reporting_level", "welfare_type", "value", "unit", "is_interpolated", "included_in_table", "original_record_locator"])
            for index, row in enumerate(rows, 2):
                writer.writerow([SOURCE_ID, field, row["country_code"], row["country_name"], row["reporting_year"], row["survey_year"], row["survey_acronym"], row["reporting_level"], row["welfare_type"], row[field], unit, row["is_interpolated"], row["reporting_level"] == "national", f"PIP API CSV row {index}"])
        catalog.append({
            "id": dataset_id, "source_release_id": SOURCE_ID,
            "source_artifact_id": "pip_20260922_surveys_3usd", "source_artifact_sha256": lock["sha256"],
            "indicator": field, "label": label, "unit": unit,
            "support_type": dataset["support_type"], "observation_grain": "survey_record",
            "temporal_policy": "exact_source_year_only", "available_years": dataset["available_years"],
            "source_row_count": len(rows), "known_value_count": len(observations),
            "data_file": f"economics/{json_path.name}", "download_file": f"economics/{csv_path.name}",
        })
    return catalog


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lockfile", type=Path, default=Path("data/registry/pip-source-lock.json"))
    parser.add_argument("--output", type=Path, default=Path("data/derived/pip"))
    args = parser.parse_args()
    catalog = derive(args.lockfile, args.output)
    print(json.dumps({"datasets": len(catalog), "known_values": sum(item["known_value_count"] for item in catalog)}))


if __name__ == "__main__":
    main()
