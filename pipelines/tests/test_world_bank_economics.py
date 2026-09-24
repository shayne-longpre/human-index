import json
import tempfile
import unittest
from pathlib import Path

from pipelines.atlas_etl.core import ValidationError
from pipelines.atlas_etl.sources.world_bank_economics import (
    GDP_PER_CAPITA_INDICATOR,
    WorldBankEconomicsAdapter,
)


class WorldBankEconomicsAdapterTests(unittest.TestCase):
    def _write(self, root: Path, name: str, value: object) -> Path:
        path = root / name
        path.write_text(json.dumps(value), encoding="utf-8")
        return path

    def test_rejects_a_different_indicator_before_publication(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            countries = [
                {
                    "id": f"X{index:02d}",
                    "region": {"id": "R", "value": "Region"},
                }
                for index in range(217)
            ] + [
                {
                    "id": f"A{index:02d}",
                    "region": {"id": "NA", "value": "Aggregates"},
                }
                for index in range(78)
            ]
            country_path = self._write(
                root,
                "countries.json",
                [{"page": 1, "pages": 1, "total": 295}, countries],
            )
            series_path = self._write(
                root,
                "series.json",
                [
                    {"page": 1, "pages": 1, "total": 1, "lastupdated": "2026-07-13"},
                    [{
                        "indicator": {"id": "NOT_THE_PINNED_INDICATOR"},
                        "countryiso3code": "X00",
                        "date": "2024",
                        "value": 1,
                    }],
                ],
            )
            with self.assertRaisesRegex(ValidationError, "Unexpected indicator"):
                WorldBankEconomicsAdapter(
                    gdp_per_capita=series_path,
                    countries=country_path,
                )

    def test_indicator_id_is_the_constant_price_series(self) -> None:
        self.assertEqual(GDP_PER_CAPITA_INDICATOR, "NY.GDP.PCAP.KD")


if __name__ == "__main__":
    unittest.main()
