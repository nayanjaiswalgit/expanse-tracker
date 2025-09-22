"""
Investment service for handling investment business logic.
"""

from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from core.services.base import BaseService
from ..models import Investment, Transaction


class InvestmentService(BaseService):
    """Service for investment operations"""

    def get_queryset(self):
        return Investment.objects.all()

    def create_investment(self, investment_data):
        """Create a new investment"""
        return Investment.objects.create(user=self.user, **investment_data)

    def buy_investment(
        self, investment_id, quantity, price_per_unit, fees=0, transaction_date=None
    ):
        """Record a buy transaction for an investment"""
        investment = self.get_user_queryset().get(id=investment_id)

        if transaction_date is None:
            transaction_date = timezone.now().date()

        total_amount = (quantity * price_per_unit) + fees

        with transaction.atomic():
            # Create buy transaction
            buy_transaction = Transaction.objects.create(
                user=self.user,
                transaction_category="investment",
                transaction_type="buy",
                investment=investment,
                quantity=quantity,
                price_per_unit=price_per_unit,
                amount=total_amount,
                fees=fees,
                date=transaction_date,
                description=f"Buy {quantity} shares of {investment.symbol}",
                status="active",
            )

            # Update investment current price if this is the latest transaction
            latest_transaction = (
                investment.transactions.filter(status="active")
                .order_by("-date", "-created_at")
                .first()
            )

            if latest_transaction and latest_transaction.id == buy_transaction.id:
                investment.current_price = price_per_unit
                investment.last_price_update = timezone.now()
                investment.save()

            return buy_transaction

    def sell_investment(
        self, investment_id, quantity, price_per_unit, fees=0, transaction_date=None
    ):
        """Record a sell transaction for an investment"""
        investment = self.get_user_queryset().get(id=investment_id)

        # Check if user has enough quantity to sell
        current_quantity = investment.current_quantity
        if quantity > current_quantity:
            raise ValueError(
                f"Cannot sell {quantity} shares. Only {current_quantity} shares available."
            )

        if transaction_date is None:
            transaction_date = timezone.now().date()

        total_amount = (quantity * price_per_unit) - fees

        with transaction.atomic():
            # Create sell transaction
            sell_transaction = Transaction.objects.create(
                user=self.user,
                transaction_category="investment",
                transaction_type="sell",
                investment=investment,
                quantity=quantity,
                price_per_unit=price_per_unit,
                amount=total_amount,
                fees=fees,
                date=transaction_date,
                description=f"Sell {quantity} shares of {investment.symbol}",
                status="active",
            )

            # Update investment current price if this is the latest transaction
            latest_transaction = (
                investment.transactions.filter(status="active")
                .order_by("-date", "-created_at")
                .first()
            )

            if latest_transaction and latest_transaction.id == sell_transaction.id:
                investment.current_price = price_per_unit
                investment.last_price_update = timezone.now()
                investment.save()

            return sell_transaction

    def record_dividend(self, investment_id, amount, payment_date=None):
        """Record a dividend payment"""
        investment = self.get_user_queryset().get(id=investment_id)

        if payment_date is None:
            payment_date = timezone.now().date()

        return Transaction.objects.create(
            user=self.user,
            transaction_category="investment",
            transaction_type="dividend",
            investment=investment,
            amount=amount,
            date=payment_date,
            description=f"Dividend from {investment.symbol}",
            status="active",
        )

    def update_investment_price(self, investment_id, new_price, price_source="manual"):
        """Update investment current price"""
        investment = self.get_user_queryset().get(id=investment_id)

        investment.current_price = new_price
        investment.price_source = price_source
        investment.last_price_update = timezone.now()
        investment.save()

        return investment

    def bulk_update_prices(self, price_updates):
        """Bulk update prices for multiple investments"""
        updated_count = 0
        for symbol, price_data in price_updates.items():
            try:
                investment = self.get_user_queryset().get(symbol=symbol)
                self.update_investment_price(
                    investment.id, price_data["price"], price_data.get("source", "api")
                )
                updated_count += 1
            except Investment.DoesNotExist:
                continue

        return updated_count

    def get_portfolio_performance(self, portfolio_name="Default"):
        """Get comprehensive portfolio performance metrics"""
        investments = self.get_user_queryset().filter(
            portfolio_name=portfolio_name, is_active=True
        )

        portfolio_metrics = {
            "total_value": Decimal("0"),
            "total_invested": Decimal("0"),
            "total_gain_loss": Decimal("0"),
            "total_gain_loss_percentage": Decimal("0"),
            "dividend_income": Decimal("0"),
            "investments": [],
        }

        for investment in investments:
            investment_data = {
                "symbol": investment.symbol,
                "name": investment.name,
                "current_quantity": investment.current_quantity,
                "current_price": investment.current_price,
                "current_value": investment.current_value,
                "total_invested": investment.total_invested,
                "total_gain_loss": investment.total_gain_loss,
                "total_gain_loss_percentage": investment.total_gain_loss_percentage,
            }

            # Calculate dividend income
            dividend_income = investment.transactions.filter(
                transaction_type="dividend", status="active"
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

            investment_data["dividend_income"] = dividend_income

            portfolio_metrics["investments"].append(investment_data)
            portfolio_metrics["total_value"] += investment.current_value
            portfolio_metrics["total_invested"] += investment.total_invested
            portfolio_metrics["dividend_income"] += dividend_income

        portfolio_metrics["total_gain_loss"] = (
            portfolio_metrics["total_value"] - portfolio_metrics["total_invested"]
        )

        if portfolio_metrics["total_invested"] > 0:
            portfolio_metrics["total_gain_loss_percentage"] = (
                portfolio_metrics["total_gain_loss"]
                / portfolio_metrics["total_invested"]
                * 100
            )

        # Add sector allocation
        portfolio_metrics["sector_allocation"] = self._get_sector_allocation(
            investments
        )

        # Add investment type allocation
        portfolio_metrics["type_allocation"] = self._get_type_allocation(investments)

        return portfolio_metrics

    def get_investment_history(self, investment_id, start_date=None, end_date=None):
        """Get transaction history for an investment"""
        investment = self.get_user_queryset().get(id=investment_id)

        transactions = investment.transactions.filter(status="active")

        if start_date:
            transactions = transactions.filter(date__gte=start_date)
        if end_date:
            transactions = transactions.filter(date__lte=end_date)

        return transactions.order_by("-date", "-created_at")

    def calculate_realized_gains(self, investment_id=None):
        """Calculate realized gains/losses from sell transactions"""
        if investment_id:
            investments = [self.get_user_queryset().get(id=investment_id)]
        else:
            investments = self.get_user_queryset().filter(is_active=True)

        total_realized_gains = Decimal("0")
        investment_gains = {}

        for investment in investments:
            sell_transactions = investment.transactions.filter(
                transaction_type="sell", status="active"
            ).order_by("date")

            buy_transactions = investment.transactions.filter(
                transaction_type="buy", status="active"
            ).order_by("date")

            # Simple FIFO calculation
            realized_gain = self._calculate_fifo_gains(
                buy_transactions, sell_transactions
            )
            investment_gains[investment.symbol] = realized_gain
            total_realized_gains += realized_gain

        return {
            "total_realized_gains": total_realized_gains,
            "investment_gains": investment_gains,
        }

    def get_top_performers(self, limit=5):
        """Get top performing investments by percentage gain"""
        investments = self.get_user_queryset().filter(is_active=True)
        performers = []

        for investment in investments:
            if investment.total_invested > 0:
                performers.append(
                    {
                        "symbol": investment.symbol,
                        "name": investment.name,
                        "gain_loss_percentage": investment.total_gain_loss_percentage,
                        "current_value": investment.current_value,
                    }
                )

        return sorted(
            performers, key=lambda x: x["gain_loss_percentage"], reverse=True
        )[:limit]

    def _get_sector_allocation(self, investments):
        """Calculate sector allocation for portfolio"""
        sector_allocation = {}
        total_value = sum(inv.current_value for inv in investments)

        if total_value == 0:
            return sector_allocation

        for investment in investments:
            sector = investment.sector or "Unknown"
            if sector not in sector_allocation:
                sector_allocation[sector] = {
                    "value": Decimal("0"),
                    "percentage": Decimal("0"),
                }
            sector_allocation[sector]["value"] += investment.current_value

        # Calculate percentages
        for sector_data in sector_allocation.values():
            sector_data["percentage"] = (sector_data["value"] / total_value) * 100

        return sector_allocation

    def _get_type_allocation(self, investments):
        """Calculate investment type allocation for portfolio"""
        type_allocation = {}
        total_value = sum(inv.current_value for inv in investments)

        if total_value == 0:
            return type_allocation

        for investment in investments:
            inv_type = investment.get_investment_type_display()
            if inv_type not in type_allocation:
                type_allocation[inv_type] = {
                    "value": Decimal("0"),
                    "percentage": Decimal("0"),
                }
            type_allocation[inv_type]["value"] += investment.current_value

        # Calculate percentages
        for type_data in type_allocation.values():
            type_data["percentage"] = (type_data["value"] / total_value) * 100

        return type_allocation

    def _calculate_fifo_gains(self, buy_transactions, sell_transactions):
        """Calculate realized gains using FIFO method"""
        realized_gain = Decimal("0")
        remaining_buys = []

        # Build remaining buys queue
        for buy in buy_transactions:
            remaining_buys.append(
                {
                    "quantity": buy.quantity,
                    "price": buy.price_per_unit,
                    "fees": buy.fees,
                }
            )

        # Process sells against buys
        for sell in sell_transactions:
            sell_quantity = sell.quantity
            sell_price = sell.price_per_unit
            sell_fees = sell.fees

            while sell_quantity > 0 and remaining_buys:
                buy = remaining_buys[0]

                if buy["quantity"] <= sell_quantity:
                    # Use entire buy lot
                    quantity_used = buy["quantity"]
                    buy_cost = quantity_used * buy["price"] + (
                        buy["fees"] * quantity_used / buy["quantity"]
                    )
                    sell_proceeds = quantity_used * sell_price - (
                        sell_fees * quantity_used / sell.quantity
                    )

                    realized_gain += sell_proceeds - buy_cost
                    sell_quantity -= quantity_used
                    remaining_buys.pop(0)
                else:
                    # Partial buy lot usage
                    quantity_used = sell_quantity
                    buy_cost = quantity_used * buy["price"] + (
                        buy["fees"] * quantity_used / buy["quantity"]
                    )
                    sell_proceeds = quantity_used * sell_price - (
                        sell_fees * quantity_used / sell.quantity
                    )

                    realized_gain += sell_proceeds - buy_cost
                    buy["quantity"] -= quantity_used
                    sell_quantity = 0

        return realized_gain
