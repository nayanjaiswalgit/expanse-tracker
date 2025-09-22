"""
Finance app models - Financial domain models moved from core app.

This package contains all financial models organized by domain.
"""

# Import base classes
from core.models.base import (
    TimestampedModel,
    UserOwnedModel,
    StatusMixin,
    MetadataMixin,
)

# Import all financial models
from .accounts import Account
from .transactions import BaseTransaction, Transaction, Category, Tag
from .investments import Investment
from .goals import Goal, GroupExpense, GroupExpenseShare
from .invoices import Invoice
from .expense_groups import ExpenseGroup, ExpenseGroupMembership

__all__ = [
    # Base classes
    "TimestampedModel",
    "UserOwnedModel",
    "StatusMixin",
    "MetadataMixin",
    # Account models
    "Account",
    # Transaction models
    "BaseTransaction",
    "Transaction",
    "Category",
    "Tag",
    # Investment models
    "Investment",
    # Goal models
    "Goal",
    "GroupExpense",
    "GroupExpenseShare",
    # Invoice models
    "Invoice",
    # Expense Group models
    "ExpenseGroup",
    "ExpenseGroupMembership",
]
