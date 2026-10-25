"""Explicitly acquire official UCDP OrganizedViolenceCY 26.1 and codebook."""

from __future__ import annotations

import argparse
import hashlib
import json
import urllib.request
from pathlib import Path

from .core import write_json


ARTIFACTS = (
    ("ucdp_organized_violence_cy_26_1_zip", "organizedviolencecy-261-csv.zip", "https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-261-csv.zip"),
    ("ucdp_organized_violence_cy_26_1_codebook", "UCDP_OrganizedViolenceCY_Codebook_261.pdf", "https://ucdp.uu.se/downloads/organizedviolencecy/UCDP_OrganizedViolenceCY_Codebook_261.pdf"),
)


def acquire(output: Path, lock_path: Path) -> dict:
    if lock_path.exists():
        raise ValueError(f"Refusing to overwrite acquisition lock: {lock_path}")
    output.mkdir(parents=True, exist_ok=True)
    records = []
    for artifact_id, filename, url in ARTIFACTS:
        target = output / filename
        if target.exists():
            raise ValueError(f"Refusing to overwrite acquired artifact: {target}")
        request = urllib.request.Request(url, headers={"User-Agent": "Atlas-of-Humanity-research/0.1"})
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = response.read()
        if len(payload) < 1000:
            raise ValueError(f"Unexpectedly short official artifact: {url}")
        target.write_bytes(payload)
        records.append({"id": artifact_id, "source_id": "ucdp_organized_violence_cy",
                        "path": str(target), "url": url, "bytes": len(payload),
                        "sha256": hashlib.sha256(payload).hexdigest(), "license": "CC BY 4.0",
                        "retrieved_on": "2026-10-24"})
    lock = {"status": "acquired_candidate", "version": "26.1", "artifacts": records,
            "terms_url": "https://ucdp.uu.se/downloads/"}
    write_json(lock_path, lock)
    return {"artifacts": len(records), "bytes": sum(item["bytes"] for item in records)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("data/raw/ucdp/26.1/organizedviolencecy"))
    parser.add_argument("--lock", type=Path, default=Path("data/registry/ucdp-country-year-lock.json"))
    args = parser.parse_args()
    print(json.dumps(acquire(args.output, args.lock)))


if __name__ == "__main__":
    main()
