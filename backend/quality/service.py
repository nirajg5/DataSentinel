
import json
from datetime import datetime, timezone

import pandas as pd
from sqlalchemy import inspect, text

from backend.database.database import engine


DATASETS = {
    "customers": {
        "table": "silver_customers",
        "primary_key": "customer_id",
        "required": [
            "customer_id",
            "customer_name",
            "email",
        ],
    },
    "products": {
        "table": "silver_products",
        "primary_key": "product_id",
        "required": [
            "product_id",
            "product_name",
            "price",
            "stock_quantity",
        ],
    },
    "orders": {
        "table": "silver_orders",
        "primary_key": "order_id",
        "required": [
            "order_id",
            "customer_id",
            "product_id",
            "quantity",
            "order_date",
        ],
    },
}


def check_dataset(dataset_type: str) -> dict:
    dataset_type = dataset_type.strip().lower()

    if dataset_type not in DATASETS:
        raise ValueError(
            f"Unsupported dataset: {dataset_type}. "
            f"Supported: {list(DATASETS)}"
        )

    config = DATASETS[dataset_type]
    table_name = config["table"]

    if not inspect(engine).has_table(table_name):
        raise ValueError(
            f"Table {table_name} does not exist. "
            "Run Silver ETL first."
        )

    with engine.connect() as connection:
        df = pd.read_sql(
            text(f'SELECT * FROM "{table_name}"'),
            connection,
        )

        # Load reference keys for referential integrity checks.
        if dataset_type == "orders":
            customer_ids = pd.read_sql(
                text("SELECT customer_id FROM silver_customers"),
                connection,
            )["customer_id"]

            product_ids = pd.read_sql(
                text("SELECT product_id FROM silver_products"),
                connection,
            )["product_id"]
        else:
            customer_ids = pd.Series(dtype="object")
            product_ids = pd.Series(dtype="object")

    results = []

    def add_check(name, failed_count, total_count, details):
        failed_count = int(failed_count)
        total_count = int(total_count)

        # An empty dataset is not considered healthy.
        score = (
            0.0 if total_count == 0
            else round(
                100 * (total_count - min(failed_count, total_count))
                / total_count,
                2,
            )
        )

        results.append({
            "dataset_name": dataset_type,
            "check_type": name,
            "status": (
                "FAIL" if failed_count > 0 or total_count == 0
                else "PASS"
            ),
            "score": score,
            "details": details,
        })

    # Check 1: dataset is not empty.
    add_check(
        "non_empty",
        1 if df.empty else 0,
        max(len(df), 1),
        {"row_count": len(df)},
    )

    # Check 2: required columns exist.
    missing_columns = sorted(
        set(config["required"]) - set(df.columns)
    )

    add_check(
        "required_columns",
        1 if missing_columns else 0,
        1,
        {"missing_columns": missing_columns},
    )

    # Remaining checks require the expected columns.
    if not missing_columns:
        # Check 3: nulls in required columns.
        null_counts = (
            df[config["required"]]
            .isna()
            .sum()
            .to_dict()
        )
        total_nulls = sum(int(value) for value in null_counts.values())

        add_check(
            "null_values",
            total_nulls,
            max(len(df) * len(config["required"]), 1),
            {"null_counts": {
                key: int(value)
                for key, value in null_counts.items()
            }},
        )

        # Check 4: duplicate primary keys.
        duplicate_mask = df[config["primary_key"]].duplicated(
            keep=False
        )

        add_check(
            "duplicate_primary_key",
            int(duplicate_mask.sum()),
            max(len(df), 1),
            {
                "primary_key": config["primary_key"],
                "duplicate_rows": int(duplicate_mask.sum()),
            },
        )

    # Check 5: business rules.
    if dataset_type == "products":
        invalid_price = (
            pd.to_numeric(df["price"], errors="coerce") < 0
        ) | pd.to_numeric(df["price"], errors="coerce").isna()

        invalid_stock = (
            pd.to_numeric(df["stock_quantity"], errors="coerce") < 0
        ) | pd.to_numeric(
            df["stock_quantity"], errors="coerce"
        ).isna()

        add_check(
            "valid_price",
            int(invalid_price.sum()),
            max(len(df), 1),
            {"invalid_rows": int(invalid_price.sum())},
        )

        add_check(
            "valid_stock_quantity",
            int(invalid_stock.sum()),
            max(len(df), 1),
            {"invalid_rows": int(invalid_stock.sum())},
        )

    elif dataset_type == "orders":
        quantity = pd.to_numeric(
            df["quantity"], errors="coerce"
        )
        invalid_quantity = quantity.isna() | (quantity <= 0)

        add_check(
            "valid_quantity",
            int(invalid_quantity.sum()),
            max(len(df), 1),
            {"invalid_rows": int(invalid_quantity.sum())},
        )

        missing_customers = ~df["customer_id"].isin(customer_ids)
        missing_products = ~df["product_id"].isin(product_ids)

        add_check(
            "customer_referential_integrity",
            int(missing_customers.sum()),
            max(len(df), 1),
            {"unmatched_rows": int(missing_customers.sum())},
        )

        add_check(
            "product_referential_integrity",
            int(missing_products.sum()),
            max(len(df), 1),
            {"unmatched_rows": int(missing_products.sum())},
        )

    # Persist the results in data_quality_results.
    # Expected columns: dataset_name, check_type, status,
    # score, details, checked_at.
    checked_at = datetime.now(timezone.utc).replace(tzinfo=None)

    with engine.begin() as connection:
        for result in results:
            connection.execute(
                text("""
                    INSERT INTO data_quality_results
                    (dataset_name, check_type, status, score,
                     details, checked_at)
                    VALUES
                    (:dataset_name, :check_type, :status, :score,
                     :details, :checked_at)
                """),
                {
                    **result,
                    "details": json.dumps(result["details"]),
                    "checked_at": checked_at,
                },
            )

    failed_checks = sum(
        1 for result in results if result["status"] == "FAIL"
    )

    return {
        "dataset": dataset_type,
        "table": table_name,
        "rows_checked": len(df),
        "checks_run": len(results),
        "failed_checks": failed_checks,
        "overall_status": (
            "PASS" if failed_checks == 0 else "FAIL"
        ),
        "results": results,
    }
