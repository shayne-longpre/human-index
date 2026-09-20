"""Source-specific Atlas adapters."""

from .world_bank import WorldBankAdapter

SOURCE_ADAPTERS = {"world_bank": WorldBankAdapter}

__all__ = ["SOURCE_ADAPTERS", "WorldBankAdapter"]
