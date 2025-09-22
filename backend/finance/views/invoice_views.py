"""
Invoice-related views for the finance app.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from ..models import Invoice
from ..serializers import InvoiceSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for invoice management"""

    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Invoice.objects.filter(user=self.request.user).order_by("-issue_date")

    @action(detail=True, methods=["post"])
    def mark_sent(self, request, pk=None):
        """Mark invoice as sent"""
        invoice = self.get_object()

        if invoice.status == "draft":
            invoice.status = "sent"
            invoice.save()

            return Response(
                {"message": "Invoice marked as sent", "status": invoice.status},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"error": "Invoice is not in draft status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def mark_paid(self, request, pk=None):
        """Mark invoice as paid"""
        invoice = self.get_object()
        paid_date = request.data.get("paid_date", timezone.now().date())

        if invoice.status in ["sent", "overdue"]:
            invoice.status = "paid"
            invoice.paid_date = paid_date
            invoice.save()

            return Response(
                {
                    "message": "Invoice marked as paid",
                    "status": invoice.status,
                    "paid_date": invoice.paid_date,
                },
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"error": "Invoice cannot be marked as paid from current status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def mark_overdue(self, request, pk=None):
        """Mark invoice as overdue"""
        invoice = self.get_object()

        if invoice.status == "sent" and invoice.due_date < timezone.now().date():
            invoice.status = "overdue"
            invoice.save()

            return Response(
                {"message": "Invoice marked as overdue", "status": invoice.status},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"error": "Invoice cannot be marked as overdue"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel invoice"""
        invoice = self.get_object()

        if invoice.status in ["draft", "sent"]:
            invoice.status = "cancelled"
            invoice.save()

            return Response(
                {"message": "Invoice cancelled", "status": invoice.status},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"error": "Invoice cannot be cancelled from current status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get invoices summary"""
        invoices = self.get_queryset()

        summary = {
            "total_invoices": invoices.count(),
            "draft_invoices": invoices.filter(status="draft").count(),
            "sent_invoices": invoices.filter(status="sent").count(),
            "paid_invoices": invoices.filter(status="paid").count(),
            "overdue_invoices": invoices.filter(status="overdue").count(),
            "cancelled_invoices": invoices.filter(status="cancelled").count(),
            "total_amount": sum(invoice.total_amount for invoice in invoices),
            "paid_amount": sum(
                invoice.total_amount for invoice in invoices.filter(status="paid")
            ),
            "outstanding_amount": sum(
                invoice.total_amount
                for invoice in invoices.filter(status__in=["sent", "overdue"])
            ),
        }

        return Response(summary, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def overdue(self, request):
        """Get overdue invoices"""
        today = timezone.now().date()
        overdue_invoices = self.get_queryset().filter(status="sent", due_date__lt=today)

        # Auto-mark as overdue
        overdue_invoices.update(status="overdue")

        serializer = self.get_serializer(overdue_invoices, many=True)
        return Response(
            {"overdue_invoices": serializer.data, "count": overdue_invoices.count()},
            status=status.HTTP_200_OK,
        )
