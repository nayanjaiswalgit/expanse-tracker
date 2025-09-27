from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Add thumbnail_image column to Goal table'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            try:
                # Check if column already exists
                cursor.execute("PRAGMA table_info(finance_goal)")
                columns = [row[1] for row in cursor.fetchall()]

                if 'thumbnail_image' not in columns:
                    # Add the column
                    cursor.execute("""
                        ALTER TABLE finance_goal
                        ADD COLUMN thumbnail_image VARCHAR(500) NULL
                    """)
                    self.stdout.write(
                        self.style.SUCCESS('Successfully added thumbnail_image column')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING('thumbnail_image column already exists')
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error adding column: {e}')
                )