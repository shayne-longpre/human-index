"""Explicitly acquire public WRP v1.1 files for review, not publication."""

from __future__ import annotations

import argparse
import csv
import json
from datetime import date
from pathlib import Path

from .acquire_economic_sources import fetch, sha256


URLS = {
    "national": "https://correlatesofwar.org/wp-content/uploads/WRP_national.csv",
    "codebook": "https://correlatesofwar.org/wp-content/uploads/wrp-codebook-bibliography.pdf",
}


def acquire(raw_root: Path, lockfile: Path, retrieved_on: str) -> dict:
    prior = json.loads(lockfile.read_text()) if lockfile.exists() else None
    if prior and prior["release"] != "World Religion Data v1.1":
        raise ValueError("Religion source lock points to another release")
    files = {}
    for kind, url in URLS.items():
        path = raw_root / ("WRP_national.csv" if kind == "national" else "wrp-codebook-bibliography.pdf")
        previous = prior["files"][kind] if prior else None
        if previous and (previous["url"] != url or previous["path"] != str(path)):
            raise ValueError("Locked WRP source path or URL changed")
        if previous and path.exists() and (sha256(path) != previous["sha256"] or path.stat().st_size != previous["bytes"]):
            raise ValueError("Pinned WRP source changed")
        fetch(url, path)
        if kind == "codebook":
            with path.open("rb") as stream:
                if stream.read(5) != b"%PDF-":
                    raise ValueError("WRP codebook is not a PDF")
        if kind == "national":
            with path.open(newline="", encoding="utf-8-sig") as stream:
                reader = csv.DictReader(stream)
                if not reader.fieldnames or not {"year", "state"}.issubset({name.lower() for name in reader.fieldnames}):
                    raise ValueError("WRP national CSV schema needs review")
        record = {"url": url, "path": str(path), "bytes": path.stat().st_size, "sha256": sha256(path)}
        if previous and (record["bytes"] != previous["bytes"] or record["sha256"] != previous["sha256"]):
            raise ValueError("Provider changed the pinned WRP artifact; review a new release")
        files[kind] = record
    lock = {
        "schema_version": "0.1.0", "source_id": "world_religion_project",
        "release": "World Religion Data v1.1",
        "retrieved_on": prior["retrieved_on"] if prior else retrieved_on,
        "publication_status": "review_only_republication_terms_unresolved",
        "source_page": "https://correlatesofwar.org/data-sets/world-religion-data/",
        "files": files,
    }
    lockfile.parent.mkdir(parents=True, exist_ok=True)
    lockfile.write_text(json.dumps(lock, indent=2, sort_keys=True) + "\n")
    return lock


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-root", type=Path, default=Path("data/raw/world_religion_project/v1.1"))
    parser.add_argument("--lockfile", type=Path, default=Path("data/registry/religion-source-lock.json"))
    args = parser.parse_args()
    result = acquire(args.raw_root, args.lockfile, date.today().isoformat())
    print(json.dumps({"source_id": result["source_id"], "publication_status": result["publication_status"],
                      "files": {key: item["sha256"] for key, item in result["files"].items()}}))


if __name__ == "__main__":
    main()
