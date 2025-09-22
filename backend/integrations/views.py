"""
Views for integrations app - Gmail OAuth and account management.
"""

import os
from rest_framework import views, permissions, status
from rest_framework.response import Response
from django.conf import settings
from django.shortcuts import redirect
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from .models import GoogleAccount
from .serializers import GoogleAccountSerializer

# Allow insecure transport for development (OAuth over HTTP)
if settings.DEBUG:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'


class GmailConnectView(views.APIView):
    """Initiate Gmail OAuth flow"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Debug: Print the redirect URI being used
        print(f"DEBUG: Using redirect URI: {settings.GOOGLE_OAUTH_REDIRECT_URI}")

        # Create flow instance to manage OAuth 2.0 Authorization Grant Flow steps.
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                    "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_OAUTH_REDIRECT_URI],
                }
            },
                       scopes=[
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/gmail.readonly",
                "openid"
            ],
            redirect_uri=settings.GOOGLE_OAUTH_REDIRECT_URI,
        )

        # Store user ID in session for callback
        request.session["gmail_oauth_user_id"] = request.user.id

        authorization_url, state = flow.authorization_url(
            access_type="offline", include_granted_scopes="true"
        )

        # Debug: Print the generated authorization URL
        print(f"DEBUG: Generated authorization URL: {authorization_url}")

        # Store state in session for verification
        request.session["gmail_oauth_state"] = state

        return Response({"authorization_url": authorization_url, "state": state})


class GmailCallbackView(views.APIView):
    """Handle Gmail OAuth callback"""

    permission_classes = [
        permissions.AllowAny
    ]  # Allow unauthenticated for OAuth callback

    def get(self, request):
        # Verify state parameter
        state = request.GET.get("state")
        stored_state = request.session.get("gmail_oauth_state")

        # Debug logging
        print(f"DEBUG: Received state: {state}")
        print(f"DEBUG: Stored state: {stored_state}")
        print(f"DEBUG: Session keys: {list(request.session.keys())}")

        if state != stored_state:
            return Response(
                {
                    "error": "Invalid state parameter",
                    "received_state": state,
                    "stored_state": stored_state,
                    "session_keys": list(request.session.keys())
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get user ID from session
        user_id = request.session.get("gmail_oauth_user_id")
        if not user_id:
            return Response(
                {"error": "User ID not found in session"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Exchange authorization code for tokens
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                    "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_OAUTH_REDIRECT_URI],
                }
            },
            scopes= [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid"
        ],
            redirect_uri=settings.GOOGLE_OAUTH_REDIRECT_URI,
            state=state,
        )

        authorization_response = request.build_absolute_uri()
        flow.fetch_token(authorization_response=authorization_response)

        # Get user info from Google
        service = build("gmail", "v1", credentials=flow.credentials)
        profile = service.users().getProfile(userId="me").execute()

        # Save or update GoogleAccount
        try:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            user = User.objects.get(id=user_id)

            google_account, created = GoogleAccount.objects.update_or_create(
                user=user,
                defaults={
                    "email": profile["emailAddress"],
                    "access_token": flow.credentials.token,
                    "refresh_token": flow.credentials.refresh_token,
                    "expires_at": flow.credentials.expiry,
                },
            )

            # Clean up session
            del request.session["gmail_oauth_user_id"]
            del request.session["gmail_oauth_state"]

            # Redirect to frontend success page
            return redirect(
                f"{settings.CORS_ALLOWED_ORIGINS[0]}/settings?gmail_connected=true"
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class GmailAccountView(views.APIView):
    """Manage Gmail account connection"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get current Gmail account status"""
        try:
            google_account = GoogleAccount.objects.get(user=request.user)
            serializer = GoogleAccountSerializer(google_account)
            return Response(serializer.data)
        except GoogleAccount.DoesNotExist:
            return Response({"connected": False})

    def delete(self, request):
        """Disconnect Gmail account"""
        try:
            google_account = GoogleAccount.objects.get(user=request.user)
            google_account.delete()
            return Response({"message": "Gmail account disconnected successfully"})
        except GoogleAccount.DoesNotExist:
            return Response(
                {"error": "No Gmail account connected"},
                status=status.HTTP_404_NOT_FOUND,
            )

    def patch(self, request):
        """Update Gmail account settings (filters, etc.)"""
        try:
            google_account = GoogleAccount.objects.get(user=request.user)

            # Update filter settings
            if "email_filter_keywords" in request.data:
                google_account.email_filter_keywords = request.data[
                    "email_filter_keywords"
                ]
            if "email_filter_senders" in request.data:
                google_account.email_filter_senders = request.data[
                    "email_filter_senders"
                ]

            google_account.save()

            serializer = GoogleAccountSerializer(google_account)
            return Response(serializer.data)
        except GoogleAccount.DoesNotExist:
            return Response(
                {"error": "No Gmail account connected"},
                status=status.HTTP_404_NOT_FOUND,
            )


class GmailTestFetchView(views.APIView):
    """Test Gmail email fetching (for development)"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Manually trigger email fetch for testing"""
        try:
            from .tasks import fetch_emails_from_gmail
            result = fetch_emails_from_gmail.delay(request.user.id)
            return Response(
                {"message": "Email fetch task started", "task_id": result.id}
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class GmailConnectionTestView(views.APIView):
    """Test Gmail API connection"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Test Gmail API connection and return status"""
        try:
            from .services.gmail_service import GmailService

            gmail_service = GmailService(request.user)
            result = gmail_service.test_connection()

            if "error" in result:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response(result)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
