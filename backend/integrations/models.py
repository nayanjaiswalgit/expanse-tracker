from django.db import models
from django.conf import settings


class GmailAccount(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="gmail_accounts",
    )
    name = models.CharField(max_length=100, help_text="Display name for this account")
    email = models.EmailField()
    access_token = models.CharField(max_length=500)
    refresh_token = models.CharField(max_length=500, null=True, blank=True)
    expires_at = models.DateTimeField()

    # Simple sync settings
    is_active = models.BooleanField(default=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    last_synced_history_id = models.CharField(max_length=255, null=True, blank=True)

    # Transaction tag for emails from this account
    transaction_tag = models.CharField(max_length=50, default="email-import")

    # Simple filters
    sender_filters = models.JSONField(default=list, blank=True)
    keyword_filters = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'email']

    def __str__(self):
        return f"{self.name} ({self.email})"