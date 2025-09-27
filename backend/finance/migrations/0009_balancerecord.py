# Generated manually on 2025-09-27 to create BalanceRecord model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("finance", "0008_delete_balance_tables"),
    ]

    operations = [
        migrations.CreateModel(
            name="BalanceRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("balance", models.DecimalField(decimal_places=2, help_text="Account balance at this point", max_digits=12)),
                ("date", models.DateField(help_text="Date of the balance record")),
                ("entry_type", models.CharField(choices=[("daily", "Daily Balance"), ("monthly", "Monthly Statement"), ("weekly", "Weekly Check"), ("manual", "Manual Entry"), ("reconciliation", "Reconciliation")], default="manual", max_length=20)),
                ("statement_balance", models.DecimalField(blank=True, decimal_places=2, help_text="Official statement balance for comparison", max_digits=12, null=True)),
                ("reconciliation_status", models.CharField(choices=[("pending", "Pending"), ("reconciled", "Reconciled"), ("discrepancy", "Has Discrepancy"), ("investigation", "Under Investigation")], default="pending", max_length=20)),
                ("difference", models.DecimalField(decimal_places=2, default=0, help_text="Difference between tracked and statement balance", max_digits=12)),
                ("total_income", models.DecimalField(decimal_places=2, default=0, help_text="Total income transactions for the period", max_digits=12)),
                ("total_expenses", models.DecimalField(decimal_places=2, default=0, help_text="Total expense transactions for the period", max_digits=12)),
                ("calculated_change", models.DecimalField(decimal_places=2, default=0, help_text="Calculated balance change based on transactions", max_digits=12)),
                ("actual_change", models.DecimalField(decimal_places=2, default=0, help_text="Actual balance change from previous record", max_digits=12)),
                ("missing_transactions", models.DecimalField(decimal_places=2, default=0, help_text="Estimated missing transaction amount", max_digits=12)),
                ("period_start", models.DateField(blank=True, help_text="Start of the tracking period", null=True)),
                ("period_end", models.DateField(blank=True, help_text="End of the tracking period", null=True)),
                ("is_month_end", models.BooleanField(default=False, help_text="Is this a month-end balance")),
                ("year", models.IntegerField(blank=True, help_text="Year for easier filtering", null=True)),
                ("month", models.IntegerField(blank=True, help_text="Month for easier filtering", null=True)),
                ("notes", models.TextField(blank=True, help_text="Additional notes or observations")),
                ("source", models.CharField(blank=True, help_text="Source of the balance (e.g., mobile app, website, manual)", max_length=100)),
                ("confidence_score", models.DecimalField(blank=True, decimal_places=2, help_text="Confidence in the balance accuracy (0.00-1.00)", max_digits=3, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict, help_text="Additional metadata")),
                ("account", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="balance_records", to="finance.account")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-date", "account__name"],
                "indexes": [
                    models.Index(fields=["user", "date"], name="finance_bal_user_id_5446f4_idx"),
                    models.Index(fields=["account", "date"], name="finance_bal_account_faee19_idx"),
                    models.Index(fields=["entry_type", "date"], name="finance_bal_entry_t_9630a2_idx"),
                    models.Index(fields=["reconciliation_status"], name="finance_bal_reconci_c10f14_idx"),
                    models.Index(fields=["is_month_end", "date"], name="finance_bal_is_mont_8fd85c_idx"),
                    models.Index(fields=["year", "month"], name="finance_bal_year_399a26_idx"),
                    models.Index(fields=["user", "entry_type", "date"], name="finance_bal_user_id_d83abe_idx"),
                    models.Index(fields=["account", "entry_type", "date"], name="finance_bal_account_aaad10_idx"),
                ],
            },
        ),
        migrations.AlterUniqueTogether(
            name="balancerecord",
            unique_together={("account", "date", "entry_type")},
        ),
    ]