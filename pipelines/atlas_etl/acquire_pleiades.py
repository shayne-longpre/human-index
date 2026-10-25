"""Explicitly acquire the fixed Pleiades v4.1 GIS place/name/point exports."""

from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
import urllib.request
from pathlib import Path

from .core import write_json


VERSION = "v4.1"
FILES = ("README.md", "places.csv", "names.csv", "location_points.csv")
ROOT_URL = f"https://raw.githubusercontent.com/isawnyu/pleiades.datasets/{VERSION}/data/gis"


def acquire(output: Path, lock_path: Path) -> dict:
    if output.exists() or lock_path.exists():
        raise ValueError("Refusing to overwrite Pleiades acquisition or lock")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".pleiades-stage-", dir=output.parent) as temporary:
        stage = Path(temporary)
        artifacts = []
        for filename in FILES:
            url = f"{ROOT_URL}/{filename}"
            request = urllib.request.Request(url, headers={"User-Agent": "Atlas-of-Humanity-research/0.1"})
            with urllib.request.urlopen(request, timeout=90) as response:
                payload = response.read()
            if len(payload) < 100:
                raise ValueError(f"Unexpectedly short Pleiades file: {url}")
            (stage / filename).write_bytes(payload)
            artifacts.append({"id": f"pleiades_v4_1_{filename.replace('.', '_')}",
                              "source_id": "pleiades", "path": str(output / filename),
                              "url": url, "bytes": len(payload),
                              "sha256": hashlib.sha256(payload).hexdigest(),
                              "license": "CC BY 3.0", "retrieved_on": "2026-10-24"})
        stage.rename(output)
    write_json(lock_path, {"status": "acquired_for_profile_not_released", "version": VERSION,
                           "license_url": "https://pleiades.stoa.org/downloads",
                           "release_url": "https://github.com/isawnyu/pleiades.datasets/releases/tag/v4.1",
                           "artifacts": artifacts})
    return {"files": len(artifacts), "bytes": sum(item["bytes"] for item in artifacts)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("data/raw/pleiades/v4.1/gis"))
    parser.add_argument("--lock", type=Path, default=Path("data/registry/pleiades-source-lock.json"))
    args = parser.parse_args()
    print(json.dumps(acquire(args.output, args.lock)))


if __name__ == "__main__":
    main()
