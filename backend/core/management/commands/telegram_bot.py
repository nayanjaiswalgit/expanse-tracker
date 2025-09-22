"""
Management command for Telegram bot operations.
"""

import asyncio
from django.core.management.base import BaseCommand, CommandError
from core.models import TelegramBot, TelegramUser
from core.telegram_service import TelegramBotService


class Command(BaseCommand):
    help = "Manage Telegram bots"

    def add_arguments(self, parser):
        parser.add_argument(
            "action",
            choices=["list", "start", "stop", "test", "stats", "cleanup"],
            help="Action to perform",
        )
        parser.add_argument(
            "--bot-id", type=int, help="Bot ID (required for start, stop, test actions)"
        )
        parser.add_argument(
            "--all", action="store_true", help="Apply action to all bots"
        )

    def handle(self, *args, **options):
        action = options["action"]
        bot_id = options.get("bot_id")
        all_bots = options.get("all", False)

        if action == "list":
            self.list_bots()
        elif action == "start":
            if all_bots:
                self.start_all_bots()
            else:
                if not bot_id:
                    raise CommandError("--bot-id is required for start action")
                self.start_bot(bot_id)
        elif action == "stop":
            if all_bots:
                self.stop_all_bots()
            else:
                if not bot_id:
                    raise CommandError("--bot-id is required for stop action")
                self.stop_bot(bot_id)
        elif action == "test":
            if not bot_id:
                raise CommandError("--bot-id is required for test action")
            asyncio.run(self.test_bot(bot_id))
        elif action == "stats":
            self.show_stats()
        elif action == "cleanup":
            self.cleanup_inactive_users()

    def list_bots(self):
        """List all Telegram bots"""
        bots = TelegramBot.objects.all().order_by("-created_at")

        if not bots:
            self.stdout.write(self.style.WARNING("No Telegram bots found."))
            return

        self.stdout.write(self.style.SUCCESS(f"Found {len(bots)} bot(s):"))
        self.stdout.write("-" * 80)

        for bot in bots:
            status_color = (
                self.style.SUCCESS if bot.status == "active" else self.style.ERROR
            )
            user_count = TelegramUser.objects.filter(telegram_bot=bot).count()
            active_users = TelegramUser.objects.filter(
                telegram_bot=bot, status="active"
            ).count()

            self.stdout.write(f"ID: {bot.id}")
            self.stdout.write(f"Name: {bot.name}")
            self.stdout.write(f"Owner: {bot.user.username} ({bot.user.email})")
            self.stdout.write(f"Status: {status_color(bot.status)}")
            self.stdout.write(f"Users: {active_users}/{user_count} active")
            self.stdout.write(f"Messages: {bot.total_messages_processed}")
            self.stdout.write(f"Transactions: {bot.total_transactions_created}")
            self.stdout.write(f"Created: {bot.created_at.strftime('%Y-%m-%d %H:%M')}")
            if bot.last_error_message:
                self.stdout.write(
                    f"Last Error: {self.style.ERROR(bot.last_error_message)}"
                )
            self.stdout.write("-" * 80)

    def start_bot(self, bot_id):
        """Start a specific bot"""
        try:
            bot = TelegramBot.objects.get(id=bot_id)
        except TelegramBot.DoesNotExist:
            raise CommandError(f"Bot with ID {bot_id} not found")

        self.stdout.write(f"Starting bot: {bot.name}...")

        try:
            service = TelegramBotService()
            success = asyncio.run(service.initialize_bot(bot))

            if success:
                bot.status = "active"
                bot.save()
                self.stdout.write(
                    self.style.SUCCESS(f"Bot {bot.name} started successfully")
                )
            else:
                self.stdout.write(self.style.ERROR(f"Failed to start bot {bot.name}"))
                if bot.last_error_message:
                    self.stdout.write(f"Error: {bot.last_error_message}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error starting bot: {str(e)}"))

    def start_all_bots(self):
        """Start all inactive bots"""
        bots = TelegramBot.objects.filter(status__in=["inactive", "error"])

        if not bots:
            self.stdout.write(self.style.WARNING("No inactive bots to start"))
            return

        self.stdout.write(f"Starting {len(bots)} bot(s)...")

        for bot in bots:
            self.stdout.write(f"Starting {bot.name}...")
            try:
                service = TelegramBotService()
                success = asyncio.run(service.initialize_bot(bot))

                if success:
                    bot.status = "active"
                    bot.save()
                    self.stdout.write(self.style.SUCCESS(f"✓ {bot.name} started"))
                else:
                    self.stdout.write(self.style.ERROR(f"✗ Failed to start {bot.name}"))
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"✗ Error starting {bot.name}: {str(e)}")
                )

    def stop_bot(self, bot_id):
        """Stop a specific bot"""
        try:
            bot = TelegramBot.objects.get(id=bot_id)
        except TelegramBot.DoesNotExist:
            raise CommandError(f"Bot with ID {bot_id} not found")

        self.stdout.write(f"Stopping bot: {bot.name}...")

        bot.status = "inactive"
        bot.save()

        self.stdout.write(self.style.SUCCESS(f"Bot {bot.name} stopped"))

    def stop_all_bots(self):
        """Stop all active bots"""
        bots = TelegramBot.objects.filter(status="active")

        if not bots:
            self.stdout.write(self.style.WARNING("No active bots to stop"))
            return

        self.stdout.write(f"Stopping {len(bots)} bot(s)...")

        for bot in bots:
            bot.status = "inactive"
            bot.save()
            self.stdout.write(self.style.SUCCESS(f"✓ {bot.name} stopped"))

    async def test_bot(self, bot_id):
        """Test bot connection"""
        try:
            bot = TelegramBot.objects.get(id=bot_id)
        except TelegramBot.DoesNotExist:
            raise CommandError(f"Bot with ID {bot_id} not found")

        self.stdout.write(f"Testing bot: {bot.name}...")

        try:
            service = TelegramBotService(bot.bot_token)

            # Test initialization
            success = await service.initialize_bot(bot)

            if success and service.application:
                # Get bot info
                bot_info = await service.application.bot.get_me()

                self.stdout.write(self.style.SUCCESS("✓ Bot connection successful"))
                self.stdout.write(f"Bot Username: @{bot_info.username}")
                self.stdout.write(f"Bot Name: {bot_info.first_name}")
                self.stdout.write(f"Bot ID: {bot_info.id}")
                self.stdout.write(f"Can Join Groups: {bot_info.can_join_groups}")
                self.stdout.write(
                    f"Can Read Messages: {bot_info.can_read_all_group_messages}"
                )

                # Test webhook info
                webhook_info = await service.application.bot.get_webhook_info()
                if webhook_info.url:
                    self.stdout.write(f"Webhook URL: {webhook_info.url}")
                    self.stdout.write(
                        f"Pending Updates: {webhook_info.pending_update_count}"
                    )
                else:
                    self.stdout.write(self.style.WARNING("No webhook configured"))

            else:
                self.stdout.write(self.style.ERROR("✗ Bot connection failed"))
                if bot.last_error_message:
                    self.stdout.write(f"Error: {bot.last_error_message}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Test failed: {str(e)}"))

    def show_stats(self):
        """Show Telegram bot statistics"""
        total_bots = TelegramBot.objects.count()
        active_bots = TelegramBot.objects.filter(status="active").count()
        total_users = TelegramUser.objects.count()
        active_users = TelegramUser.objects.filter(status="active").count()
        pending_users = TelegramUser.objects.filter(status="pending").count()
        blocked_users = TelegramUser.objects.filter(status="blocked").count()

        # Calculate totals
        total_messages = sum(
            bot.total_messages_processed for bot in TelegramBot.objects.all()
        )
        total_transactions = sum(
            bot.total_transactions_created for bot in TelegramBot.objects.all()
        )

        self.stdout.write(self.style.SUCCESS("Telegram Bot Statistics"))
        self.stdout.write("=" * 40)
        self.stdout.write(f"Total Bots: {total_bots}")
        self.stdout.write(f"Active Bots: {active_bots}")
        self.stdout.write(f"Total Users: {total_users}")
        self.stdout.write(f"Active Users: {active_users}")
        self.stdout.write(f"Pending Users: {pending_users}")
        self.stdout.write(f"Blocked Users: {blocked_users}")
        self.stdout.write(f"Total Messages Processed: {total_messages:,}")
        self.stdout.write(f"Total Transactions Created: {total_transactions:,}")

        # Per-bot breakdown
        if total_bots > 0:
            self.stdout.write("\nPer-Bot Breakdown:")
            self.stdout.write("-" * 40)

            for bot in TelegramBot.objects.all():
                bot_users = TelegramUser.objects.filter(telegram_bot=bot).count()
                self.stdout.write(f"{bot.name}:")
                self.stdout.write(f"  Status: {bot.status}")
                self.stdout.write(f"  Users: {bot_users}")
                self.stdout.write(f"  Messages: {bot.total_messages_processed:,}")
                self.stdout.write(f"  Transactions: {bot.total_transactions_created:,}")

    def cleanup_inactive_users(self):
        """Clean up inactive Telegram users"""
        from django.utils import timezone
        from datetime import timedelta

        # Find users inactive for more than 30 days
        cutoff_date = timezone.now() - timedelta(days=30)
        inactive_users = TelegramUser.objects.filter(
            last_activity_at__lt=cutoff_date, status="pending"
        )

        count = inactive_users.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("No inactive users to clean up"))
            return

        self.stdout.write(
            f"Found {count} inactive pending user(s) (inactive for 30+ days)"
        )
        self.stdout.write("These users will be deleted...")

        for user in inactive_users:
            self.stdout.write(
                f"Deleting user: {user.get_display_name()} (last active: {user.last_activity_at})"
            )

        # Delete the users
        inactive_users.delete()

        self.stdout.write(self.style.SUCCESS(f"Cleaned up {count} inactive user(s)"))
