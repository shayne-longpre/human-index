"""The deliberately small interface implemented by MVP source adapters."""

from __future__ import annotations

from typing import Any, Protocol


class SourceAdapter(Protocol):
    """Normalize one acquired release without hiding its native identifiers."""

    def profile(self) -> dict[str, Any]: ...

    def nonaggregate_codes(self) -> set[str]: ...

    def entities(self) -> dict[str, dict[str, Any]]: ...

    def series(self, indicator_id: str) -> dict[tuple[str, int], float | int | None]: ...
