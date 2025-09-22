"""
Serializers for integrations app.
"""

from rest_framework import serializers
from .models import GoogleAccount


class GoogleAccountSerializer(serializers.ModelSerializer):
    """Serializer for GoogleAccount model"""

    class Meta:
        model = GoogleAccount
        fields = [
            "id",
            "email",
            "connected",
            "last_synced_history_id",
            "created_at",
            "updated_at",
            "email_filter_keywords",
            "email_filter_senders",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_connected(self, obj):
        return True  # If object exists, it's connected

    connected = serializers.SerializerMethodField()
