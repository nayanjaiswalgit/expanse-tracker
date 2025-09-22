from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    # def ready(self):
    #     # from django.contrib.auth import get_user_model
    #     # from .managers import UserManager

    #     # User = get_user_model()
    #     # User.add_to_class('objects', UserManager())
