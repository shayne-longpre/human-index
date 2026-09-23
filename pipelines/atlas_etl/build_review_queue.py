"""Publish compact, read-only human-review queues for the static web app."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def build_queue(topology_path: Path, cities_path: Path, decisions_path: Path) -> dict[str, Any]:
    topology = load(topology_path)
    cities = load(cities_path)
    decisions = load(decisions_path)
    border_decisions = {
        decision["candidate_key"]: decision
        for decision in decisions["border_overlap_decisions"]
    }
    city_decisions = {
        decision["candidate_id"]: decision
        for decision in decisions["city_identity_decisions"]
    }
    border_candidates = []
    for candidate in topology["overlap_candidates"]:
        key = (
            f"{candidate['left_source_feature_index']}-"
            f"{candidate['right_source_feature_index']}"
        )
        decision = border_decisions.get(key)
        if decision is None:
            raise ValueError(f"Missing border decision for {key}")
        border_candidates.append({**candidate, "decision": decision})
    city_candidates = []
    for candidate in cities["candidates"]:
        decision = city_decisions.get(candidate["candidate_id"])
        if decision is None:
            raise ValueError(f"Missing city decision for {candidate['candidate_id']}")
        city_candidates.append({**candidate, "decision": decision})
    return {
        "schema_version": "0.1.0",
        "status": "versioned_decisions_applied_unresolved_evidence_preserved",
        "warning": (
            "Every current candidate has a deterministic disposition. Accepted place links "
            "do not merge observations; unresolved borders remain visible and cannot allocate population."
        ),
        "decision_set": {
            "id": decisions["decision_set_id"],
            "status": decisions["status"],
            "semantic_boundary": decisions["semantic_boundary"],
            "summary": decisions["summary"],
        },
        "source_policies": decisions["source_policies"],
        "border_overlaps": {
            "source": topology["source"],
            "pilot": topology["pilot"],
            "summary": topology["summary"],
            "candidates": border_candidates,
        },
        "city_identities": {
            "method": cities["method"],
            "series": cities["series"],
            "candidate_counts_by_series_pair": cities["candidate_counts_by_series_pair"],
            "records": cities["candidate_records"],
            "candidates": city_candidates,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--topology", type=Path, required=True)
    parser.add_argument("--cities", type=Path, required=True)
    parser.add_argument("--decisions", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    queue = build_queue(args.topology, args.cities, args.decisions)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(queue, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
