"""Explicit, idempotent acquisition of public population raster source artifacts.

This is intentionally not part of installation, development startup, or tests.
It does not download HYDE or silently substitute another release.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import urllib.request
import zipfile
from pathlib import Path


GHSL_ESTIMATE_YEARS = tuple(range(1975, 2021, 5))
GHSL_PROJECTION_YEARS = (2025, 2030)
GHSL_BASE = "https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_POP_GLOBE_R2023A"
WORLDPOP_BASE = "https://data.worldpop.org/GIS/Population/Global_2015_2030/R2025A"
USER_AGENT = "Atlas-of-Humanity/0.1 (public population source audit)"
TIFF_SIGNATURES = (b"II*\x00", b"MM\x00*", b"II+\x00", b"MM\x00+")


def source_url(source: str, year: int) -> tuple[str, str]:
    if source == "ghsl":
        if year not in (*GHSL_ESTIMATE_YEARS, *GHSL_PROJECTION_YEARS):
            raise ValueError(f"GHSL R2023A has no five-year population product for {year}")
        stem = f"GHS_POP_E{year}_GLOBE_R2023A_54009_1000_V1_0"
        directory = f"GHS_POP_E{year}_GLOBE_R2023A_54009_1000/V1-0"
        return f"{GHSL_BASE}/{directory}/{stem}.zip", f"ghsl/R2023A/{stem}.zip"
    if source == "worldpop":
        if year < 2015 or year > 2030:
            raise ValueError(f"WorldPop Global2 R2025A has no product for {year}")
        filename = f"global_pop_{year}_CN_1km_R2025A_v1.tif"
        return (
            f"{WORLDPOP_BASE}/{year}/0_Mosaicked/v1/1km/constrained/{filename}",
            f"worldpop/R2025A/{filename}",
        )
    raise ValueError(f"Unknown population source {source}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def acquire(source: str, year: int, output: Path) -> dict:
    url, relative_path = source_url(source, year)
    target = output / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        temporary = target.with_suffix(target.suffix + ".partial")
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=90) as response, temporary.open("wb") as stream:
                while chunk := response.read(1024 * 1024):
                    stream.write(chunk)
            temporary.replace(target)
        except Exception:
            temporary.unlink(missing_ok=True)
            raise
    if source == "ghsl":
        with zipfile.ZipFile(target) as archive:
            if archive.testzip() is not None:
                raise ValueError(f"GHSL archive failed integrity check: {target}")
            if len([name for name in archive.namelist() if name.endswith(".tif")]) != 1:
                raise ValueError(f"GHSL archive has unexpected TIFF members: {target}")
    else:
        with target.open("rb") as stream:
            if stream.read(4) not in TIFF_SIGNATURES:
                raise ValueError(f"WorldPop artifact is not a TIFF: {target}")
    return {
        "source": source,
        "year": year,
        "url": url,
        "relative_path": relative_path,
        "bytes": target.stat().st_size,
        "sha256": sha256(target),
        "status": "acquired_for_validation_not_automatically_published",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", choices=("ghsl", "worldpop"), required=True)
    parser.add_argument("--years", type=int, nargs="+", required=True)
    parser.add_argument("--output", type=Path, default=Path("data/raw"))
    parser.add_argument("--lockfile", type=Path, default=Path("data/registry/population-surface-lock.json"))
    args = parser.parse_args()
    acquired = []
    for year in args.years:
        record = acquire(args.source, year, args.output)
        print(json.dumps(record), flush=True)
        acquired.append(record)
    existing = { (item["source"], item["year"]): item for item in (
        json.loads(args.lockfile.read_text())["artifacts"] if args.lockfile.exists() else []
    ) }
    existing.update({(item["source"], item["year"]): item for item in acquired})
    args.lockfile.parent.mkdir(parents=True, exist_ok=True)
    args.lockfile.write_text(json.dumps({
        "schema_version": "0.1.0",
        "artifacts": sorted(existing.values(), key=lambda item: (item["source"], item["year"])),
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
