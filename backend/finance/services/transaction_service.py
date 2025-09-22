"""
Transaction service for handling transaction business logic.
"""

from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Count
from django.utils import timezone
from core.services.base import BaseService
from ..models import Transaction, Category, Account


class TransactionService(BaseService):
    """Service for transaction operations"""

    def get_queryset(self):
        return Transaction.objects.all()

    def create_transaction(self, transaction_data):
        """Create a new transaction with validation"""
        with transaction.atomic():
            # Validate account exists and belongs to user
            if transaction_data.get("account"):
                account = Account.objects.get(
                    id=transaction_data["account"], user=self.user
                )
                transaction_data["account"] = account

            # Handle category assignment
            if transaction_data.get("category"):
                category = Category.objects.get(
                    id=transaction_data["category"], user=self.user
                )
                transaction_data["category"] = category

            # Create transaction
            transaction_obj = Transaction.objects.create(
                user=self.user, **transaction_data
            )

            # Update account balance if it's an expense/income
            if account and transaction_obj.transaction_type in ["expense", "income"]:
                self._update_account_balance(account, transaction_obj)

            return transaction_obj

    def update_transaction(self, transaction_id, update_data):
        """Update an existing transaction"""
        with transaction.atomic():
            transaction_obj = self.get_user_queryset().get(id=transaction_id)
            old_amount = transaction_obj.amount
            old_type = transaction_obj.transaction_type

            # Update transaction
            for field, value in update_data.items():
                setattr(transaction_obj, field, value)
            transaction_obj.save()

            # Recalculate account balance if amount or type changed
            if transaction_obj.account and (
                old_amount != transaction_obj.amount
                or old_type != transaction_obj.transaction_type
            ):
                self._recalculate_account_balance(transaction_obj.account)

            return transaction_obj

    def delete_transaction(self, transaction_id):
        """Delete a transaction and update account balance"""
        with transaction.atomic():
            transaction_obj = self.get_user_queryset().get(id=transaction_id)
            account = transaction_obj.account

            transaction_obj.delete()

            # Recalculate account balance
            if account:
                self._recalculate_account_balance(account)

    def get_transactions_by_date_range(self, start_date, end_date, filters=None):
        """Get transactions within a date range with optional filters"""
        queryset = self.get_user_queryset().filter(
            date__gte=start_date, date__lte=end_date
        )

        if filters:
            if filters.get("category"):
                queryset = queryset.filter(category_id=filters["category"])
            if filters.get("account"):
                queryset = queryset.filter(account_id=filters["account"])
            if filters.get("transaction_type"):
                queryset = queryset.filter(transaction_type=filters["transaction_type"])
            if filters.get("min_amount"):
                queryset = queryset.filter(amount__gte=filters["min_amount"])
            if filters.get("max_amount"):
                queryset = queryset.filter(amount__lte=filters["max_amount"])

        return queryset.order_by("-date", "-created_at")

    def get_spending_summary(self, start_date, end_date):
        """Get spending summary for a date range"""
        transactions = self.get_user_queryset().filter(
            date__gte=start_date, date__lte=end_date
        )

        income_total = transactions.filter(transaction_type="income").aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")

        expense_total = transactions.filter(transaction_type="expense").aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")

        # Category breakdown
        category_breakdown = (
            transactions.filter(transaction_type="expense")
            .values("category__name")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )

        return {
            "income_total": income_total,
            "expense_total": expense_total,
            "net_income": income_total - expense_total,
            "category_breakdown": list(category_breakdown),
            "transaction_count": transactions.count(),
        }

    def create_recurring_transaction(self, template_data):
        """Create a recurring transaction template"""
        template_data["is_template"] = True
        template_data["transaction_category"] = "recurring_template"

        if template_data.get("start_date"):
            template_data["next_execution_date"] = template_data["start_date"]

        return self.create_transaction(template_data)

    def execute_recurring_transactions(self):
        """Execute pending recurring transactions"""
        today = timezone.now().date()

        pending_templates = self.get_user_queryset().filter(
            is_template=True, is_active_template=True, next_execution_date__lte=today
        )

        executed_count = 0
        for template in pending_templates:
            try:
                # Create actual transaction from template
                transaction_data = {
                    "amount": template.amount,
                    "description": template.description,
                    "date": template.next_execution_date,
                    "currency": template.currency,
                    "transaction_type": template.transaction_type,
                    "account": template.account,
                    "category": template.category,
                    "notes": f"Generated from template: {template.template_name}",
                }

                self.create_transaction(transaction_data)

                # Update template next execution date
                template.update_next_execution_date()
                executed_count += 1

            except Exception as e:
                # Log error but continue with other templates
                print(f"Failed to execute template {template.id}: {e}")

        return executed_count

    def categorize_transaction(self, transaction_id, category_id):
        """Assign a category to a transaction"""
        transaction_obj = self.get_user_queryset().get(id=transaction_id)
        category = Category.objects.get(id=category_id, user=self.user)

        transaction_obj.category = category
        transaction_obj.verified = True
        transaction_obj.save()

        return transaction_obj

    def bulk_categorize(self, transaction_ids, category_id):
        """Bulk categorize multiple transactions"""
        category = Category.objects.get(id=category_id, user=self.user)

        updated_count = (
            self.get_user_queryset()
            .filter(id__in=transaction_ids)
            .update(category=category, verified=True)
        )

        return updated_count

    def _update_account_balance(self, account, transaction_obj):
        """Update account balance based on transaction"""
        if transaction_obj.transaction_type == "income":
            account.balance += transaction_obj.amount
        elif transaction_obj.transaction_type == "expense":
            account.balance -= transaction_obj.amount

        account.save()

    def _recalculate_account_balance(self, account):
        """Recalculate account balance from all transactions"""
        transactions = Transaction.objects.filter(account=account, status="active")

        balance = Decimal("0")
        for transaction_obj in transactions:
            if transaction_obj.transaction_type == "income":
                balance += transaction_obj.amount
            elif transaction_obj.transaction_type == "expense":
                balance -= transaction_obj.amount

        account.balance = balance
        account.save()
