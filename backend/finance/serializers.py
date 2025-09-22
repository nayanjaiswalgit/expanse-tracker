"""
Finance app serializers for financial models.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Investment,
    Goal,
    GroupExpense,
    GroupExpenseShare,
    Invoice,
    Account,
    Category,
    Tag,
    Transaction,
    ExpenseGroup,
    ExpenseGroupMembership,
)
from users.serializers import UserSerializer

User = get_user_model()


class ExpenseGroupMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", write_only=True
    )

    class Meta:
        model = ExpenseGroupMembership
        fields = ["id", "user", "user_id", "role", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class ExpenseGroupSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members = ExpenseGroupMembershipSerializer(
        source="memberships", many=True, read_only=True
    )

    class Meta:
        model = ExpenseGroup
        fields = [
            "id",
            "name",
            "description",
            "owner",
            "group_type",
            "created_at",
            "updated_at",
            "members",
        ]
        read_only_fields = ["owner", "created_at", "updated_at"]


class InvestmentSerializer(serializers.ModelSerializer):
    """Serializer for Investment model"""

    current_quantity = serializers.ReadOnlyField()
    current_value = serializers.ReadOnlyField()
    total_invested = serializers.ReadOnlyField()
    total_gain_loss = serializers.ReadOnlyField()
    total_gain_loss_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Investment
        fields = [
            "id",
            "symbol",
            "name",
            "investment_type",
            "sector",
            "current_price",
            "currency",
            "last_price_update",
            "price_source",
            "auto_update_price",
            "portfolio_name",
            "portfolio_weight",
            "description",
            "risk_level",
            "dividend_yield",
            "market_cap",
            "pe_ratio",
            "beta",
            "fifty_two_week_high",
            "fifty_two_week_low",
            "is_active",
            "created_at",
            "updated_at",
            "current_quantity",
            "current_value",
            "total_invested",
            "total_gain_loss",
            "total_gain_loss_percentage",
        ]
        read_only_fields = ["created_at", "updated_at"]


class AccountSerializer(serializers.ModelSerializer):
    """Serializer for Account model"""

    class Meta:
        model = Account
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model"""

    class Meta:
        model = Category
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model"""

    class Meta:
        model = Tag
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class GoalSerializer(serializers.ModelSerializer):
    """Serializer for Goal model"""

    progress_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Goal
        fields = [
            "id",
            "name",
            "description",
            "goal_type",
            "target_amount",
            "current_amount",
            "target_date",
            "status",
            "created_at",
            "updated_at",
            "progress_percentage",
        ]
        read_only_fields = ["created_at", "updated_at"]


class GroupExpenseShareSerializer(serializers.ModelSerializer):
    """Serializer for GroupExpenseShare model"""

    username = serializers.CharField(source="user.username", read_only=True)
    is_settled = serializers.ReadOnlyField()
    remaining_amount = serializers.ReadOnlyField()

    class Meta:
        model = GroupExpenseShare
        fields = [
            "id",
            "user",
            "username",
            "share_amount",
            "paid_amount",
            "payment_date",
            "notes",
            "is_settled",
            "remaining_amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class GroupExpenseSerializer(serializers.ModelSerializer):
    """Serializer for GroupExpense model"""

    shares = GroupExpenseShareSerializer(many=True, read_only=True)
    group = ExpenseGroupSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = GroupExpense
        fields = [
            "id",
            "title",
            "description",
            "total_amount",
            "currency",
            "split_method",
            "date",
            "status",
            "created_by",
            "shares",
            "group",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "created_by"]


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for Invoice model"""

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_type",
            "invoice_number",
            "status",
            "client_name",
            "client_email",
            "client_address",
            "description",
            "amount",
            "tax_amount",
            "total_amount",
            "currency",
            "issue_date",
            "due_date",
            "paid_date",
            "generated_by_ai",
            "ai_confidence_score",
            "pdf_file",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for Transaction model"""

    account_name = serializers.CharField(source="account.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    tag_names = serializers.StringRelatedField(source="tags", many=True, read_only=True)
    contact_name = serializers.CharField(source="contact_user.username", read_only=True)
    contact_email = serializers.CharField(source="contact_user.email", read_only=True)
    group_expense_title = serializers.CharField(source="group_expense.title", read_only=True)

    # Computed fields for lending transactions
    is_lending = serializers.SerializerMethodField()
    is_group_expense = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    repayment_percentage = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    def get_is_lending(self, obj):
        return obj.transaction_category == "lending"

    def get_is_group_expense(self, obj):
        return obj.transaction_category == "group_expense"

    def get_remaining_amount(self, obj):
        """Calculate remaining amount for lending transactions"""
        if obj.transaction_category != "lending" or obj.transaction_type not in ["lend", "borrow"]:
            return None

        # Get all repayments for this lending transaction
        from decimal import Decimal
        repayments = Transaction.objects.filter(
            user=obj.user,
            transaction_category="lending",
            transaction_type="repayment",
            contact_user=obj.contact_user,
            description__contains=obj.description[:20]  # Simple matching
        )

        total_repaid = sum([abs(r.amount) for r in repayments])
        remaining = abs(obj.amount) - total_repaid
        return max(remaining, 0)

    def get_repayment_percentage(self, obj):
        """Calculate repayment percentage for lending transactions"""
        if obj.transaction_category != "lending" or obj.transaction_type not in ["lend", "borrow"]:
            return None

        remaining = self.get_remaining_amount(obj)
        if remaining is None or obj.amount == 0:
            return 0

        repaid_amount = abs(obj.amount) - remaining
        return (repaid_amount / abs(obj.amount)) * 100

    def get_is_overdue(self, obj):
        """Check if lending transaction is overdue"""
        if obj.transaction_category != "lending" or not obj.due_date:
            return False

        from django.utils import timezone
        remaining = self.get_remaining_amount(obj)
        return obj.due_date < timezone.now().date() and remaining > 0

    class Meta:
        model = Transaction
        fields = [
            "id",
            "amount",
            "description",
            "date",
            "currency",
            "notes",
            "external_id",
            "status",
            "transaction_category",
            "transaction_type",
            "account",
            "account_name",
            "transfer_account",
            "category",
            "category_name",
            "suggested_category",
            "tags",
            "tag_names",
            "investment",
            "quantity",
            "price_per_unit",
            "fees",
            "contact_user",
            "due_date",
            "interest_rate",
            "is_template",
            "template_name",
            "frequency",
            "frequency_interval",
            "start_date",
            "end_date",
            "max_executions",
            "next_execution_date",
            "is_active_template",
            "is_manual",
            "auto_categorize",
            "execution_conditions",
            "group_expense",
            "merchant_name",
            "original_description",
            "verified",
            "gmail_message_id",
            "metadata",
            "created_at",
            "updated_at",
            # Computed fields
            "contact_name",
            "contact_email",
            "group_expense_title",
            "is_lending",
            "is_group_expense",
            "remaining_amount",
            "repayment_percentage",
            "is_overdue",
        ]
        read_only_fields = ["created_at", "updated_at", "contact_name", "contact_email", "group_expense_title", "is_lending", "is_group_expense", "remaining_amount", "repayment_percentage", "is_overdue"]
