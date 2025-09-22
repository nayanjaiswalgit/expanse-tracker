from rest_framework.test import APITestCase
from django.urls import reverse


class UserAPITests(APITestCase):
    def test_user_list_is_protected(self):
        """
        Ensure that the user list endpoint is protected.
        """
        response = self.client.get(reverse("user-list"))
        self.assertEqual(response.status_code, 401)
