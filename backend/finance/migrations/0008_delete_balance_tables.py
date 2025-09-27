# Generated manually on 2025-09-27 to clean up balance tracking tables

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0007_monthlybalance"),
    ]

    operations = [
        migrations.RunSQL(
            "DROP TABLE IF EXISTS finance_balancehistory;",
            reverse_sql="",
        ),
        migrations.RunSQL(
            "DROP TABLE IF EXISTS finance_monthlybalance;",
            reverse_sql="",
        ),
    ]