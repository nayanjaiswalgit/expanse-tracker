"""
Account-related models for the finance tracker.
"""

from django.db import models
from .base import UserOwnedModel


class Account(UserOwnedModel):
    """Financial accounts"""

    ACCOUNT_TYPES = [
        ("checking", "Checking"),
        ("savings", "Savings"),
        ("credit", "Credit Card"),
        ("investment", "Investment"),
        ("loan", "Loan"),
        ("cash", "Cash"),
        ("other", "Other"),
    ]

    name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="USD")
    is_active = models.BooleanField(default=True)
    account_number = models.CharField(max_length=50, blank=True)
    institution = models.CharField(max_length=255, blank=True)

    class Meta:
        app_label = "finance"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["account_type"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.account_type})"
