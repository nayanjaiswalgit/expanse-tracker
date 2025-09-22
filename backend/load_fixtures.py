#!/usr/bin/env python
"""
Script to load sample fixtures for testing and development.
Run this script to populate the database with sample data.

Usage:
    python load_fixtures.py [--flush]

Options:
    --flush    Flush the database before loading fixtures (WARNING: This will delete all data)
"""

import os
import sys
import django
from django.core.management import call_command
from django.db import transaction

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app_settings.settings")
django.setup()


def load_fixtures(flush_db=False):
    """Load all fixtures in the correct order"""

    if flush_db:
        print("⚠️  WARNING: Flushing database...")
        response = input("This will delete ALL data. Type 'yes' to continue: ")
        if response.lower() != "yes":
            print("Cancelled.")
            return
        call_command("flush", "--noinput")
        print("✅ Database flushed")

    # Fixtures to load in dependency order
    fixtures = [
        "users/fixtures/users_sample_data.json",
        "core/fixtures/core_sample_data.json",
        "ai/fixtures/ai_sample_data.json",
    ]

    print("🔄 Loading fixtures...")

    with transaction.atomic():
        for fixture in fixtures:
            fixture_path = os.path.join(os.path.dirname(__file__), fixture)
            if os.path.exists(fixture_path):
                print(f"  📂 Loading {fixture}...")
                try:
                    call_command("loaddata", fixture_path)
                    print(f"  ✅ Loaded {fixture}")
                except Exception as e:
                    print(f"  ❌ Error loading {fixture}: {e}")
                    raise
            else:
                print(f"  ⚠️  Fixture not found: {fixture_path}")

    print("\n🎉 All fixtures loaded successfully!")
    print("\n📊 Sample data includes:")
    print("  • 3 users (testuser1, testuser2, admin)")
    print("  • 2 subscription plans (Free Trial, Premium)")
    print("  • 4 accounts (checking, savings, credit)")
    print("  • 5 categories with subcategories")
    print("  • 6 transactions (income, expenses, transfers)")
    print("  • 2 investments (AAPL, TSLA)")
    print("  • 2 financial goals")
    print("  • 1 invoice")
    print("  • 5 activity logs")
    print("\n🔑 Login credentials:")
    print("  User: testuser1@example.com / Password: test123")
    print("  User: testuser2@example.com / Password: test123")
    print("  Admin: admin@example.com / Password: admin123")


if __name__ == "__main__":
    flush = "--flush" in sys.argv
    load_fixtures(flush_db=flush)
