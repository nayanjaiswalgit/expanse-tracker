# Statement Upload System Documentation

## Overview

The statement upload system provides comprehensive backend support for processing bank statements and other financial files, with automatic transaction extraction, AI categorization, duplicate detection, and transaction linking.

## Features

### 📁 File Processing
- **Multiple formats**: PDF, CSV, JSON, Excel files
- **Password protection**: Support for encrypted PDF files
- **Smart parsing**: Automatic transaction extraction from various file formats
- **Duplicate detection**: Prevents importing the same transactions multiple times

### 🤖 AI-Powered Features
- **Automatic categorization**: Uses merchant patterns to categorize transactions
- **Transaction linking**: Detects transfers, refunds, and related transactions
- **Learning system**: Improves categorization over time based on user corrections

### 📊 Session Tracking
- **Upload sessions**: Track each file upload with detailed status
- **Progress monitoring**: Real-time upload and processing status
- **Error handling**: Comprehensive error tracking and retry mechanisms

## API Endpoints

### Upload Session Management

#### Upload File
```http
POST /api/finance/upload-sessions/upload/
Content-Type: multipart/form-data

{
    "file": <file>,
    "account_id": 123,
    "password": "optional_password",
    "ai_categorization": true
}
```

#### Get Upload Status
```http
GET /api/finance/upload-sessions/{session_id}/status/
```

#### List Upload Sessions
```http
GET /api/finance/upload-sessions/
```

#### Get Session Transactions
```http
GET /api/finance/upload-sessions/{session_id}/transactions/
```

#### Update Account for Session
```http
PATCH /api/finance/upload-sessions/{session_id}/update-account/
{
    "account_id": 456
}
```

#### Retry Failed Upload
```http
POST /api/finance/upload-sessions/{session_id}/retry/
{
    "password": "optional_new_password"
}
```

### Transaction Import Management

#### List Transaction Imports
```http
GET /api/finance/transaction-imports/
?status=imported&upload_session=123
```

#### Update Import Status
```http
PATCH /api/finance/transaction-imports/{import_id}/update-status/
{
    "status": "skipped"
}
```

### Transaction Linking

#### List Transaction Links
```http
GET /api/finance/transaction-links/
```

#### Get Link Suggestions
```http
GET /api/finance/transaction-links/suggestions/
```

#### Confirm Transaction Link
```http
PATCH /api/finance/transaction-links/{link_id}/confirm/
```

### Merchant Patterns

#### List Merchant Patterns
```http
GET /api/finance/merchant-patterns/
```

#### Create Pattern from Transaction
```http
POST /api/finance/merchant-patterns/learn-from-transaction/
{
    "transaction_id": 123,
    "pattern": "starbucks"
}
```

## Models

### UploadSession
Tracks file upload sessions with processing status and results.

**Key Fields:**
- `original_filename`: Original name of uploaded file
- `file_type`: Detected file type (pdf, csv, json, excel)
- `status`: Processing status (pending, processing, completed, failed)
- `account`: Associated account for transactions
- `total_transactions`: Number of transactions found
- `successful_imports`: Successfully imported transactions
- `requires_password`: Whether file needs password

### StatementImport
Represents individual statement files within an upload session.

**Key Fields:**
- `upload_session`: Parent upload session
- `statement_period_start/end`: Statement date range
- `institution_name`: Bank/institution name
- `raw_text_content`: Extracted text from PDF

### TransactionImport
Tracks individual transaction imports with detailed status.

**Key Fields:**
- `upload_session`: Parent upload session
- `transaction`: Created transaction (if successful)
- `import_status`: Import result (imported, duplicate, failed, skipped)
- `raw_data`: Original transaction data from file
- `parsed_amount/date/description`: Extracted transaction details

### TransactionLink
Links related transactions (transfers, refunds, etc.).

**Key Fields:**
- `from_transaction/to_transaction`: Linked transactions
- `link_type`: Type of relationship (transfer, refund, split_payment, etc.)
- `confidence_score`: AI confidence in the link
- `is_confirmed`: Whether user confirmed the link

### MerchantPattern
Stores merchant categorization patterns for AI learning.

**Key Fields:**
- `pattern`: Text pattern to match
- `category`: Target category for matching transactions
- `confidence`: Pattern reliability score
- `usage_count`: Number of times pattern was used

## Usage Examples

### 1. Upload a Bank Statement

```python
# Frontend code
const formData = new FormData();
formData.append('file', file);
formData.append('account_id', accountId);

const response = await fetch('/api/finance/upload-sessions/upload/', {
    method: 'POST',
    body: formData,
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

const result = await response.json();
console.log(`Uploaded ${result.successful_imports} transactions`);
```

### 2. Monitor Upload Progress

```python
# Poll for status updates
const checkStatus = async (sessionId) => {
    const response = await fetch(`/api/finance/upload-sessions/${sessionId}/status/`);
    const status = await response.json();

    if (status.status === 'processing') {
        console.log(`Progress: ${status.progress_percentage}%`);
        setTimeout(() => checkStatus(sessionId), 2000);
    } else {
        console.log('Upload completed:', status);
    }
};
```

### 3. Handle Password-Protected PDFs

```python
# If upload fails due to password requirement
if (result.requires_password) {
    const password = prompt('Enter PDF password:');

    const retryResponse = await fetch(`/api/finance/upload-sessions/${result.id}/retry/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password })
    });
}
```

### 4. Learn from User Categorizations

```python
# When user categorizes a transaction, create a pattern
const createPattern = async (transactionId, pattern) => {
    await fetch('/api/finance/merchant-patterns/learn-from-transaction/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            transaction_id: transactionId,
            pattern: pattern
        })
    });
};

// This improves future AI categorization
createPattern(123, 'starbucks');
```

## File Format Support

### PDF Bank Statements
- Extracts text using PyPDF2
- Parses transaction patterns with regex
- Supports encrypted PDFs with password
- Handles multi-page statements

### CSV Files
- Auto-detects column mapping
- Common field names: date, amount, description, category
- Flexible date format parsing
- Handles various CSV dialects

### JSON Files
- Direct transaction import
- Supports nested structures
- Array or object formats
- Custom field mapping

### Excel Files
- Uses pandas for parsing
- Supports .xls and .xlsx formats
- Similar to CSV processing
- Multiple sheet support

## AI Categorization

### Merchant Pattern Matching
1. **Text Analysis**: Analyzes transaction descriptions
2. **Pattern Matching**: Compares against known merchant patterns
3. **Confidence Scoring**: Assigns confidence scores to suggestions
4. **Learning**: Updates patterns based on user corrections

### Transaction Linking
1. **Transfer Detection**: Identifies matching amounts between accounts
2. **Date Proximity**: Links transactions within date ranges
3. **Description Analysis**: Matches similar transaction descriptions
4. **Confidence Scoring**: Ranks link suggestions by likelihood

## Error Handling

### Common Error Types
- **Invalid file format**: Unsupported file type
- **Password required**: Encrypted PDF needs password
- **Parse errors**: Malformed file content
- **Validation errors**: Invalid transaction data
- **Duplicate detection**: Transaction already exists

### Retry Mechanisms
- **Session retry**: Retry entire upload with new parameters
- **Individual transaction retry**: Re-process failed transactions
- **Password retry**: Multiple password attempts for PDFs

## Performance Considerations

### File Size Limits
- Maximum file size: 50MB
- Large files processed in chunks
- Memory-efficient PDF parsing
- Streaming CSV processing

### Concurrency
- Multiple uploads can be processed simultaneously
- Individual transaction processing is atomic
- Database transactions ensure consistency

## Security Features

### File Validation
- File type verification
- Size limit enforcement
- Malicious content scanning
- User permission checking

### Data Protection
- Encrypted file storage options
- Secure password handling
- User data isolation
- Audit logging

## Management Commands

### Populate Merchant Patterns
```bash
python manage.py populate_merchant_patterns --user username
```

Creates sample merchant patterns for improved AI categorization.

## Database Schema

The upload system adds 5 new tables:
- `finance_uploadsession`: Upload session tracking
- `finance_statementimport`: Individual statement files
- `finance_transactionimport`: Individual transaction imports
- `finance_transactionlink`: Transaction relationships
- `finance_merchantpattern`: AI categorization patterns

All tables include proper indexes for performance and foreign key relationships for data integrity.

## Integration with Existing System

The upload system integrates seamlessly with:
- **Existing transaction model**: Creates standard transactions
- **Account system**: Links to user accounts
- **Category system**: Uses existing categories
- **Tag system**: Supports transaction tagging
- **User permissions**: Respects user access controls

This comprehensive upload system provides a robust foundation for automated financial data processing while maintaining data integrity and user control.