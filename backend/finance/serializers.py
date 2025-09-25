"""
Finance app serializers for financial models.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Investment,
    Goal,
    GoalImage,
    GroupExpense,
    GroupExpenseShare,
    Invoice,
    Account,
    Category,
    Tag,
    Transaction,
    ExpenseGroup,
    ExpenseGroupMembership,
    UploadSession,
    StatementImport,
    TransactionImport,
    TransactionLink,
    MerchantPattern,
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


class GoalImageSerializer(serializers.ModelSerializer):
    """Serializer for GoalImage model"""

    class Meta:
        model = GoalImage
        fields = [
            "id",
            "goal_id",
            "image_url",
            "thumbnail_url",
            "caption",
            "is_primary",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class GoalSerializer(serializers.ModelSerializer):
    """Serializer for Goal model"""

    progress_percentage = serializers.ReadOnlyField()
    remaining_amount = serializers.ReadOnlyField()
    is_completed = serializers.ReadOnlyField()
    images = GoalImageSerializer(many=True, read_only=True)

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
            "start_date",
            "currency",
            "color",
            "status",
            "created_at",
            "updated_at",
            "progress_percentage",
            "remaining_amount",
            "is_completed",
            "images",
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


# Upload-related Serializers

class UploadSessionSerializer(serializers.ModelSerializer):
    """Serializer for UploadSession model"""

    processing_duration = serializers.SerializerMethodField()
    success_rate = serializers.SerializerMethodField()

    class Meta:
        model = UploadSession
        fields = [
            'id', 'original_filename', 'file_type', 'file_size', 'status',
            'account', 'total_transactions', 'successful_imports',
            'failed_imports', 'duplicate_imports', 'processing_started_at',
            'processing_completed_at', 'processing_duration', 'success_rate',
            'error_message', 'requires_password', 'password_attempts',
            'ai_categorization_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'total_transactions', 'successful_imports',
            'failed_imports', 'duplicate_imports', 'processing_started_at',
            'processing_completed_at', 'processing_duration', 'success_rate',
            'error_message', 'password_attempts', 'created_at', 'updated_at'
        ]

    def get_processing_duration(self, obj):
        """Calculate processing duration in seconds"""
        if obj.processing_started_at and obj.processing_completed_at:
            duration = obj.processing_completed_at - obj.processing_started_at
            return duration.total_seconds()
        return None

    def get_success_rate(self, obj):
        """Calculate success rate percentage"""
        if obj.total_transactions > 0:
            return round((obj.successful_imports / obj.total_transactions) * 100, 2)
        return None


class UploadSessionListSerializer(serializers.ModelSerializer):
    """Simplified serializer for upload session lists"""

    account_name = serializers.CharField(source='account.name', read_only=True)
    processing_duration = serializers.SerializerMethodField()

    class Meta:
        model = UploadSession
        fields = [
            'id', 'original_filename', 'file_type', 'file_size', 'status',
            'account', 'account_name', 'total_transactions', 'successful_imports',
            'failed_imports', 'duplicate_imports', 'processing_duration',
            'created_at'
        ]

    def get_processing_duration(self, obj):
        """Calculate processing duration in seconds"""
        if obj.processing_started_at and obj.processing_completed_at:
            duration = obj.processing_completed_at - obj.processing_started_at
            return duration.total_seconds()
        return None


class StatementImportSerializer(serializers.ModelSerializer):
    """Serializer for StatementImport model"""

    transaction_count = serializers.SerializerMethodField()

    class Meta:
        model = StatementImport
        fields = [
            'id', 'upload_session', 'statement_period_start',
            'statement_period_end', 'institution_name', 'account_number_masked',
            'transaction_count', 'created_at'
        ]
        read_only_fields = ['id', 'transaction_count', 'created_at']

    def get_transaction_count(self, obj):
        """Get count of transaction imports for this statement"""
        return obj.transaction_imports.count()


class TransactionImportSerializer(serializers.ModelSerializer):
    """Serializer for TransactionImport model"""

    transaction_details = serializers.SerializerMethodField()

    class Meta:
        model = TransactionImport
        fields = [
            'id', 'upload_session', 'statement_import', 'transaction',
            'import_status', 'raw_data', 'parsed_amount', 'parsed_date',
            'parsed_description', 'error_message', 'suggested_category_confidence',
            'ai_merchant_detection', 'transaction_details', 'created_at'
        ]
        read_only_fields = [
            'id', 'transaction_details', 'created_at'
        ]

    def get_transaction_details(self, obj):
        """Get basic transaction details if linked"""
        if obj.transaction:
            return {
                'id': obj.transaction.id,
                'amount': str(obj.transaction.amount),
                'description': obj.transaction.description,
                'date': obj.transaction.date,
                'category': obj.transaction.category.name if obj.transaction.category else None,
            }
        return None


class TransactionLinkSerializer(serializers.ModelSerializer):
    """Serializer for TransactionLink model"""

    from_transaction_details = serializers.SerializerMethodField()
    to_transaction_details = serializers.SerializerMethodField()

    class Meta:
        model = TransactionLink
        fields = [
            'id', 'from_transaction', 'to_transaction', 'link_type',
            'confidence_score', 'is_confirmed', 'notes', 'auto_detected',
            'from_transaction_details', 'to_transaction_details', 'created_at'
        ]
        read_only_fields = ['id', 'from_transaction_details', 'to_transaction_details', 'created_at']

    def get_from_transaction_details(self, obj):
        """Get details of the from transaction"""
        return {
            'id': obj.from_transaction.id,
            'amount': str(obj.from_transaction.amount),
            'description': obj.from_transaction.description,
            'date': obj.from_transaction.date,
            'account': obj.from_transaction.account.name if obj.from_transaction.account else None,
        }

    def get_to_transaction_details(self, obj):
        """Get details of the to transaction"""
        return {
            'id': obj.to_transaction.id,
            'amount': str(obj.to_transaction.amount),
            'description': obj.to_transaction.description,
            'date': obj.to_transaction.date,
            'account': obj.to_transaction.account.name if obj.to_transaction.account else None,
        }


class MerchantPatternSerializer(serializers.ModelSerializer):
    """Serializer for MerchantPattern model"""

    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)

    class Meta:
        model = MerchantPattern
        fields = [
            'id', 'pattern', 'category', 'category_name', 'category_color',
            'merchant_name', 'confidence', 'usage_count', 'last_used',
            'is_active', 'is_user_confirmed', 'pattern_type', 'created_at'
        ]
        read_only_fields = ['id', 'category_name', 'category_color', 'usage_count', 'last_used', 'created_at']


class UploadProgressSerializer(serializers.Serializer):
    """Serializer for upload progress status"""

    session_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=UploadSession.STATUS_CHOICES)
    progress_percentage = serializers.FloatField()
    current_step = serializers.CharField()
    total_transactions = serializers.IntegerField()
    processed_transactions = serializers.IntegerField()
    successful_imports = serializers.IntegerField()
    failed_imports = serializers.IntegerField()
    duplicate_imports = serializers.IntegerField()
    error_message = serializers.CharField(allow_blank=True)
    processing_log = serializers.JSONField()


class FileUploadSerializer(serializers.Serializer):
    """Serializer for file upload requests"""

    file = serializers.FileField()
    account_id = serializers.IntegerField(required=False, allow_null=True)
    password = serializers.CharField(required=False, allow_blank=True)
    ai_categorization = serializers.BooleanField(default=True)

    def validate_file(self, value):
        """Validate uploaded file"""
        max_size = 50 * 1024 * 1024  # 50MB
        if value.size > max_size:
            raise serializers.ValidationError("File size cannot exceed 50MB")

        allowed_types = ['.pdf', '.csv', '.json', '.xls', '.xlsx']
        if not any(value.name.lower().endswith(ext) for ext in allowed_types):
            raise serializers.ValidationError(
                f"File type not supported. Allowed types: {', '.join(allowed_types)}"
            )

        return value

    def validate_account_id(self, value):
        """Validate account belongs to user"""
        if value:
            user = self.context['request'].user
            from .models import Account
            if not Account.objects.filter(id=value, user=user).exists():
                raise serializers.ValidationError("Account not found or access denied")
        return value