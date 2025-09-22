"""
Finance app URL configuration.
"""

from django.urls import path, include
from rest_framework_nested import routers
from .views import (
    InvestmentViewSet,
    GoalViewSet,
    GroupExpenseViewSet,
    InvoiceViewSet,
    TransactionViewSet,
    UserBalanceView,
)
from .views.expense_group_views import ExpenseGroupViewSet

# Create router and register viewsets
router = routers.DefaultRouter()
router.register(r"transactions", TransactionViewSet, basename="transaction")
router.register(r"investments", InvestmentViewSet, basename="investment")
router.register(r"goals", GoalViewSet, basename="goal")
router.register(r"invoices", InvoiceViewSet, basename="invoice")
router.register(r"expense-groups", ExpenseGroupViewSet, basename="expense-group")

expense_groups_router = routers.NestedDefaultRouter(
    router, r"expense-groups", lookup="expense_group"
)
expense_groups_router.register(
    r"expenses", GroupExpenseViewSet, basename="expense-group-expense"
)

app_name = "finance"

urlpatterns = [
    # Include at root; project urls add the '/api/finance/' prefix
    path("", include(router.urls)),
    path("", include(expense_groups_router.urls)),
    path("balances/", UserBalanceView.as_view(), name="user-balances"),
]
