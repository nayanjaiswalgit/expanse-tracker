from django.urls import path
from .views import StripeWebhookView

urlpatterns = [
    path("", StripeWebhookView.as_view(), name="stripe-webhook"),
]
