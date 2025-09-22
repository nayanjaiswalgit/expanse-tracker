from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailBackend(ModelBackend):
    """
    Custom authentication backend that allows users to log in using their email address.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        # Always try email first, then fall back to username
        if username:
            if "@" in username:
                # Definitely an email
                try:
                    user = User.objects.get(email=username)
                except User.DoesNotExist:
                    return None
            else:
                # Could be username, try email first (in case user provided email without @)
                try:
                    user = User.objects.get(email=username)
                except User.DoesNotExist:
                    # Fall back to username
                    try:
                        user = User.objects.get(username=username)
                    except User.DoesNotExist:
                        return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
