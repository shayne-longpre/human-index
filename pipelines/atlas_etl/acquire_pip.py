"""Acquire one explicitly versioned PIP survey response; never run at startup."""

from __future__ import annotations

import argparse
import csv
import json
from datetime import date
from pathlib import Path

from .acquire_economic_sources import fetch, sha256


PIP_VERSION = "20260922_2021_01_02_PROD"
PIP_URL = (
    "https://api.worldbank.org/pip/v1/pip?country=ALL&povline=3"
    f"&version={PIP_VERSION}&fill_gaps=false&format=csv"
)
PIP_COLUMNS = {
    "country_code", "country_name", "reporting_year", "reporting_level",
    "survey_acronym", "survey_year", "welfare_type", "poverty_line",
    "headcount", "poverty_gap", "gini", "decile1", "decile10",
    "is_interpolated", "distribution_type", "estimation_type",
}


def acquire(raw: Path, lockfile: Path, retrieved_on: str) -> dict:
    prior = None
    if lockfile.exists():
        prior = json.loads(lockfile.read_text())
        if prior["url"] != PIP_URL or prior["version"] != PIP_VERSION:
            raise ValueError("PIP lock is for another release")
        if raw.exists() and (sha256(raw) != prior["sha256"] or raw.stat().st_size != prior["bytes"]):
            raise ValueError("Pinned PIP source changed")
    fetch(PIP_URL, raw)
    with raw.open(newline="", encoding="utf-8") as stream:
        reader = csv.DictReader(stream)
        if not PIP_COLUMNS.issubset(reader.fieldnames or []):
            raise ValueError("PIP source columns changed")
        rows = sum(1 for _ in reader)
    if rows < 1000:
        raise ValueError("PIP response unexpectedly small")
    record = {
        "schema_version": "0.1.0", "id": "world-bank-pip-20260922-2021-surveys",
        "version": PIP_VERSION, "url": PIP_URL, "path": str(raw),
        "retrieved_on": prior["retrieved_on"] if prior else retrieved_on,
        "bytes": raw.stat().st_size,
        "sha256": sha256(raw), "source_rows": rows,
        "license": "CC BY 4.0 (World Bank Poverty and Equity Database catalog)",
        "license_url": "https://datacatalog.worldbank.org/search/dataset/0038020/poverty-and-equity-database-poverty-and-inequality-platform",
    }
    if lockfile.exists() and (record["sha256"] != prior["sha256"] or record["bytes"] != prior["bytes"]):
        raise ValueError("Provider changed pinned PIP artifact; review a new release")
    lockfile.parent.mkdir(parents=True, exist_ok=True)
    lockfile.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n")
    return record


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=Path("data/raw/pip/20260922_2021_01_02_PROD/surveys-3usd.csv"))
    parser.add_argument("--lockfile", type=Path, default=Path("data/registry/pip-source-lock.json"))
    args = parser.parse_args()
    result = acquire(args.raw, args.lockfile, date.today().isoformat())
    print(json.dumps({"id": result["id"], "source_rows": result["source_rows"], "sha256": result["sha256"]}))


if __name__ == "__main__":
    main()
