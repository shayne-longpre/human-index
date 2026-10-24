"""Source-category selection tests without fabricating historical observations."""

import unittest

from pipelines.atlas_etl.stage_seshat_institutions import relevant


class SeshatInstitutionSelectionTests(unittest.TestCase):
    def test_preserves_direct_sections_and_explicit_complexity_variables(self):
        government = {"Courts", "Professional priesthood"}
        self.assertTrue(relevant("Institutional Variables", "Constraint on executive by government", government))
        self.assertTrue(relevant("Religion and Normative Ideology", "Moral concern is primary", government))
        self.assertTrue(relevant("Social Complexity variables", "Courts", government))
        self.assertTrue(relevant("Social Complexity variables", "Religious literature", government))
        self.assertFalse(relevant("Warfare variables", "Iron weapons", government))


if __name__ == "__main__":
    unittest.main()
