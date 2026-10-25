"""Acquire the OWID long-run life-expectancy CSV with its matching metadata."""

from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
import urllib.request
from pathlib import Path

from .core import write_json


URLS = {
    "life-expectancy.csv": "https://ourworldindata.org/grapher/life-expectancy.csv?v=1&csvType=full&useColumnShortNames=false",
    "life-expectancy.metadata.json": "https://ourworldindata.org/grapher/life-expectancy.metadata.json?v=1&csvType=full&useColumnShortNames=false",
}


def acquire(output: Path, lock_path: Path) -> dict:
    if output.exists() or lock_path.exists():
        raise ValueError("Refusing to overwrite the OWID acquisition or lock")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".owid-life-stage-", dir=output.parent) as temporary:
        stage = Path(temporary)
        artifacts = []
        for name, url in URLS.items():
            request = urllib.request.Request(url, headers={"User-Agent": "Atlas-of-Humanity-research/0.1"})
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = response.read()
            if len(payload) < 100:
                raise ValueError(f"Unexpectedly short OWID artifact: {url}")
            (stage / name).write_bytes(payload)
            artifacts.append({"id": f"owid_life_expectancy_{'metadata' if name.endswith('json') else 'csv'}",
                              "source_id": "owid_life_expectancy", "path": str(output / name),
                              "url": url, "bytes": len(payload),
                              "sha256": hashlib.sha256(payload).hexdigest(), "retrieved_on": "2026-10-24",
                              "license_status": "underlying_hmd_and_zijdeman_reuse_terms_unresolved"})
        metadata = json.loads((stage / "life-expectancy.metadata.json").read_text())
        if "Period life expectancy at birth" not in metadata.get("columns", {}):
            raise ValueError("OWID chart metadata no longer describes the selected variable")
        stage.rename(output)
    write_json(lock_path, {"status": "acquired_for_review_not_redistribution_approved",
                           "chart_url": "https://ourworldindata.org/grapher/life-expectancy",
                           "artifacts": artifacts})
    return {"artifacts": len(artifacts), "bytes": sum(item["bytes"] for item in artifacts)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("data/raw/owid/life-expectancy/2026-10-24"))
    parser.add_argument("--lock", type=Path, default=Path("data/registry/owid-life-expectancy-lock.json"))
    args = parser.parse_args()
    print(json.dumps(acquire(args.output, args.lock)))


if __name__ == "__main__":
    main()
