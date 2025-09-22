from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from users.models import UserProfile

User = get_user_model()


# Unregister the default User admin and register our custom one
admin.site.unregister(User)


# Custom User Admin that prioritizes email
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User Admin that shows email prominently and allows email-based search"""

    list_display = (
        "email",
        "username",
        "first_name",
        "last_name",
        "is_staff",
        "date_joined",
    )
    list_filter = ("is_staff", "is_superuser", "is_active", "date_joined")
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("email",)

    # Fieldsets to organize user information with email first
    fieldsets = (
        ("Authentication", {"fields": ("email", "username", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Important dates",
            {"fields": ("last_login", "date_joined"), "classes": ("collapse",)},
        ),
    )

    # Add fieldsets for creating new users (email first)
    add_fieldsets = (
        (
            "Authentication",
            {
                "classes": ("wide",),
                "fields": ("email", "username", "password1", "password2"),
            },
        ),
        (
            "Personal info",
            {
                "classes": ("wide",),
                "fields": ("first_name", "last_name"),
            },
        ),
        (
            "Permissions",
            {
                "classes": ("wide", "collapse"),
                "fields": ("is_active", "is_staff", "is_superuser"),
            },
        ),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "current_plan",
        "subscription_status",
        "ai_credits_remaining",
        "total_monthly_cost",
    ]
    list_filter = ["subscription_status", "current_plan", "created_at"]
    search_fields = ["user__email", "user__username"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("User", {"fields": ("user",)}),
        (
            "Subscription",
            {"fields": ("current_plan", "subscription_status", "total_monthly_cost")},
        ),
        ("Usage", {"fields": ("ai_credits_remaining",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )
