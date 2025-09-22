"""
Transaction-related views for the finance app.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.http import HttpResponse
import csv
import json
import io
import xlsxwriter
from datetime import datetime

from ..models import Transaction
from ..serializers import TransactionSerializer

User = get_user_model()


class TransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for transaction management"""

    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).order_by(
            "-date", "-created_at"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get transactions summary"""
        transactions = self.get_queryset()

        # Filter by date range if provided
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        if start_date:
            transactions = transactions.filter(date__gte=start_date)
        if end_date:
            transactions = transactions.filter(date__lte=end_date)

        income = transactions.filter(transaction_type="income").aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")
        expenses = transactions.filter(transaction_type="expense").aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")

        summary = {
            "total_transactions": transactions.count(),
            "total_income": income,
            "total_expenses": expenses,
            "net_amount": income - expenses,
            "income_transactions": transactions.filter(
                transaction_type="income"
            ).count(),
            "expense_transactions": transactions.filter(
                transaction_type="expense"
            ).count(),
            "transfer_transactions": transactions.filter(
                transaction_type="transfer"
            ).count(),
        }

        return Response(summary, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def toggle_verified(self, request, pk=None):
        """Toggle transaction verified status"""
        transaction = self.get_object()
        transaction.verified = not transaction.verified
        transaction.save()

        return Response(
            {
                "message": "Transaction verification status updated",
                "verified": transaction.verified,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def lending(self, request):
        """Get all lending transactions (both lent and borrowed)"""
        lending_transactions = self.get_queryset().filter(
            transaction_category="lending"
        )

        # Filter by transaction type if specified
        transaction_type = request.query_params.get("transaction_type")
        if transaction_type in ["lend", "borrow", "repayment"]:
            lending_transactions = lending_transactions.filter(
                transaction_type=transaction_type
            )

        # Filter by contact if specified
        contact_id = request.query_params.get("contact_id")
        if contact_id:
            try:
                contact_user = User.objects.get(id=contact_id)
                lending_transactions = lending_transactions.filter(
                    contact_user=contact_user
                )
            except User.DoesNotExist:
                return Response(
                    {"detail": "Contact not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

        serializer = self.get_serializer(lending_transactions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def lending_summary(self, request):
        """Get lending summary for the user"""
        lending_transactions = self.get_queryset().filter(
            transaction_category="lending"
        )

        # Calculate totals
        total_lent = lending_transactions.filter(
            transaction_type="lend"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        total_borrowed = lending_transactions.filter(
            transaction_type="borrow"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        total_repayments_received = lending_transactions.filter(
            transaction_type="repayment",
            amount__gt=0  # Positive amounts are repayments received
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        total_repayments_made = lending_transactions.filter(
            transaction_type="repayment",
            amount__lt=0  # Negative amounts are repayments made
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        # Calculate outstanding amounts
        outstanding_lent = total_lent - total_repayments_received
        outstanding_borrowed = total_borrowed - abs(total_repayments_made)

        # Count overdue transactions (where due_date is past and not fully repaid)
        overdue_count = lending_transactions.filter(
            due_date__lt=timezone.now().date(),
            transaction_type__in=["lend", "borrow"]
        ).count()

        summary = {
            "total_lent": total_lent,
            "total_borrowed": total_borrowed,
            "outstanding_lent": outstanding_lent,
            "outstanding_borrowed": outstanding_borrowed,
            "total_repayments_received": total_repayments_received,
            "total_repayments_made": abs(total_repayments_made),
            "overdue_count": overdue_count,
            "net_lending_position": outstanding_lent - outstanding_borrowed,
        }

        return Response(summary, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def create_lending(self, request):
        """Create a new lending transaction"""
        data = request.data.copy()
        data["transaction_category"] = "lending"
        data["user"] = request.user.id

        # Validate required fields for lending
        required_fields = ["contact_user", "amount", "transaction_type", "description"]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return Response(
                {"detail": f"Missing required fields: {', '.join(missing_fields)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate transaction type
        if data["transaction_type"] not in ["lend", "borrow"]:
            return Response(
                {"detail": "transaction_type must be 'lend' or 'borrow'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate contact exists
        try:
            contact_user = User.objects.get(id=data["contact_user"])
        except User.DoesNotExist:
            return Response(
                {"detail": "Contact user not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def record_repayment(self, request, pk=None):
        """Record a repayment for a lending transaction"""
        lending_transaction = self.get_object()

        # Validate this is a lending transaction
        if lending_transaction.transaction_category != "lending":
            return Response(
                {"detail": "This is not a lending transaction"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if lending_transaction.transaction_type not in ["lend", "borrow"]:
            return Response(
                {"detail": "Can only record repayments for lend/borrow transactions"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get repayment amount
        repayment_amount = request.data.get("amount")
        if not repayment_amount:
            return Response(
                {"detail": "Repayment amount is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            repayment_amount = Decimal(repayment_amount)
        except:
            return Response(
                {"detail": "Invalid repayment amount"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create repayment transaction
        repayment_data = {
            "transaction_category": "lending",
            "transaction_type": "repayment",
            "amount": repayment_amount if lending_transaction.transaction_type == "borrow" else -repayment_amount,
            "description": f"Repayment for: {lending_transaction.description}",
            "date": request.data.get("date", timezone.now().date()),
            "contact_user": lending_transaction.contact_user,
            "account": lending_transaction.account,
            "notes": request.data.get("notes", ""),
        }

        repayment_serializer = self.get_serializer(data=repayment_data)
        if repayment_serializer.is_valid():
            repayment_serializer.save(user=request.user)
            return Response(
                {
                    "message": "Repayment recorded successfully",
                    "repayment": repayment_serializer.data
                },
                status=status.HTTP_201_CREATED
            )
        return Response(repayment_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def group_expenses(self, request):
        """Get all group expense transactions"""
        group_expenses = self.get_queryset().filter(
            transaction_category="group_expense"
        )

        # Filter by group if specified
        group_id = request.query_params.get("group_id")
        if group_id:
            group_expenses = group_expenses.filter(
                group_expense__group_id=group_id
            )

        serializer = self.get_serializer(group_expenses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def export(self, request):
        """Export transactions in various formats"""
        format_type = request.query_params.get('format', 'json').lower()

        # Get transactions for the user
        queryset = self.get_queryset()

        # Apply filters if provided
        start_date = request.query_params.get('dateFrom')
        end_date = request.query_params.get('dateTo')
        transaction_ids = request.query_params.get('transaction_ids')

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        if transaction_ids:
            ids = [int(id.strip()) for id in transaction_ids.split(',') if id.strip().isdigit()]
            queryset = queryset.filter(id__in=ids)

        transactions = queryset

        if format_type == 'csv':
            return self._export_csv(transactions)
        elif format_type == 'excel':
            return self._export_excel(transactions)
        elif format_type == 'pdf':
            return self._export_pdf(transactions)
        else:  # Default to JSON
            return self._export_json(transactions)

    def _export_json(self, transactions):
        """Export transactions as JSON"""
        serializer = self.get_serializer(transactions, many=True)

        export_data = {
            'exported_at': timezone.now().isoformat(),
            'total_transactions': transactions.count(),
            'transactions': serializer.data
        }

        response = HttpResponse(
            json.dumps(export_data, indent=2, default=str),
            content_type='application/json'
        )
        filename = f"transactions_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    def _export_csv(self, transactions):
        """Export transactions as CSV"""
        response = HttpResponse(content_type='text/csv')
        filename = f"transactions_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)

        # Write headers
        headers = [
            'Date', 'Description', 'Amount', 'Type', 'Category',
            'Account', 'Tags', 'Notes', 'Verified', 'Created'
        ]
        writer.writerow(headers)

        # Write data
        for transaction in transactions:
            row = [
                transaction.date,
                transaction.description,
                str(transaction.amount),
                transaction.transaction_type,
                getattr(transaction.category, 'name', '') if transaction.category else '',
                getattr(transaction.account, 'name', '') if transaction.account else '',
                ', '.join([tag.name for tag in transaction.tags.all()]) if hasattr(transaction, 'tags') else '',
                transaction.notes or '',
                transaction.verified,
                transaction.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ]
            writer.writerow(row)

        return response

    def _export_excel(self, transactions):
        """Export transactions as Excel"""
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet('Transactions')

        # Add headers
        headers = [
            'Date', 'Description', 'Amount', 'Type', 'Category',
            'Account', 'Tags', 'Notes', 'Verified', 'Created'
        ]

        # Write headers with formatting
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D7E4BC'})
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)

        # Write data
        for row, transaction in enumerate(transactions, 1):
            worksheet.write(row, 0, transaction.date.strftime('%Y-%m-%d'))
            worksheet.write(row, 1, transaction.description)
            worksheet.write(row, 2, float(transaction.amount))
            worksheet.write(row, 3, transaction.transaction_type)
            worksheet.write(row, 4, getattr(transaction.category, 'name', '') if transaction.category else '')
            worksheet.write(row, 5, getattr(transaction.account, 'name', '') if transaction.account else '')
            worksheet.write(row, 6, ', '.join([tag.name for tag in transaction.tags.all()]) if hasattr(transaction, 'tags') else '')
            worksheet.write(row, 7, transaction.notes or '')
            worksheet.write(row, 8, transaction.verified)
            worksheet.write(row, 9, transaction.created_at.strftime('%Y-%m-%d %H:%M:%S'))

        # Auto-adjust column widths
        for col in range(len(headers)):
            worksheet.set_column(col, col, 15)

        workbook.close()
        output.seek(0)

        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = f"transactions_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        return response

    def _export_pdf(self, transactions):
        """Export transactions as PDF - simplified version"""
        # For now, return JSON with a note about PDF implementation
        response_data = {
            'message': 'PDF export not yet implemented',
            'suggested_alternative': 'Please use Excel or CSV format for now',
            'total_transactions': transactions.count()
        }
        return Response(response_data, status=status.HTTP_501_NOT_IMPLEMENTED)

    @action(detail=False, methods=["post"], url_path="import")
    def import_transactions(self, request):
        """Import transactions from uploaded file"""
        if 'file' not in request.FILES:
            return Response(
                {'detail': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = request.FILES['file']
        format_type = request.query_params.get('format', 'json').lower()

        try:
            if format_type == 'csv':
                result = self._import_csv(uploaded_file)
            elif format_type == 'excel':
                result = self._import_excel(uploaded_file)
            else:  # Default to JSON
                result = self._import_json(uploaded_file)

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'detail': f'Import failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _import_json(self, file):
        """Import transactions from JSON file"""
        try:
            content = file.read().decode('utf-8')
            data = json.loads(content)

            # Handle both direct array and object with transactions key
            transactions_data = data.get('transactions', data) if isinstance(data, dict) else data

            imported_count = 0
            errors = []

            for item in transactions_data:
                try:
                    # Remove user field if present and set current user
                    item.pop('user', None)
                    item.pop('id', None)  # Remove ID to create new

                    serializer = self.get_serializer(data=item)
                    if serializer.is_valid():
                        serializer.save(user=self.request.user)
                        imported_count += 1
                    else:
                        errors.append(f"Row {imported_count + 1}: {serializer.errors}")
                except Exception as e:
                    errors.append(f"Row {imported_count + 1}: {str(e)}")

            return {
                'success': True,
                'imported_count': imported_count,
                'errors': errors[:10]  # Limit errors to first 10
            }

        except json.JSONDecodeError as e:
            raise Exception(f"Invalid JSON format: {str(e)}")

    def _import_csv(self, file):
        """Import transactions from CSV file"""
        try:
            content = file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(content))

            imported_count = 0
            errors = []

            for row_num, row in enumerate(csv_reader, 1):
                try:
                    # Map CSV fields to model fields
                    transaction_data = {
                        'date': row.get('Date', ''),
                        'description': row.get('Description', ''),
                        'amount': row.get('Amount', ''),
                        'transaction_type': row.get('Type', 'expense'),
                        'notes': row.get('Notes', ''),
                        'verified': row.get('Verified', 'false').lower() == 'true'
                    }

                    serializer = self.get_serializer(data=transaction_data)
                    if serializer.is_valid():
                        serializer.save(user=self.request.user)
                        imported_count += 1
                    else:
                        errors.append(f"Row {row_num}: {serializer.errors}")

                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

            return {
                'success': True,
                'imported_count': imported_count,
                'errors': errors[:10]  # Limit errors to first 10
            }

        except Exception as e:
            raise Exception(f"CSV processing error: {str(e)}")

    def _import_excel(self, file):
        """Import transactions from Excel file"""
        try:
            import pandas as pd

            df = pd.read_excel(file)
            imported_count = 0
            errors = []

            for index, row in df.iterrows():
                try:
                    transaction_data = {
                        'date': row.get('Date', ''),
                        'description': row.get('Description', ''),
                        'amount': row.get('Amount', ''),
                        'transaction_type': row.get('Type', 'expense'),
                        'notes': row.get('Notes', ''),
                        'verified': str(row.get('Verified', 'false')).lower() == 'true'
                    }

                    serializer = self.get_serializer(data=transaction_data)
                    if serializer.is_valid():
                        serializer.save(user=self.request.user)
                        imported_count += 1
                    else:
                        errors.append(f"Row {index + 1}: {serializer.errors}")

                except Exception as e:
                    errors.append(f"Row {index + 1}: {str(e)}")

            return {
                'success': True,
                'imported_count': imported_count,
                'errors': errors[:10]  # Limit errors to first 10
            }

        except ImportError:
            raise Exception("pandas library not available for Excel import")
        except Exception as e:
            raise Exception(f"Excel processing error: {str(e)}")
