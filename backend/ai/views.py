"""
AI configuration and management views.
"""

import logging
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg
from django.utils import timezone
from datetime import timedelta

from users.models import UserProfile, ActivityLog
from .ai_service import AIService

logger = logging.getLogger(__name__)


class AIConfigurationViewSet(viewsets.ViewSet):
    """ViewSet for AI configuration management"""

    permission_classes = [IsAuthenticated]

    def get_user_profile(self):
        """Get or create user profile"""
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile

    @action(detail=False, methods=["get"])
    def settings(self, request):
        """Get current AI settings"""
        profile = self.get_user_profile()
        ai_settings = profile.config.get("ai_settings", {})

        # Default settings
        default_settings = {
            "preferred_provider": "openai",
            "openai_api_key": "",
            "openai_model": "gpt-3.5-turbo",
            "ollama_endpoint": "http://localhost:11434",
            "ollama_model": "llama2",
            "enable_categorization": True,
            "enable_transaction_parsing": True,
            "enable_receipt_ocr": True,
            "enable_monthly_reports": True,
            "confidence_threshold": 0.7,
            "max_monthly_usage": 1000,
            "auto_approve_high_confidence": False,
        }

        # Merge with user settings
        settings_data = {**default_settings, **ai_settings}

        # Don't expose API keys in response
        if settings_data.get("openai_api_key"):
            settings_data["openai_api_key"] = "***masked***"

        return Response(
            {
                "settings": settings_data,
                "credits_remaining": profile.ai_credits_remaining,
                "system_openai_available": bool(settings.OPENAI_API_KEY),
                "system_ollama_available": bool(settings.OLLAMA_ENDPOINT),
            }
        )

    @action(detail=False, methods=["post"])
    def update_settings(self, request):
        """Update AI settings"""
        profile = self.get_user_profile()
        current_settings = profile.config.get("ai_settings", {})

        # Get new settings from request
        new_settings = request.data.get("settings", {})

        # Validate provider
        if "preferred_provider" in new_settings:
            if new_settings["preferred_provider"] not in ["openai", "ollama", "system"]:
                return Response(
                    {"error": "Invalid provider. Must be openai, ollama, or system"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Handle API key encryption
        if "openai_api_key" in new_settings and new_settings["openai_api_key"]:
            if new_settings["openai_api_key"] != "***masked***":
                # Encrypt the API key
                ai_service = AIService()
                encrypted_key = ai_service.encrypt_api_key(
                    new_settings["openai_api_key"]
                )
                new_settings["openai_api_key"] = encrypted_key
            else:
                # Keep existing key
                new_settings["openai_api_key"] = current_settings.get(
                    "openai_api_key", ""
                )

        # Validate numeric settings
        numeric_fields = ["confidence_threshold", "max_monthly_usage"]
        for field in numeric_fields:
            if field in new_settings:
                try:
                    float(new_settings[field])
                except (ValueError, TypeError):
                    return Response(
                        {"error": f"Invalid {field}. Must be a number"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Validate confidence threshold
        if "confidence_threshold" in new_settings:
            threshold = float(new_settings["confidence_threshold"])
            if not 0.0 <= threshold <= 1.0:
                return Response(
                    {"error": "Confidence threshold must be between 0.0 and 1.0"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Update settings
        updated_settings = {**current_settings, **new_settings}
        profile.config["ai_settings"] = updated_settings
        profile.save()

        # Log the configuration change
        ActivityLog.objects.create(
            user=request.user,
            activity_type="user_action",
            action="ai_settings_updated",
            activity_data={
                "updated_fields": list(new_settings.keys()),
                "provider": updated_settings.get("preferred_provider", "openai"),
            },
        )

        return Response({"message": "Settings updated successfully"})

    @action(detail=False, methods=["post"])
    def test_connection(self, request):
        """Test AI provider connection"""

        try:
            ai_service = AIService()
            provider_type, client, model = ai_service.get_ai_client(request.user)

            if not client:
                return Response(
                    {
                        "success": False,
                        "error": "No AI client available. Please configure API keys.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Test with a simple prompt
            test_prompt = "Respond with 'OK' if you can understand this message."

            start_time = timezone.now()

            if provider_type == "openai":
                try:
                    response = client.chat.completions.create(
                        model=model,
                        messages=[{"role": "user", "content": test_prompt}],
                        max_tokens=10,
                    )
                    result = response.choices[0].message.content.strip()
                    tokens_used = response.usage.total_tokens if response.usage else 0
                except Exception as e:
                    return Response(
                        {"success": False, "error": f"OpenAI error: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            elif provider_type == "ollama":
                try:
                    response = client.chat(
                        model=model, messages=[{"role": "user", "content": test_prompt}]
                    )
                    result = response["message"]["content"].strip()
                    tokens_used = 0  # Ollama doesn't provide token count
                except Exception as e:
                    return Response(
                        {"success": False, "error": f"Ollama error: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            processing_time = (timezone.now() - start_time).total_seconds()

            # Log the test
            ai_service.log_usage(
                user=request.user,
                usage_type="connection_test",
                provider=provider_type,
                model=model,
                credits_consumed=0,  # Don't charge for tests
                success=True,
                input_data=test_prompt,
                output_data=result,
                processing_time=processing_time,
                tokens_used=tokens_used,
            )

            return Response(
                {
                    "success": True,
                    "provider": provider_type,
                    "model": model,
                    "response": result,
                    "processing_time": round(processing_time, 2),
                    "tokens_used": tokens_used,
                }
            )

        except Exception as e:
            logger.error(f"AI connection test failed: {str(e)}")
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"])
    def usage_stats(self, request):
        """Get AI usage statistics"""
        # Get date range from query params
        days = int(request.query_params.get("days", 30))
        start_date = timezone.now() - timedelta(days=days)

        # Get AI usage activities
        usage_activities = ActivityLog.objects.filter(
            user=request.user, activity_type="ai_usage", created_at__gte=start_date
        )

        # Calculate statistics
        total_requests = usage_activities.count()
        successful_requests = usage_activities.filter(
            activity_data__success=True
        ).count()

        total_credits = sum(
            activity.activity_data.get("credits_consumed", 0)
            for activity in usage_activities
        )

        total_tokens = sum(
            activity.activity_data.get("tokens_used", 0)
            for activity in usage_activities
        )

        avg_processing_time = (
            usage_activities.aggregate(avg_time=Avg("activity_data__processing_time"))[
                "avg_time"
            ]
            or 0
        )

        # Usage by provider
        provider_stats = {}
        for activity in usage_activities:
            provider = activity.activity_data.get("provider", "unknown")
            if provider not in provider_stats:
                provider_stats[provider] = {
                    "requests": 0,
                    "credits": 0,
                    "success_rate": 0,
                }
            provider_stats[provider]["requests"] += 1
            provider_stats[provider]["credits"] += activity.activity_data.get(
                "credits_consumed", 0
            )

        # Calculate success rates
        for provider in provider_stats:
            provider_requests = usage_activities.filter(
                activity_data__provider=provider
            )
            successful = provider_requests.filter(activity_data__success=True).count()
            provider_stats[provider]["success_rate"] = (
                (successful / provider_requests.count() * 100)
                if provider_requests.count() > 0
                else 0
            )

        # Usage by operation type
        operation_stats = {}
        for activity in usage_activities:
            operation = activity.action
            if operation not in operation_stats:
                operation_stats[operation] = {"requests": 0, "credits": 0}
            operation_stats[operation]["requests"] += 1
            operation_stats[operation]["credits"] += activity.activity_data.get(
                "credits_consumed", 0
            )

        # Daily usage for the chart
        daily_usage = []
        for i in range(days):
            date = start_date + timedelta(days=i)
            day_activities = usage_activities.filter(created_at__date=date.date())
            daily_usage.append(
                {
                    "date": date.date().isoformat(),
                    "requests": day_activities.count(),
                    "credits": sum(
                        activity.activity_data.get("credits_consumed", 0)
                        for activity in day_activities
                    ),
                }
            )

        profile = self.get_user_profile()

        return Response(
            {
                "period_days": days,
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "success_rate": round(
                    (successful_requests / total_requests * 100)
                    if total_requests > 0
                    else 0,
                    1,
                ),
                "total_credits_used": total_credits,
                "total_tokens_used": total_tokens,
                "avg_processing_time": round(avg_processing_time, 2),
                "credits_remaining": profile.ai_credits_remaining,
                "provider_stats": provider_stats,
                "operation_stats": operation_stats,
                "daily_usage": daily_usage,
            }
        )

    @action(detail=False, methods=["post"])
    def add_credits(self, request):
        """Add AI credits to user account"""
        # This would typically be handled by payment processing
        # For now, allow admins to add credits manually

        if not request.user.is_staff:
            return Response(
                {"error": "Only administrators can add credits"},
                status=status.HTTP_403_FORBIDDEN,
            )

        credits = request.data.get("credits", 0)
        reason = request.data.get("reason", "Manual addition")

        try:
            credits = int(credits)
            if credits <= 0:
                return Response(
                    {"error": "Credits must be a positive number"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid credits value"}, status=status.HTTP_400_BAD_REQUEST
            )

        profile = self.get_user_profile()
        old_credits = profile.ai_credits_remaining
        profile.ai_credits_remaining += credits
        profile.save()

        # Log the credit addition
        ActivityLog.objects.create(
            user=request.user,
            activity_type="system",
            action="credits_added",
            activity_data={
                "credits_added": credits,
                "old_balance": old_credits,
                "new_balance": profile.ai_credits_remaining,
                "reason": reason,
                "added_by": request.user.username,
            },
        )

        return Response(
            {
                "message": f"Successfully added {credits} credits",
                "old_balance": old_credits,
                "new_balance": profile.ai_credits_remaining,
            }
        )

    @action(detail=False, methods=["get"])
    def models(self, request):
        """Get available AI models"""
        return Response(
            {
                "openai_models": [
                    {
                        "id": "gpt-3.5-turbo",
                        "name": "GPT-3.5 Turbo",
                        "description": "Fast and cost-effective",
                    },
                    {
                        "id": "gpt-4",
                        "name": "GPT-4",
                        "description": "Most capable, higher cost",
                    },
                    {
                        "id": "gpt-4-turbo",
                        "name": "GPT-4 Turbo",
                        "description": "Latest GPT-4 with improvements",
                    },
                ],
                "ollama_models": [
                    {
                        "id": "llama2",
                        "name": "Llama 2",
                        "description": "Open source model",
                    },
                    {
                        "id": "codellama",
                        "name": "Code Llama",
                        "description": "Optimized for code",
                    },
                    {
                        "id": "mistral",
                        "name": "Mistral 7B",
                        "description": "Efficient and capable",
                    },
                    {
                        "id": "neural-chat",
                        "name": "Neural Chat",
                        "description": "Conversational model",
                    },
                ],
            }
        )

    @action(detail=False, methods=["get"])
    def system_status(self, request):
        """Get system AI status"""
        ai_service = AIService()

        # Test system OpenAI
        system_openai_status = "unavailable"
        if ai_service.system_openai_key:
            try:
                import openai

                client = openai.OpenAI(api_key=ai_service.system_openai_key)
                client.models.list()
                system_openai_status = "available"
            except Exception:
                system_openai_status = "error"

        # Test system Ollama
        system_ollama_status = "unavailable"
        if ai_service.system_ollama_endpoint:
            try:
                import ollama

                client = ollama.Client(host=ai_service.system_ollama_endpoint)
                client.list()
                system_ollama_status = "available"
            except Exception:
                system_ollama_status = "error"

        return Response(
            {
                "system_openai_status": system_openai_status,
                "system_ollama_status": system_ollama_status,
                "system_openai_endpoint": "https://api.openai.com"
                if ai_service.system_openai_key
                else None,
                "system_ollama_endpoint": ai_service.system_ollama_endpoint,
                "credit_costs": ai_service.credit_costs,
            }
        )
