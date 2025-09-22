"""
Goals and group expense models for the finance tracker.
"""

from django.db import models
from django.conf import settings
from .base import UserOwnedModel, TimestampedModel
from .expense_groups import ExpenseGroup


class Goal(UserOwnedModel):
    """Financial goals"""

    GOAL_TYPES = [
        ("savings", "Savings Goal"),
        ("debt_reduction", "Debt Reduction"),
        ("investment", "Investment Goal"),
        ("expense_reduction", "Expense Reduction"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("completed", "Completed"),
        ("paused", "Paused"),
        ("cancelled", "Cancelled"),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    goal_type = models.CharField(max_length=20, choices=GOAL_TYPES)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    target_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    class Meta:
        app_label = "finance"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["goal_type"]),
        ]

    @property
    def progress_percentage(self):
        if self.target_amount <= 0:
            return 0
        return min(100, (self.current_amount / self.target_amount) * 100)

    def __str__(self):
        return self.name


class GroupExpense(TimestampedModel):
    """Group expenses for splitting bills"""

    SPLIT_METHODS = [
        ("equal", "Split Equally"),
        ("percentage", "Split by Percentage"),
        ("amount", "Split by Amount"),
        ("shares", "Split by Shares"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("settled", "Settled"),
        ("cancelled", "Cancelled"),
    ]

    group = models.ForeignKey(
        ExpenseGroup, on_delete=models.CASCADE, related_name="expenses"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_expenses",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    split_method = models.CharField(
        max_length=20, choices=SPLIT_METHODS, default="equal"
    )
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    class Meta:
        app_label = "finance"
        indexes = [
            models.Index(fields=["group", "status"]),
            models.Index(fields=["date"]),
        ]

    def __str__(self):
        return self.title


class GroupExpenseShare(TimestampedModel):
    """Individual shares in group expenses"""

    group_expense = models.ForeignKey(
        GroupExpense, on_delete=models.CASCADE, related_name="shares"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="expense_shares",
    )
    share_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        app_label = "finance"

    @property
    def is_settled(self):
        return self.paid_amount >= self.share_amount

    @property
    def remaining_amount(self):
        return max(0, self.share_amount - self.paid_amount)
