from django.db import models
from django.conf import settings
from core.models.base import TimestampedModel


class ExpenseGroup(TimestampedModel):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_expense_groups",
    )
    GROUP_TYPE_CHOICES = [
        ("one-to-one", "One-to-One"),
        ("multi-person", "Multi-Person"),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    group_type = models.CharField(
        max_length=20, choices=GROUP_TYPE_CHOICES, default="multi-person"
    )

    class Meta:
        verbose_name = "Expense Group"
        verbose_name_plural = "Expense Groups"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class ExpenseGroupMembership(TimestampedModel):
    ROLE_CHOICES = [
        ("member", "Member"),
        ("admin", "Admin"),
    ]

    group = models.ForeignKey(
        ExpenseGroup, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="expense_group_memberships",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member")

    class Meta:
        unique_together = ("group", "user")
        verbose_name = "Expense Group Membership"
        verbose_name_plural = "Expense Group Memberships"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} in {self.group.name}"