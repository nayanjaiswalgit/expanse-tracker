from django.core.management.base import BaseCommand
from finance.models import Category


class Command(BaseCommand):
    help = 'Populate category icons for existing categories'

    def handle(self, *args, **options):
        # Define default icons for common category names
        category_icons = {
            # Food & Dining
            'food': '🍽️',
            'restaurant': '🍽️',
            'dining': '🍽️',
            'groceries': '🛒',
            'grocery': '🛒',
            'coffee': '☕',
            'cafe': '☕',
            'fast food': '🍔',
            'pizza': '🍕',
            'lunch': '🥪',
            'breakfast': '🥞',
            'dinner': '🍽️',

            # Transportation
            'transport': '🚗',
            'transportation': '🚗',
            'car': '🚗',
            'fuel': '⛽',
            'gas': '⛽',
            'parking': '🅿️',
            'taxi': '🚕',
            'uber': '🚕',
            'bus': '🚌',
            'train': '🚆',
            'flight': '✈️',
            'travel': '✈️',

            # Shopping
            'shopping': '🛍️',
            'retail': '🛍️',
            'clothes': '👕',
            'clothing': '👕',
            'electronics': '📱',
            'books': '📚',
            'gifts': '🎁',

            # Bills & Utilities
            'utilities': '⚡',
            'electricity': '⚡',
            'water': '💧',
            'internet': '🌐',
            'phone': '📱',
            'rent': '🏠',
            'mortgage': '🏡',
            'insurance': '🛡️',

            # Health & Medical
            'health': '🏥',
            'medical': '🏥',
            'doctor': '👨‍⚕️',
            'pharmacy': '💊',
            'dentist': '🦷',
            'hospital': '🏥',

            # Entertainment
            'entertainment': '🎬',
            'movie': '🎬',
            'cinema': '🎬',
            'music': '🎵',
            'games': '🎮',
            'sports': '⚽',
            'gym': '💪',
            'fitness': '💪',

            # Income
            'salary': '💰',
            'wage': '💰',
            'income': '💰',
            'bonus': '💰',
            'freelance': '💻',
            'investment': '📈',
            'dividend': '📊',

            # Other
            'education': '🎓',
            'bank': '🏦',
            'atm': '💳',
            'transfer': '💸',
            'subscription': '📱',
            'charity': '❤️',
            'pets': '🐕',
            'home': '🏠',
            'office': '🏢',
            'personal': '👤',
        }

        updated_count = 0

        # Update existing categories that don't have icons
        for category in Category.objects.filter(icon__in=['', None]):
            name_lower = category.name.lower()
            icon_found = None

            # Try to find a matching icon
            for keyword, icon in category_icons.items():
                if keyword in name_lower:
                    icon_found = icon
                    break

            # If no specific match, use default based on category type
            if not icon_found:
                if category.category_type == 'income':
                    icon_found = '💰'
                elif category.category_type == 'expense':
                    icon_found = '💼'
                else:
                    icon_found = '📝'

            category.icon = icon_found
            category.save()
            updated_count += 1
            try:
                self.stdout.write(f"Updated '{category.name}' with icon")
            except UnicodeEncodeError:
                self.stdout.write(f"Updated '{category.name}'")

        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated {updated_count} categories with icons')
        )