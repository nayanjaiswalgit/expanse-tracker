from rest_framework.routers import DefaultRouter
from django.urls import include, path
from .views import AIConfigurationViewSet

router = DefaultRouter()
router.register(r"ai-config", AIConfigurationViewSet, basename="ai-config")

urlpatterns = [
    path("", include(router.urls)),
]
