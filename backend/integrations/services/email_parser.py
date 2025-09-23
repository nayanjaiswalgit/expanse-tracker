import re
import email
import base64
from decimal import Decimal
from datetime import datetime
from typing import Dict, Optional, List, Tuple


class EmailParser:
    """Parse emails to extract transaction information"""

    # Common patterns for transaction amounts
    AMOUNT_PATTERNS = [
        r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)',  # $1,234.56
        r'₹(\d+(?:,\d{2,3})*(?:\.\d{2})?)',  # ₹1,234.56
        r'EUR\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',  # EUR 1,234.56
        r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*USD',  # 1,234.56 USD
        r'Rs\.?\s*(\d+(?:,\d{2,3})*(?:\.\d{2})?)',  # Rs. 1,234.56
        r'amount[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)',  # amount: $1,234.56
        r'total[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)',  # total: $1,234.56
        r'paid[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)',  # paid: $1,234.56
    ]

    # Currency symbols mapping
    CURRENCY_SYMBOLS = {
        '$': 'USD',
        '₹': 'INR',
        '€': 'EUR',
        '£': 'GBP',
        '¥': 'JPY',
    }

    # Keywords that indicate expenses vs income
    EXPENSE_KEYWORDS = [
        'purchase', 'bought', 'payment', 'paid', 'charged', 'debit', 'withdrawal',
        'spent', 'bill', 'invoice', 'subscription', 'order', 'transaction'
    ]

    INCOME_KEYWORDS = [
        'received', 'deposit', 'credit', 'refund', 'cashback', 'salary',
        'transfer in', 'payment received'
    ]

    # Bank/service patterns for better parsing
    BANK_PATTERNS = {
        'credit_card': [
            r'credit card.*charged',
            r'card ending.*\d{4}',
            r'purchase.*approved'
        ],
        'bank_transfer': [
            r'transfer.*completed',
            r'wire transfer',
            r'ACH.*transfer'
        ],
        'online_payment': [
            r'paypal',
            r'stripe',
            r'razorpay',
            r'paytm'
        ]
    }

    def __init__(self):
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.AMOUNT_PATTERNS]

    def parse_gmail_message(self, gmail_message: Dict) -> Dict:
        """Parse a Gmail message and extract transaction data"""
        try:
            # Extract basic email info
            headers = gmail_message.get('payload', {}).get('headers', [])
            subject = self._get_header_value(headers, 'Subject') or ''
            sender = self._get_header_value(headers, 'From') or ''
            date_str = self._get_header_value(headers, 'Date') or ''

            # Extract email body
            body = self._extract_email_body(gmail_message.get('payload', {}))

            # Parse the email content
            result = {
                'subject': subject,
                'sender': sender,
                'date': date_str,
                'body_preview': body[:200] + '...' if len(body) > 200 else body,
                'parsed_amount': None,
                'parsed_currency': None,
                'parsed_description': None,
                'transaction_type': None,
                'confidence_score': 0.0,
                'is_transaction': False
            }

            # Check if this looks like a transaction email
            if self._is_transaction_email(subject, body, sender):
                result['is_transaction'] = True

                # Extract amount and currency
                amount, currency = self._extract_amount_and_currency(body + ' ' + subject)
                if amount:
                    result['parsed_amount'] = amount
                    result['parsed_currency'] = currency
                    result['confidence_score'] += 0.4

                # Determine transaction type
                transaction_type = self._determine_transaction_type(subject, body)
                if transaction_type:
                    result['transaction_type'] = transaction_type
                    result['confidence_score'] += 0.3

                # Generate description
                description = self._generate_description(subject, body, sender)
                result['parsed_description'] = description
                result['confidence_score'] += 0.3

            return result

        except Exception as e:
            return {
                'error': f"Failed to parse email: {str(e)}",
                'is_transaction': False,
                'confidence_score': 0.0
            }

    def _get_header_value(self, headers: List[Dict], name: str) -> Optional[str]:
        """Extract header value by name"""
        for header in headers:
            if header.get('name', '').lower() == name.lower():
                return header.get('value', '')
        return None

    def _extract_email_body(self, payload: Dict) -> str:
        """Extract plain text body from email payload"""
        body = ""

        if 'parts' in payload:
            for part in payload['parts']:
                if part.get('mimeType') == 'text/plain':
                    data = part.get('body', {}).get('data', '')
                    if data:
                        body += base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                elif part.get('mimeType') == 'text/html' and not body:
                    # Fallback to HTML if no plain text
                    data = part.get('body', {}).get('data', '')
                    if data:
                        html_content = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                        # Simple HTML to text conversion
                        body = re.sub(r'<[^>]+>', ' ', html_content)
        elif payload.get('mimeType') == 'text/plain':
            data = payload.get('body', {}).get('data', '')
            if data:
                body = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')

        return body.strip()

    def _is_transaction_email(self, subject: str, body: str, sender: str) -> bool:
        """Determine if email contains transaction information"""
        content = f"{subject} {body} {sender}".lower()

        # Check for transaction indicators
        transaction_indicators = [
            'payment', 'transaction', 'receipt', 'invoice', 'bill', 'purchase',
            'order', 'charged', 'paid', 'debit', 'credit', 'transfer', 'deposit',
            'withdrawal', 'balance', 'statement'
        ]

        # Check for amount patterns
        has_amount = any(pattern.search(content) for pattern in self.compiled_patterns)

        # Check for transaction keywords
        has_keywords = any(keyword in content for keyword in transaction_indicators)

        return has_amount and has_keywords

    def _extract_amount_and_currency(self, text: str) -> Tuple[Optional[Decimal], Optional[str]]:
        """Extract amount and currency from text"""
        for pattern in self.compiled_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(1).replace(',', '')
                try:
                    amount = Decimal(amount_str)

                    # Try to determine currency
                    currency = self._extract_currency(text, match)

                    return amount, currency
                except:
                    continue

        return None, None

    def _extract_currency(self, text: str, amount_match) -> str:
        """Extract currency from text context"""
        # Look for currency symbols near the amount
        start = max(0, amount_match.start() - 10)
        end = min(len(text), amount_match.end() + 10)
        context = text[start:end]

        # Check for currency symbols
        for symbol, currency in self.CURRENCY_SYMBOLS.items():
            if symbol in context:
                return currency

        # Check for currency codes
        currency_codes = ['USD', 'EUR', 'GBP', 'INR', 'JPY']
        for code in currency_codes:
            if code.lower() in context.lower():
                return code

        # Default to USD if no currency found
        return 'USD'

    def _determine_transaction_type(self, subject: str, body: str) -> Optional[str]:
        """Determine if transaction is expense or income"""
        content = f"{subject} {body}".lower()

        expense_score = sum(1 for keyword in self.EXPENSE_KEYWORDS if keyword in content)
        income_score = sum(1 for keyword in self.INCOME_KEYWORDS if keyword in content)

        if expense_score > income_score:
            return 'expense'
        elif income_score > expense_score:
            return 'income'
        else:
            # Default to expense for ambiguous cases
            return 'expense'

    def _generate_description(self, subject: str, body: str, sender: str) -> str:
        """Generate a meaningful description for the transaction"""
        # Start with subject as base
        description = subject.strip()

        # Clean up common email prefixes
        prefixes_to_remove = ['re:', 'fwd:', 'fw:', '[automated]', '[receipt]']
        for prefix in prefixes_to_remove:
            if description.lower().startswith(prefix):
                description = description[len(prefix):].strip()

        # Add sender information if not obvious
        sender_name = sender.split('@')[0] if '@' in sender else sender
        if sender_name.lower() not in description.lower():
            description = f"{description} - {sender_name}"

        # Limit length
        if len(description) > 100:
            description = description[:97] + "..."

        return description