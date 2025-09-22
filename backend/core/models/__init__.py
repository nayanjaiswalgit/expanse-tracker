"""
Core models package - Base classes only.

Financial models are now in the finance app.
User models are in the users app.
"""

# Import base classes only
from .base import (
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
