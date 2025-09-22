"""
Core app URLs - Newsletter and basic functionality only.

User URLs are in users.urls
Financial URLs are in finance.urls
"""

from django.urls import path
from .views import (
    NewsletterSubscribeView,
    # PDF processing
    PDFProcessingCapabilitiesView,
    PDFProcessingUnprocessedListView,
    PDFProcessingHistoryView,
    PDFProcessView,
    PDFUnlockView,
    PDFBatchProcessView,
    PDFExtractionResultView,
    # Invoice OCR
    InvoiceOCRCapabilitiesView,
    InvoiceOCRUnprocessedListView,
    InvoiceOCRHistoryView,
    InvoiceOCRStatisticsView,
    InvoiceProcessView,
    InvoiceCreateTransactionView,
    InvoiceBatchProcessView,
    InvoiceDetailsView,
    # Recurring & investments (stubs)
    RecurringTransactionsView,
    RecurringTransactionToggleActiveView,
    RecurringTransactionExecuteNowView,
    InvestmentPortfoliosView,
    InvestmentTransactionsView,
    # Upload endpoints
    UploadStatementView,
    ProcessReceiptView,
    CsvFormatView,
    JsonFormatView,
    UploadSessionsView,
)

urlpatterns = [
    # Newsletter subscription endpoint
    path(
        "newsletter/subscribe/",
        NewsletterSubscribeView.as_view(),
        name="newsletter_subscribe",
    ),
    # PDF Processing endpoints (stubs)
    path(
        "pdf-processing/capabilities/",
        PDFProcessingCapabilitiesView.as_view(),
        name="pdf_capabilities",
    ),
    path(
        "pdf-processing/unprocessed_pdfs/",
        PDFProcessingUnprocessedListView.as_view(),
        name="pdf_unprocessed",
    ),
    path(
        "pdf-processing/processing_history/",
        PDFProcessingHistoryView.as_view(),
        name="pdf_history",
    ),
    path(
        "pdf-processing/<str:pdf_id>/process_pdf/",
        PDFProcessView.as_view(),
        name="pdf_process",
    ),
    path(
        "pdf-processing/<str:pdf_id>/unlock_pdf/",
        PDFUnlockView.as_view(),
        name="pdf_unlock",
    ),
    path(
        "pdf-processing/batch_process/", PDFBatchProcessView.as_view(), name="pdf_batch"
    ),
    path(
        "pdf-processing/<str:pdf_id>/extraction_result/",
        PDFExtractionResultView.as_view(),
        name="pdf_extraction_result",
    ),
    # Invoice OCR endpoints (stubs)
    path(
        "invoice-ocr/capabilities/",
        InvoiceOCRCapabilitiesView.as_view(),
        name="invoice_ocr_capabilities",
    ),
    path(
        "invoice-ocr/unprocessed_invoices/",
        InvoiceOCRUnprocessedListView.as_view(),
        name="invoice_ocr_unprocessed",
    ),
    path(
        "invoice-ocr/processing_history/",
        InvoiceOCRHistoryView.as_view(),
        name="invoice_ocr_history",
    ),
    path(
        "invoice-ocr/statistics/",
        InvoiceOCRStatisticsView.as_view(),
        name="invoice_ocr_statistics",
    ),
    path(
        "invoice-ocr/<str:invoice_id>/process_invoice/",
        InvoiceProcessView.as_view(),
        name="invoice_process",
    ),
    path(
        "invoice-ocr/<str:invoice_id>/create_transaction/",
        InvoiceCreateTransactionView.as_view(),
        name="invoice_create_txn",
    ),
    path(
        "invoice-ocr/batch_process/",
        InvoiceBatchProcessView.as_view(),
        name="invoice_batch",
    ),
    path(
        "invoice-ocr/<str:invoice_id>/invoice_details/",
        InvoiceDetailsView.as_view(),
        name="invoice_details",
    ),
    # Recurring transactions (stubs)
    path(
        "recurring-transactions/",
        RecurringTransactionsView.as_view(),
        name="recurring_list_create",
    ),
    path(
        "recurring-transactions/<int:id>/toggle_active/",
        RecurringTransactionToggleActiveView.as_view(),
        name="recurring_toggle_active",
    ),
    path(
        "recurring-transactions/<int:id>/execute_now/",
        RecurringTransactionExecuteNowView.as_view(),
        name="recurring_execute_now",
    ),
    # Investment portfolios & transactions (stubs)
    path(
        "investment-portfolios/",
        InvestmentPortfoliosView.as_view(),
        name="investment_portfolios",
    ),
    path(
        "investment-transactions/",
        InvestmentTransactionsView.as_view(),
        name="investment_transactions",
    ),
    # Upload endpoints
    path(
        "upload/upload_statement/",
        UploadStatementView.as_view(),
        name="upload_statement",
    ),
    path(
        "upload/process_receipt/",
        ProcessReceiptView.as_view(),
        name="process_receipt",
    ),
    path(
        "upload/csv_format/",
        CsvFormatView.as_view(),
        name="csv_format",
    ),
    path(
        "upload/json_format/",
        JsonFormatView.as_view(),
        name="json_format",
    ),
    path(
        "upload/sessions/",
        UploadSessionsView.as_view(),
        name="upload_sessions",
    ),
]
