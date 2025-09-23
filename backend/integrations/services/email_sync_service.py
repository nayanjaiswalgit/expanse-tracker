import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction
from .gmail_service import GmailService
from .email_parser import EmailParser
from ..models import GmailAccount


logger = logging.getLogger(__name__)


class EmailSyncService:
    """Service to sync emails and create transactions"""

    def __init__(self):
        self.parser = EmailParser()

    def _find_html_part(self, parts):
        for part in parts:
            if part['mimeType'] == 'text/html':
                return part.get('body', {}).get('data')
            if 'parts' in part:
                html_part = self._find_html_part(part['parts'])
                if html_part:
                    return html_part
        return None

    def sync_account_emails(self, gmail_account: GmailAccount, limit: int = 100) -> dict:
        """Sync emails for a specific Gmail account"""
        from training.models import RawEmail
        import base64

        if not gmail_account.is_active:
            return {"error": "Account is not active", "processed": 0}

        try:
            gmail_service = GmailService(gmail_account=gmail_account)
            query = self._build_query(gmail_account)

            all_messages = []
            page_token = None
            while len(all_messages) < limit:
                page_size = min(100, limit - len(all_messages))
                messages, next_page_token = gmail_service.list_messages(
                    query=query, max_results=page_size, page_token=page_token
                )
                all_messages.extend(messages)

                if not next_page_token:
                    break
                page_token = next_page_token

            results = {
                "total_fetched": len(all_messages),
                "processed": 0,
                "transactions_created": 0,
                "errors": []
            }

            emails_to_store = []
            for message in all_messages:
                try:
                    full_message = gmail_service.get_message(message['id'])

                    headers = {h['name']: h['value'] for h in full_message['payload']['headers']}
                    
                    html_body_data = None
                    if 'parts' in full_message['payload']:
                        html_body_data = self._find_html_part(full_message['payload']['parts'])
                    elif full_message['payload'].get('mimeType') == 'text/html':
                        html_body_data = full_message['payload'].get('body', {}).get('data')

                    html_body = ''
                    if html_body_data:
                        try:
                            html_body = base64.urlsafe_b64decode(html_body_data.encode('ASCII')).decode('utf-8')
                        except Exception as e:
                            logger.warning(f"Could not decode HTML body for message {message['id']}: {e}")

                    emails_to_store.append(
                        RawEmail(
                            user=gmail_account.user,
                            gmail_account=gmail_account,
                            message_id=full_message['id'],
                            headers=headers,
                            subject=headers.get('Subject', ''),
                            sender=headers.get('From', ''),
                            body_text=full_message.get('snippet', ''),
                            body_html=html_body,
                            received_at=datetime.fromtimestamp(int(full_message['internalDate']) / 1000, tz=timezone.utc)
                        )
                    )

                    parsed_data = self.parser.parse_gmail_message(full_message)

                    if parsed_data.get('is_transaction') and parsed_data.get('parsed_amount'):
                        if parsed_data.get('confidence_score', 0) >= 0.5:
                            transaction_created = self._create_transaction_from_email(
                                gmail_account, parsed_data, message['id']
                            )
                            if transaction_created:
                                results["transactions_created"] += 1

                    results["processed"] += 1

                except Exception as e:
                    logger.error(f"Error processing message {message['id']}: {str(e)}")
                    results["errors"].append(f"Message {message['id']}: {str(e)}")

            if emails_to_store:
                RawEmail.objects.bulk_create(emails_to_store, ignore_conflicts=True)
                logger.info(f"Stored {len(emails_to_store)} emails for training.")

            gmail_account.last_sync_at = timezone.now()
            gmail_account.save()

            return results

        except Exception as e:
            logger.error(f"Error syncing emails for account {gmail_account.id}: {str(e)}")
            return {"error": str(e), "processed": 0}

    def sync_all_active_accounts(self) -> dict:
        """Sync emails for all active Gmail accounts"""
        active_accounts = GmailAccount.objects.filter(is_active=True)

        results = {
            "accounts_processed": 0,
            "total_transactions_created": 0,
            "account_results": {}
        }

        for account in active_accounts:
            try:
                account_result = self.sync_account_emails(account)
                results["account_results"][account.id] = account_result
                results["accounts_processed"] += 1
                results["total_transactions_created"] += account_result.get("transactions_created", 0)
            except Exception as e:
                logger.error(f"Error syncing account {account.id}: {str(e)}")
                results["account_results"][account.id] = {"error": str(e)}

        return results

    def _build_query(self, gmail_account: GmailAccount) -> str:
        """Build Gmail search query based on account filters"""
        query_parts = []

        # # Add sender filters
        # if gmail_account.sender_filters:
        #     sender_query = " OR ".join([f"from:{sender}" for sender in gmail_account.sender_filters])
        #     query_parts.append(f"({sender_query})")

        # # Add keyword filters
        # if gmail_account.keyword_filters:
        #     keyword_query = " OR ".join(gmail_account.keyword_filters)
        #     query_parts.append(f"({keyword_query})")

        # # Add date filter (default to last 30 days to avoid overwhelming initial sync)
        # from datetime import datetime, timedelta
        # thirty_days_ago = datetime.now() - timedelta(days=30)
        # date_str = thirty_days_ago.strftime("%Y/%m/%d")
        # query_parts.append(f"after:{date_str}")

        # # Default query if no filters
        # if not query_parts:
        #     # Look for emails that might contain transactions
        #     default_keywords = [
        #         "payment", "transaction", "receipt", "invoice", "bill",
        #         "purchase", "order", "charged", "paid"
        #     ]
        #     keyword_query = " OR ".join(default_keywords)
        #     query_parts.append(f"({keyword_query})")

        return " ".join(query_parts)

    def _create_transaction_from_email(self, gmail_account: GmailAccount, parsed_data: dict, message_id: str) -> bool:
        """Create a transaction from parsed email data"""
        from finance.models.transactions import Transaction
        from django.db import transaction

        try:
            # Check if a transaction with this message_id already exists
            if Transaction.objects.filter(gmail_message_id=message_id).exists():
                logger.info(f"Transaction with message_id {message_id} already exists. Skipping.")
                return False

            with transaction.atomic():
                category = self._determine_category(parsed_data, gmail_account)

                # Create the transaction
                Transaction.objects.create(
                    user=gmail_account.user,
                    amount=parsed_data['parsed_amount'],
                    description=parsed_data.get('parsed_description', 'Email transaction'),
                    date=parsed_data.get('parsed_date', timezone.now().date()),
                    currency=parsed_data.get('parsed_currency', 'USD'),
                    category=category,
                    gmail_message_id=message_id,
                    transaction_type=parsed_data.get('transaction_type', 'expense'),
                    # account is left null as we can't determine it from the email
                )
            logger.info(f"Successfully created transaction from email for user {gmail_account.user.id}")
            return True

        except Exception as e:
            logger.error(f"Error creating transaction from email: {str(e)}")
            return False

    def _determine_category(self, parsed_data: dict, gmail_account):
        """Determine transaction category based on parsed data"""
        from finance.models import Category

        description = parsed_data.get('parsed_description', '').lower()

        # Simple category mapping based on keywords
        category_keywords = {
            'groceries': ['grocery', 'supermarket', 'walmart', 'target', 'food'],
            'dining': ['restaurant', 'food', 'dining', 'cafe', 'pizza'],
            'transportation': ['uber', 'taxi', 'gas', 'fuel', 'transport'],
            'shopping': ['amazon', 'shop', 'store', 'purchase'],
            'utilities': ['electric', 'water', 'gas', 'internet', 'phone'],
            'entertainment': ['netflix', 'spotify', 'movie', 'game'],
            'healthcare': ['medical', 'doctor', 'hospital', 'pharmacy'],
        }

        for category_name, keywords in category_keywords.items():
            if any(keyword in description for keyword in keywords):
                category, created = Category.objects.get_or_create(
                    name=category_name.title(),
                    user=gmail_account.user,
                    defaults={'category_type': 'expense', 'color': '#3B82F6', 'icon': '📁'}
                )
                return category

        # Default category
        default_category, created = Category.objects.get_or_create(
            name='Other',
            user=gmail_account.user,
            defaults={'category_type': 'expense', 'color': '#6B7280', 'icon': '📋'}
        )
        return default_category