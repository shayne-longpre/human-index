"""Explicitly acquire the two public, pinned CCP archives for local review."""

from __future__ import annotations

import argparse
import json
import tempfile
import urllib.request
from pathlib import Path

from .core import sha256


def acquire(lockfile: Path) -> dict[str, str]:
    lock = json.loads(lockfile.read_text(encoding="utf-8"))
    if lock.get("source_id") != "comparative_constitutions_project":
        raise ValueError("Expected a pinned CCP source lock")
    verified = {}
    for name, artifact in lock["artifacts"].items():
        path = Path(artifact["path"])
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            with tempfile.NamedTemporaryFile(dir=path.parent, suffix=".download", delete=False) as stream:
                temporary = Path(stream.name)
                try:
                    with urllib.request.urlopen(artifact["url"], timeout=90) as response:
                        while chunk := response.read(1024 * 1024):
                            stream.write(chunk)
                except Exception:
                    temporary.unlink(missing_ok=True)
                    raise
            if temporary.stat().st_size != artifact["bytes"] or sha256(temporary) != artifact["sha256"]:
                temporary.unlink(missing_ok=True)
                raise ValueError(f"Downloaded CCP {name} differs from the pinned archive")
            temporary.replace(path)
        if path.stat().st_size != artifact["bytes"] or sha256(path) != artifact["sha256"]:
            raise ValueError(f"Pinned CCP {name} archive changed")
        verified[name] = artifact["sha256"]
    return verified


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lockfile", type=Path, default=Path("data/registry/ccp-source-lock.json"))
    args = parser.parse_args()
    print(json.dumps(acquire(args.lockfile), sort_keys=True))


if __name__ == "__main__":
    main()
