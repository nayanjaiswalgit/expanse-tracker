"""
URL configuration for integrations app.
"""

from django.urls import path
from .views import (
    GmailConnectView,
    GmailCallbackView,
    GmailAccountView,
    GmailTestFetchView,
    GmailConnectionTestView,
)


app_name = "integrations"

urlpatterns = [
    path("gmail-connect/", GmailConnectView.as_view(), name="gmail-connect"),
    path("gmail-callback/", GmailCallbackView.as_view(), name="gmail-callback"),
    path("gmail-account/", GmailAccountView.as_view(), name="gmail-account"),
    path("gmail-test-fetch/", GmailTestFetchView.as_view(), name="gmail-test-fetch"),
    path("gmail-test-connection/", GmailConnectionTestView.as_view(), name="gmail-test-connection"),
]
