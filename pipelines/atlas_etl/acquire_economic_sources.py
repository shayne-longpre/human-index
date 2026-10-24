"""Explicitly acquire a bounded, source-native economic evidence set.

This command is not part of install, development startup, or tests. It saves
the original provider bytes outside Git and records each checksum separately.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import urllib.request
import zipfile
from datetime import date
from pathlib import Path


WORLD_BANK_INDICATORS = {
    "NY.GDP.MKTP.KD": ("GDP (constant 2015 US$)", "constant 2015 US$"),
    "NY.GDP.PCAP.PP.KD": ("GDP per capita, PPP (constant 2021 international $)", "constant 2021 international $/person"),
    "NE.CON.PRVT.PC.KD": ("Household and NPISH consumption per capita", "constant 2015 US$/person"),
    "SI.POV.GINI": ("Gini index", "Gini index points"),
    "SL.UEM.TOTL.ZS": ("Unemployment, modeled ILO estimate", "percent of labor force"),
    "FP.CPI.TOTL.ZG": ("Consumer price inflation", "annual percent"),
    "NE.TRD.GNFS.ZS": ("Trade in goods and services", "percent of GDP"),
    "SI.POV.DDAY": ("Poverty headcount at $3.00 a day (2021 PPP)", "percent of population"),
    "NE.GDI.TOTL.ZS": ("Gross capital formation", "percent of GDP"),
    "NE.CON.GOVT.ZS": ("General government final consumption", "percent of GDP"),
    "NV.AGR.TOTL.ZS": ("Agriculture, forestry, and fishing value added", "percent of GDP"),
    "NV.IND.MANF.ZS": ("Manufacturing value added", "percent of GDP"),
    "NV.SRV.TOTL.ZS": ("Services value added", "percent of GDP"),
}
MADDISON_URL = "https://dataverse.nl/api/access/datafile/421302"
MADDISON_PATH = Path("maddison/2023/mpd2023_web.xlsx")
COUNTRIES_URL = "https://api.worldbank.org/v2/country?format=json&per_page=500"
USER_AGENT = "Atlas-of-Humanity/0.1 (public source acquisition; research software)"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fetch(url: str, destination: Path) -> None:
    if destination.exists():
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(destination.suffix + ".part")
    partial.unlink(missing_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=180) as response, partial.open("wb") as output:
            if response.status != 200:
                raise ValueError(f"Unexpected HTTP {response.status} for {url}")
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        os.replace(partial, destination)
    finally:
        partial.unlink(missing_ok=True)


def world_bank_response(path: Path, indicator: str | None) -> tuple[dict, list[dict]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list) or len(payload) != 2:
        raise ValueError(f"Unexpected World Bank response structure: {path}")
    meta, rows = payload
    if not isinstance(meta, dict) or not isinstance(rows, list) or int(meta.get("pages", 0)) != 1:
        raise ValueError(f"Incomplete World Bank response: {path}")
    if indicator and any(row.get("indicator", {}).get("id") != indicator for row in rows):
        raise ValueError(f"Indicator mismatch: {path}")
    return meta, rows


def artifact(id: str, url: str, path: Path, license_name: str, retrieved_on: str) -> dict:
    return {
        "id": id,
        "url": url,
        "path": str(path),
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
        "license": license_name,
        "retrieved_on": retrieved_on,
    }


def acquire(raw_root: Path, lockfile: Path, retrieved_on: str) -> dict:
    previous = json.loads(lockfile.read_text()) if lockfile.exists() else {}
    old_dates = {item["id"]: item["retrieved_on"] for item in previous.get("artifacts", [])}
    for item in previous.get("artifacts", []):
        existing = Path(item["path"])
        if existing.exists() and (sha256(existing) != item["sha256"] or existing.stat().st_size != item["bytes"]):
            raise ValueError(f"Refusing changed pinned source artifact: {item['id']}")
    artifacts = []

    maddison = raw_root / MADDISON_PATH
    fetch(MADDISON_URL, maddison)
    if not zipfile.is_zipfile(maddison):
        raise ValueError("Maddison download is not an XLSX container")
    with zipfile.ZipFile(maddison) as archive:
        required = {"xl/workbook.xml", "[Content_Types].xml"}
        if not required.issubset(archive.namelist()):
            raise ValueError("Maddison workbook is incomplete")
    artifacts.append(artifact("maddison_2023_workbook", MADDISON_URL, maddison, "CC-BY-4.0", old_dates.get("maddison_2023_workbook", retrieved_on)))

    countries = raw_root / "world_bank/2026-10-24/countries.json"
    fetch(COUNTRIES_URL, countries)
    country_meta, country_rows = world_bank_response(countries, None)
    if len(country_rows) < 200:
        raise ValueError("World Bank country metadata is unexpectedly small")
    artifacts.append(artifact("world_bank_economic_country_metadata", COUNTRIES_URL, countries, "CC-BY-4.0", old_dates.get("world_bank_economic_country_metadata", retrieved_on)))

    source_updates = set()
    for code in WORLD_BANK_INDICATORS:
        url = f"https://api.worldbank.org/v2/country/all/indicator/{code}?format=json&date=1960:2025&per_page=20000"
        path = raw_root / f"world_bank/2026-10-24/economics-{code.lower()}.json"
        item_id = f"world_bank_economic_{code.lower().replace('.', '_')}"
        fetch(url, path)
        meta, rows = world_bank_response(path, code)
        if len(rows) < 10_000:
            raise ValueError(f"World Bank {code} response is unexpectedly small")
        source_updates.add(str(meta.get("lastupdated")))
        artifacts.append(artifact(item_id, url, path, "CC-BY-4.0", old_dates.get(item_id, retrieved_on)))
    if len(source_updates) != 1:
        raise ValueError(f"World Bank indicator source-update mismatch: {source_updates}")

    old_artifacts = {item["id"]: item for item in previous.get("artifacts", [])}
    for item in artifacts:
        old = old_artifacts.get(item["id"])
        if old and (item["sha256"] != old["sha256"] or item["bytes"] != old["bytes"]):
            raise ValueError(f"Provider changed pinned artifact {item['id']}; review a new release instead")

    payload = {
        "schema_version": "0.1.0",
        "status": "acquired_raw_artifacts_not_publication_approval",
        "maddison_source_release_id": "maddison-project-database-2023-v1",
        "world_bank_source_update": source_updates.pop(),
        "world_bank_country_metadata_update": country_meta.get("lastupdated"),
        "artifacts": artifacts,
    }
    lockfile.parent.mkdir(parents=True, exist_ok=True)
    lockfile.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-root", type=Path, default=Path("data/raw"))
    parser.add_argument("--lockfile", type=Path, default=Path("data/registry/economic-source-lock.json"))
    args = parser.parse_args()
    result = acquire(args.raw_root, args.lockfile, date.today().isoformat())
    print(json.dumps({"artifacts": len(result["artifacts"]), "world_bank_source_update": result["world_bank_source_update"]}))


if __name__ == "__main__":
    main()
