"""Explicit acquisition of the publisher-linked Penn World Table 11 workbook."""

from __future__ import annotations

import argparse
import json
import zipfile
from datetime import date
from pathlib import Path

from .acquire_economic_sources import fetch, sha256


URL = "https://dataverse.nl/api/access/datafile/554105"


def acquire(raw: Path, lockfile: Path, retrieved_on: str) -> dict:
    prior = json.loads(lockfile.read_text()) if lockfile.exists() else None
    if prior and (prior["url"] != URL or prior["version"] != "11.0"):
        raise ValueError("PWT lock is for another release")
    if prior and raw.exists() and (sha256(raw) != prior["sha256"] or raw.stat().st_size != prior["bytes"]):
        raise ValueError("Pinned PWT workbook changed")
    fetch(URL, raw)
    if not zipfile.is_zipfile(raw):
        raise ValueError("PWT download is not an XLSX workbook")
    with zipfile.ZipFile(raw) as archive:
        if not {"xl/workbook.xml", "[Content_Types].xml"}.issubset(archive.namelist()):
            raise ValueError("PWT workbook is incomplete")
    record = {
        "schema_version": "0.1.0", "id": "penn-world-table-11.0-workbook",
        "version": "11.0", "url": URL, "path": str(raw),
        "retrieved_on": prior["retrieved_on"] if prior else retrieved_on,
        "bytes": raw.stat().st_size, "sha256": sha256(raw),
        "license": "CC BY 4.0", "license_url": "https://www.rug.nl/ggdc/productivity/pwt/?lang=en",
    }
    if prior and (record["sha256"] != prior["sha256"] or record["bytes"] != prior["bytes"]):
        raise ValueError("Provider changed pinned PWT workbook; review a new release")
    lockfile.parent.mkdir(parents=True, exist_ok=True)
    lockfile.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n")
    return record


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=Path("data/raw/pwt/11.0/pwt110.xlsx"))
    parser.add_argument("--lockfile", type=Path, default=Path("data/registry/pwt-source-lock.json"))
    args = parser.parse_args()
    result = acquire(args.raw, args.lockfile, date.today().isoformat())
    print(json.dumps({"id": result["id"], "bytes": result["bytes"], "sha256": result["sha256"]}))


if __name__ == "__main__":
    main()
