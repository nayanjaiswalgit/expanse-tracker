#!/usr/bin/env python3
"""
Create a test user for profile photo testing.
"""

import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(r'D:\Backup\simple\backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app_settings.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserProfile

User = get_user_model()

def create_test_user():
    """Create a test user if it doesn't exist"""

    email = "test@example.com"
    password = "testpassword123"

    try:
        # Check if user already exists
        user = User.objects.get(email=email)
        print(f"[OK] Test user already exists: {user.email}")

    except User.DoesNotExist:
        # Create new user
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name="Test",
            last_name="User"
        )
        print(f"[OK] Created test user: {user.email}")

        # Create user profile if it doesn't exist
        profile, created = UserProfile.objects.get_or_create(user=user)
        if created:
            print("[OK] Created user profile")
        else:
            print("[OK] User profile already exists")

    print(f"Email: {email}")
    print(f"Password: {password}")
    print("\nYou can now use these credentials to test the profile photo functionality!")

if __name__ == "__main__":
    create_test_user()