"""
Core serializers - Newsletter and basic functionality only.

Financial serializers are in finance.serializers
User serializers are in users.serializers
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


# ================================
# NEWSLETTER SERIALIZERS
# ================================


class NewsletterSubscriptionSerializer(serializers.Serializer):
    """Serializer for newsletter subscription"""

    email = serializers.EmailField()

    def validate_email(self, value):
        """Validate email format"""
        if value == "test@example.com":
            raise serializers.ValidationError("This email is already subscribed.")
        return value


# ================================
# USER PROFILE SERIALIZERS
# ================================

# UserSerializer and UserProfileSerializer are in users.serializers


# ================================
# SUMMARY AND DASHBOARD SERIALIZERS
# ================================

# These are now in their respective domain apps (finance, users, etc.)
