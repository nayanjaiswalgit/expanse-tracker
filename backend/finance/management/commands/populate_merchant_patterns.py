"""
Management command to populate sample merchant patterns for AI categorization.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from finance.models import Category, MerchantPattern

User = get_user_model()


class Command(BaseCommand):
    help = 'Populate sample merchant patterns for AI categorization'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='Username to create patterns for (creates for all users if not specified)'
        )

    def handle(self, *args, **options):
        username = options.get('user')

        if username:
            try:
                users = [User.objects.get(username=username)]
                self.stdout.write(f"Creating patterns for user: {username}")
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"User '{username}' not found")
                )
                return
        else:
            users = User.objects.all()
            self.stdout.write("Creating patterns for all users")

        # Sample merchant patterns
        merchant_patterns = [
            # Food & Dining
            {
                'patterns': ['mcdonalds', 'mcdonald', 'burger king', 'kfc', 'subway', 'pizza hut', 'dominos'],
                'category_name': 'Fast Food',
                'merchant_name': 'Fast Food Restaurants'
            },
            {
                'patterns': ['starbucks', 'dunkin', 'costa coffee', 'coffee shop'],
                'category_name': 'Coffee',
                'merchant_name': 'Coffee Shops'
            },
            {
                'patterns': ['walmart', 'target', 'costco', 'sam\'s club', 'whole foods', 'safeway', 'kroger'],
                'category_name': 'Groceries',
                'merchant_name': 'Grocery Stores'
            },

            # Transportation
            {
                'patterns': ['uber', 'lyft', 'taxi', 'cab'],
                'category_name': 'Transportation',
                'merchant_name': 'Ride Sharing'
            },
            {
                'patterns': ['shell', 'chevron', 'bp', 'exxon', 'mobil', 'gas station', 'fuel'],
                'category_name': 'Gas',
                'merchant_name': 'Gas Stations'
            },

            # Utilities
            {
                'patterns': ['electric', 'power', 'utility', 'water', 'sewer'],
                'category_name': 'Utilities',
                'merchant_name': 'Utility Companies'
            },
            {
                'patterns': ['verizon', 'att', 't-mobile', 'sprint', 'phone', 'mobile'],
                'category_name': 'Phone',
                'merchant_name': 'Phone Services'
            },
            {
                'patterns': ['internet', 'comcast', 'cox', 'spectrum', 'broadband'],
                'category_name': 'Internet',
                'merchant_name': 'Internet Services'
            },

            # Entertainment
            {
                'patterns': ['netflix', 'spotify', 'amazon prime', 'hulu', 'disney+', 'streaming'],
                'category_name': 'Entertainment',
                'merchant_name': 'Streaming Services'
            },
            {
                'patterns': ['cinema', 'theater', 'movie', 'amc', 'regal'],
                'category_name': 'Entertainment',
                'merchant_name': 'Movie Theaters'
            },

            # Shopping
            {
                'patterns': ['amazon', 'amazon.com', 'amzn'],
                'category_name': 'Shopping',
                'merchant_name': 'Amazon'
            },
            {
                'patterns': ['best buy', 'apple store', 'electronics'],
                'category_name': 'Electronics',
                'merchant_name': 'Electronics Stores'
            },

            # Healthcare
            {
                'patterns': ['pharmacy', 'cvs', 'walgreens', 'rite aid', 'medicine'],
                'category_name': 'Healthcare',
                'merchant_name': 'Pharmacy'
            },
            {
                'patterns': ['doctor', 'clinic', 'hospital', 'medical', 'dentist'],
                'category_name': 'Healthcare',
                'merchant_name': 'Medical Services'
            },

            # Banking & Finance
            {
                'patterns': ['atm fee', 'overdraft', 'monthly fee', 'service charge'],
                'category_name': 'Bank Fees',
                'merchant_name': 'Bank Fees'
            },
            {
                'patterns': ['interest earned', 'dividend', 'investment'],
                'category_name': 'Investment Income',
                'merchant_name': 'Investment Returns'
            },

            # Insurance
            {
                'patterns': ['insurance', 'allstate', 'geico', 'progressive', 'state farm'],
                'category_name': 'Insurance',
                'merchant_name': 'Insurance Companies'
            }
        ]

        total_created = 0

        for user in users:
            user_patterns_created = 0

            for pattern_group in merchant_patterns:
                # Get or create category
                category, created = Category.objects.get_or_create(
                    user=user,
                    name=pattern_group['category_name'],
                    defaults={
                        'category_type': 'expense',
                        'color': '#6B7280'
                    }
                )

                # Create patterns for this category
                for pattern_text in pattern_group['patterns']:
                    pattern, created = MerchantPattern.objects.get_or_create(
                        user=user,
                        pattern=pattern_text,
                        defaults={
                            'category': category,
                            'merchant_name': pattern_group['merchant_name'],
                            'confidence': 0.7,
                            'pattern_type': 'contains',
                            'is_active': True
                        }
                    )

                    if created:
                        user_patterns_created += 1
                        total_created += 1

            self.stdout.write(
                f"Created {user_patterns_created} patterns for user {user.username}"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully created {total_created} merchant patterns total"
            )
        )