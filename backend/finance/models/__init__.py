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
from .accounts import Account, BalanceRecord
from .transactions import BaseTransaction, Transaction, Category, Tag
from .investments import Investment
from .goals import Goal, GoalImage, GroupExpense, GroupExpenseShare
from .invoices import Invoice
from .expense_groups import ExpenseGroup, ExpenseGroupMembership
from .uploads import (
    UploadSession, StatementImport, TransactionImport,
    TransactionLink, MerchantPattern
)

__all__ = [
    # Base classes
    "TimestampedModel",
    "UserOwnedModel",
    "StatusMixin",
    "MetadataMixin",
    # Account models
    "Account",
    "BalanceRecord",
    # Transaction models
    "BaseTransaction",
    "Transaction",
    "Category",
    "Tag",
    # Investment models
    "Investment",
    # Goal models
    "Goal",
    "GoalImage",
    "GroupExpense",
    "GroupExpenseShare",
    # Invoice models
    "Invoice",
    # Expense Group models
    "ExpenseGroup",
    "ExpenseGroupMembership",
    # Upload models
    "UploadSession",
    "StatementImport",
    "TransactionImport",
    "TransactionLink",
    "MerchantPattern",
]
