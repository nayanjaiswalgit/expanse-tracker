from django.contrib import admin
from .models import Plan, UserPlanAssignment, UserAddon, ActivityLog


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "plan_type",
        "price",
        "billing_cycle",
        "is_active",
        "is_featured",
    ]
    list_filter = ["plan_type", "is_active", "billing_cycle"]
    search_fields = ["name"]


@admin.register(UserPlanAssignment)
class UserPlanAssignmentAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "base_plan",
        "total_monthly_cost",
    ]
    search_fields = ["user__username", "user__email", "base_plan__name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(UserAddon)
class UserAddonAdmin(admin.ModelAdmin):
    list_display = ["user_plan", "addon", "quantity", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["user_plan__user__username", "addon__name"]


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "activity_type",
        "object_type",
        "object_id",
        "status",
        "created_at",
    ]
    list_filter = ["activity_type", "status", "created_at"]
    search_fields = [
        "user__username",
        "user__email",
        "object_type",
        "object_id",
    ]
    readonly_fields = ["created_at"]


# UserProfile already registered in core.admin
