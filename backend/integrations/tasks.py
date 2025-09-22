from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
from integrations.models import GoogleAccount
from integrations.services.gmail_service import GmailService
from bs4 import BeautifulSoup
import base64
import re
from datetime import datetime
from finance.models.transactions import Transaction
from ai.ai_service import ai_service
import logging
import json

User = get_user_model()

# Configure logging
logger = logging.getLogger(__name__)


@shared_task
def fetch_emails_from_gmail(user_id):
    try:
        user = User.objects.get(id=user_id)
        google_account = GoogleAccount.objects.get(user=user)
    except User.DoesNotExist:
        logger.error(f"User not found for user_id: {user_id}")
        return
    except GoogleAccount.DoesNotExist:
        logger.warning(f"GoogleAccount not found for user_id: {user_id}. User needs to connect Gmail account.")
        return

    # Check if we have a refresh token before attempting to use Gmail service
    if not google_account.refresh_token:
        logger.warning(f"No refresh token for user_id: {user_id}. User needs to reconnect Gmail account.")
        return

    gmail_service = GmailService(user)
    if not gmail_service.creds:
        logger.warning(f"No valid Gmail credentials for user_id: {user_id}")
        logger.info(f"User {user.username} needs to reconnect their Gmail account through the UI.")
        # Mark the Google account as needing re-authorization if it exists
        try:
            google_account.access_token = ""
            google_account.save()
            logger.info(f"Marked Google account for user {user_id} as needing re-authorization")
        except Exception as e:
            logger.error(f"Failed to update Google account status: {e}")
        return

    logger.info(f"Fetching emails for user {user.username} at {timezone.now()}")

    # Construct Gmail API query based on user's filter preferences
    query_parts = []
    if google_account.email_filter_senders:
        senders_query = " OR ".join(
            [f"from:{s}" for s in google_account.email_filter_senders]
        )
        query_parts.append(f"({senders_query})")
    if google_account.email_filter_keywords:
        keywords_query = " OR ".join(google_account.email_filter_keywords)
        query_parts.append(f"({keywords_query})")

    # Add a default query to only fetch unread messages, or adjust as needed
    # query_parts.append("is:unread")

    # Combine all query parts
    gmail_query = " ".join(query_parts) if query_parts else ""

    logger.info(f"Gmail API query: {gmail_query}")

    messages = gmail_service.list_messages(query=gmail_query)

    if not messages:
        logger.info(f"No new emails found for user {user.username} with query: {gmail_query}")
        return

    for message in messages:
        msg_id = message["id"]
        msg_details = gmail_service.get_message(msg_id)

        # Extract email body
        payload = msg_details["payload"]
        parts = payload.get("parts")
        body_data = ""

        if parts:
            for part in parts:
                if part["mimeType"] == "text/plain":
                    body_data = part["body"]["data"]
                    break
                elif part["mimeType"] == "text/html":
                    body_data = part["body"]["data"]
                    break
        elif payload["body"] and payload["body"]["data"]:
            body_data = payload["body"]["data"]

        if body_data:
            # Decode base64 and parse with BeautifulSoup
            decoded_body = base64.urlsafe_b64decode(body_data).decode("utf-8")
            soup = BeautifulSoup(decoded_body, "html.parser")
            text_content = soup.get_text()

            # Try enhanced parsing with multiple patterns and AI fallback
            extraction_result = extract_transaction_data(user, text_content, msg_id)

            extracted_amount = extraction_result.get('amount')
            extracted_vendor = extraction_result.get('vendor', 'Unknown Vendor')
            extracted_date = extraction_result.get('date')

            logger.debug(f"Message {msg_id} - Amount: {extracted_amount}, Vendor: {extracted_vendor}, Date: {extracted_date}")

            if extracted_amount and extracted_date:
                try:
                    # Convert extracted_date string to datetime object
                    transaction_date = datetime.strptime(
                        extracted_date, "%b %d, %Y"
                    ).date()

                    # Check for duplicate transaction
                    if Transaction.objects.filter(gmail_message_id=msg_id).exists():
                        logger.info(
                            f"Duplicate transaction found for Gmail message ID: {msg_id}. Skipping."
                        )
                        continue

                    Transaction.objects.create(
                        user=user,
                        amount=extracted_amount,
                        description=f"Expense from {extracted_vendor} via Gmail",
                        transaction_date=transaction_date,
                        gmail_message_id=msg_id,
                        # category= # TODO: Implement category detection
                    )
                    logger.info(
                        f"Successfully created transaction for {user.username}: {extracted_amount} from {extracted_vendor}"
                    )
                except Exception as e:
                    logger.error(f"Error creating transaction for message {msg_id}: {e}")
            else:
                logger.warning(
                    f"Could not extract sufficient data to create a transaction from message ID: {msg_id}"
                )


def extract_transaction_data(user, email_text, msg_id):
    """Enhanced transaction data extraction with multiple patterns and AI fallback"""

    # Log email content for debugging (truncated for privacy)
    logger.debug(f"Processing email {msg_id} content (first 500 chars): {email_text[:500]}")

    # Enhanced regex patterns for different email formats
    amount_patterns = [
        r"\$([0-9,]+\.?[0-9]*)",  # $123.45, $1,234.56, $123
        r"([0-9,]+\.?[0-9]*)\s*USD",  # 123.45 USD
        r"Amount:?\s*\$?([0-9,]+\.?[0-9]*)",  # Amount: $123.45
        r"Total:?\s*\$?([0-9,]+\.?[0-9]*)",  # Total: $123.45
        r"Charged:?\s*\$?([0-9,]+\.?[0-9]*)",  # Charged: $123.45
        r"Payment:?\s*\$?([0-9,]+\.?[0-9]*)",  # Payment: $123.45
        r"(\d+\.\d{2})\s*(?:was|has been)\s*(?:charged|debited)",  # 123.45 was charged
    ]

    vendor_patterns = [
        r"from\s+([A-Za-z0-9\s&\-\.]+?)(?:\s+for|\s+on|\s*\$)",  # from VENDOR for/on/$
        r"at\s+([A-Za-z0-9\s&\-\.]+?)(?:\s+for|\s+on|\s*\$)",  # at VENDOR
        r"([A-Za-z0-9\s&\-\.]+?)\s*charged",  # VENDOR charged
        r"Purchase\s+at\s+([A-Za-z0-9\s&\-\.]+)",  # Purchase at VENDOR
        r"Transaction\s+at\s+([A-Za-z0-9\s&\-\.]+)",  # Transaction at VENDOR
        r"(?:merchant|seller):\s*([A-Za-z0-9\s&\-\.]+)",  # merchant: VENDOR
    ]

    date_patterns = [
        r"on\s+([A-Za-z]{3}\s+[0-9]{1,2},?\s+[0-9]{4})",  # on Jan 15, 2024
        r"([A-Za-z]{3}\s+[0-9]{1,2},?\s+[0-9]{4})",  # Jan 15, 2024
        r"([0-9]{1,2}/[0-9]{1,2}/[0-9]{4})",  # 01/15/2024
        r"([0-9]{4}-[0-9]{2}-[0-9]{2})",  # 2024-01-15
        r"Date:\s*([A-Za-z]{3}\s+[0-9]{1,2},?\s+[0-9]{4})",  # Date: Jan 15, 2024
        r"Transaction\s+date:\s*([A-Za-z]{3}\s+[0-9]{1,2},?\s+[0-9]{4})",  # Transaction date: Jan 15, 2024
    ]

    # Try regex patterns first
    extracted_amount = None
    extracted_vendor = None
    extracted_date = None

    # Extract amount
    for pattern in amount_patterns:
        match = re.search(pattern, email_text, re.IGNORECASE)
        if match:
            try:
                amount_str = match.group(1).replace(',', '')
                extracted_amount = float(amount_str)
                logger.debug(f"Amount found with pattern '{pattern}': {extracted_amount}")
                break
            except (ValueError, IndexError):
                continue

    # Extract vendor
    for pattern in vendor_patterns:
        match = re.search(pattern, email_text, re.IGNORECASE)
        if match:
            vendor = match.group(1).strip()
            if len(vendor) > 2 and not vendor.isdigit():  # Basic validation
                extracted_vendor = vendor
                logger.debug(f"Vendor found with pattern '{pattern}': {extracted_vendor}")
                break

    # Extract date
    for pattern in date_patterns:
        match = re.search(pattern, email_text, re.IGNORECASE)
        if match:
            extracted_date = match.group(1)
            logger.debug(f"Date found with pattern '{pattern}': {extracted_date}")
            break

    # If regex extraction failed, try AI extraction
    if not extracted_amount or not extracted_vendor:
        try:
            logger.info(f"Regex extraction incomplete for {msg_id}, trying AI extraction")
            ai_result = extract_with_ai(user, email_text)

            if not extracted_amount and ai_result.get('amount'):
                extracted_amount = ai_result['amount']
                logger.info(f"AI extracted amount: {extracted_amount}")

            if not extracted_vendor and ai_result.get('vendor'):
                extracted_vendor = ai_result['vendor']
                logger.info(f"AI extracted vendor: {extracted_vendor}")

            if not extracted_date and ai_result.get('date'):
                extracted_date = ai_result['date']
                logger.info(f"AI extracted date: {extracted_date}")

        except Exception as e:
            logger.error(f"AI extraction failed for {msg_id}: {e}")

    return {
        'amount': extracted_amount,
        'vendor': extracted_vendor,
        'date': extracted_date
    }


def extract_with_ai(user, email_text):
    """Use AI service to extract transaction data from email text"""
    try:
        # Check if user has credits for AI processing
        has_credits, message = ai_service.check_user_credits(user, 'bill_parsing')
        if not has_credits:
            logger.warning(f"User {user.id} has insufficient credits for AI parsing: {message}")
            return {}

        # Get AI provider
        provider = ai_service.get_ai_provider(user)
        if not provider:
            logger.error(f"No AI provider available for user {user.id}")
            return {}

        # Prepare prompt for transaction extraction
        prompt = f"""
Extract transaction information from this email text. Return a JSON object with:
- amount: numerical value (float) of the transaction amount
- vendor: name of the merchant/vendor
- date: date of transaction in format "MMM DD, YYYY" (e.g., "Jan 15, 2024")

If any field cannot be determined, use null.

Email text:
{email_text[:1500]}

Return only valid JSON:
"""

        # Call AI service
        result = provider.perform_task(prompt)
        response = result.get('text', '') if isinstance(result, dict) else str(result)

        # Consume credits
        ai_service.consume_credits(user, 'bill_parsing')

        # Parse AI response
        try:
            # Try to extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                result = json.loads(json_str)

                # Validate and convert amount
                if result.get('amount'):
                    try:
                        result['amount'] = float(str(result['amount']).replace(',', ''))
                    except (ValueError, TypeError):
                        result['amount'] = None

                return result
            else:
                logger.error(f"No valid JSON found in AI response: {response}")
                return {}

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}, Response: {response}")
            return {}

    except Exception as e:
        logger.error(f"AI extraction error: {e}")
        return {}


@shared_task
def sync_all_user_emails():
    """Periodic task to sync emails for all users with Google accounts"""
    from integrations.models import GoogleAccount

    # Only sync accounts that have refresh tokens
    google_accounts = GoogleAccount.objects.filter(refresh_token__isnull=False).exclude(refresh_token='')

    if not google_accounts:
        logger.info("No Google accounts with valid refresh tokens found for email sync")
        return

    logger.info(f"Starting email sync for {google_accounts.count()} users with valid refresh tokens")

    for account in google_accounts:
        try:
            logger.info(f"Triggering email sync for user {account.user.username} ({account.user.id})")
            fetch_emails_from_gmail.delay(account.user.id)
        except Exception as e:
            logger.error(f"Failed to trigger email sync for user {account.user.id}: {e}")

    logger.info("Email sync tasks queued for all users")