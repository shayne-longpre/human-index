from __future__ import annotations

import unittest

from pipelines.atlas_etl.review_city_crosswalk import (
    CityRow,
    candidate_pairs,
    normalize_name,
    parse_coordinate,
)


def city(record_id: str, name: str, latitude: float, longitude: float) -> CityRow:
    series_id, row = record_id.split(":row-")
    return CityRow(
        series_id=series_id,
        source_row=int(row),
        city=name,
        other_name="",
        country="Test",
        latitude=latitude,
        longitude=longitude,
        certainty="1",
        first_year=1000,
        last_year=1200,
        observation_count=2,
        zero_observation_count=0,
        record_sha256="0" * 64,
    )


class HistoricalCityCandidateTests(unittest.TestCase):
    def test_normalizes_unicode_and_punctuation_without_fuzzy_matching(self) -> None:
        self.assertEqual(normalize_name("  A Coruña  "), "a coruña")
        self.assertEqual(normalize_name("A-Coruña"), "a coruña")
        self.assertNotEqual(normalize_name("Coruna"), normalize_name("Coruña"))

    def test_parses_nonbreaking_coordinate_whitespace(self) -> None:
        self.assertEqual(parse_coordinate(" 31.9\u00a047 "), 31.947)

    def test_candidates_never_claim_reviewed_identity(self) -> None:
        left = city("left:row-2", "Alpha", 10.0, 20.0)
        name_only = city("right:row-2", "Alpha", 11.0, 21.0)
        coordinate_only = city("right:row-3", "Beta", 10.0, 20.0)
        candidates = candidate_pairs([left], [name_only, coordinate_only])
        self.assertEqual(len(candidates), 2)
        self.assertEqual(
            {candidate["candidate_basis"] for candidate in candidates},
            {"exact_normalized_primary_name_only", "rounded_coordinate_only"},
        )
        self.assertTrue(
            all(candidate["review_status"] == "unreviewed_candidate" for candidate in candidates)
        )


if __name__ == "__main__":
    unittest.main()
