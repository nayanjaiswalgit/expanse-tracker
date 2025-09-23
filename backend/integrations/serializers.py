"""
Serializers for integrations app.
"""

from rest_framework import serializers
from .models import GmailAccount


class GmailAccountSerializer(serializers.ModelSerializer):
    """Serializer for GmailAccount model"""

    class Meta:
        model = GmailAccount
        fields = [
            "id",
            "name",
            "email",
            "is_active",
            "transaction_tag",
            "sender_filters",
            "keyword_filters",
            "last_sync_at",
            "created_at",
            "updated_at",
            "connected",
        ]
        read_only_fields = ["id", "email", "last_sync_at", "created_at", "updated_at"]

    def get_connected(self, obj):
        return True  # If object exists, it's connected

    connected = serializers.SerializerMethodField()


# Keep old serializer for backward compatibility
class GoogleAccountSerializer(GmailAccountSerializer):
    """DEPRECATED: Use GmailAccountSerializer instead"""
    pass
