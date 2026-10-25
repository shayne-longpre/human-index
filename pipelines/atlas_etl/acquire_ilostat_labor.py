"""Acquire one current ILOSTAT annual labor table and its matching dictionaries."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import tempfile
import urllib.request
from pathlib import Path

from .core import write_json


DEFAULT_TABLE = "EMP_DWAP_SEX_AGE_RT_A"
SUPPORTED_TABLES = (DEFAULT_TABLE, "EMP_5WAP_SEX_AGE_RT_A")
BASE = "https://rplumber.ilo.org"


def acquire(output: Path, lock_path: Path, table: str = DEFAULT_TABLE) -> dict:
    if table not in SUPPORTED_TABLES:
        raise ValueError(f"Unsupported ILOSTAT table: {table}")
    if output.exists() or lock_path.exists():
        raise ValueError("Refusing to overwrite ILOSTAT acquisition or lock")
    urls = {
        f"{table}.csv.gz": f"{BASE}/data/indicator?format=.csv.gz&id={table}",
        "table_of_contents_en.csv": f"{BASE}/metadata/toc/indicator?format=.csv&lang=en",
        "source_en.csv": f"{BASE}/metadata/dic?format=.csv&lang=en&var=source",
        "ref_area_en.csv": f"{BASE}/metadata/dic?format=.csv&lang=en&var=ref_area",
        "sex_en.csv": f"{BASE}/metadata/dic?format=.csv&lang=en&var=sex",
        "classif1_en.csv": f"{BASE}/metadata/dic?format=.csv&lang=en&var=classif1",
        "obs_status_en.csv": f"{BASE}/metadata/dic?format=.csv&lang=en&var=obs_status",
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    artifacts = []
    with tempfile.TemporaryDirectory(prefix=".ilostat-stage-", dir=output.parent) as temporary:
        stage = Path(temporary)
        for name, url in urls.items():
            directory = "dic.html" if "metadata/dic" in url else "indicator.html"
            request = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0",
                "Referer": f"{BASE}/files/website/bulk/{directory}",
            })
            with urllib.request.urlopen(request, timeout=90) as response:
                payload = response.read()
            if len(payload) < (100 if name.endswith(".gz") else 10):
                raise ValueError(f"Unexpectedly short ILOSTAT artifact: {url}")
            if name.endswith(".gz"):
                if payload[:2] != b"\x1f\x8b" or not gzip.decompress(payload).startswith(b'"ref_area","source",'):
                    raise ValueError("ILOSTAT response is not the expected CSV.gz table")
            elif not payload.removeprefix(b"\xef\xbb\xbf").startswith((
                b'"id",', b'"ref_area",', b'"source",', b'"sex",', b'"classif1",', b'"obs_status",',
            )):
                raise ValueError(f"Unexpected ILOSTAT metadata format: {name}")
            (stage / name).write_bytes(payload)
            artifacts.append({"id": f"ilostat_{name.removesuffix('.csv.gz').removesuffix('.csv')}",
                              "source_id": "ilostat_direct_labor", "path": str(output / name),
                              "url": url, "bytes": len(payload),
                              "sha256": hashlib.sha256(payload).hexdigest(), "retrieved_on": "2026-10-24"})
        stage.rename(output)
    write_json(lock_path, {"status": "acquired_for_source_dimension_and_vintage_review",
                           "table": table, "directory_url": f"{BASE}/files/website/bulk/indicator.html",
                           "license_url": "https://www.ilo.org/rights-and-permissions",
                           "license_scope": "post_2023_05_03_datasets_and_referential_metadata_CC_BY_4_0_except_restricted_microdata",
                           "artifacts": artifacts})
    return {"table": table, "artifacts": len(artifacts), "bytes": sum(item["bytes"] for item in artifacts)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("data/raw/ilostat/2026-10-24"))
    parser.add_argument("--lock", type=Path, default=Path("data/registry/ilostat-labor-lock.json"))
    parser.add_argument("--table", choices=SUPPORTED_TABLES, default=DEFAULT_TABLE)
    args = parser.parse_args()
    print(json.dumps(acquire(args.output, args.lock, args.table)))


if __name__ == "__main__":
    main()
