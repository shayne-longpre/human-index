"""Write the reproducible UN WPP 2024 acquisition profile."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .sources.un_wpp import Wpp2024MediumAudit


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    profile = Wpp2024MediumAudit(args.input).profile()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(profile, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
