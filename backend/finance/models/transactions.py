"""
Transaction-related models for the finance tracker.
"""

from datetime import timedelta
from django.db import models
from django.utils import timezone
from .base import UserOwnedModel


class BaseTransaction(UserOwnedModel):
    """Abstract base for all transaction types"""

    # Core fields
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField()
    date = models.DateField()
    currency = models.CharField(max_length=3, default="USD")
    notes = models.TextField(blank=True)
    external_id = models.CharField(max_length=255, null=True, blank=True)

    # Status tracking
    STATUS_CHOICES = [
        ("active", "Active"),
        ("cancelled", "Cancelled"),
        ("pending", "Pending"),
        ("failed", "Failed"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    class Meta:
        abstract = True


class Category(UserOwnedModel):
    """Transaction categories with hierarchical support"""

    CATEGORY_TYPES = [
        ("income", "Income"),
        ("expense", "Expense"),
        ("both", "Both"),
    ]

    name = models.CharField(max_length=100)
    category_type = models.CharField(
        max_length=10, choices=CATEGORY_TYPES, default="expense"
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="subcategories",
    )
    color = models.CharField(max_length=7, default="#0066CC")  # Hex color
    icon = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "finance"
        verbose_name_plural = "Categories"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["user", "category_type"]),
            models.Index(fields=["parent"]),
        ]

    def __str__(self):
        return self.name


class Tag(UserOwnedModel):
    """Transaction tags"""

    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default="#6B7280")

    class Meta:
        app_label = "finance"
        unique_together = ["user", "name"]

    def __str__(self):
        return self.name



class Transaction(BaseTransaction):
    """Unified transaction model handling all transaction types"""

    # Transaction categories for different use cases
    TRANSACTION_CATEGORIES = [
        ("standard", "Standard Transaction"),
        ("investment", "Investment Transaction"),
        ("lending", "Lending Transaction"),
        ("recurring_template", "Recurring Template"),
        ("group_expense", "Group Expense"),
    ]

    # Standard transaction types
    TRANSACTION_TYPES = [
        ("income", "Income"),
        ("expense", "Expense"),
        ("transfer", "Transfer"),
        ("buy", "Buy Investment"),
        ("sell", "Sell Investment"),
        ("dividend", "Dividend"),
        ("lend", "Lend Money"),
        ("borrow", "Borrow Money"),
        ("repayment", "Repayment"),
    ]

    # Recurrence frequency options
    FREQUENCY_CHOICES = [
        ("daily", "Daily"),
        ("weekly", "Weekly"),
        ("biweekly", "Bi-weekly"),
        ("monthly", "Monthly"),
        ("quarterly", "Quarterly"),
        ("yearly", "Yearly"),
    ]

    # Core categorization
    transaction_category = models.CharField(
        max_length=20, choices=TRANSACTION_CATEGORIES, default="standard"
    )
    transaction_type = models.CharField(
        max_length=20, choices=TRANSACTION_TYPES, default="expense"
    )

    # Standard transaction fields - using string references to avoid circular imports
    account = models.ForeignKey(
        "Account",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="transactions",
    )
    transfer_account = models.ForeignKey(
        "Account",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="transfer_transactions",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    suggested_category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="suggested_transactions",
    )
    tags = models.ManyToManyField(Tag, blank=True, related_name="transactions")

    # Investment-specific fields
    investment = models.ForeignKey(
        "Investment",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="transactions",
    )
    quantity = models.DecimalField(
        max_digits=15, decimal_places=6, null=True, blank=True
    )
    price_per_unit = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )
    fees = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Lending-specific fields
    contact_user = models.ForeignKey(
        "auth.User",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="lending_transactions",
    )
    due_date = models.DateField(null=True, blank=True)
    interest_rate = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )

    # Recurring transaction template fields
    is_template = models.BooleanField(default=False)
    template_name = models.CharField(max_length=255, blank=True)
    frequency = models.CharField(
        max_length=20, choices=FREQUENCY_CHOICES, null=True, blank=True
    )
    frequency_interval = models.PositiveIntegerField(default=1, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    max_executions = models.PositiveIntegerField(null=True, blank=True)
    next_execution_date = models.DateField(null=True, blank=True)
    is_active_template = models.BooleanField(default=False)
    is_manual = models.BooleanField(default=False)
    auto_categorize = models.BooleanField(default=True)
    execution_conditions = models.JSONField(default=dict, blank=True)

    # Group expense fields
    group_expense = models.ForeignKey(
        "GroupExpense",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="transactions",
    )

    # Enhanced fields
    merchant_name = models.CharField(max_length=255, null=True, blank=True)
    original_description = models.TextField(null=True, blank=True)
    verified = models.BooleanField(default=False)
    gmail_message_id = models.CharField(
        max_length=255, null=True, blank=True, unique=True
    )

    # Metadata
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        app_label = "finance"
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "transaction_category"]),
            models.Index(fields=["user", "transaction_type"]),
            models.Index(fields=["account"]),
            models.Index(fields=["category"]),
            models.Index(fields=["investment"]),
            models.Index(fields=["contact_user"]),
            models.Index(fields=["is_template", "is_active_template"]),
            models.Index(fields=["next_execution_date", "is_active_template"]),
        ]

    def __str__(self):
        if self.is_template:
            return f"Template: {self.template_name or self.description}"
        return f"{self.description} - {self.amount} ({self.date})"

    @property
    def total_executions(self):
        """Get total executions for recurring templates"""
        if not self.is_template:
            return 0
        return self.execution_logs.count()

    @property
    def successful_executions(self):
        """Get successful executions for recurring templates"""
        if not self.is_template:
            return 0
        return self.execution_logs.filter(status="completed").count()

    @property
    def failed_executions(self):
        """Get failed executions for recurring templates"""
        if not self.is_template:
            return 0
        return self.execution_logs.filter(status="failed").count()

    def update_next_execution_date(self):
        """Update the next execution date based on frequency"""
        if not self.is_template or not self.frequency:
            return

        current_date = (
            self.next_execution_date or self.start_date or timezone.now().date()
        )

        if self.frequency == "daily":
            next_date = current_date + timedelta(days=self.frequency_interval)
        elif self.frequency == "weekly":
            next_date = current_date + timedelta(weeks=self.frequency_interval)
        elif self.frequency == "biweekly":
            next_date = current_date + timedelta(weeks=2 * self.frequency_interval)
        elif self.frequency == "monthly":
            # Add months (approximate)
            next_date = current_date + timedelta(days=30 * self.frequency_interval)
        elif self.frequency == "quarterly":
            next_date = current_date + timedelta(days=90 * self.frequency_interval)
        elif self.frequency == "yearly":
            next_date = current_date + timedelta(days=365 * self.frequency_interval)
        else:
            return

        # Check if we should stop (end date or max executions)
        if self.end_date and next_date > self.end_date:
            self.is_active_template = False
            self.next_execution_date = None
        elif self.max_executions and self.total_executions >= self.max_executions:
            self.is_active_template = False
            self.next_execution_date = None
        else:
            self.next_execution_date = next_date

        self.save()
