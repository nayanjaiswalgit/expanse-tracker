"""
Goal-related views for the finance app.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import Goal
from ..serializers import GoalSerializer


class GoalViewSet(viewsets.ModelViewSet):
    """ViewSet for financial goal management"""

    serializer_class = GoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"])
    def update_progress(self, request, pk=None):
        """Update goal progress"""
        goal = self.get_object()

        try:
            amount = request.data.get("amount")

            if not amount:
                return Response(
                    {"error": "Amount is required"}, status=status.HTTP_400_BAD_REQUEST
                )

            # Update current amount
            goal.current_amount += amount

            # Check if goal is completed
            if goal.current_amount >= goal.target_amount:
                goal.status = "completed"

            goal.save()

            return Response(
                {
                    "message": "Goal progress updated successfully",
                    "current_amount": goal.current_amount,
                    "progress_percentage": goal.progress_percentage,
                    "status": goal.status,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def mark_completed(self, request, pk=None):
        """Mark goal as completed"""
        goal = self.get_object()

        goal.status = "completed"
        goal.save()

        return Response(
            {"message": "Goal marked as completed", "status": goal.status},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        """Pause a goal"""
        goal = self.get_object()

        goal.status = "paused"
        goal.save()

        return Response(
            {"message": "Goal paused", "status": goal.status}, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        """Resume a paused goal"""
        goal = self.get_object()

        if goal.status == "paused":
            goal.status = "active"
            goal.save()

            return Response(
                {"message": "Goal resumed", "status": goal.status},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"error": "Goal is not paused"}, status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get goals summary"""
        goals = self.get_queryset()

        summary = {
            "total_goals": goals.count(),
            "active_goals": goals.filter(status="active").count(),
            "completed_goals": goals.filter(status="completed").count(),
            "paused_goals": goals.filter(status="paused").count(),
            "total_target_amount": sum(goal.target_amount for goal in goals),
            "total_current_amount": sum(goal.current_amount for goal in goals),
            "average_progress": 0,
        }

        if summary["total_goals"] > 0:
            summary["average_progress"] = (
                sum(goal.progress_percentage for goal in goals) / summary["total_goals"]
            )

        return Response(summary, status=status.HTTP_200_OK)
