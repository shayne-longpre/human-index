import tempfile
import unittest
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin

from pipelines.atlas_etl.acquire_population_surfaces import TIFF_SIGNATURES, source_url
from pipelines.atlas_etl.population_surface import aggregate_raster, geographic_bin_areas_km2


class PopulationSurfaceTests(unittest.TestCase):
    def test_ghsl_pixel_centre_bins_conserve_counts_and_distinguish_zero(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "synthetic-ghsl.tif"
            with rasterio.open(
                path,
                "w",
                driver="GTiff",
                width=2,
                height=2,
                count=1,
                dtype="float64",
                crs="ESRI:54009",
                transform=from_origin(-1000, 1000, 1000, 1000),
                nodata=-200,
            ) as destination:
                destination.write(np.array([[1, 0], [-200, 2]], dtype="float64"), 1)
            result = aggregate_raster(path, "ghsl", 2020)
        audit = result["transformation"]
        self.assertEqual(audit["source_total_people"], 3)
        self.assertEqual(audit["published_bin_total_people"], 3)
        self.assertEqual(audit["unassigned_outside_grid_people"], 0)
        self.assertEqual(audit["known_zero_bin_count"], 1)
        self.assertEqual(audit["covered_bin_count"], 3)
        self.assertEqual(sum(cell[2] for cell in result["cells"]), 3)

    def test_bin_areas_are_physical_and_vary_with_latitude(self):
        areas = geographic_bin_areas_km2()
        self.assertEqual(len(areas), 180)
        self.assertGreater(areas[89], areas[0])
        self.assertGreater(areas[0], 0)
        self.assertAlmostEqual(areas[89], areas[90], places=4)

    def test_pinned_source_years_reject_unpublished_dates(self):
        self.assertIn("GHS_POP_E1975", source_url("ghsl", 1975)[0])
        with self.assertRaises(ValueError):
            source_url("ghsl", 1976)

    def test_acquisition_accepts_classic_and_big_tiff_headers(self):
        self.assertIn(b"II*\x00", TIFF_SIGNATURES)
        self.assertIn(b"MM\x00*", TIFF_SIGNATURES)
        self.assertIn(b"II+\x00", TIFF_SIGNATURES)
        self.assertIn(b"MM\x00+", TIFF_SIGNATURES)


if __name__ == "__main__":
    unittest.main()
