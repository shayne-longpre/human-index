"""Publish compact, read-only human-review queues for the static web app."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def build_queue(topology_path: Path, cities_path: Path) -> dict[str, Any]:
    topology = load(topology_path)
    cities = load(cities_path)
    return {
        "schema_version": "0.1.0",
        "status": "read_only_candidates_human_review_outstanding",
        "warning": (
            "Automated candidates are leads, not corrections or identity decisions. "
            "The Atlas does not apply them until a source-aware decision is recorded."
        ),
        "border_overlaps": {
            "source": topology["source"],
            "pilot": topology["pilot"],
            "summary": topology["summary"],
            "candidates": topology["overlap_candidates"],
        },
        "city_identities": {
            "method": cities["method"],
            "series": cities["series"],
            "candidate_counts_by_series_pair": cities["candidate_counts_by_series_pair"],
            "records": cities["candidate_records"],
            "candidates": cities["candidates"],
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--topology", type=Path, required=True)
    parser.add_argument("--cities", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    queue = build_queue(args.topology, args.cities)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(queue, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
