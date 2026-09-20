"""Small shared primitives for deterministic Atlas ETL."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class ValidationError(RuntimeError):
    """Raised when acquired evidence violates a release contract."""


@dataclass(frozen=True)
class InputArtifact:
    id: str
    path: Path
    url: str
    retrieved_on: str
    license: str

    def lock_record(self) -> dict[str, Any]:
        payload = self.path.read_bytes()
        return {
            "id": self.id,
            "url": self.url,
            "retrieved_on": self.retrieved_on,
            "bytes": len(payload),
            "sha256": hashlib.sha256(payload).hexdigest(),
            "license": self.license,
        }


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        handle.write("\n")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def artifact_record(path: Path) -> dict[str, int | str]:
    return {"bytes": path.stat().st_size, "sha256": sha256(path)}
