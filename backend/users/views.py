# Standard library imports
import logging

# Third-party imports
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import (
    OutstandingToken,
    BlacklistedToken,
)

from django.contrib.auth import get_user_model, login
from django.db.models import F, Q
from django.conf import settings
from django.urls import reverse
from django.utils.http import urlencode
from django.shortcuts import redirect

# Allauth imports
from allauth.socialaccount.models import SocialAccount

# Local application imports
import finance.models as fmodels
from users.serializers_auth import EmailTokenObtainPairSerializer
from users.models import Plan, UserPlanAssignment, UserAddon, ActivityLog, UserProfile
from users.image_utils import ProfilePhotoProcessor, cleanup_old_profile_photos
from finance.models import GroupExpenseShare
from users.serializers import (
    UserSerializer,
    UserPlanAssignmentSerializer,
    ActivityLogSerializer,
    OnboardingSerializer,
    ProfilePhotoSerializer,
)
from finance.serializers import (
    AccountSerializer,
    CategorySerializer,
    TagSerializer,
    GroupExpenseShareSerializer,
)

logger = logging.getLogger(__name__)


def _handle_api_exception(
    e,
    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    message="An unexpected error occurred.",
):
    logger.exception(f"API Exception: {e}")  # Use exception to log traceback
    return Response(
        {"error": message if message != "An unexpected error occurred." else str(e)},
        status=status_code,
    )


User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT token view that accepts email and returns user info with secure httpOnly cookies"""

    serializer_class = EmailTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        logger.debug(
            f"CustomTokenObtainPairView: Response status: {response.status_code}"
        )
        logger.debug(f"CustomTokenObtainPairView: Response data: {response.data}")

        # Add user info to response
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.user
            response.data["user"] = UserSerializer(user).data

            # Keep tokens in response body for frontend localStorage usage
            # Also set secure httpOnly cookies for additional security (optional)
            access_token = response.data.get("access")
            refresh_token = response.data.get("refresh")

            if access_token:
                # Set httpOnly cookie for security
                response.set_cookie(
                    "access_token",
                    access_token,
                    max_age=60 * 60,  # 1 hour
                    httponly=True,
                    secure=settings.JWT_COOKIE_SECURE,
                    samesite=settings.JWT_COOKIE_SAMESITE,
                )

            if refresh_token:
                response.set_cookie(
                    "refresh_token",
                    refresh_token,
                    max_age=60 * 60 * 24 * 7,  # 7 days
                    httponly=True,
                    secure=settings.JWT_COOKIE_SECURE,
                    samesite=settings.JWT_COOKIE_SAMESITE,
                )

            # In production, you may want to remove tokens from response body and rely on httpOnly cookies only
            # For local development (DEBUG=True), keep tokens in body to simplify frontend usage
            if not settings.DEBUG:
                response.data.pop("access", None)
                response.data.pop("refresh", None)

        return response


class CustomTokenRefreshView(APIView):
    """Custom JWT refresh view that uses httpOnly cookies"""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        # Get refresh token from httpOnly cookie or request body (fallback)
        refresh_token = request.COOKIES.get("refresh_token") or request.data.get(
            "refresh"
        )

        if not refresh_token:
            return Response({"error": "Refresh token not found"}, status=400)

        try:
            # Validate and refresh the token
            refresh = RefreshToken(refresh_token)

            # Check if the refresh token is blacklisted
            from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

            jti = refresh.get("jti")
            if BlacklistedToken.objects.filter(token__jti=jti).exists():
                raise TokenError("Token is blacklisted")

            access_token = str(refresh.access_token)
            new_refresh_token = str(refresh)

            # Get user info for response
            user_id = refresh.get("user_id")
            user = User.objects.get(id=user_id)

            # Create response with tokens (in DEBUG mode) and user info
            response_data = {
                "message": "Token refreshed successfully",
                "user": UserSerializer(user).data,
            }

            # In DEBUG mode, also include tokens in response body for frontend convenience
            if settings.DEBUG:
                response_data.update(
                    {
                        "access": access_token,
                        "refresh": new_refresh_token,
                    }
                )

            response = Response(response_data)

            # Set new tokens as httpOnly cookies
            response.set_cookie(
                "access_token",
                access_token,
                max_age=60 * 60,  # 1 hour
                httponly=True,
                secure=settings.JWT_COOKIE_SECURE,
                samesite=settings.JWT_COOKIE_SAMESITE,
            )

            response.set_cookie(
                "refresh_token",
                new_refresh_token,
                max_age=60 * 60 * 24 * 7,  # 7 days
                httponly=True,
                secure=settings.JWT_COOKIE_SECURE,
                samesite=settings.JWT_COOKIE_SAMESITE,
            )

            return response

        except TokenError as e:
            response = _handle_api_exception(
                e,
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="Invalid refresh token",
            )
            response.delete_cookie("access_token")
            response.delete_cookie("refresh_token")
            return response
        except User.DoesNotExist:
            response = Response({"error": "User not found"}, status=401)
            response.delete_cookie("access_token")
            response.delete_cookie("refresh_token")
            return response


class UserViewSet(viewsets.ModelViewSet):
    """User management endpoints"""

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=["get"])
    def me(self, request):
        """Get current user profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=["patch"])
    def update_preferences(self, request):
        """Update user preferences"""
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def search(self, request):
        """Search users by email or username for group invitations"""
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response(
                {"detail": "Query parameter 'q' is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Search users by email or username (excluding current user)
        users = User.objects.filter(
            Q(email__icontains=query) | Q(username__icontains=query)
        ).exclude(id=request.user.id)[:10]  # Limit to 10 results

        # Return minimal user info for privacy
        results = []
        for user in users:
            results.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
            })

        return Response(results)

    @action(detail=False, methods=["post"])
    def upload_profile_photo(self, request):
        """Upload and process profile photo"""
        try:
            profile, created = UserProfile.objects.get_or_create(user=request.user)

            if 'profile_photo' not in request.FILES:
                return Response(
                    {"error": "No profile photo file provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            image_file = request.FILES['profile_photo']

            # Validate image file first
            validation_errors = ProfilePhotoProcessor.validate_image_file(image_file)
            if validation_errors:
                return Response(
                    {"errors": validation_errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Clean up old photos
            cleanup_old_profile_photos(profile)

            # Process image
            main_file, thumbnail_file, processing_errors = ProfilePhotoProcessor.process_profile_photo(
                image_file,
                filename_prefix=f"user_{request.user.id}"
            )

            if processing_errors:
                return Response(
                    {"errors": processing_errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Save processed images to profile
            profile.profile_photo.save(main_file.name, main_file, save=False)
            profile.profile_photo_thumbnail.save(thumbnail_file.name, thumbnail_file, save=False)
            profile.save()

            # Return updated profile photo info
            serializer = ProfilePhotoSerializer(profile)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("Error uploading profile photo")
            return Response(
                {"error": f"Failed to upload profile photo: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["delete"])
    def delete_profile_photo(self, request):
        """Delete custom profile photo"""
        try:
            profile = request.user.profile

            if not profile.profile_photo:
                return Response(
                    {"error": "No custom profile photo to delete"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Delete profile photos
            profile.delete_profile_photo()

            # Return updated profile photo info (will fall back to Google photo if available)
            serializer = ProfilePhotoSerializer(profile)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except UserProfile.DoesNotExist:
            return Response(
                {"error": "User profile not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.exception("Error deleting profile photo")
            return Response(
                {"error": f"Failed to delete profile photo: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"])
    def profile_photo_info(self, request):
        """Get current profile photo information"""
        try:
            profile = request.user.profile
            serializer = ProfilePhotoSerializer(profile)
            return Response(serializer.data)
        except UserProfile.DoesNotExist:
            return Response(
                {"error": "User profile not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return fmodels.Account.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return fmodels.Category.objects.filter(user=self.request.user)


class TagViewSet(viewsets.ModelViewSet):
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return fmodels.Tag.objects.filter(user=self.request.user)


class UserPlanAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = UserPlanAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserPlanAssignment.objects.filter(user=self.request.user)

    @action(detail=False, methods=["post"])
    def assign_plan(self, request):
        plan_id = request.data.get("plan_id")
        if not plan_id:
            return Response(
                {"error": "Plan ID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            plan = Plan.objects.get(id=plan_id, plan_type="base", is_active=True)
        except Plan.DoesNotExist:
            return Response(
                {"error": "Base plan not found or not active"},
                status=status.HTTP_404_NOT_FOUND,
            )

        assignment, created = UserPlanAssignment.objects.get_or_create(
            user=request.user, defaults={"base_plan": plan}
        )
        if not created:
            assignment.base_plan = plan
            assignment.save()

        assignment.calculate_totals()
        serializer = self.get_serializer(assignment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_addon(self, request, pk=None):
        assignment = self.get_object()
        addon_id = request.data.get("addon_id")
        quantity = request.data.get("quantity", 1)

        try:
            addon = Plan.objects.get(id=addon_id, plan_type="addon", is_active=True)
        except Plan.DoesNotExist:
            return Response(
                {"error": "Addon not found or not active"},
                status=status.HTTP_404_NOT_FOUND,
            )

        user_addon, created = UserAddon.objects.get_or_create(
            user_plan=assignment, addon=addon, defaults={"quantity": quantity}
        )
        if not created:
            user_addon.quantity = F("quantity") + quantity
            user_addon.save()
            user_addon.refresh_from_db()

        assignment.calculate_totals()
        serializer = self.get_serializer(assignment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def remove_addon(self, request, pk=None):
        assignment = self.get_object()
        addon_id = request.data.get("addon_id")

        try:
            user_addon = UserAddon.objects.get(user_plan=assignment, addon_id=addon_id)
            user_addon.delete()
        except UserAddon.DoesNotExist:
            return Response(
                {"error": "Addon not found in your plan"},
                status=status.HTTP_404_NOT_FOUND,
            )

        assignment.calculate_totals()
        serializer = self.get_serializer(assignment)
        return Response(serializer.data)


class GroupExpenseShareViewSet(viewsets.ModelViewSet):
    serializer_class = GroupExpenseShareSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return GroupExpenseShare.objects.filter(group_expense__user=self.request.user)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ActivityLog.objects.filter(user=self.request.user).order_by(
            "-created_at"
        )


class OnboardingViewSet(viewsets.ModelViewSet):
    serializer_class = OnboardingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user)

    def get_object(self):
        return self.request.user.profile

    @action(detail=False, methods=["post"])
    def complete_step(self, request):
        user_profile = self.get_object()
        serializer = self.get_serializer(user_profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


class GoogleAuthUrl(APIView):
    """Generate Google OAuth2 authorization URL"""

    permission_classes = [AllowAny]

    def get(self, request):
        try:
            # Check if Google OAuth is configured
            client_id = settings.GOOGLE_OAUTH_CLIENT_ID
            if not client_id:
                return Response(
                    {"error": "Google OAuth client ID not configured"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Build Google OAuth URL manually
            base_url = "https://accounts.google.com/o/oauth2/v2/auth"
            redirect_uri = request.build_absolute_uri("/api/auth/google/callback/")

            params = {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "scope": "openid email profile",
                "response_type": "code",
                "access_type": "offline",
                "prompt": "select_account",
                "state": "google_oauth",  # Add state parameter for frontend validation
            }

            auth_url = f"{base_url}?{urlencode(params)}"
            return Response({"auth_url": auth_url})

        except Exception as e:
            logger.exception("Error generating Google auth URL")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GoogleLogin(APIView):
    """Handle Google OAuth2 callback and login"""

    permission_classes = [AllowAny]

    def get(self, request):
        """Handle Google OAuth callback from redirect - just pass parameters to frontend"""
        code = request.GET.get("code")
        state = request.GET.get("state", "")
        error = request.GET.get("error")

        logger.info(f"GET request to Google callback - code: {code[:10] if code else None}..., state: {state}, error: {error}")

        if error:
            frontend_url = f"http://localhost:5173/google-callback?error={error}"
        elif code:
            frontend_url = (
                f"http://localhost:5173/google-callback?code={code}&state={state}"
            )
        else:
            frontend_url = "http://localhost:5173/google-callback?error=Missing code"

        return redirect(frontend_url)

    def post(self, request):
        """Handle Google OAuth callback from API call"""
        return self._handle_google_auth(request)

    def _handle_google_auth(self, request):
        import requests

        try:
            # Get code from either GET parameters (redirect) or POST data (API call)
            code = request.GET.get("code") or request.data.get("code")
            state = request.GET.get("state") or request.data.get("state")

            logger.info(f"Google OAuth callback - code: {code[:10] if code else None}..., state: {state}")

            if not code:
                logger.error("Authorization code is missing")
                return Response(
                    {"error": "Authorization code is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if Google OAuth is configured
            client_id = settings.GOOGLE_OAUTH_CLIENT_ID
            client_secret = settings.GOOGLE_OAUTH_CLIENT_SECRET

            if not client_id or not client_secret:
                return Response(
                    {"error": "Google OAuth not configured"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Exchange authorization code for access token
            token_url = "https://oauth2.googleapis.com/token"
            redirect_uri = request.build_absolute_uri("/api/auth/google/callback/")

            token_data = {
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            }

            token_response = requests.post(token_url, data=token_data)
            token_json = token_response.json()

            logger.info(f"Google token response status: {token_response.status_code}")
            logger.info(f"Google token response: {token_json}")

            if "access_token" not in token_json:
                error_msg = token_json.get('error_description', token_json.get('error', 'Unknown error'))
                error_type = token_json.get('error', '')

                logger.error(f"Failed to get access token from Google: {error_msg} (type: {error_type})")

                # If authorization code was already used, this is likely a duplicate request
                if 'invalid_grant' in error_type or 'authorization code' in error_msg.lower():
                    return Response(
                        {"error": "Authorization code already used. Please try logging in again."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                return Response(
                    {"error": f"Failed to get access token from Google: {error_msg}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Use access token to get user info
            access_token = token_json["access_token"]
            user_info_url = f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={access_token}"

            user_response = requests.get(user_info_url)
            user_data = user_response.json()

            # Find or create user
            email = user_data.get("email")
            if not email:
                logger.error("Email not provided by Google")
                return Response(
                    {"error": "Email not provided by Google"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            logger.info(f"Processing Google login for email: {email}")

            # Check if user exists
            try:
                user = User.objects.get(email=email)
                created = False
                logger.info(f"Found existing user: {user.email}")
            except User.DoesNotExist:
                # Create new user
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    first_name=user_data.get("given_name", ""),
                    last_name=user_data.get("family_name", ""),
                )
                created = True
                logger.info(f"Created new user: {user.email}")

            # Create or get social account
            social_account, _ = SocialAccount.objects.get_or_create(
                user=user,
                provider="google",
                defaults={"uid": user_data.get("id"), "extra_data": user_data},
            )

            # Update user profile with Google data
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.google_profile_picture = user_data.get("picture")
            profile.google_email_verified = user_data.get("verified_email", False)
            profile.save()

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            jwt_access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            # Prepare response
            response_data = {"user": UserSerializer(user).data, "created": created}

            # In DEBUG mode, include tokens in response
            if settings.DEBUG:
                response_data.update(
                    {
                        "access": jwt_access_token,
                        "refresh": refresh_token,
                    }
                )

            # Create JSON response for API calls
            response = Response(response_data, status=status.HTTP_200_OK)

            # Set httpOnly cookies
            response.set_cookie(
                "access_token",
                jwt_access_token,
                max_age=60 * 60,  # 1 hour
                httponly=True,
                secure=settings.JWT_COOKIE_SECURE,
                samesite=settings.JWT_COOKIE_SAMESITE,
            )

            response.set_cookie(
                "refresh_token",
                refresh_token,
                max_age=60 * 60 * 24 * 7,  # 7 days
                httponly=True,
                secure=settings.JWT_COOKIE_SECURE,
                samesite=settings.JWT_COOKIE_SAMESITE,
            )

            return response

        except Exception as e:
            logger.exception("Error during Google login")
            # Return JSON error for POST requests
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RegisterView(APIView):
    """User registration endpoint"""

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        full_name = request.data.get("full_name", "")

        if not email or not password:
            return Response({"error": "Email and password required"}, status=400)

        if User.objects.filter(Q(email=email) | Q(username=email)).exists():
            return Response(
                {"error": "User with this email already exists"}, status=400
            )

        user = User.objects.create_user(
            username=email,  # Use email as username
            email=email,
            password=password,
            first_name=full_name.split(" ")[0] if full_name else "",
            last_name=" ".join(full_name.split(" ")[1:]) if " " in full_name else "",
        )

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # In DEBUG, also include tokens in response body for frontend convenience
        response_payload = {
            "user": UserSerializer(user).data,
        }
        if settings.DEBUG:
            response_payload.update(
                {
                    "access": access_token,
                    "refresh": refresh_token,
                }
            )

        response = Response(response_payload, status=status.HTTP_201_CREATED)

        # Set httpOnly cookies for security
        response.set_cookie(
            "access_token",
            access_token,
            max_age=60 * 60,  # 1 hour
            httponly=True,
            secure=settings.JWT_COOKIE_SECURE,
            samesite=settings.JWT_COOKIE_SAMESITE,
        )

        response.set_cookie(
            "refresh_token",
            refresh_token,
            max_age=60 * 60 * 24 * 7,  # 7 days
            httponly=True,
            secure=settings.JWT_COOKIE_SECURE,
            samesite=settings.JWT_COOKIE_SAMESITE,
        )

        return response


class LogoutView(APIView):
    """User logout endpoint"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Try to get refresh token from cookie or request data
        refresh_token = request.COOKIES.get("refresh_token") or request.data.get(
            "refresh"
        )

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                outstanding_token = OutstandingToken.objects.get(jti=token["jti"])
                BlacklistedToken.objects.get_or_create(token=outstanding_token)
            except TokenError as e:
                logger.error(f"Error blacklisting token: {e}")

        response = Response(
            {"message": "Successfully logged out"}, status=status.HTTP_200_OK
        )

        # Clear httpOnly cookies
        response.set_cookie(
            "access_token",
            "",
            expires="Thu, 01 Jan 1970 00:00:00 GMT",
            max_age=0,
            httponly=True,
            secure=settings.JWT_COOKIE_SECURE,
            samesite=settings.JWT_COOKIE_SAMESITE,
            path="/",
        )
        response.set_cookie(
            "refresh_token",
            "",
            expires="Thu, 01 Jan 1970 00:00:00 GMT",
            max_age=0,
            httponly=True,
            secure=settings.JWT_COOKIE_SECURE,
            samesite=settings.JWT_COOKIE_SAMESITE,
            path="/",
        )

        return response


class UserAccountDeleteView(APIView):
    """Delete user account and all associated data"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        """Permanently delete user account and all associated data"""
        user = request.user

        try:
            # Log the account deletion attempt
            logger.info(f"User account deletion requested for user: {user.email}")

            # Delete user and all associated data (CASCADE should handle related objects)
            user.delete()

            # Log successful deletion
            logger.info(f"User account successfully deleted: {user.email}")

            return Response(
                {"message": "User account and all associated data have been permanently deleted"},
                status=status.HTTP_200_OK
            )

        except Exception as e:
            logger.error(f"Error deleting user account {user.email}: {str(e)}")
            return Response(
                {"detail": "Failed to delete user account"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
