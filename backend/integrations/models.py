from django.db import models
from django.conf import settings


class GoogleAccount(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="google_account",
    )
    email = models.EmailField(unique=True)
    access_token = models.CharField(max_length=255)
    refresh_token = models.CharField(max_length=255, null=True, blank=True)
    expires_at = models.DateTimeField()
    last_synced_history_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    email_filter_keywords = models.JSONField(default=list, blank=True)
    email_filter_senders = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.user.username}'s Google Account"