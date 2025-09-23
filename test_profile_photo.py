#!/usr/bin/env python3
"""
Test script for profile photo functionality.
"""

import requests
import io
from PIL import Image
import json

# Configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"

def create_test_image():
    """Create a simple test image"""
    # Create a 400x400 red square image for testing
    img = Image.new('RGB', (400, 400), color='red')

    # Add some text to make it recognizable
    try:
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)
        # Try to use default font, fallback if not available
        try:
            font = ImageFont.load_default()
        except:
            font = None

        # Draw text in center
        text = "TEST PROFILE PHOTO"
        if font:
            # Get text dimensions
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
        else:
            text_width, text_height = 200, 20  # Estimate

        x = (400 - text_width) // 2
        y = (400 - text_height) // 2

        draw.text((x, y), text, fill='white', font=font)

    except ImportError:
        # PIL drawing not available, just use the red square
        pass

    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG', quality=85)
    img_bytes.seek(0)

    return img_bytes

def test_profile_photo_endpoints():
    """Test the profile photo endpoints"""

    print("Testing Profile Photo Functionality")
    print("=" * 50)

    # Test user login first (assuming we have a test user)
    login_data = {
        "email": "test@example.com",  # You may need to adjust this
        "password": "testpassword123"
    }

    print("1. Testing user authentication...")
    try:
        response = requests.post(f"{API_URL}/auth/login/", json=login_data)

        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access')
            if access_token:
                print("[OK] Authentication successful")
                headers = {'Authorization': f'Bearer {access_token}'}
            else:
                print("[ERROR] No access token in response")
                return
        else:
            print(f"[ERROR] Authentication failed: {response.status_code}")
            print(f"Response: {response.text}")
            return

    except Exception as e:
        print(f"[ERROR] Authentication error: {e}")
        return

    # Test getting current profile photo info
    print("2. Getting current profile photo info...")
    try:
        response = requests.get(f"{API_URL}/users/profile_photo_info/", headers=headers)

        if response.status_code == 200:
            data = response.json()
            print("[OK] Profile photo info retrieved:")
            print(f"   - Has custom photo: {data.get('has_custom_photo', False)}")
            print(f"   - Photo URL: {data.get('profile_photo_url', 'None')}")
            print(f"   - Thumbnail URL: {data.get('profile_photo_thumbnail_url', 'None')}")
        else:
            print(f"[ERROR] Failed to get profile photo info: {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"[ERROR] Error getting profile photo info: {e}")

    # Test uploading a profile photo
    print("3. Testing profile photo upload...")
    try:
        test_image = create_test_image()

        files = {
            'profile_photo': ('test_profile.jpg', test_image, 'image/jpeg')
        }

        response = requests.post(f"{API_URL}/users/upload_profile_photo/",
                               files=files, headers=headers)

        if response.status_code == 200:
            data = response.json()
            print("[OK] Profile photo uploaded successfully:")
            print(f"   - Photo URL: {data.get('profile_photo_url', 'None')}")
            print(f"   - Thumbnail URL: {data.get('profile_photo_thumbnail_url', 'None')}")
            print(f"   - Has custom photo: {data.get('has_custom_photo', False)}")
        else:
            print(f"[ERROR] Failed to upload profile photo: {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"[ERROR] Error uploading profile photo: {e}")

    # Test deleting profile photo
    print("4. Testing profile photo deletion...")
    try:
        response = requests.delete(f"{API_URL}/users/delete_profile_photo/",
                                 headers=headers)

        if response.status_code == 200:
            data = response.json()
            print("[OK] Profile photo deleted successfully:")
            print(f"   - Photo URL: {data.get('profile_photo_url', 'None')}")
            print(f"   - Thumbnail URL: {data.get('profile_photo_thumbnail_url', 'None')}")
            print(f"   - Has custom photo: {data.get('has_custom_photo', False)}")
        else:
            print(f"[ERROR] Failed to delete profile photo: {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"[ERROR] Error deleting profile photo: {e}")

    print("\nTest completed!")

if __name__ == "__main__":
    test_profile_photo_endpoints()