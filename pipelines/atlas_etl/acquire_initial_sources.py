"""Explicitly acquire the public inputs for the first Atlas release.

Nothing calls this command during install, development startup, tests, or the
fixture-based build. Network acquisition is an intentional operator action.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import urllib.request
import zipfile
from pathlib import Path

from .build_mvp_release import CLIOPATRIA_GEOMETRY_MEMBER, RETRIEVED_ON
from .geography import NATURAL_EARTH_URL, NATURAL_EARTH_VERSION
from .sources.world_bank import SOURCE_URLS
from .sources.cliopatria import SOURCE_LICENSE_URL as CLIOPATRIA_LICENSE_URL
from .sources.cliopatria import SOURCE_URL as CLIOPATRIA_URL
from .sources.us_census_population import SOURCE_URL as HISTORICAL_POPULATION_URL


USER_AGENT = "Atlas-of-Humanity/0.1 source-audit (research software)"


def download(url: str, destination: Path) -> dict[str, object]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=120) as response:
        payload = response.read()
        status = response.status
        content_type = response.headers.get("Content-Type")
    if status != 200:
        raise RuntimeError(f"Unexpected HTTP status {status} for {url}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(payload)
    return {
        "url": url,
        "path": str(destination),
        "bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "content_type": content_type,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    world_bank = args.output / "world_bank" / RETRIEVED_ON
    natural_earth = args.output / "natural_earth" / NATURAL_EARTH_VERSION
    historical_population = args.output / "us_census" / RETRIEVED_ON
    cliopatria = args.output / "cliopatria" / "v0.2.0"
    cliopatria_archive = cliopatria / "cliopatria.geojson.zip"
    artifacts = [
        download(SOURCE_URLS["world_bank_electricity"], world_bank / "electricity.json"),
        download(SOURCE_URLS["world_bank_population"], world_bank / "population.json"),
        download(SOURCE_URLS["world_bank_countries"], world_bank / "countries.json"),
        download(
            NATURAL_EARTH_URL,
            natural_earth / "ne_110m_admin_0_countries.geojson",
        ),
        download(
            HISTORICAL_POPULATION_URL,
            historical_population / "historical-est-worldpop.html",
        ),
        download(CLIOPATRIA_URL, cliopatria_archive),
        download(CLIOPATRIA_LICENSE_URL, cliopatria / "LICENSE.md"),
    ]
    with zipfile.ZipFile(cliopatria_archive) as archive:
        member = CLIOPATRIA_GEOMETRY_MEMBER
        if member not in archive.namelist():
            raise RuntimeError(f"Pinned Cliopatria archive lacks {member}")
        destination = cliopatria / member
        destination.write_bytes(archive.read(member))
        artifacts.append(
            {
                "url": f"{CLIOPATRIA_URL}#{member}",
                "path": str(destination),
                "bytes": destination.stat().st_size,
                "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
                "content_type": "application/geo+json",
            }
        )
    print(json.dumps({"retrieved_on": RETRIEVED_ON, "artifacts": artifacts}, indent=2))


if __name__ == "__main__":
    main()
