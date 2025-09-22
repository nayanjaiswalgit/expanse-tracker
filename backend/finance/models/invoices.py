"""
Invoice-related models for the finance tracker.
"""

from django.db import models
from .base import UserOwnedModel


class Invoice(UserOwnedModel):
    """Invoice management"""

    INVOICE_TYPES = [
        ("standard", "Standard Invoice"),
        ("recurring", "Recurring Invoice"),
        ("quote", "Quote"),
        ("receipt", "Receipt"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("sent", "Sent"),
        ("paid", "Paid"),
        ("overdue", "Overdue"),
        ("cancelled", "Cancelled"),
    ]

    invoice_type = models.CharField(
        max_length=20, choices=INVOICE_TYPES, default="standard"
    )
    invoice_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    # Client information
    client_name = models.CharField(max_length=255)
    client_email = models.EmailField(blank=True)
    client_address = models.TextField(blank=True)

    # Invoice details
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")

    # Dates
    issue_date = models.DateField()
    due_date = models.DateField()
    paid_date = models.DateField(null=True, blank=True)

    # AI generation tracking
    generated_by_ai = models.BooleanField(default=False)
    ai_confidence_score = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )

    # File storage
    pdf_file = models.FileField(upload_to="invoices/", null=True, blank=True)

    class Meta:
        app_label = "finance"
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["issue_date"]),
            models.Index(fields=["due_date"]),
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.client_name}"
