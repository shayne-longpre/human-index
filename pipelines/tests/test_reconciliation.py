from __future__ import annotations

import unittest

from pipelines.atlas_etl.build_reconciliation_decisions import decide_borders, decide_cities


def record(record_id: str, city: str, other_name: str | None, latitude: float, longitude: float) -> dict:
    return {
        "record_id": record_id,
        "city": city,
        "other_name": other_name,
        "country_label": "Test",
        "latitude": latitude,
        "longitude": longitude,
        "record_sha256": (record_id.encode("utf-8").hex() + "0" * 64)[:64],
    }


def candidate(left: str, right: str) -> dict:
    return {
        "candidate_id": f"{left}__{right}",
        "left_record_id": left,
        "right_record_id": right,
        "temporal_coverage_overlaps": False,
    }


class ReconciliationDecisionTests(unittest.TestCase):
    def test_city_rules_link_reject_and_preserve_ambiguity_without_merging_values(self) -> None:
        records = {
            "a:row-1": record("a:row-1", "Alpha", None, 1.0, 1.0),
            "b:row-1": record("b:row-1", "Alpha", None, 1.0, 1.0),
            "a:row-2": record("a:row-2", "London", None, 51.5, -0.1),
            "b:row-2": record("b:row-2", "London", None, 42.98, -81.25),
            "a:row-3": record("a:row-3", "Ahmadabad", "Ahmedabad", 23.03, 72.56),
            "b:row-3": record("b:row-3", "Ahmedabad", None, 23.03, 72.56),
            "a:row-4": record("a:row-4", "Shangqi", "Shanghi", 31.22, 121.45),
            "b:row-4": record("b:row-4", "Shanghai", None, 31.22, 121.45),
        }
        review = {
            "candidate_records": records,
            "candidates": [
                candidate("a:row-1", "b:row-1"),
                candidate("a:row-2", "b:row-2"),
                candidate("a:row-3", "b:row-3"),
                candidate("a:row-4", "b:row-4"),
            ],
        }
        decisions, clusters = decide_cities(review)
        self.assertEqual(
            [decision["disposition"] for decision in decisions],
            [
                "accepted_same_place",
                "rejected_distinct_place",
                "accepted_same_place",
                "unresolved_identity",
            ],
        )
        self.assertEqual(len(clusters), 2)
        self.assertTrue(
            all(
                decision["observation_policy"] == "keep_source_values_and_locators_separate"
                for decision in decisions
            )
        )
        self.assertIsNone(decisions[1]["canonical_place_id"])
        self.assertIsNone(decisions[3]["canonical_place_id"])

    def test_border_rules_use_only_source_declared_hierarchy_and_preserve_other_overlap(self) -> None:
        def feature(name: str, components: str = "", member_of: str = "") -> dict:
            return {
                "type": "Feature",
                "properties": {
                    "Name": name,
                    "Components": components,
                    "MemberOf": member_of,
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]],
                },
            }

        source = {
            "features": [
                feature("(Parent)", components="Member"),
                feature("Member", member_of="(Parent)"),
                feature("Unrelated A"),
                feature("Unrelated B"),
            ]
        }
        review = {
            "overlap_candidates": [
                {
                    "left_source_feature_index": 0,
                    "right_source_feature_index": 1,
                    "overlap_km2": 100,
                },
                {
                    "left_source_feature_index": 2,
                    "right_source_feature_index": 3,
                    "overlap_km2": 50,
                },
            ]
        }
        decisions = decide_borders(review, source)
        self.assertEqual(decisions[0]["disposition"], "source_declared_hierarchy")
        self.assertEqual(decisions[0]["render_policy"], "render_composite_as_outline_and_retain_member")
        self.assertEqual(decisions[1]["disposition"], "unresolved_overlap")
        self.assertEqual(decisions[1]["render_policy"], "render_both_with_unresolved_overlap_warning")
        self.assertTrue(all(decision["population_allocation"] == "prohibited" for decision in decisions))


if __name__ == "__main__":
    unittest.main()
