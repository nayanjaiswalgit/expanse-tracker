from django.contrib import admin
from .models import (
    Account,
    Category,
    Tag,
    Investment,
    Goal,
    GroupExpense,
    GroupExpenseShare,
    Invoice,
    Transaction,
)


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "account_type", "balance", "currency", "is_active"]
    list_filter = ["account_type", "is_active"]
    search_fields = ["name", "user__username", "institution", "account_number"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "category_type", "parent", "is_active"]
    list_filter = ["category_type", "is_active"]
    search_fields = ["name", "user__username"]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "color"]
    list_filter = ["color"]
    search_fields = ["name", "user__username"]


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "user",
        "symbol",
        "investment_type",
        "current_price",
        "currency",
        "is_active",
        "last_price_update",
    ]
    list_filter = ["investment_type", "is_active"]
    search_fields = ["name", "symbol", "user__username"]


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "user",
        "goal_type",
        "target_amount",
        "current_amount",
        "status",
    ]
    list_filter = ["goal_type", "status"]
    search_fields = ["name", "user__username"]


@admin.register(GroupExpense)
class GroupExpenseAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "created_by",
        "total_amount",
        "currency",
        "split_method",
        "status",
        "date",
    ]
    list_filter = ["status", "split_method", "date"]
    search_fields = ["title", "created_by__username"]


@admin.register(GroupExpenseShare)
class GroupExpenseShareAdmin(admin.ModelAdmin):
    list_display = [
        "group_expense",
        "user",
        "share_amount",
        "paid_amount",
        "is_settled",
    ]
    # 'is_settled' is a @property, not a model field; cannot be used in list_filter
    list_filter = []
    search_fields = ["group_expense__title", "user__username"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        "invoice_number",
        "invoice_type",
        "status",
        "client_name",
        "total_amount",
        "currency",
        "issue_date",
        "due_date",
    ]
    list_filter = ["status", "invoice_type", "issue_date", "due_date"]
    search_fields = ["invoice_number", "client_name", "client_email"]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        "description",
        "user",
        "transaction_type",
        "amount",
        "date",
        "status",
        "account",
        "category",
    ]
    list_filter = ["transaction_type", "status", "date"]
    search_fields = ["description", "user__email", "user__username"]
    readonly_fields = ["created_at", "updated_at"]
