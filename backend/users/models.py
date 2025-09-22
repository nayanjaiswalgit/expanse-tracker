"""
User-related Django models for authentication, profiles, plans, and activity logging.
"""

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
from cryptography.fernet import Fernet
from django.conf import settings


# ================================
# BASE MODELS AND MIXINS
# ================================


class TimestampedModel(models.Model):
    """Abstract base model with timestamp fields"""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UserOwnedModel(TimestampedModel):
    """Abstract base model for user-owned entities"""

    user = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        abstract = True


# ================================
# USER PROFILE AND SETTINGS
# ================================


class UserProfile(models.Model):
    """Consolidated user profile with subscription and settings"""

    SUBSCRIPTION_STATUS_CHOICES = [
        ("trial", "Trial"),
        ("active", "Active"),
        ("cancelled", "Cancelled"),
        ("expired", "Expired"),
        ("suspended", "Suspended"),
    ]

    AI_PROVIDERS = [
        ("system", "System Default"),
        ("openai", "OpenAI"),
        ("ollama", "Ollama"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")

    # Subscription information
    current_plan = models.ForeignKey(
        "Plan", on_delete=models.CASCADE, null=True, blank=True
    )
    subscription_status = models.CharField(
        max_length=20, choices=SUBSCRIPTION_STATUS_CHOICES, default="trial"
    )
    subscription_start_date = models.DateTimeField(auto_now_add=True)
    subscription_end_date = models.DateTimeField(null=True, blank=True)
    is_auto_renew = models.BooleanField(default=True)

    # Usage tracking
    ai_credits_remaining = models.IntegerField(default=100)  # Trial credits
    ai_credits_used_this_month = models.IntegerField(default=0)
    transactions_this_month = models.IntegerField(default=0)
    last_reset_date = models.DateField(default=timezone.now)

    # AI Settings
    preferred_ai_provider = models.CharField(
        max_length=20, choices=AI_PROVIDERS, default="system"
    )
    openai_api_key = models.TextField(blank=True)  # Encrypted
    openai_model = models.CharField(max_length=50, default="gpt-3.5-turbo")
    ollama_endpoint = models.URLField(default="http://localhost:11434")
    ollama_model = models.CharField(max_length=50, default="llama2")

    # AI feature toggles
    enable_ai_suggestions = models.BooleanField(default=True)
    enable_ai_categorization = models.BooleanField(default=True)
    enable_ai_invoice_generation = models.BooleanField(default=True)

    # Plan customization (calculated from base plan + addons)
    total_ai_credits = models.IntegerField(default=100)
    total_transactions_limit = models.IntegerField(default=1000)
    total_accounts_limit = models.IntegerField(default=3)
    total_storage_gb = models.DecimalField(max_digits=8, decimal_places=2, default=1)
    custom_features = models.JSONField(default=dict)
    total_monthly_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Preferences
    default_currency = models.CharField(max_length=3, default="USD")
    timezone = models.CharField(max_length=50, default="UTC")
    language = models.CharField(max_length=10, default="en")

    # Google OAuth essential data
    google_profile_picture = models.URLField(blank=True, null=True)
    google_email_verified = models.BooleanField(default=False)

    # Onboarding status
    onboarding_step = models.PositiveIntegerField(default=0)
    is_onboarded = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["subscription_status"]),
            models.Index(fields=["subscription_end_date"]),
        ]

    def __str__(self):
        return f"{self.user.username}'s Profile"

    def encrypt_api_key(self, api_key):
        """Encrypt API key for storage"""
        try:
            fernet = Fernet(settings.SECRET_KEY[:44].encode() + b"==")
            return fernet.encrypt(api_key.encode()).decode()
        except Exception:
            return api_key  # Fallback to plain text

    def decrypt_api_key(self):
        """Decrypt stored API key"""
        if not self.openai_api_key:
            return None
        try:
            fernet = Fernet(settings.SECRET_KEY[:44].encode() + b"==")
            return fernet.decrypt(self.openai_api_key.encode()).decode()
        except Exception:
            return self.openai_api_key  # Fallback to plain text

    def reset_monthly_usage(self):
        """Reset monthly usage counters"""
        self.ai_credits_used_this_month = 0
        self.transactions_this_month = 0
        self.last_reset_date = timezone.now().date()

        # Restore credits from plan
        if self.current_plan:
            self.ai_credits_remaining = self.total_ai_credits

        self.save()

    def consume_ai_credits(self, credits):
        """Consume AI credits and return success"""
        if self.ai_credits_remaining >= credits:
            self.ai_credits_remaining -= credits
            self.ai_credits_used_this_month += credits
            self.save()
            return True
        return False


# ================================
# SIMPLIFIED PLAN SYSTEM
# ================================


class Plan(TimestampedModel):
    """Unified plan model supporting base plans and addons"""

    PLAN_TYPES = [
        ("base", "Base Plan"),
        ("addon", "Add-on"),
        ("template", "Template Bundle"),
    ]

    BILLING_CYCLES = [
        ("monthly", "Monthly"),
        ("yearly", "Yearly"),
        ("one_time", "One Time"),
    ]

    name = models.CharField(max_length=100)
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPES)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    billing_cycle = models.CharField(
        max_length=20, choices=BILLING_CYCLES, default="monthly"
    )

    # Plan limits and features
    ai_credits_per_month = models.IntegerField(default=0)
    max_transactions_per_month = models.IntegerField(default=0)
    max_accounts = models.IntegerField(default=0)
    storage_gb = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    features = models.JSONField(default=dict)

    # Template/Bundle support
    base_plan = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="bundle_plans",
    )
    included_addons = models.ManyToManyField(
        "self", blank=True, symmetrical=False, related_name="parent_templates"
    )
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Addon-specific fields
    is_stackable = models.BooleanField(default=True)
    max_quantity = models.PositiveIntegerField(default=1)
    compatible_with = models.ManyToManyField("self", blank=True, symmetrical=False)

    # Status
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["plan_type", "is_active"]),
            models.Index(fields=["price"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.plan_type})"


class UserPlanAssignment(TimestampedModel):
    """User's current plan assignment with customizations"""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="plan_assignment"
    )
    base_plan = models.ForeignKey(
        Plan, on_delete=models.CASCADE, related_name="user_assignments"
    )
    active_addons = models.ManyToManyField(Plan, blank=True, through="UserAddon")

    # Calculated totals (denormalized for performance)
    total_monthly_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    effective_limits = models.JSONField(
        default=dict
    )  # Combined limits from base + addons

    def calculate_totals(self):
        """Recalculate total cost and limits"""
        total_cost = self.base_plan.price
        combined_limits = {
            "ai_credits": self.base_plan.ai_credits_per_month,
            "transactions": self.base_plan.max_transactions_per_month,
            "accounts": self.base_plan.max_accounts,
            "storage_gb": float(self.base_plan.storage_gb),
            "features": self.base_plan.features.copy(),
        }

        # Add addon contributions
        for user_addon in self.user_addons.filter(is_active=True):
            addon = user_addon.addon
            quantity = user_addon.quantity

            # Add to cost
            if addon.billing_cycle == "monthly":
                total_cost += addon.price * quantity
            elif addon.billing_cycle == "yearly":
                total_cost += (addon.price * quantity) / 12

            # Add to limits
            combined_limits["ai_credits"] += addon.ai_credits_per_month * quantity
            combined_limits["transactions"] += (
                addon.max_transactions_per_month * quantity
            )
            combined_limits["accounts"] += addon.max_accounts * quantity
            combined_limits["storage_gb"] += float(addon.storage_gb) * quantity

            # Merge features
            for feature, value in addon.features.items():
                combined_limits["features"][feature] = value

        self.total_monthly_cost = total_cost
        self.effective_limits = combined_limits
        self.save()

        # Update user profile
        if hasattr(self.user, "profile"):
            profile = self.user.profile
            profile.total_ai_credits = combined_limits["ai_credits"]
            profile.total_transactions_limit = combined_limits["transactions"]
            profile.total_accounts_limit = combined_limits["accounts"]
            profile.total_storage_gb = combined_limits["storage_gb"]
            profile.custom_features = combined_limits["features"]
            profile.total_monthly_cost = total_cost
            profile.save()


class UserAddon(TimestampedModel):
    """Through model for user's active addons"""

    user_plan = models.ForeignKey(
        UserPlanAssignment, on_delete=models.CASCADE, related_name="user_addons"
    )
    addon = models.ForeignKey(Plan, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ["user_plan", "addon"]


# ================================
# ACTIVITY AND AUDIT LOGGING
# ================================


class ActivityLog(TimestampedModel):
    """Unified activity and audit logging"""

    ACTIVITY_TYPES = [
        ("transaction_execution", "Transaction Execution"),
        ("plan_change", "Plan Change"),
        ("ai_usage", "AI Usage"),
        ("investment_update", "Investment Update"),
        ("login", "User Login"),
        ("password_change", "Password Change"),
        ("data_export", "Data Export"),
        ("api_access", "API Access"),
    ]

    STATUS_CHOICES = [
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("pending", "Pending"),
        ("cancelled", "Cancelled"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="activity_logs"
    )
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPES)

    # Generic reference to related objects
    object_type = models.CharField(
        max_length=50, blank=True
    )  # 'transaction', 'plan', etc.
    object_id = models.CharField(max_length=50, blank=True)

    # Activity details
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="completed"
    )
    details = models.JSONField(default=dict)
    metadata = models.JSONField(default=dict)

    # Request context (for API access)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "activity_type"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["object_type", "object_id"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.activity_type} ({self.status})"

    @staticmethod
    def log_activity(
        user,
        activity_type,
        object_type="",
        object_id="",
        status="completed",
        details=None,
        metadata=None,
        ip_address=None,
        user_agent=None,
    ):
        """Helper to log various user activities."""
        if details is None:
            details = {}
        if metadata is None:
            metadata = {}

        ActivityLog.objects.create(
            user=user,
            activity_type=activity_type,
            object_type=object_type,
            object_id=object_id,
            status=status,
            details=details,
            metadata=metadata,
            ip_address=ip_address,
            user_agent=user_agent,
        )
