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
    get_supported_currencies,
    get_exchange_rates,
    convert_currency,
)


app_name = "integrations"

urlpatterns = [
    # Gmail endpoints
    path("gmail-connect/", GmailConnectView.as_view(), name="gmail-connect"),
    path("gmail-callback/", GmailCallbackView.as_view(), name="gmail-callback"),
    path("gmail-account/", GmailAccountView.as_view(), name="gmail-account"),
    path("gmail-test-fetch/", GmailTestFetchView.as_view(), name="gmail-test-fetch"),
    path("gmail-test-connection/", GmailConnectionTestView.as_view(), name="gmail-test-connection"),

    # Currency endpoints
    path("currencies/", get_supported_currencies, name="supported-currencies"),
    path("currencies/exchange-rates/", get_exchange_rates, name="exchange-rates"),
    path("currencies/convert/", convert_currency, name="convert-currency"),
]
