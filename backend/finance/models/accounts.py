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

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("closed", "Closed"),
        ("frozen", "Frozen"),
        ("pending", "Pending"),
    ]

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    # Basic Information
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, help_text="Account description or notes")
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")

    # Financial Information
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    available_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Available balance excluding holds")
    currency = models.CharField(max_length=3, default="USD")
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Credit limit for credit accounts")
    minimum_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Minimum required balance")

    # Institution Information
    institution = models.CharField(max_length=255, blank=True)
    institution_code = models.CharField(max_length=20, blank=True, help_text="Bank/Institution routing code")
    account_number = models.CharField(max_length=50, blank=True)
    account_number_masked = models.CharField(max_length=50, blank=True, help_text="Masked account number for display")

    # Account Settings
    is_active = models.BooleanField(default=True)
    is_primary = models.BooleanField(default=False, help_text="Primary account for this type")
    include_in_budget = models.BooleanField(default=True, help_text="Include in budget calculations")
    track_balance = models.BooleanField(default=True, help_text="Track balance changes")

    # Dates
    opened_date = models.DateField(null=True, blank=True, help_text="Date account was opened")
    closed_date = models.DateField(null=True, blank=True, help_text="Date account was closed")
    last_sync_date = models.DateTimeField(null=True, blank=True, help_text="Last synchronization with institution")

    # Additional Information
    interest_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True, help_text="Interest rate (annual %)")
    tags = models.JSONField(default=list, blank=True, help_text="Tags for categorization")
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional metadata")

    class Meta:
        app_label = "finance"
        ordering = ["priority", "name"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["user", "status"]),
            models.Index(fields=["account_type"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["institution"]),
            models.Index(fields=["is_primary"]),
            models.Index(fields=["opened_date"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.account_type})"


class BalanceRecord(UserOwnedModel):
    """Unified balance tracking for comprehensive account monitoring"""

    ENTRY_TYPES = [
        ("daily", "Daily Balance"),
        ("monthly", "Monthly Statement"),
        ("weekly", "Weekly Check"),
        ("manual", "Manual Entry"),
        ("reconciliation", "Reconciliation"),
    ]

    RECONCILIATION_STATUS = [
        ("pending", "Pending"),
        ("reconciled", "Reconciled"),
        ("discrepancy", "Has Discrepancy"),
        ("investigation", "Under Investigation"),
    ]

    # Core Information
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="balance_records")
    balance = models.DecimalField(max_digits=12, decimal_places=2, help_text="Account balance at this point")
    date = models.DateField(help_text="Date of the balance record")
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPES, default="manual")

    # Statement/Reconciliation Fields
    statement_balance = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Official statement balance for comparison"
    )
    reconciliation_status = models.CharField(
        max_length=20, choices=RECONCILIATION_STATUS, default="pending"
    )
    difference = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Difference between tracked and statement balance"
    )

    # Transaction Analysis
    total_income = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Total income transactions for the period"
    )
    total_expenses = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Total expense transactions for the period"
    )
    calculated_change = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Calculated balance change based on transactions"
    )
    actual_change = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Actual balance change from previous record"
    )
    missing_transactions = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Estimated missing transaction amount"
    )

    # Period Information
    period_start = models.DateField(null=True, blank=True, help_text="Start of the tracking period")
    period_end = models.DateField(null=True, blank=True, help_text="End of the tracking period")
    is_month_end = models.BooleanField(default=False, help_text="Is this a month-end balance")
    year = models.IntegerField(null=True, blank=True, help_text="Year for easier filtering")
    month = models.IntegerField(null=True, blank=True, help_text="Month for easier filtering")

    # Additional Information
    notes = models.TextField(blank=True, help_text="Additional notes or observations")
    source = models.CharField(
        max_length=100, blank=True,
        help_text="Source of the balance (e.g., mobile app, website, manual)"
    )
    confidence_score = models.DecimalField(
        max_digits=3, decimal_places=2, null=True, blank=True,
        help_text="Confidence in the balance accuracy (0.00-1.00)"
    )
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional metadata")

    class Meta:
        app_label = "finance"
        ordering = ["-date", "account__name"]
        unique_together = [["account", "date", "entry_type"]]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["account", "date"]),
            models.Index(fields=["entry_type", "date"]),
            models.Index(fields=["reconciliation_status"]),
            models.Index(fields=["is_month_end", "date"]),
            models.Index(fields=["year", "month"]),
            models.Index(fields=["user", "entry_type", "date"]),
            models.Index(fields=["account", "entry_type", "date"]),
        ]

    def save(self, *args, **kwargs):
        """Auto-populate year and month from date"""
        if self.date:
            # Convert string to date if needed
            if isinstance(self.date, str):
                from datetime import datetime
                self.date = datetime.strptime(self.date, '%Y-%m-%d').date()

            self.year = self.date.year
            self.month = self.date.month

            # Calculate actual change if we have a previous record
            if self.pk is None:  # Only for new records
                previous_record = BalanceRecord.objects.filter(
                    account=self.account,
                    date__lt=self.date
                ).order_by('-date').first()

                if previous_record:
                    self.actual_change = self.balance - previous_record.balance

                    # Calculate missing transactions if we have transaction data
                    if self.calculated_change != 0:
                        self.missing_transactions = self.actual_change - self.calculated_change

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.account.name} - {self.date} ({self.entry_type}): {self.balance}"

    @property
    def month_name(self):
        """Get month name for display"""
        if self.month:
            import calendar
            return calendar.month_name[self.month]
        return ""

    @property
    def date_display(self):
        """Get formatted date for display"""
        return self.date.strftime("%Y-%m-%d") if self.date else ""

    @property
    def has_discrepancy(self):
        """Check if there's a discrepancy between statement and tracked balance"""
        return abs(self.difference) > 0.01 or abs(self.missing_transactions) > 0.01

    @property
    def balance_status(self):
        """Get balance status for analysis"""
        if self.has_discrepancy:
            return "discrepancy"
        elif self.reconciliation_status == "reconciled":
            return "reconciled"
        else:
            return "normal"




