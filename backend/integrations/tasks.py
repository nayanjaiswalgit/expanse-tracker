from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
from integrations.models import GmailAccount
from integrations.services.email_sync_service import EmailSyncService
import logging

from django.conf import settings

User = get_user_model()

# Configure logging
logger = logging.getLogger(__name__)


@shared_task
def sync_gmail_account(account_id):
    """Sync emails for a specific Gmail account"""
    try:
        gmail_account = GmailAccount.objects.get(id=account_id, is_active=True)
        sync_service = EmailSyncService()
        limit = settings.EMAIL_FETCH_LIMIT
        result = sync_service.sync_account_emails(gmail_account, limit=limit)

        logger.info(f"Email sync completed for account {account_id}: {result}")
        return result
    except GmailAccount.DoesNotExist:
        logger.error(f"Gmail account {account_id} not found or inactive")
        return {"error": "Account not found or inactive"}
    except Exception as e:
        logger.error(f"Error syncing Gmail account {account_id}: {str(e)}")
        return {"error": str(e)}


@shared_task
def fetch_emails_from_gmail(user_id):
    """Fetch emails for a user (backward compatibility)"""
    try:
        user = User.objects.get(id=user_id)
        # Get first active Gmail account for the user
        gmail_account = GmailAccount.objects.filter(user=user, is_active=True).first()

        if not gmail_account:
            logger.warning(f"No active Gmail account found for user {user_id}")
            return {"error": "No active Gmail account found"}

        return sync_gmail_account.delay(gmail_account.id)

    except User.DoesNotExist:
        logger.error(f"User not found for user_id: {user_id}")
        return {"error": "User not found"}


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
def sync_all_gmail_accounts():
    """Periodic task to sync emails for all active Gmail accounts"""
    active_accounts = GmailAccount.objects.filter(is_active=True)

    if not active_accounts.exists():
        logger.info("No active Gmail accounts found for email sync")
        return {"message": "No active accounts", "accounts_processed": 0}

    logger.info(f"Starting email sync for {active_accounts.count()} active Gmail accounts")

    results = {"accounts_processed": 0, "accounts_failed": 0}

    for account in active_accounts:
        try:
            logger.info(f"Triggering email sync for account {account.id} ({account.email})")
            sync_gmail_account.delay(account.id)
            results["accounts_processed"] += 1
        except Exception as e:
            logger.error(f"Failed to trigger email sync for account {account.id}: {e}")
            results["accounts_failed"] += 1

    logger.info(f"Email sync tasks queued: {results}")
    return results


# Keep old function for backward compatibility
@shared_task
def sync_all_user_emails():
    """DEPRECATED: Use sync_all_gmail_accounts instead"""
    return sync_all_gmail_accounts()