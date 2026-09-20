"""Display-geometry handling kept separate from statistical supports."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .core import ValidationError, load_json


NATURAL_EARTH_VERSION = "v5.1.2"
NATURAL_EARTH_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
    "v5.1.2/geojson/ne_110m_admin_0_countries.geojson"
)

# Explicit, release-specific identifier mapping. Names are never join keys.
DISPLAY_CROSSWALKS = {
    "KOS": {
        "world_bank_code": "XKX",
        "reason": "Natural Earth v5.1.2 ADM0_A3 KOS to World Bank economy XKX",
        "review_status": "explicit_release_specific_crosswalk",
    }
}


def _world_bank_code(properties: dict[str, Any], valid_codes: set[str]) -> str | None:
    for key in ("WB_A3", "ADM0_A3", "ISO_A3", "SOV_A3", "GU_A3", "SU_A3"):
        candidate = properties.get(key)
        if candidate in valid_codes:
            return candidate
        if candidate in DISPLAY_CROSSWALKS:
            mapped = DISPLAY_CROSSWALKS[candidate]["world_bank_code"]
            if mapped in valid_codes:
                return mapped
    return None


def build_display_geometry(
    path: Path,
    *,
    valid_codes: set[str],
    entity_names: dict[str, str],
) -> tuple[dict[str, Any], set[str]]:
    source = load_json(path)
    features = source.get("features", [])
    if source.get("type") != "FeatureCollection" or len(features) != 177:
        raise ValidationError("Natural Earth input is not the audited 177-feature collection")

    matched: dict[str, dict[str, Any]] = {}
    for feature in features:
        code = _world_bank_code(feature.get("properties", {}), valid_codes)
        if code is None:
            continue
        if code in matched:
            raise ValidationError(f"Multiple display geometries resolve to {code}")
        matched[code] = feature

    output = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": code,
                "properties": {"code": code, "name": entity_names[code]},
                "geometry": matched[code]["geometry"],
            }
            for code in sorted(matched)
        ],
    }
    return output, set(matched)
