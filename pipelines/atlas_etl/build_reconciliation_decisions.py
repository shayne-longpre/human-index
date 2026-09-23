"""Build versioned reconciliation decisions from pinned candidates and policy.

The output covers every current candidate. It links identities and annotates
source-declared hierarchy without altering source observations or geometries.
Anything the evidence cannot adjudicate receives an explicit unresolved policy.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import unicodedata
import re
from pathlib import Path
from typing import Any


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def digest_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def digest_file(path: Path) -> str:
    return digest_bytes(path.read_bytes())


def normalize_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).casefold().strip()
    return re.sub(r"[^\w]+", " ", normalized).strip()


def name_set(record: dict[str, Any]) -> set[str]:
    values = [record["city"]]
    if record.get("other_name"):
        values.extend(str(record["other_name"]).split(","))
    return {normalize_name(value) for value in values if normalize_name(value)}


def coordinate_key(record: dict[str, Any]) -> tuple[float, float]:
    return (round(float(record["latitude"]), 5), round(float(record["longitude"]), 5))


def distance_km(left: dict[str, Any], right: dict[str, Any]) -> float:
    latitude_1 = math.radians(float(left["latitude"]))
    latitude_2 = math.radians(float(right["latitude"]))
    delta_latitude = latitude_2 - latitude_1
    delta_longitude = math.radians(float(right["longitude"]) - float(left["longitude"]))
    haversine = (
        math.sin(delta_latitude / 2) ** 2
        + math.cos(latitude_1) * math.cos(latitude_2) * math.sin(delta_longitude / 2) ** 2
    )
    return 6371.0088 * 2 * math.asin(math.sqrt(haversine))


class UnionFind:
    def __init__(self) -> None:
        self.parent: dict[str, str] = {}

    def add(self, value: str) -> None:
        self.parent.setdefault(value, value)

    def find(self, value: str) -> str:
        self.add(value)
        while self.parent[value] != value:
            self.parent[value] = self.parent[self.parent[value]]
            value = self.parent[value]
        return value

    def union(self, left: str, right: str) -> None:
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root == right_root:
            return
        first, second = sorted((left_root, right_root))
        self.parent[second] = first


def decide_cities(
    review: dict[str, Any], maximum_same_name_distance_km: float = 10
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    records = review["candidate_records"]
    decisions: list[dict[str, Any]] = []
    accepted = UnionFind()
    for candidate in review["candidates"]:
        left = records[candidate["left_record_id"]]
        right = records[candidate["right_record_id"]]
        primary_name_matches = normalize_name(left["city"]) == normalize_name(right["city"])
        coordinates_match = coordinate_key(left) == coordinate_key(right)
        source_alias_matches = bool(name_set(left).intersection(name_set(right)))
        separation = distance_km(left, right)

        if primary_name_matches and coordinates_match:
            rule_id = "city-exact-primary-name-and-rounded-coordinate-v1"
            disposition = "accepted_same_place"
        elif primary_name_matches and separation <= maximum_same_name_distance_km:
            rule_id = "city-exact-primary-name-within-10km-v1"
            disposition = "accepted_same_place"
        elif coordinates_match and source_alias_matches:
            rule_id = "city-rounded-coordinate-and-source-alias-v1"
            disposition = "accepted_same_place"
        elif primary_name_matches and separation > maximum_same_name_distance_km:
            rule_id = "city-distant-homonym-v1"
            disposition = "rejected_distinct_place"
        elif coordinates_match:
            rule_id = "city-coordinate-only-unresolved-v1"
            disposition = "unresolved_identity"
        else:
            raise ValueError(f"No reconciliation rule covers {candidate['candidate_id']}")

        if disposition == "accepted_same_place":
            accepted.union(candidate["left_record_id"], candidate["right_record_id"])
        decisions.append(
            {
                "decision_id": f"city:{candidate['candidate_id']}",
                "candidate_id": candidate["candidate_id"],
                "disposition": disposition,
                "rule_id": rule_id,
                "left_record_id": candidate["left_record_id"],
                "right_record_id": candidate["right_record_id"],
                "distance_km": round(separation, 3),
                "temporal_coverage_overlaps": candidate["temporal_coverage_overlaps"],
                "evidence_record_sha256s": [left["record_sha256"], right["record_sha256"]],
                "observation_policy": "keep_source_values_and_locators_separate",
                "review_level": "project_authorized_deterministic_rule_not_independent_historian_review",
            }
        )

    groups: dict[str, list[str]] = {}
    for record_id in sorted(accepted.parent):
        groups.setdefault(accepted.find(record_id), []).append(record_id)
    clusters: list[dict[str, Any]] = []
    cluster_by_record: dict[str, str] = {}
    for member_ids in sorted(groups.values()):
        identity = "|".join(member_ids)
        place_id = f"place-{digest_bytes(identity.encode('utf-8'))[:16]}"
        clusters.append(
            {
                "canonical_place_id": place_id,
                "source_record_ids": member_ids,
                "identity_scope": "same_geocoded_place_not_same_urban_extent_or_equal_estimate",
            }
        )
        for record_id in member_ids:
            cluster_by_record[record_id] = place_id
    for decision in decisions:
        if decision["disposition"] == "accepted_same_place":
            left_place_id = cluster_by_record[decision["left_record_id"]]
            right_place_id = cluster_by_record[decision["right_record_id"]]
            if left_place_id != right_place_id:
                raise ValueError("Accepted city pair did not resolve to one place cluster")
            decision["canonical_place_id"] = left_place_id
        else:
            decision["canonical_place_id"] = None
    return decisions, clusters


def split_members(value: Any) -> list[str]:
    return [item.strip() for item in str(value or "").split(";") if item.strip()]


def feature_sha256(feature: dict[str, Any]) -> str:
    canonical = json.dumps(feature, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return digest_bytes(canonical)


def decide_borders(review: dict[str, Any], source: dict[str, Any]) -> list[dict[str, Any]]:
    decisions: list[dict[str, Any]] = []
    for candidate in review["overlap_candidates"]:
        left_index = candidate["left_source_feature_index"]
        right_index = candidate["right_source_feature_index"]
        left_feature = source["features"][left_index]
        right_feature = source["features"][right_index]
        left = left_feature["properties"]
        right = right_feature["properties"]
        left_is_member = left["Name"] in split_members(right.get("Components")) or left.get("MemberOf") == right["Name"]
        right_is_member = right["Name"] in split_members(left.get("Components")) or right.get("MemberOf") == left["Name"]
        if left_is_member or right_is_member:
            rule_id = "border-source-declared-hierarchy-v1"
            disposition = "source_declared_hierarchy"
            parent_index = right_index if left_is_member else left_index
            child_index = left_index if left_is_member else right_index
            render_policy = "render_composite_as_outline_and_retain_member"
        else:
            rule_id = "border-preserve-unresolved-overlap-v1"
            disposition = "unresolved_overlap"
            parent_index = None
            child_index = None
            render_policy = "render_both_with_unresolved_overlap_warning"
        decisions.append(
            {
                "decision_id": f"border:cliopatria-1500:{left_index}-{right_index}",
                "candidate_key": f"{left_index}-{right_index}",
                "disposition": disposition,
                "rule_id": rule_id,
                "left_source_feature_index": left_index,
                "right_source_feature_index": right_index,
                "left_feature_sha256": feature_sha256(left_feature),
                "right_feature_sha256": feature_sha256(right_feature),
                "parent_source_feature_index": parent_index,
                "child_source_feature_index": child_index,
                "overlap_km2": candidate["overlap_km2"],
                "render_policy": render_policy,
                "population_allocation": "prohibited",
                "review_level": (
                    "source_declared_relation"
                    if disposition == "source_declared_hierarchy"
                    else "unresolved_requires_historian_evidence"
                ),
            }
        )
    return decisions


def count_by(rows: list[dict[str, Any]], key: str) -> dict[str, int]:
    result: dict[str, int] = {}
    for row in rows:
        value = str(row[key])
        result[value] = result.get(value, 0) + 1
    return dict(sorted(result.items()))


def build_decisions(
    policy_path: Path,
    city_review_path: Path,
    border_review_path: Path,
    cliopatria_path: Path,
) -> dict[str, Any]:
    policy = load(policy_path)
    city_review = load(city_review_path)
    border_review = load(border_review_path)
    cliopatria = load(cliopatria_path)
    city_rules = {rule["id"]: rule for rule in policy["city_identity_rules"]}
    border_rules = {rule["id"]: rule for rule in policy["border_overlap_rules"]}
    maximum_same_name_distance_km = float(
        city_rules["city-exact-primary-name-within-10km-v1"]["maximum_distance_km"]
    )
    city_decisions, place_clusters = decide_cities(
        city_review, maximum_same_name_distance_km
    )
    border_decisions = decide_borders(border_review, cliopatria)

    if len(city_decisions) != len(city_review["candidates"]):
        raise ValueError("City decisions do not cover every candidate")
    if len(border_decisions) != len(border_review["overlap_candidates"]):
        raise ValueError("Border decisions do not cover every candidate")
    if len({row["candidate_id"] for row in city_decisions}) != len(city_decisions):
        raise ValueError("Duplicate city decision")
    if len({row["candidate_key"] for row in border_decisions}) != len(border_decisions):
        raise ValueError("Duplicate border decision")
    unknown_city_rules = {row["rule_id"] for row in city_decisions}.difference(city_rules)
    unknown_border_rules = {row["rule_id"] for row in border_decisions}.difference(border_rules)
    if unknown_city_rules or unknown_border_rules:
        raise ValueError(
            "Decision builder used rules absent from policy: "
            f"city={sorted(unknown_city_rules)}, border={sorted(unknown_border_rules)}"
        )
    for decision in city_decisions:
        if city_rules[decision["rule_id"]]["result"] != decision["disposition"]:
            raise ValueError(f"City rule result drifted: {decision['decision_id']}")
    for decision in border_decisions:
        if border_rules[decision["rule_id"]]["result"] != decision["disposition"]:
            raise ValueError(f"Border rule result drifted: {decision['decision_id']}")

    return {
        "schema_version": "0.1.0",
        "decision_set_id": "atlas-reconciliation-2026-09-22-v1",
        "status": "complete_for_all_current_candidates_with_unresolved_history_preserved",
        "policy_id": policy["policy_id"],
        "semantic_boundary": policy["semantic_boundary"],
        "inputs": {
            "policy": {"filename": policy_path.name, "sha256": digest_file(policy_path)},
            "city_candidates": {"filename": city_review_path.name, "sha256": digest_file(city_review_path)},
            "border_candidates": {"filename": border_review_path.name, "sha256": digest_file(border_review_path)},
            "cliopatria": {"filename": cliopatria_path.name, "sha256": digest_file(cliopatria_path)},
        },
        "rules": {
            "city_identity": policy["city_identity_rules"],
            "border_overlap": policy["border_overlap_rules"],
        },
        "summary": {
            "city_candidates": len(city_decisions),
            "city_dispositions": count_by(city_decisions, "disposition"),
            "canonical_place_clusters": len(place_clusters),
            "border_candidates": len(border_decisions),
            "border_dispositions": count_by(border_decisions, "disposition"),
            "source_policies": len(policy["source_policies"]),
        },
        "source_policies": policy["source_policies"],
        "place_clusters": place_clusters,
        "city_identity_decisions": city_decisions,
        "border_overlap_decisions": border_decisions,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--policy", type=Path, required=True)
    parser.add_argument("--cities", type=Path, required=True)
    parser.add_argument("--borders", type=Path, required=True)
    parser.add_argument("--cliopatria", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    decisions = build_decisions(
        args.policy,
        args.cities,
        args.borders,
        args.cliopatria,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(decisions, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
