"""Record exact-code/year WRP↔CCP candidates without asserting territorial equivalence."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

from .core import artifact_record, sha256, write_json

TRANSFORM_ID = "wrp-ccp-cow-code-year-candidate-v1"


def _cow_code(value: object) -> int:
    raw = str(value)
    if not raw.isdecimal() or int(raw) <= 0:
        raise ValueError(f"Invalid COW-style source code: {raw!r}")
    return int(raw)


def reconcile(wrp_path: Path, ccp_path: Path, output: Path) -> dict:
    wrp = json.loads(wrp_path.read_text(encoding="utf-8"))
    ccp = json.loads(ccp_path.read_text(encoding="utf-8"))
    if wrp.get("source_id") != "world_religion_project" or ccp.get("source_id") != "comparative_constitutions_project":
        raise ValueError("Expected staged WRP and CCP sources")
    for path in (wrp_path, ccp_path):
        receipt_path = path.with_suffix(".receipt.json")
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
        if receipt["output"]["sha256"] != sha256(path):
            raise ValueError(f"Staged source checksum disagrees with receipt: {path}")

    ccp_section = ccp["sections"]["characteristics_v5"]
    ccp_columns = ccp_section["columns"]
    ccp_lookup: dict[tuple[int, int], list[dict]] = defaultdict(list)
    for item in ccp_section["rows"]:
        row = dict(zip(ccp_columns, item["cells"], strict=True))
        key = (_cow_code(row["cowcode"]), int(row["year"]))
        ccp_lookup[key].append({"source_row": item["source_row"], "source_code": row["cowcode"],
                                "source_name": row["country"]})

    wrp_columns = wrp["columns"]
    candidates = []
    for item in wrp["rows"]:
        row = dict(zip(wrp_columns, item["cells"], strict=True))
        key = (_cow_code(row["state"]), int(row["year"]))
        matches = ccp_lookup.get(key, [])
        if matches:
            candidates.append({
                "cow_code": key[0], "source_year": key[1],
                "wrp": {"source_row": item["source_row"], "source_code": row["state"], "source_name": row["name"]},
                "ccp": matches,
                "disposition": "same_code_year_candidate_support_not_reviewed",
            })
    result = {
        "schema_version": "0.1.0", "decision_set_id": TRANSFORM_ID,
        "access_class": "local_research_only_not_in_public_release",
        "input_artifacts": [{"id": "wrp-national-v1.1-stage", "sha256": sha256(wrp_path)},
                            {"id": "ccp-religion-stage", "sha256": sha256(ccp_path)}],
        "transformation": {"id": TRANSFORM_ID, "version": "1.0.0", "parameters": {
            "key": "integer-normalized COW-style source code and exact source year",
            "geography_policy": "candidate only; no asserted territorial equivalence or map join",
            "duplicate_policy": "preserve every CCP same-year source row",
        }},
        "candidate_count": len(candidates), "wrp_source_row_count": len(wrp["rows"]),
        "ccp_source_row_count": len(ccp_section["rows"]), "candidates": candidates,
    }
    write_json(output, result)
    receipt = {"schema_version": "0.1.0", "input_artifacts": result["input_artifacts"],
               "transformation": result["transformation"], "output": artifact_record(output),
               "candidate_count": len(candidates)}
    write_json(output.with_suffix(".receipt.json"), receipt)
    return receipt


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wrp", type=Path, default=Path("data/derived/religion/wrp-national-v1.1.json"))
    parser.add_argument("--ccp", type=Path, default=Path("data/derived/institutions/ccp-religion-local.json"))
    parser.add_argument("--output", type=Path, default=Path("data/derived/institutions/wrp-ccp-candidates-local.json"))
    args = parser.parse_args()
    print(json.dumps(reconcile(args.wrp, args.ccp, args.output), sort_keys=True))


if __name__ == "__main__":
    main()
