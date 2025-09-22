"""
Core views - Newsletter and basic functionality only.

User views are in users.views
Financial views are in finance.views
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from datetime import datetime

from .serializers import NewsletterSubscriptionSerializer


class NewsletterSubscribeView(APIView):
    """API endpoint for newsletter subscription."""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = NewsletterSubscriptionSerializer(data=request.data)

        if serializer.is_valid():
            email = serializer.validated_data["email"]

            # Simulate subscription logic
            # In production, integrate with newsletter service (Mailchimp, SendGrid)
            print(f"Newsletter subscription for: {email}")

            return Response(
                {"message": "Successfully subscribed to the newsletter!"},
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# -----------------------------
# PDF Processing Stub Endpoints
# -----------------------------


class PDFProcessingCapabilitiesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response(
            {
                "capabilities": {
                    "pypdf2": True,
                    "pymupdf": False,
                    "ocr": False,
                    "pdf_processing_enabled": True,
                }
            }
        )


class PDFProcessingUnprocessedListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # Return an empty list for now
        return Response({"unprocessed_pdfs": []})


class PDFProcessingHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response({"processing_history": []})


class PDFProcessView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pdf_id: str, *args, **kwargs):
        # Simulate successful processing
        return Response(
            {
                "success": True,
                "document_type": "statement",
                "id": pdf_id,
            }
        )


class PDFUnlockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pdf_id: str, *args, **kwargs):
        # Simulate successful unlock and processing
        return Response(
            {
                "success": True,
                "message": "PDF unlocked and processed",
                "id": pdf_id,
            }
        )


class PDFBatchProcessView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        return Response(
            {
                "success": True,
                "success_count": 0,
            }
        )


class PDFExtractionResultView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pdf_id: str, *args, **kwargs):
        # Minimal shape expected by UI
        return Response(
            {
                "document_id": pdf_id,
                "title": f"PDF {pdf_id}",
                "document_type": "statement",
                "page_count": 0,
                "extraction_method": "pypdf2",
                "password_protected": False,
                "financial_data": {},
                "text_preview": "",
                "confidence": 90,
            }
        )


# ---------------------------
# Invoice OCR Stub Endpoints
# ---------------------------


class InvoiceOCRCapabilitiesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response(
            {
                "capabilities": {
                    "tesseract": False,
                    "pdf2image": False,
                    "ocr_enabled": True,
                    "tesseract_working": False,
                }
            }
        )


class InvoiceOCRUnprocessedListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response({"unprocessed_invoices": []})


class InvoiceOCRHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response({"processing_history": []})


class InvoiceOCRStatisticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response(
            {
                "statistics": {
                    "total_processed_30d": 0,
                    "successful_processed_30d": 0,
                    "transactions_created_30d": 0,
                    "pending_documents": 0,
                    "success_rate": 0,
                }
            }
        )


class InvoiceProcessView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, invoice_id: str, *args, **kwargs):
        return Response(
            {
                "success": True,
                "confidence": 0.85,
                "id": invoice_id,
            }
        )


class InvoiceCreateTransactionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, invoice_id: str, *args, **kwargs):
        return Response(
            {
                "success": True,
                "transaction_id": 1,
                "amount": 0,
                "vendor": "",
                "message": "Transaction created (stub)",
            }
        )


class InvoiceBatchProcessView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        return Response(
            {
                "success": True,
                "successful_count": 0,
                "transactions_created": 0,
            }
        )


class InvoiceDetailsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, invoice_id: str, *args, **kwargs):
        return Response(
            {
                "id": invoice_id,
                "title": f"Invoice {invoice_id}",
                "confidence": 90,
                "processed_at": datetime.utcnow().isoformat() + "Z",
                "has_transaction": False,
                "invoice_data": {},
                "extracted_text": "",
            }
        )


# -------------------------------------
# Recurring Transactions (Stub) Endpoints
# -------------------------------------


class RecurringTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # Return empty paginated-like structure
        return Response({"results": []})

    def post(self, request, *args, **kwargs):
        # Echo minimal creation response
        return Response(
            {
                "message": "Recurring transaction created (stub)",
                "id": 1,
            },
            status=status.HTTP_201_CREATED,
        )


class RecurringTransactionToggleActiveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id: int, *args, **kwargs):
        return Response(
            {
                "message": "Recurring transaction toggled (stub)",
                "id": id,
            }
        )


class RecurringTransactionExecuteNowView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id: int, *args, **kwargs):
        return Response(
            {
                "message": "Recurring transaction executed (stub)",
                "id": id,
            }
        )


# -------------------------------------
# Investment Portfolios & Transactions (Stubs)
# -------------------------------------


class InvestmentPortfoliosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response({"results": []})


class InvestmentTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response({"results": []})


# -------------------------------------
# Upload Endpoints
# -------------------------------------


class UploadStatementView(APIView):
    """Upload and process bank statement files"""
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if 'file' not in request.FILES:
            return Response(
                {'detail': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = request.FILES['file']
        file_type = request.data.get('file_type', 'csv')

        # Validate file type
        allowed_types = ['csv', 'json', 'excel', 'pdf']
        if file_type not in allowed_types:
            return Response(
                {'detail': f'Unsupported file type. Allowed: {", ".join(allowed_types)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # For now, return a success response with upload details
        return Response({
            'success': True,
            'file_name': uploaded_file.name,
            'file_size': uploaded_file.size,
            'file_type': file_type,
            'upload_session_id': f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'message': 'File uploaded successfully. Processing will begin shortly.'
        }, status=status.HTTP_201_CREATED)


class ProcessReceiptView(APIView):
    """Process receipt images using OCR"""
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if 'file' not in request.FILES:
            return Response(
                {'detail': 'No receipt file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = request.FILES['file']

        # Validate image file
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.pdf']
        file_extension = uploaded_file.name.lower().split('.')[-1]
        if f'.{file_extension}' not in allowed_extensions:
            return Response(
                {'detail': f'Unsupported file type. Allowed: {", ".join(allowed_extensions)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mock OCR processing result
        return Response({
            'success': True,
            'file_name': uploaded_file.name,
            'extracted_data': {
                'merchant': 'Sample Store',
                'amount': '25.99',
                'date': datetime.now().strftime('%Y-%m-%d'),
                'category': 'expense',
                'confidence_score': 0.85
            },
            'suggestions': {
                'transaction_type': 'expense',
                'category': 'shopping',
                'notes': f'Receipt from {uploaded_file.name}'
            },
            'message': 'Receipt processed successfully'
        }, status=status.HTTP_200_OK)


class CsvFormatView(APIView):
    """Get CSV format specification for uploads"""
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response({
            'format': 'csv',
            'required_columns': [
                'date',
                'description',
                'amount'
            ],
            'optional_columns': [
                'type',
                'category',
                'account',
                'notes',
                'verified'
            ],
            'sample_data': [
                {
                    'date': '2024-01-15',
                    'description': 'Coffee Shop',
                    'amount': '-4.50',
                    'type': 'expense',
                    'category': 'dining',
                    'notes': 'Morning coffee'
                },
                {
                    'date': '2024-01-15',
                    'description': 'Salary',
                    'amount': '3000.00',
                    'type': 'income',
                    'category': 'salary',
                    'notes': 'Monthly salary'
                }
            ],
            'notes': [
                'Date should be in YYYY-MM-DD format',
                'Amount should be positive for income, negative for expenses',
                'Type should be one of: income, expense, transfer, buy, sell, dividend, lend, borrow, repayment'
            ]
        }, status=status.HTTP_200_OK)


class JsonFormatView(APIView):
    """Get JSON format specification for uploads"""
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response({
            'format': 'json',
            'structure': {
                'transactions': [
                    {
                        'date': 'YYYY-MM-DD',
                        'description': 'string',
                        'amount': 'decimal',
                        'transaction_type': 'string',
                        'category': 'string (optional)',
                        'account': 'string (optional)',
                        'notes': 'string (optional)',
                        'verified': 'boolean (optional)'
                    }
                ]
            },
            'sample_data': {
                'transactions': [
                    {
                        'date': '2024-01-15',
                        'description': 'Coffee Shop',
                        'amount': '-4.50',
                        'transaction_type': 'expense',
                        'category': 'dining',
                        'notes': 'Morning coffee',
                        'verified': False
                    },
                    {
                        'date': '2024-01-15',
                        'description': 'Salary',
                        'amount': '3000.00',
                        'transaction_type': 'income',
                        'category': 'salary',
                        'verified': True
                    }
                ]
            },
            'transaction_types': [
                'income', 'expense', 'transfer', 'buy', 'sell',
                'dividend', 'lend', 'borrow', 'repayment'
            ],
            'notes': [
                'Root object can either be an array of transactions or an object with a "transactions" key',
                'Amount should be positive for income, negative for expenses',
                'Date should be in YYYY-MM-DD format'
            ]
        }, status=status.HTTP_200_OK)


class UploadSessionsView(APIView):
    """Get list of upload sessions"""
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # Mock upload sessions data
        mock_sessions = [
            {
                'id': 1,
                'session_id': 'session_20240115_142030',
                'file_name': 'bank_statement_jan.csv',
                'file_type': 'csv',
                'status': 'completed',
                'uploaded_at': '2024-01-15T14:20:30Z',
                'processed_at': '2024-01-15T14:21:15Z',
                'transactions_imported': 45,
                'errors_count': 2
            },
            {
                'id': 2,
                'session_id': 'session_20240115_093015',
                'file_name': 'receipts_batch.json',
                'file_type': 'json',
                'status': 'processing',
                'uploaded_at': '2024-01-15T09:30:15Z',
                'processed_at': None,
                'transactions_imported': 0,
                'errors_count': 0
            },
            {
                'id': 3,
                'session_id': 'session_20240114_160045',
                'file_name': 'credit_card_dec.csv',
                'file_type': 'csv',
                'status': 'failed',
                'uploaded_at': '2024-01-14T16:00:45Z',
                'processed_at': '2024-01-14T16:01:02Z',
                'transactions_imported': 0,
                'errors_count': 15,
                'error_message': 'Invalid date format in row 5'
            }
        ]

        return Response({
            'results': mock_sessions,
            'count': len(mock_sessions),
            'status_counts': {
                'completed': 1,
                'processing': 1,
                'failed': 1
            }
        }, status=status.HTTP_200_OK)
