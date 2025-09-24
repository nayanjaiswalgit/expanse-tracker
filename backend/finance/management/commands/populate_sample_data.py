from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import random

from finance.models import Account, Category, Transaction, Goal


class Command(BaseCommand):
    help = 'Populate sample data for demonstration purposes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='Username to create sample data for (required)',
            required=True,
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before populating',
        )

    def handle(self, *args, **options):
        username = options['user']
        clear_data = options['clear']

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User "{username}" does not exist')
            )
            return

        if clear_data:
            self.stdout.write('Clearing existing data...')
            Transaction.objects.filter(user=user).delete()
            Goal.objects.filter(user=user).delete()
            Account.objects.filter(user=user).delete()
            Category.objects.filter(user=user).delete()

        # Create sample accounts
        self.stdout.write('Creating sample accounts...')
        accounts = [
            Account.objects.create(
                user=user,
                name='Main Checking',
                account_type='checking',
                balance=Decimal('2850.75'),
                account_number='1234567890',
                institution='Chase Bank'
            ),
            Account.objects.create(
                user=user,
                name='Savings Account',
                account_type='savings',
                balance=Decimal('15000.00'),
                account_number='0987654321',
                institution='Wells Fargo'
            ),
            Account.objects.create(
                user=user,
                name='Credit Card',
                account_type='credit',
                balance=Decimal('-1425.30'),
                account_number='4532123456789012',
                institution='Capital One'
            ),
            Account.objects.create(
                user=user,
                name='Cash Wallet',
                account_type='cash',
                balance=Decimal('485.50'),
                account_number='',
                institution=''
            ),
        ]

        # Create sample categories
        self.stdout.write('Creating sample categories...')
        expense_categories = [
            ('Food & Dining', '🍽️'),
            ('Coffee', '☕'),
            ('Transportation', '🚗'),
            ('Shopping', '🛍️'),
            ('Utilities', '⚡'),
            ('Entertainment', '🎬'),
            ('Health & Medical', '🏥'),
            ('Groceries', '🛒'),
            ('Gas & Fuel', '⛽'),
            ('Rent', '🏠'),
        ]

        income_categories = [
            ('Salary', '💰'),
            ('Freelance', '💻'),
            ('Investment Returns', '📈'),
            ('Other Income', '💵'),
        ]

        categories = []
        for name, icon in expense_categories:
            categories.append(Category.objects.create(
                user=user,
                name=name,
                category_type='expense',
                icon=icon,
                color='#' + ''.join([random.choice('0123456789ABCDEF') for _ in range(6)])
            ))

        for name, icon in income_categories:
            categories.append(Category.objects.create(
                user=user,
                name=name,
                category_type='income',
                icon=icon,
                color='#' + ''.join([random.choice('0123456789ABCDEF') for _ in range(6)])
            ))

        # Create sample transactions
        self.stdout.write('Creating sample transactions...')

        # Recent transactions (last 30 days)
        sample_transactions = [
            # Recent expenses
            ('Sea Sound Cafe', -8.50, 'Coffee', 'checking', 1),
            ('AromaKava', -11.40, 'Coffee', 'credit', 2),
            ('Whole Foods Market', -81.04, 'Groceries', 'checking', 3),
            ('Shell Gas Station', -45.20, 'Gas & Fuel', 'credit', 4),
            ('Netflix', -15.99, 'Entertainment', 'checking', 5),
            ('Amazon Purchase', -67.89, 'Shopping', 'credit', 6),
            ('Electric Bill', -120.45, 'Utilities', 'checking', 7),
            ('Target', -34.67, 'Shopping', 'checking', 8),
            ('Starbucks', -5.85, 'Coffee', 'credit', 9),
            ('McDonald\'s', -12.45, 'Food & Dining', 'checking', 10),

            # Recent income
            ('Salary Deposit', 2500.00, 'Salary', 'checking', -5),
            ('Freelance Project', 850.00, 'Freelance', 'checking', -10),
            ('Investment Dividend', 125.50, 'Investment Returns', 'checking', -15),
        ]

        # Create transactions
        expense_categories_dict = {cat.name: cat for cat in categories if cat.category_type == 'expense'}
        income_categories_dict = {cat.name: cat for cat in categories if cat.category_type == 'income'}
        accounts_dict = {acc.account_type: acc for acc in accounts}

        for desc, amount, cat_name, acc_type, days_ago in sample_transactions:
            category = expense_categories_dict.get(cat_name) or income_categories_dict.get(cat_name)
            account = accounts_dict.get(acc_type, accounts[0])

            Transaction.objects.create(
                user=user,
                amount=Decimal(str(amount)),
                description=desc,
                date=timezone.now().date() - timedelta(days=abs(days_ago)),
                account=account,
                category=category,
                transaction_type='income' if amount > 0 else 'expense',
                status='active'
            )

        # Create additional older transactions for better data
        older_transactions = []
        for i in range(50):
            days_ago = random.randint(30, 365)
            is_income = random.choice([True, False, False, False])  # 25% chance of income

            if is_income:
                amount = random.uniform(800, 3000)
                desc = random.choice(['Salary', 'Freelance Work', 'Bonus', 'Side Income'])
                category = random.choice([cat for cat in categories if cat.category_type == 'income'])
            else:
                amount = -random.uniform(5, 200)
                desc = random.choice([
                    'Restaurant', 'Gas Station', 'Grocery Store', 'Coffee Shop',
                    'Online Purchase', 'Utility Bill', 'Subscription', 'Shopping'
                ])
                category = random.choice([cat for cat in categories if cat.category_type == 'expense'])

            account = random.choice(accounts)

            Transaction.objects.create(
                user=user,
                amount=Decimal(str(round(amount, 2))),
                description=desc,
                date=timezone.now().date() - timedelta(days=days_ago),
                account=account,
                category=category,
                transaction_type='income' if amount > 0 else 'expense',
                status='active'
            )

        # Create sample goals
        self.stdout.write('Creating sample goals...')
        goals_data = [
            ('Emergency Fund', 'savings', 10000, 6500),
            ('Vacation to Europe', 'savings', 3500, 1200),
            ('New Laptop', 'savings', 1500, 850),
            ('Car Down Payment', 'savings', 8000, 5200),
        ]

        for name, goal_type, target, current in goals_data:
            Goal.objects.create(
                user=user,
                name=name,
                goal_type=goal_type,
                target_amount=Decimal(str(target)),
                current_amount=Decimal(str(current)),
                target_date=timezone.now().date() + timedelta(days=random.randint(90, 365)),
                status='active'
            )

        # Update account balances based on transactions
        self.stdout.write('Updating account balances...')
        for account in accounts:
            transactions = Transaction.objects.filter(user=user, account=account)
            balance = sum(t.amount for t in transactions)

            # Add some base balance
            if account.account_type == 'checking':
                balance += Decimal('1000')
            elif account.account_type == 'savings':
                balance += Decimal('10000')
            elif account.account_type == 'cash':
                balance += Decimal('200')

            account.balance = balance
            account.save()

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created sample data for user "{username}":\n'
                f'- {len(accounts)} accounts\n'
                f'- {len(categories)} categories\n'
                f'- {Transaction.objects.filter(user=user).count()} transactions\n'
                f'- {Goal.objects.filter(user=user).count()} goals'
            )
        )