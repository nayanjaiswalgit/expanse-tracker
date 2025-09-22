"""
Base classes imported from core.models.base for finance models.
"""

# Import base classes from core app
from core.models.base import (
    TimestampedModel,
    UserOwnedModel,
    StatusMixin,
    MetadataMixin,
)

__all__ = [
    "TimestampedModel",
    "UserOwnedModel",
    "StatusMixin",
    "MetadataMixin",
]
